# ETL Pipeline Capability - Spec Deltas

## ADDED Requirements

### Requirement: Transactional ETL Inserts
The ETL pipeline SHALL use database transactions to ensure atomic multi-insert operations.

#### Scenario: Four-insert batch wrapped in transaction
- **GIVEN** an ETL batch with 4 insert operations (nivel, cloro, turbiedad, voldia)
- **WHEN** executing nuevoHistoricoLectura
- **THEN** the system SHALL wrap all 4 inserts in BEGIN TRANSACTION / COMMIT

#### Scenario: Successful batch commit
- **GIVEN** a transaction with 4 successful inserts
- **WHEN** all inserts complete without error
- **THEN** the system SHALL execute COMMIT and log success message

#### Scenario: Failed insert triggers rollback
- **GIVEN** a transaction in progress
- **WHEN** any insert fails (e.g., constraint violation, disk error)
- **THEN** the system SHALL execute ROLLBACK and propagate the error to the callback

#### Scenario: Rollback error handling
- **GIVEN** a transaction that needs to rollback
- **WHEN** the ROLLBACK operation itself fails
- **THEN** the system SHALL log both the rollback error and original error, then invoke callback with original error

#### Scenario: Transaction serialization
- **GIVEN** multiple concurrent ETL batches
- **WHEN** executing transactions
- **THEN** the system SHALL use db.serialize() to ensure sequential execution (prevent race conditions)

### Requirement: Input Validation for Web Pagination
The web routes SHALL validate pagination parameters to prevent DoS attacks and invalid queries.

#### Scenario: Valid limit parameter accepted
- **GIVEN** a request with query parameter historicoLimit=50
- **WHEN** validating input
- **THEN** the system SHALL accept values between 1 and 1000 (inclusive)

#### Scenario: Out-of-bounds limit rejected
- **GIVEN** a request with historicoLimit=9999 or historicoLimit=0
- **WHEN** validating input
- **THEN** the system SHALL return HTTP 400 with error message "Error: historicoLimit debe estar entre 1 y 1000"

#### Scenario: Valid page parameter accepted
- **GIVEN** a request with query parameter historicoPage=2
- **WHEN** validating input
- **THEN** the system SHALL accept integer values >= 1

#### Scenario: Negative page rejected
- **GIVEN** a request with historicoPage=-1 or historicoPage=0
- **WHEN** validating input
- **THEN** the system SHALL return HTTP 400 with error message "Error: historicoPage debe ser >= 1"

#### Scenario: Non-numeric parameters rejected
- **GIVEN** a request with historicoLimit="abc" or historicoPage="xyz"
- **WHEN** parsing parameters with parseInt
- **THEN** the system SHALL detect NaN and return HTTP 400 with error message "Error: Parámetros inválidos"

#### Scenario: Default values for missing parameters
- **GIVEN** a request without historicoLimit or historicoPage query parameters
- **WHEN** processing the request
- **THEN** the system SHALL use default values (limit=100, page=1)
