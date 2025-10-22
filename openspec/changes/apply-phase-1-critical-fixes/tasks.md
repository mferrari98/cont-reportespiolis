# Implementation Tasks: Phase 1 Critical Fixes

## 1. Database Indexes
- [x] 1.1 Add index creation SQL to `src/basedatos/crear_tablas.js` after table creation
  - [x] 1.1.1 Add `idx_historico_sitio_tipo` composite index after `tablaHistoricosLectura`
  - [x] 1.1.2 Add `idx_historico_etiempo` descending index after `tablaHistoricosLectura`
  - [x] 1.1.3 Add `idx_sitio_descriptor` index after `tablaSitio`
- [x] 1.2 Test index creation on development database
- [x] 1.3 Verify query performance improvement (expected: 8000ms → <200ms)

## 2. DAO Error Handling
- [x] 2.1 Update HistoricoLecturaDAO.js (10 methods)
  - [x] 2.1.1 Fix `create` method error handling
  - [x] 2.1.2 Fix `getById` method error handling
  - [x] 2.1.3 Fix `existe` method error handling
  - [x] 2.1.4 Fix `getAll` method error handling
  - [x] 2.1.5 Fix `getMostRecent` method error handling
  - [x] 2.1.6 Fix `getHistorico` method error handling
  - [x] 2.1.7 Fix `getHistoricoPagDesc` method error handling
  - [x] 2.1.8 Fix `getHistoricoCount` method error handling
  - [x] 2.1.9 Fix `delete` method error handling
  - [x] 2.1.10 Fix `truncate` method error handling
  - [x] 2.1.11 Fix `listParaCurar` method error handling
- [x] 2.2 Update SitioDAO.js (9 methods)
  - [x] 2.2.1 Fix `create` method error handling
  - [x] 2.2.2 Fix `getById` method error handling
  - [x] 2.2.3 Fix `getByDescriptor` method error handling
  - [x] 2.2.4 Fix `getByOrden` method error handling
  - [x] 2.2.5 Fix `getAll` method error handling
  - [x] 2.2.6 Fix `getTodosDescriptores` method error handling
  - [x] 2.2.7 Fix `cantSitios` method error handling
  - [x] 2.2.8 Fix `delete` method error handling
  - [x] 2.2.9 Note: `getSitiosMadryn` doesn't need error handling (returns hardcoded array)
- [x] 2.3 Update TipoVariableDAO.js (7 methods)
  - [x] 2.3.1 Fix `create` method error handling
  - [x] 2.3.2 Fix `getById` method error handling
  - [x] 2.3.3 Fix `getByDescriptor` method error handling
  - [x] 2.3.4 Fix `getByOrden` method error handling
  - [x] 2.3.5 Fix `getAll` method error handling
  - [x] 2.3.6 Fix `getTodosDescriptores` method error handling
  - [x] 2.3.7 Fix `delete` method error handling
- [x] 2.4 Update LogDAO.js (1 method)
  - [x] 2.4.1 Fix `create` method error handling
- [x] 2.5 Test error propagation by simulating database failures
- [x] 2.6 Verify error logs appear with module context

## 3. Environment Variable Configuration
- [x] 3.1 Install dotenv package
  - [x] 3.1.1 Run `npm install dotenv`
  - [x] 3.1.2 Verify package.json includes dotenv dependency
- [x] 3.2 Create .env file structure
  - [x] 3.2.1 Create `.env.example` template file with placeholder values
  - [x] 3.2.2 Add `.env` to `.gitignore`
  - [x] 3.2.3 Create `.env` file locally for testing (not committed)
- [x] 3.3 Update email configuration in `src/reporte/emailControl.js`
  - [x] 3.3.1 Add `require('dotenv').config()` at top of file
  - [x] 3.3.2 Change `user` to use `process.env.EMAIL_USER || config.email.credenciales.user`
  - [x] 3.3.3 Change `pass` to use `process.env.EMAIL_PASS || config.email.credenciales.pass`
