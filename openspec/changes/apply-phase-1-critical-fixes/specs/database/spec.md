# Database Capability - Spec Deltas

## ADDED Requirements

### Requirement: Database Performance Indexes
The database schema SHALL include indexes on high-frequency query columns to ensure optimal query performance.

#### Scenario: Composite index for historico_lectura joins
- **GIVEN** historico_lectura table with sitio_id and tipo_id foreign keys
- **WHEN** queries join by both sitio_id and tipo_id
- **THEN** a composite index `idx_historico_sitio_tipo` SHALL exist on (sitio_id, tipo_id)

#### Scenario: Temporal index for recent data queries
- **GIVEN** historico_lectura table with etiempo timestamp column
- **WHEN** queries order by etiempo DESC or filter by most recent timestamp
- **THEN** a descending index `idx_historico_etiempo` SHALL exist on etiempo DESC

#### Scenario: Descriptor lookup index
- **GIVEN** sitio table with descriptor text column
- **WHEN** ETL or API performs getByDescriptor lookups
- **THEN** an index `idx_sitio_descriptor` SHALL exist on descriptor

#### Scenario: Index creation idempotency
- **GIVEN** database initialization or migration script
- **WHEN** creating indexes
- **THEN** indexes SHALL use CREATE INDEX IF NOT EXISTS to safely re-run

### Requirement: Transaction Support for Data Integrity
The database SHALL support transactions to ensure atomic multi-row operations.

#### Scenario: ETL batch insert atomicity
- **GIVEN** an ETL batch inserting 4 rows (nivel, cloro, turbiedad, vol/dia)
- **WHEN** wrapped in BEGIN TRANSACTION / COMMIT
- **THEN** all 4 inserts SHALL succeed together or all SHALL be rolled back on error

#### Scenario: Transaction rollback on error
- **GIVEN** a transaction in progress with 2 successful inserts
- **WHEN** the 3rd insert fails (e.g., constraint violation, disk full)
- **THEN** the database SHALL execute ROLLBACK and revert the first 2 inserts

#### Scenario: Transaction isolation
- **GIVEN** concurrent ETL process writes
- **WHEN** multiple transactions execute simultaneously
- **THEN** SQLite file-level locking SHALL serialize writes (no deadlocks possible)
