# Project Context

## Purpose
**reportespiolis** is a specialized ETL pipeline and real-time monitoring dashboard for water/sewage treatment facilities managed by Servicoop. The system:
- Consumes plain text reports from SCADA systems (Wizcon) containing sensor readings
- Processes and stores historical measurement data (water levels, chlorine, turbidity, flow rates)
- Generates HTML reports with interactive charts (Plotly/D3.js)
- Sends automated email notifications with embedded visualizations
- Provides web-based access to current and historical sensor data with pagination

The project serves as a critical monitoring tool for water quality and infrastructure management.

## Tech Stack
- **Runtime**: Node.js (ES6+, CommonJS modules)
- **Web Framework**: Express.js v4.19.2 with HTTPS support
- **Database**: SQLite3 v5.1.7 (file-based, no external server)
- **Email**: Nodemailer v6.9.14 (SMTP client)
- **Browser Automation**: Puppeteer v22.13.1 (for screenshot generation)
- **HTML Parsing**: Cheerio v1.0.0-rc.12
- **Frontend Visualization**: Plotly.js, D3.js
- **Security**: Self-signed SSL certificates (passphrase: "escadadiamasdificil")
- **Version Control**: Git (GitHub repository)

## Project Conventions

### Code Style
- **Language**: JavaScript (ES6+ features with CommonJS `require`/`module.exports`)
- **File Naming**: lowercase with underscores (e.g., `control_reporte.js`, `historico_lectura_dao.js`)
- **Class Naming**: PascalCase constructors (e.g., `HistoricoLecturaDAO`, `ControlReporte`)
- **Variable Naming**: camelCase for variables and functions
- **Database Naming**: snake_case for tables/columns (e.g., `historico_lectura`, `tipo_variable`)
- **Indentation**: Tabs (inferred from codebase)
- **String Literals**: Mix of single and double quotes
- **Logging**: Custom `logamarillo(nivel, modulo, mensaje)` function used throughout
- **Comments**: Spanish language, inline and block comments
- **No Linter/Formatter**: No ESLint/Prettier configuration detected

### Architecture Patterns
1. **DAO (Data Access Object) Pattern**
   - Each database table has dedicated DAO class
   - All database operations use callbacks (no Promises/async-await)
   - SQL queries defined as constants at top of DAO files

2. **MVC-Inspired Structure**
   - `/src/modelo`: Data models (Report class)
   - `/src/control`: Business logic controllers
   - `/src/dao`: Data access layer
   - `/src/web/routes`: HTTP route handlers

3. **ETL Pipeline Pattern**
   - Extract: Read plain text from network shares
   - Transform: Parse space-separated columns, normalize gaps, validate data
   - Load: Insert into SQLite via DAO layer

4. **Observer Pattern**
   - File system watcher (`observador.js`) polls network shares every 40 seconds
   - Triggers ETL pipeline on file modification detection

5. **Template Transpilation**
   - Load HTML template (`plantilla.piolis`)
   - Clone DOM elements for each data row
   - Replace placeholders with actual sensor readings
   - Generate chart data arrays

6. **Callback-Based Async Flow**
   - No Promises or async/await
   - Nested callbacks throughout (intentional simplicity)

### Testing Strategy
- **Current State**: No automated tests configured (`"test": "echo \"Error: no test specified\" && exit 1"`)
- **Manual Testing**: Development mode with debug routes at `/desa` endpoint
- **Development Database**: Separate `desarrollo.sqlite` for testing without affecting production

### Git Workflow
- **Main Branch**: `main` (default for PRs)
- **Recent Commits**: Spanish commit messages focused on feature descriptions
  - "agregando paginado de reporte"
  - "cambio en los destinatarios del correo"
  - "Se agrego un cambio en el transpilador para mostrar un punto rojo cuando la lectura de cloro es menor a 1"
- **Commit Style**: Informal, descriptive (no conventional commits format)
- **Untracked Files**: `.claude/`, `AGENTS.md`, `CLAUDE.md`, `openspec/` currently not committed

