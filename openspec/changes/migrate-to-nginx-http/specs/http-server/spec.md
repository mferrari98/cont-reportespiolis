# Spec: HTTP Server Configuration

## Overview
This spec defines the HTTP server configuration for the reportespiolis application when running behind an nginx reverse proxy.

---

## ADDED Requirements

### Requirement: HTTP Server Protocol
The application MUST serve HTTP traffic instead of HTTPS, delegating SSL/TLS termination to nginx.

#### Scenario: Server uses HTTP module
**GIVEN** the application is starting
**WHEN** the web server module is loaded
**THEN** it MUST use Node.js `http` module instead of `https` module
**AND** it MUST NOT load SSL certificate files
**AND** it MUST NOT require passphrase configuration

#### Scenario: No SSL configuration at startup
**GIVEN** the application is starting
**WHEN** the server initializes
**THEN** it MUST NOT attempt to read `./src/web/cert/server.key`
**AND** it MUST NOT attempt to read `./src/web/cert/server.crt`
**AND** it MUST NOT fail if certificate files are missing or invalid

---

### Requirement: Port Configuration
The application MUST listen on HTTP port 80 for standard HTTP traffic.

#### Scenario: Production mode uses port 80
**GIVEN** the application is in production mode (desarrollo.activo = false)
**WHEN** the server starts
**THEN** it MUST bind to port 80
**AND** it MUST log "Escuchando en p=80 (HTTP)" to confirm HTTP mode

#### Scenario: Development mode uses port 3001
**GIVEN** the application is in development mode (desarrollo.activo = true)
**WHEN** the server starts
**THEN** it MUST bind to port 3001
**AND** it MUST log "Escuchando en p=3001 (HTTP)"

#### Scenario: Startup log indicates HTTP protocol
**GIVEN** the server has started successfully
**WHEN** reviewing the application logs
**THEN** the log message MUST indicate "(HTTP)" not "(HTTPS)"

---

### Requirement: Content Security Policy Headers
The application MUST emit Content-Security-Policy headers compatible with nginx reverse proxy.

#### Scenario: CSP uses relative 'self' directive
**GIVEN** a client requests any route
**WHEN** the response is sent
**THEN** the CSP header MUST use `'self'` directive without hardcoded hostnames
**AND** it MUST NOT contain references to `localhost:3000` or `localhost:3001`
**AND** it MUST work correctly whether accessed via localhost or reverse proxy

#### Scenario: CSP allows required resources
**GIVEN** a client accesses `/reporte`
**WHEN** the HTML page loads
**THEN** the CSP MUST allow:
- Scripts from same origin with `'unsafe-inline'` and `'unsafe-eval'`
- Styles from same origin with `'unsafe-inline'`
- Images from same origin, data URLs, and blob URLs
- Connections to same origin

---

### Requirement: Reverse Proxy Trust
The application MUST trust proxy headers from nginx for correct request handling.

#### Scenario: Express trusts proxy headers
**GIVEN** the Express application is configured
**WHEN** a request arrives from nginx with `X-Forwarded-*` headers
**THEN** Express MUST trust these headers
**AND** `req.ip` MUST reflect the original client IP, not nginx's IP
**AND** `req.protocol` MUST reflect the original protocol (https), not the backend protocol (http)

#### Scenario: Proxy trust configured at startup
**GIVEN** the application is starting
**WHEN** Express middleware is configured
**THEN** `app.set('trust proxy', true)` MUST be executed before route registration

---

### Requirement: Root Route Redirect
The application MUST redirect the root path to /reporte for user convenience.

#### Scenario: Root path redirects to /reporte
**GIVEN** a client requests "/"
**WHEN** the request is processed
**THEN** the server MUST respond with HTTP 301 (Permanent Redirect)
**AND** the Location header MUST be "/reporte"

#### Scenario: Redirect preserves query parameters
**GIVEN** a client requests "/?historicoPage=2&historicoLimit=100"
**WHEN** the redirect is processed
**THEN** the redirect SHOULD preserve query parameters
**OR** the redirect MAY strip query parameters (simpler implementation acceptable)

---

### Requirement: Existing Routes Preserved
All existing application routes MUST continue to function without modification.

#### Scenario: Reporte route works
**GIVEN** the server is running in HTTP mode
**WHEN** a client requests "/reporte"
**THEN** the application MUST serve the report HTML with pagination controls
**AND** the response MUST be identical to the HTTPS version

#### Scenario: API routes work
**GIVEN** the server is running in HTTP mode
**WHEN** a client requests "/sitio", "/tipovar", or "/desa"
**THEN** the application MUST respond with the same data as before
**AND** no functionality MUST be lost

#### Scenario: Static files served correctly
**GIVEN** the server is running in HTTP mode
**WHEN** a client requests static files (JS, CSS, images, favicon)
**THEN** the files MUST be served with correct MIME types
**AND** CSP headers MUST allow these resources to load

---

## MODIFIED Requirements

_No requirements modified from existing specs (no existing specs present)._

---

## REMOVED Requirements

_No requirements removed (no existing specs present)._

---

## Cross-References

### Related Capabilities
- **nginx-reverse-proxy** (external): nginx configuration for SSL termination and proxy to this application
- **observador-etl** (existing): File observer and ETL pipeline - must continue to work unchanged
- **email-reporting** (existing): Email sending functionality - must continue to work unchanged

### Dependencies
- nginx MUST be configured to proxy `/reporte` location to `http://localhost:80` (or :3001 in dev mode)
- Firewall MUST block direct external access to port 80, allowing only nginx access
- nginx MUST set `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host` headers

---

## Implementation Notes

### Code Changes Required
1. **src/web/server.js**:
   - Replace `require('https')` with `require('http')`
   - Remove `httpsOptions` object
   - Remove certificate file reading
   - Change port from 3000 → 80 (production) and keep 3001 (development)
   - Update CSP middleware to remove hardcoded localhost references
   - Add `app.set('trust proxy', true)` before route registration
   - Add root redirect: `app.get('/', (req, res) => res.redirect(301, '/reporte'))`

### No Changes Required
- **src/web/routes/general.js**: No changes
- **src/web/routes/sitio.js**: No changes
- **src/web/routes/tipovar.js**: No changes
- **src/web/routes/desarrollo.js**: No changes
- **config.json**: No changes
- **Database layer**: No changes
- **ETL pipeline**: No changes

### Testing Verification
Manual testing checklist:
1. Start server, verify log shows "(HTTP)" not "(HTTPS)"
2. `curl http://localhost:80/` returns 301 redirect
3. `curl http://localhost:80/reporte` returns HTML
4. Access via browser, check console for CSP errors (should be none)
5. Verify charts load (Plotly/D3)
6. Test pagination buttons
7. Verify observer continues to update reports
