# Proposal: Migrate to nginx-http

## Status
PROPOSED

## Why
The current application uses self-signed HTTPS certificates and handles SSL/TLS directly in the Node.js application. This approach has several drawbacks:

1. **Certificate Management Complexity**: Self-signed certificates cause browser warnings and require manual distribution to clients
2. **Mixed Responsibilities**: The application handles both business logic AND SSL termination
3. **Deployment Requirements**: The user needs to deploy the app at `10.10.9.252/reporte` with proper SSL, which is better handled by nginx
4. **Production Best Practice**: Industry standard is to use nginx for SSL termination with Node.js apps serving plain HTTP behind it

By migrating to HTTP and letting nginx handle SSL, we achieve:
- Proper SSL certificates (Let's Encrypt or commercial CA)
- Separation of concerns (nginx = SSL/routing, app = business logic)
- Easier deployment and maintenance
- Better performance (nginx SSL is more efficient)

## Summary
Migrate the application from self-signed HTTPS to plain HTTP on port 80, delegating SSL/TLS termination to nginx reverse proxy. The application will be accessible at `10.10.9.252/reporte` with nginx handling HTTPS on the public-facing side.

## Motivation
- **Simplified SSL Management**: nginx will handle SSL certificates instead of the application
- **Standard Architecture**: Separation of concerns - nginx handles SSL/TLS, app focuses on business logic
- **Easier Certificate Management**: nginx can use Let's Encrypt or proper certificates
- **Better Performance**: nginx is optimized for SSL termination and static file serving
- **Production Best Practice**: Standard pattern for Node.js applications behind reverse proxy

## Goals
1. Remove HTTPS configuration from the Express application
2. Change server to listen on HTTP port 80
3. Remove dependency on self-signed SSL certificates
4. Update Content-Security-Policy headers to work with nginx reverse proxy
5. Ensure all existing routes continue to work (`/reporte`, `/sitio`, `/tipovar`, `/desa`)
6. Add redirect from root `/` to `/reporte` for convenience

## Non-Goals
- nginx configuration is out of scope (handled separately by ops)
- Changing the application functionality or routes
- Modifying the database schema or ETL pipeline
- Updating the email sending functionality

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Breaking existing clients | HIGH | Add redirect from `/` to `/reporte` for backward compatibility |
| CSP headers blocking resources | MEDIUM | Update CSP to work with both direct access and nginx proxy |
| Port 80 requires root privileges | MEDIUM | Document that app may need to run with capabilities or behind nginx on different port |
| Application still accessible on port 80 | LOW | nginx firewall rules should block direct access, only allow through reverse proxy |

## Dependencies
- nginx reverse proxy configuration (external)
- Network configuration to route `10.10.9.252/reporte` to application

## Alternatives Considered
1. **Keep HTTPS in app + nginx**: More complex, duplicate SSL handling
2. **Use different port (e.g., 3000)**: Less standard for HTTP, but avoids root privilege requirement - RECOMMENDED if nginx is doing reverse proxy anyway
3. **Use systemd socket activation**: More complex setup, limited benefits

## Success Metrics
- Application starts successfully on HTTP port 80
- All routes accessible via `http://localhost:80/reporte`
- No SSL/certificate errors in logs
- Reduced application startup complexity (no certificate loading)
- Application works behind nginx reverse proxy at `10.10.9.252/reporte`