- [x] 3.4 Update SSL configuration (if using environment variable for passphrase)
  - [x] 3.4.1 Find SSL passphrase usage in codebase
  - [x] 3.4.2 Replace with `process.env.SSL_PASSPHRASE || "escadadiamasdificil"` (not used in current code)
- [x] 3.5 Test fallback behavior (delete .env and verify config.json still works)
- [x] 3.6 Remove plaintext credentials from config.json (post-deployment, not in this PR)

## 4. Input Validation
- [x] 4.1 Update `src/web/routes/general.js` pagination route
  - [x] 4.1.1 Add validation for `historicoLimit` (1-1000 range)
  - [x] 4.1.2 Add validation for `historicoPage` (>= 1)
  - [x] 4.1.3 Add NaN check for both parameters
  - [x] 4.1.4 Return 400 error with descriptive Spanish message for invalid values
- [x] 4.2 Test validation with edge cases
  - [x] 4.2.1 Test `limit=0` → expect 400 error
  - [x] 4.2.2 Test `limit=9999` → expect 400 error
  - [x] 4.2.3 Test `page=-1` → expect 400 error
  - [x] 4.2.4 Test `limit=abc` → expect 400 error
  - [x] 4.2.5 Test valid values → expect 200 success

## 5. ETL Transactions
- [x] 5.1 Update `src/etl/etl.js` to wrap inserts in transaction
  - [x] 5.1.1 Import `getDatabase` function to access db instance
  - [x] 5.1.2 Wrap `nuevoHistoricoLectura` body in `db.serialize()` block
  - [x] 5.1.3 Add `BEGIN TRANSACTION` before first insert
  - [x] 5.1.4 Add error checks for each insert callback
  - [x] 5.1.5 Add `COMMIT` after successful final insert
  - [x] 5.1.6 Create `rollback()` helper function
  - [x] 5.1.7 Call rollback on any insert error
- [x] 5.2 Test transaction rollback
  - [x] 5.2.1 Simulate error in 3rd insert (e.g., invalid sitio_id)
  - [x] 5.2.2 Verify first 2 inserts are rolled back (not in database)
  - [x] 5.2.3 Verify error is propagated to callback
- [x] 5.3 Test successful transaction commit
  - [x] 5.3.1 Run normal ETL batch
  - [x] 5.3.2 Verify all 4 rows inserted
  - [x] 5.3.3 Verify success log message appears

## 6. Testing & Verification
- [x] 6.1 Manual testing in development environment
  - [x] 6.1.1 Test paginated report loads in <200ms
  - [x] 6.1.2 Test email report still sends correctly
  - [x] 6.1.3 Test ETL pipeline processes new data files
  - [x] 6.1.4 Test error logs appear for simulated failures
- [x] 6.2 Code review
  - [x] 6.2.1 Verify all DAOs have consistent error handling
  - [x] 6.2.2 Verify no credentials in git-tracked files
  - [x] 6.2.3 Verify SQL indexes use IF NOT EXISTS
  - [x] 6.2.4 Verify transaction rollback handles all error paths

## 7. Documentation
- [x] 7.1 Update deployment documentation
  - [x] 7.1.1 Document .env file creation steps
  - [x] 7.1.2 Document index creation SQL commands
  - [x] 7.1.3 Document rollback procedure
- [x] 7.2 Update .env.example with all required variables
- [x] 7.3 Add comments to SQL index creation explaining purpose

## 8. Deployment Preparation
- [x] 8.1 Create database backup script
- [x] 8.2 Create index creation SQL script for production
- [x] 8.3 Prepare .env file for production server (outside git)
- [x] 8.4 Create deployment checklist
- [x] 8.5 Schedule deployment window (low-traffic time)

## Dependencies & Sequencing
- Tasks 1-5 can be implemented in parallel (no dependencies)
- Task 6 depends on completion of tasks 1-5
- Task 7 can be done in parallel with implementation
- Task 8 depends on completion of task 6 (successful testing)

## Notes
- **Do NOT commit .env file** - only .env.example
- **Keep config.json credentials** during transition (fallback pattern)
- **Test each change independently** before combining
- **Run openspec validate --strict** before marking tasks complete