## Domain Context

### Water Treatment Monitoring Domain
- **Sites (sitios)**: Physical monitoring locations (e.g., "P.Pot", "P.San", "Cisterna Sur")
- **Variables (tipo_variable)**: Sensor measurement types:
  - `Nivel[m]`: Water level in meters
  - `Cloro[mlg/l]`: Chlorine concentration in mg/L
  - `Turbiedad[UTN]`: Turbidity in NTU (Nephelometric Turbidity Units)
  - `VOL/DIA[m3/dia]`: Daily volume flow in cubic meters per day
  - `Cota45`: Special tank level reading from separate system

### Critical Business Rules
1. **Chlorine Alert**: Display red dot (🔴) when chlorine reading < 1 mg/L at P.Pot site (indicates unsafe water quality)
2. **Pagination Direction**: Inverted - page 1 = newest data (DESC order)
3. **Missing Data Handling**: Gaps >20 characters in text parsing insert "s/d" (sin datos) markers
4. **Email Distribution**: Automated reports sent to stakeholders list in `config.json`
5. **Tank Volume Calculations**: Rebalse (overflow level) and cubicaje (volume capacity) tracked per site

### SCADA Integration
- **Wizcon System**: Primary SCADA data source (REP002.DAT file)
- **Text Format**: Space-separated columns with irregular spacing, no CSV structure
- **Update Frequency**: Files checked every 40 seconds
- **Network Shares**: Reads from mounted Linux paths (`/mnt/compartido/...`)

## Important Constraints

### Technical Constraints
1. **Fixed Text Format**: Cannot parse arbitrary reports - only designed for specific Wizcon output format
2. **Network Dependency**: Requires mounted network shares to access SCADA data files
3. **Callback-Based Code**: No async/await - must maintain callback pattern for consistency
4. **Self-Signed Certificates**: HTTPS uses non-production certificates
5. **SQLite Limitations**: Single-file database with potential concurrency bottlenecks
6. **No Type Safety**: Plain JavaScript without TypeScript
7. **Node.js Version**: Must support ES6+ and CommonJS (no ESM)

### Business Constraints
1. **Spanish Language**: All UI, logs, and documentation in Spanish
2. **Servicoop Organization**: Email credentials and branding specific to organization
3. **Water Quality Regulations**: Chlorine threshold (<1 mg/L) likely mandated by health regulations
4. **Real-Time Requirements**: Must process data within 40-second polling window

### Performance Constraints
1. **Pagination Required**: Historical data can be large (100 records per page)
2. **Email Screenshots**: Puppeteer headless browser adds processing overhead
3. **File I/O**: Network share latency affects ETL pipeline

## External Dependencies

### Network Share Files (Critical)
- **REP002.DAT**: Primary SCADA sensor readings
  - Path: `//mnt/compartido/valScadaWizcon/REP002.DAT`
  - Format: Space-separated plain text
  - Update frequency: Real-time (monitored every 40s)

- **NivelCisSur.txt**: Cisterna Sur tank level data
  - Path: `//mnt/compartido/nvCistSur/NivelCisSur.txt`
  - Special handling: Cota45 variable

### Email Infrastructure
- **SMTP Server**: servicoop.com mail server
- **Credentials**: `fixture-user@servicoop.com` / `fixture-user` (stored in config.json)
- **Recipients**: Configured distribution list in `config.json`

### SSL Certificates
- **Location**: `/src/web/cert/`
- **Files**: Private key and certificate for HTTPS
- **Passphrase**: "escadadiamasdificil" (hardcoded)

### External Libraries (CDN)
- **Plotly.js**: Chart rendering in browser
- **D3.js**: Additional visualizations
- **Socket.io** (optional): WebSocket support for development mode

### Operating System
- **Linux Required**: Uses Linux-style mount paths (`/mnt/compartido/`)
- **File System**: Must support watching network shares
- **Permissions**: Needs read access to SCADA network shares
