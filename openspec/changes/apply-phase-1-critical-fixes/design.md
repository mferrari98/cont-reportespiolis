# Design: Phase 1 Critical Fixes

## Context

The reportespiolis system is a production ETL pipeline monitoring water treatment facilities. It processes SCADA sensor data every 40 seconds and serves reports via web interface. The system has accumulated technical debt including:

- **Performance**: No database indexes → O(n) query complexity
- **Reliability**: No error handling → silent failures
- **Security**: Plaintext secrets in git → credential exposure
- **Data Integrity**: No transactions → race conditions
- **Debuggability**: Missing validation → unpredictable behavior

**Stakeholders**:
- Operations team (needs reliability)
- Development team (needs debuggability)
- Security team (needs credential protection)
- End users (need fast page loads)

**Constraints**:
- Cannot change callback-based architecture (project convention)
- Must maintain backward compatibility (no API changes)
- SQLite database (no external DB server available)
- Zero-downtime deployment preferred

## Goals / Non-Goals

### Goals
1. **Performance**: Achieve <200ms query times for paginated reports (currently ~8000ms)
2. **Reliability**: Make all database errors visible in logs
3. **Security**: Remove plaintext credentials from version control
4. **Integrity**: Prevent partial ETL writes (all-or-nothing semantics)
5. **Robustness**: Reject invalid pagination parameters (prevent DoS)

### Non-Goals
- Refactoring to async/await (would violate project conventions)
- Adding authentication (separate Phase 2 concern)
- Implementing connection pooling (SQLite limitation)
- Adding comprehensive test suite (no testing infrastructure)
- Migrating to PostgreSQL (constraint: SQLite only)

## Decisions

### Decision 1: Index Strategy

**Choice**: Composite + single-column indexes on historico_lectura

**Rationale**:
- `idx_historico_sitio_tipo (sitio_id, tipo_id)`: Covers N+1 query pattern in `getNuevosDatos()` where we join by both IDs
- `idx_historico_etiempo (etiempo DESC)`: Covers `getMostRecent()` and pagination queries that ORDER BY etiempo DESC
- `idx_sitio_descriptor (descriptor)`: Covers frequent `getByDescriptor()` lookups in ETL

**Alternatives Considered**:
1. **Full-text search index**: Rejected - no text search requirements
2. **Covering indexes** (include all columns): Rejected - would duplicate entire table in index
3. **Partial indexes** (WHERE clauses): Rejected - all rows are queried
4. **Index on `tipo_id` alone**: Rejected - low cardinality (only 4 distinct values)

**Implementation**:
```sql
CREATE INDEX IF NOT EXISTS idx_historico_sitio_tipo
  ON historico_lectura(sitio_id, tipo_id);

CREATE INDEX IF NOT EXISTS idx_historico_etiempo
  ON historico_lectura(etiempo DESC);

CREATE INDEX IF NOT EXISTS idx_sitio_descriptor
  ON sitio(descriptor);
```

**Trade-offs**:
- **Pro**: 95%+ query speedup, enables future N+1 optimization
- **Pro**: Transparent to application code
- **Con**: +10% disk space (indexes stored in .sqlite file)
- **Con**: +5% write overhead (indexes updated on INSERT)

**Migration**: Add to `crear_tablas.js` after table creation, run once on production DB

---

### Decision 2: Error Handling Pattern

**Choice**: Preserve callback pattern, add error checks

**Rationale**:
- Project convention is callback-based (no promises/async-await)
- Current pattern: `db.get(sql, params, (_, row) => callback(null, row))`
- New pattern: `db.get(sql, params, (err, row) => { if (err) return callback(err, null); callback(null, row); })`

**Alternatives Considered**:
1. **Convert to Promises**: Rejected - violates project conventions (would require rewriting 50+ callback chains)
2. **Global error handler**: Rejected - loses error context (which DAO method failed?)
3. **Try-catch blocks**: Rejected - doesn't work with async callbacks
4. **Error middleware**: Rejected - only applicable to HTTP layer, not DAOs

**Implementation**:
```javascript
// Before (silent error)
db.get(sql_getById, [id], (_, row) => {
  callback(null, row);
});

// After (propagate error)
db.get(sql_getById, [id], (err, row) => {
  if (err) {
    logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
    return callback(err, null);
  }
  callback(null, row);
});
```

**Affected Files** (27 methods across 4 DAOs):
- `historicoLecturaDAO.js`: 10 methods (getById, getMostRecent, getHistorico, etc.)
- `sitioDAO.js`: 9 methods (getById, getByDescriptor, getByOrden, etc.)
- `tipoVariableDAO.js`: 7 methods (getById, getByDescriptor, create, etc.)
- `logDAO.js`: 1 method (create)

**Trade-offs**:
- **Pro**: Errors become debuggable (log shows which query failed + SQL error message)
- **Pro**: Callers can handle errors (retry logic, user feedback)
- **Con**: Requires updating every DAO method (+3 lines each)

**Migration**: No migration needed - backward compatible (callbacks still receive same args)

---

### Decision 3: Environment Variable Strategy

**Choice**: Use `dotenv` with config.json fallback

