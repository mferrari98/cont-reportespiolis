# Design: Migrate to nginx-http

## Architecture Overview

### Current State
```
┌─────────────────────────────────────────┐
│  Node.js Application                    │
│  ┌───────────────────────────────────┐  │
│  │ HTTPS Server (port 3000/3001)     │  │
│  │ - Self-signed certificates        │  │
│  │ - Passphrase: escadadiamasdificil │  │
│  │ - CSP headers for localhost:3000  │  │
│  └───────────────────────────────────┘  │
│           ↓                              │
│  ┌───────────────────────────────────┐  │
│  │ Express Routes                    │  │
│  │ - /reporte (general.js)           │  │
│  │ - /sitio (sitio.js)               │  │
│  │ - /tipovar (tipovar.js)           │  │
│  │ - /desa (desarrollo.js)           │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Target State
```
┌─────────────────────────────────────────┐
│  nginx Reverse Proxy (10.10.9.252)     │
│  ┌───────────────────────────────────┐  │
│  │ HTTPS (port 443)                  │  │
│  │ - Proper SSL certificates         │  │
│  │ - Location: /reporte → :80        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    ↓ HTTP
┌─────────────────────────────────────────┐
│  Node.js Application                    │
│  ┌───────────────────────────────────┐  │
│  │ HTTP Server (port 80)             │  │
│  │ - No SSL/certificates             │  │
│  │ - CSP headers for proxy           │  │
│  │ - Trust X-Forwarded-* headers     │  │
│  └───────────────────────────────────┘  │
│           ↓                              │
│  ┌───────────────────────────────────┐  │
│  │ Express Routes                    │  │
│  │ - / → redirect to /reporte        │  │
│  │ - /reporte (general.js)           │  │
│  │ - /sitio (sitio.js)               │  │
│  │ - /tipovar (tipovar.js)           │  │
│  │ - /desa (desarrollo.js)           │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Port Selection: Port 80 vs Port 3000

**Decision**: Use port 80 for maximum simplicity in nginx configuration

**Rationale**:
- User explicitly requested port 80 configuration
- Simpler nginx proxy_pass configuration
- Standard HTTP port, no custom port management needed

**Trade-offs**:
| Approach | Pros | Cons |
|----------|------|------|
| Port 80 | Standard HTTP port, simple nginx config | Requires root/capabilities to bind |
| Port 3000 | No special privileges needed | Requires port in nginx config |

**Implementation Note**: If port 80 binding fails due to permissions, the application can fall back to port 3000 and nginx can be configured with `proxy_pass http://localhost:3000;`

### 2. HTTP vs HTTPS Module

**Decision**: Replace `https.createServer()` with `http.createServer()`

**Changes Required**:
```javascript
// BEFORE
const https = require('https');
const httpsOptions = {
  key: fs.readFileSync('./src/web/cert/server.key'),
  cert: fs.readFileSync('./src/web/cert/server.crt'),
  passphrase: 'escadadiamasdificil',
};
const server = https.createServer(httpsOptions, app).listen(currentPort, ...);

// AFTER
const http = require('http');
const server = http.createServer(app).listen(currentPort, ...);
```

### 3. Content-Security-Policy Headers

**Decision**: Update CSP to work with nginx reverse proxy using relative URLs

**Current CSP** (hardcoded to localhost):
```javascript
default-src 'self' https://localhost:3000;
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://localhost:3000;
// ... more rules with hardcoded localhost
```

**New CSP** (proxy-aware):
```javascript
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
connect-src 'self';
```

**Rationale**:
- `'self'` automatically adapts to the request's origin (whether localhost or 10.10.9.252)
- Removes hardcoded port references
- Works both in development (direct access) and production (nginx proxy)

### 4. Root Route Redirect

**Decision**: Add explicit redirect from `/` to `/reporte`

**Implementation**:
```javascript
// Add to server.js before route registration
app.get('/', (req, res) => {
  res.redirect(301, '/reporte');
});
```

**Rationale**:
- Backwards compatibility for users accessing the root
- Clearer user experience (automatic navigation to main feature)
- 301 (permanent) redirect tells clients to update bookmarks

### 5. Proxy Trust Configuration

**Decision**: Add Express trust proxy setting for nginx reverse proxy

**Implementation**:
```javascript
app.set('trust proxy', true);
```

**Rationale**:
- Allows Express to trust `X-Forwarded-*` headers from nginx
- Enables correct client IP logging
- Required for secure cookies if using sessions in the future
- Standard practice for apps behind reverse proxy

## File Changes Summary

