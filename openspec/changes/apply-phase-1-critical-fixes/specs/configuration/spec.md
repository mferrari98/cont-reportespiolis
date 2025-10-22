# Configuration Capability - Spec Deltas

## ADDED Requirements

### Requirement: Environment-Based Secret Management
The system SHALL load sensitive configuration from environment variables instead of plaintext configuration files.

#### Scenario: Dotenv library initialization
- **GIVEN** application startup
- **WHEN** loading configuration
- **THEN** the system SHALL call `require('dotenv').config()` before accessing process.env

#### Scenario: Email credentials from environment
- **GIVEN** email service initialization
- **WHEN** configuring SMTP authentication
- **THEN** the system SHALL read credentials from process.env.EMAIL_USER and process.env.EMAIL_PASS

#### Scenario: SSL passphrase from environment
- **GIVEN** HTTPS server initialization
- **WHEN** loading SSL certificates
- **THEN** the system SHALL read the passphrase from process.env.SSL_PASSPHRASE

#### Scenario: Config file fallback for migration
- **GIVEN** environment variable is not set (e.g., .env file missing)
- **WHEN** accessing a configuration value
- **THEN** the system SHALL fallback to config.json value with pattern: `process.env.KEY || config.path.to.value`

### Requirement: Secret File Protection
The system SHALL prevent sensitive environment files from being committed to version control.

#### Scenario: Gitignore excludes .env
- **GIVEN** a .gitignore file in the repository root
- **WHEN** committing changes
- **THEN** the file SHALL include `.env` to exclude it from version control

#### Scenario: Example environment file provided
- **GIVEN** a new deployment or developer setup
- **WHEN** configuring environment variables
- **THEN** a `.env.example` template file SHALL exist with placeholder values (not real secrets)

#### Scenario: Example file content structure
- **GIVEN** the .env.example file
- **WHEN** viewing its contents
- **THEN** it SHALL contain all required environment variables with placeholder values:
  ```
  EMAIL_USER=your_email@servicoop.com
  EMAIL_PASS=your_password_here
  SSL_PASSPHRASE=your_ssl_passphrase_here
  ```

### Requirement: Secure File Permissions
The .env file SHALL have restricted filesystem permissions to prevent unauthorized access.

#### Scenario: Read-only for owner
- **GIVEN** a .env file created on the server
- **WHEN** setting file permissions
- **THEN** the file SHOULD have permissions 600 (read/write for owner only, no access for group/others)