**Rationale**:
- Industry standard: `dotenv` has 75M+ weekly downloads, battle-tested
- Fallback pattern: Try `process.env.EMAIL_PASS` first, then `config.json` (smooth migration)
- Zero-risk: If .env missing, app still works with config.json

**Alternatives Considered**:
1. **System environment variables**: Rejected - requires editing systemd/PM2 config (higher friction)
2. **Encrypted config file**: Rejected - adds complexity (key management)
3. **Secrets manager (Vault, AWS Secrets)**: Rejected - overkill for single-server deployment
4. **Inline prompts at startup**: Rejected - breaks automated restarts

**Implementation**:
```javascript
// src/reporte/emailControl.js
require('dotenv').config();

const pass = process.env.EMAIL_PASS || config.email.credenciales.pass;
const sslPassphrase = process.env.SSL_PASSPHRASE || "escadadiamasdificil";
```

**.env file**:
```bash
EMAIL_USER=fixture-user@servicoop.com
EMAIL_PASS=fixture-user
SSL_PASSPHRASE=escadadiamasdificil
```

**.env.example** (committed to git):
```bash
EMAIL_USER=your_email@servicoop.com
EMAIL_PASS=your_password_here
SSL_PASSPHRASE=your_ssl_passphrase_here
```

**.gitignore addition**:
```
.env
```

**Trade-offs**:
- **Pro**: Removes plaintext secrets from git history
- **Pro**: Standard pattern (developers familiar)
- **Pro**: Easy per-environment config (dev/prod)
- **Con**: Requires manual .env creation on deployment
- **Con**: +1 dependency (`dotenv`, 50KB)

**Migration**:
1. Install dotenv: `npm install dotenv`
2. Create `.env` on server
3. Restart app (fallback to config.json if .env missing)
4. Remove credentials from config.json after verification

---

### Decision 4: Input Validation Strategy

**Choice**: Early validation with explicit bounds

**Rationale**:
- Validate at HTTP boundary (routes layer) before business logic
- Explicit limits: `historicoLimit` (1-1000), `historicoPage` (>=1)
- Fail fast with clear error messages

**Alternatives Considered**:
1. **Express-validator middleware**: Rejected - overkill (adds dependency, only 2 params to validate)
2. **Database-level constraints**: Rejected - not appropriate for query params
3. **Joi schema validation**: Rejected - too heavyweight for simple int checks
4. **Silent clamping** (force to bounds): Rejected - hides user errors

**Implementation**:
```javascript
// src/web/routes/general.js
router.get('/reporte', async (req, res) => {
  const limit = parseInt(req.query.historicoLimit) || 100;
  const page = parseInt(req.query.historicoPage) || 1;

  // Validation
  if (limit < 1 || limit > 1000) {
    return res.status(400).send('Error: historicoLimit debe estar entre 1 y 1000');
  }
  if (page < 1) {
    return res.status(400).send('Error: historicoPage debe ser >= 1');
  }
  if (isNaN(limit) || isNaN(page)) {
    return res.status(400).send('Error: Parámetros inválidos');
  }

  // ... existing logic
});
```

**Trade-offs**:
- **Pro**: Prevents DoS via `limit=999999999` (would load millions of records)
- **Pro**: Prevents crashes from negative/NaN values
- **Pro**: Clear user feedback (400 error with message)
- **Con**: Slightly more verbose routes (+10 lines)

**Migration**: No migration - new validation rejects previously-accepted invalid inputs

---

### Decision 5: Transaction Strategy

**Choice**: Wrap 4-insert ETL sequence in SQLite transaction

**Rationale**:
- SQLite supports `BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK`
- Current code has race condition: if insert #3 fails, inserts #1-2 are orphaned
- Transaction ensures atomicity: all 4 inserts succeed or none do

**Alternatives Considered**:
1. **Batch insert** (single SQL with 4 rows): Rejected - would require major ETL refactor
2. **Manual rollback** (delete on error): Rejected - complex, race-prone
3. **Optimistic locking**: Rejected - doesn't prevent partial writes
4. **Two-phase commit**: Rejected - overkill (single DB)

**Implementation**:
```javascript
// src/etl/etl.js
function nuevoHistoricoLectura(lines, etiempo, callback) {
  const db = getDatabase();
  const lineas_modif = agregarNulos(lines, umbral);

  db.serialize(() => {
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        logamarillo(2, `${ID_MOD} - Error iniciando transacción: ${err.message}`);
        return callback(err);
      }

      insertar(lineas_modif, 1, etiempo, (err1) => {
        if (err1) return rollback(db, callback, err1);

        insertar(lineas_modif, 2, etiempo, (err2) => {
          if (err2) return rollback(db, callback, err2);

          insertar(lineas_modif, 3, etiempo, (err3) => {
            if (err3) return rollback(db, callback, err3);

            insertar(lineas_modif, 4, etiempo, (err4) => {
              if (err4) return rollback(db, callback, err4);

              db.run('COMMIT', (err) => {
                if (err) {
                  logamarillo(2, `${ID_MOD} - Error en commit: ${err.message}`);
                  return rollback(db, callback, err);
                }
                logamarillo(1, `${ID_MOD} - Transacción completada exitosamente`);
                callback();
              });
            });
          });
        });
      });
    });
  });
}

function rollback(db, callback, originalError) {
  db.run('ROLLBACK', (rollbackErr) => {
    if (rollbackErr) {
      logamarillo(2, `${ID_MOD} - Error en rollback: ${rollbackErr.message}`);
    }
    logamarillo(2, `${ID_MOD} - Transacción revertida: ${originalError.message}`);
    callback(originalError);
  });
}
```