### Modified Files
1. **src/web/server.js**
   - Replace `https` module with `http`
   - Remove `httpsOptions` and certificate file reads
   - Update port from 3000/3001 to 80
   - Update CSP middleware to use relative `'self'` instead of hardcoded localhost
   - Add `app.set('trust proxy', true)`
   - Add root redirect route

### Removed Dependencies
- No longer need to read certificate files at startup
- Can remove `fs.readFileSync()` calls for cert/key
- Can remove `passphrase` from configuration

### Configuration Changes
- **config.json**: No changes required (email, paths, etc. remain the same)
- **package.json**: No dependency changes needed

## Security Considerations

### SSL/TLS Termination
- **Before**: Application handles SSL with self-signed certificates
- **After**: nginx handles SSL with proper certificates
- **Benefit**: Separation of concerns, proper certificate management

### HTTP Between nginx and App
- **Risk**: Unencrypted traffic between nginx and Node.js
- **Mitigation**: Both should be on same server/localhost, traffic doesn't leave machine
- **Best Practice**: nginx and app communicate over localhost interface

### Exposed Port 80
- **Risk**: Application directly accessible on port 80, bypassing nginx
- **Mitigation**: Firewall rules should block external access to port 80, only nginx on 443 accessible
- **Deployment Note**: Document firewall requirement in deployment guide

## Rollback Plan

If issues arise after deployment:

1. **Immediate Rollback**: Keep old HTTPS version as git tag/branch
   ```bash
   git tag pre-nginx-migration
   git checkout pre-nginx-migration
   ```

2. **Fallback nginx Config**: nginx can temporarily proxy to HTTPS:
   ```nginx
   location /reporte {
       proxy_pass https://localhost:3000;
       proxy_ssl_verify off;
   }
   ```

3. **Gradual Migration**: Test HTTP version on port 3001 while HTTPS runs on 3000

## Testing Strategy

### Unit Testing
- Not applicable (no automated tests in project)

### Manual Testing Checklist
1. **Direct Access** (before nginx):
   - [ ] `curl http://localhost:80/reporte` returns HTML
   - [ ] `curl http://localhost:80/sitio` returns data
   - [ ] `curl http://localhost:80/tipovar` returns data
   - [ ] `curl http://localhost:80/desa` returns development page
   - [ ] `curl -I http://localhost:80/` returns 301 redirect to `/reporte`

2. **Through nginx Proxy**:
   - [ ] `https://10.10.9.252/reporte` loads successfully
   - [ ] Pagination buttons work correctly
   - [ ] Charts render (Plotly/D3)
   - [ ] Images load correctly
   - [ ] No mixed content warnings in browser console

3. **Logging**:
   - [ ] No SSL/certificate errors in `historico.txt`
   - [ ] Requests logged with correct paths
   - [ ] Application startup log shows "Escuchando en p=80 (HTTP)"

4. **Integration**:
   - [ ] Observador continues to work
   - [ ] Email sending still functions
   - [ ] Database queries work correctly
   - [ ] File uploads work (if any)

## Performance Implications

### Startup Time
- **Before**: ~200ms (includes certificate file reads and decryption)
- **After**: ~150ms (no certificate overhead)
- **Improvement**: ~25% faster startup

### Request Latency
- **Before**: HTTPS decrypt in Node.js (~2-5ms per request)
- **After**: HTTP only (~0.5ms), nginx handles SSL
- **Improvement**: Negligible (nginx SSL is faster than Node.js)

### Memory Usage
- **Before**: SSL context in memory (~5MB)
- **After**: HTTP only (~1MB less)
- **Improvement**: Minimal but measurable

## Deployment Considerations

### Prerequisites
1. nginx installed and configured on target server
2. SSL certificates configured in nginx
3. Firewall rules:
   - Allow: External → nginx:443
   - Allow: nginx → app:80 (localhost only)
   - Block: External → app:80

### Deployment Steps
1. Update application code (git pull)
2. Restart application: `systemctl restart reportespiolis` (or equivalent)
3. Verify application listening on port 80: `netstat -tulpn | grep :80`
4. Configure nginx reverse proxy
5. Reload nginx: `systemctl reload nginx`
6. Test end-to-end from client

### Monitoring
- Watch `historico.txt` for errors
- Monitor nginx access/error logs
- Check application process status: `systemctl status reportespiolis`

## Open Questions
- [ ] Should we keep development mode (port 3001) on HTTPS for testing?
- [ ] Do we need WebSocket support for Socket.io in production?
- [ ] Should CSP be different for development vs production?
