# DAO Layer Capability - Spec Deltas

## ADDED Requirements

### Requirement: Database Error Propagation
All DAO methods SHALL properly handle and propagate database errors to callers.

#### Scenario: Error callback propagation
- **GIVEN** a DAO method executing a database query
- **WHEN** the database operation fails (e.g., SQLITE_BUSY, constraint violation)
- **THEN** the DAO SHALL invoke the callback with error as first argument: `callback(err, null)`

#### Scenario: Error logging with context
- **GIVEN** a database error occurs in a DAO method
- **WHEN** the error is caught
- **THEN** the DAO SHALL log the error with module ID and error message: `logamarillo(2, '${ID_MOD} - Error DB: ${err.message}')`

#### Scenario: No silent error suppression
- **GIVEN** any DAO method callback receiving an error parameter
- **WHEN** processing the database result
- **THEN** the DAO SHALL NOT ignore the error by using `(_, row)` destructuring

#### Scenario: Consistent error handling pattern
- **GIVEN** all DAO methods across all DAO classes
- **WHEN** implementing error handling
- **THEN** all SHALL follow the same pattern:
  ```javascript
  db.get(sql, params, (err, row) => {
    if (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      return callback(err, null);
    }
    callback(null, row);
  });
  ```

### Requirement: DAO Method Error Coverage
Every DAO method that performs database operations SHALL include error handling.

#### Scenario: HistoricoLecturaDAO error handling
- **GIVEN** HistoricoLecturaDAO with 10 methods
- **WHEN** any method performs a database query
- **THEN** all 10 methods (create, getById, existe, getAll, getMostRecent, getHistorico, getHistoricoPagDesc, getHistoricoCount, delete, truncate, listParaCurar) SHALL implement error handling

#### Scenario: SitioDAO error handling
- **GIVEN** SitioDAO with 9 methods
- **WHEN** any method performs a database query
- **THEN** all 9 methods (create, getById, getByDescriptor, getByOrden, getSitiosMadryn, getAll, getTodosDescriptores, cantSitios, delete) SHALL implement error handling

#### Scenario: TipoVariableDAO error handling
- **GIVEN** TipoVariableDAO with 7 methods
- **WHEN** any method performs a database query
- **THEN** all 7 methods (create, getById, getByDescriptor, getByOrden, getAll, getTodosDescriptores, delete) SHALL implement error handling

#### Scenario: LogDAO error handling
- **GIVEN** LogDAO with 1 method
- **WHEN** the create method performs a database insert
- **THEN** the method SHALL implement error handling