**Trade-offs**:
- **Pro**: Guarantees data consistency (all-or-nothing)
- **Pro**: Automatically rolls back on network/disk errors
- **Pro**: Better error recovery (partial data never visible)
- **Con**: +5ms overhead per batch (BEGIN + COMMIT)
- **Con**: More complex callback nesting (could mitigate with async/await in Phase 3)

**Migration**: No migration - transparent to callers (same callback API)

## Risks / Trade-offs

### Risk: Index Creation Locks Table
**Mitigation**: Use `CREATE INDEX IF NOT EXISTS` (safe to re-run), create indexes during low-traffic window

### Risk: .env File Missing in Production
**Mitigation**: Fallback to config.json, add deployment checklist, create .env.example template

### Risk: Transaction Deadlocks
**Mitigation**: SQLite uses file-level locking (no deadlocks possible), `db.serialize()` ensures sequential execution

### Risk: Validation Breaks Existing Clients
**Mitigation**: Unlikely (no known clients sending invalid params), can temporarily log warnings instead of errors

### Risk: Error Handling Exposes Internal Details
**Mitigation**: Log detailed errors server-side, return generic errors to clients (e.g., "Database error")

## Migration Plan

### Pre-Deployment
1. Review changes in development environment
2. Test pagination with various `limit`/`page` values
3. Verify ETL transaction rollback (simulate error in insert #3)
4. Confirm error logs appear for database failures

### Deployment Steps
1. **Backup database**: `cp desarrollo.sqlite desarrollo.sqlite.backup`
2. **Install dependencies**: `npm install dotenv`
3. **Create .env file** on server:
   ```bash
   cat > .env << EOF
   EMAIL_USER=fixture-user@servicoop.com
   EMAIL_PASS=fixture-user
   SSL_PASSPHRASE=escadadiamasdificil
   EOF
   chmod 600 .env  # Restrict permissions
   ```
4. **Deploy code**: Copy updated files to server
5. **Run index creation** (can do while app running):
   ```bash
   sqlite3 src/basedatos/desarrollo.sqlite << EOF
   CREATE INDEX IF NOT EXISTS idx_historico_sitio_tipo ON historico_lectura(sitio_id, tipo_id);
   CREATE INDEX IF NOT EXISTS idx_historico_etiempo ON historico_lectura(etiempo DESC);
   CREATE INDEX IF NOT EXISTS idx_sitio_descriptor ON sitio(descriptor);
   EOF
   ```
6. **Restart application**: `pm2 restart reportespiolis` (or systemd restart)
7. **Verify**:
   - Check logs for dotenv loading
   - Test pagination: `/reporte?historicoPage=2&historicoLimit=50`
   - Verify query speed: Should be <200ms (check logs)
   - Test invalid input: `/reporte?historicoLimit=9999` → expect 400 error

### Rollback Plan
If issues arise:
1. **Rollback code**: Revert to previous version
2. **Keep indexes**: Safe to leave (no harm, improve performance)
3. **Keep .env**: Safe to leave (fallback to config.json)
4. **Restore DB backup if needed**: `cp desarrollo.sqlite.backup desarrollo.sqlite`

### Post-Deployment Monitoring
- Monitor error logs for new error messages (should see structured errors)
- Check query performance (expect 95% improvement)
- Verify ETL pipeline continues running (transaction overhead minimal)
- Confirm email reports still send (dotenv credentials working)

## Open Questions

1. **Should we add monitoring metrics?**
   - Decision: Defer to Phase 4 (monitoring infrastructure)
   - Rationale: Current focus is fixing critical bugs, metrics are enhancement

2. **Should we add retry logic for DB errors?**
   - Decision: No (not in Phase 1)
   - Rationale: Error handling makes failures visible; retry logic is enhancement for Phase 2

3. **Should we enforce HTTPS-only with HSTS headers?**
   - Decision: Defer to Phase 2 (security enhancements)
   - Rationale: SSL already configured; HSTS is nice-to-have, not critical

4. **Should we create integration tests?**
   - Decision: No (no test infrastructure exists)
   - Rationale: Manual testing sufficient for Phase 1; test suite is Phase 4 goal

## Success Criteria

Phase 1 is successful if:
1. ✅ Query performance improves by >90% (8000ms → <200ms)
2. ✅ Database errors appear in logs (no more silent failures)
3. ✅ No plaintext credentials in git (secrets in .env)
4. ✅ ETL pipeline never creates partial batches (transaction rollback tested)
5. ✅ Invalid pagination returns 400 error (not 500/crash)
6. ✅ Zero production downtime during deployment
7. ✅ All existing functionality works unchanged
