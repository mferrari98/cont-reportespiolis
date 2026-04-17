# Task 5 Docker Verification Report

## Context
- Branch: `feat/multi-repo-gateway-landing-reporte`
- Worktree: `/home/mferrari/code/cont-reportespiolis/.worktrees/feat-multi-repo-gateway-landing-reporte`
- Topology: app-only private service in this repo, published through an external gateway maintained in another repo.

## Docker availability evidence
- Command: `docker version`
- Exact result: `/bin/bash: line 1: docker: command not found`
- Impact: runtime checks that require Docker remain pending in this environment.

## Non-Docker checks executed
- Command: `node --test test/deploy/compose.config.test.js test/deploy/nginx.proxy.test.js test/deploy/readme.deploy.test.js`
- Result: **PASS** (`12` tests, `0` failures)

## Acceptance mapping (Task 5)
- `docker-compose.yml` defines only `app`; no published ports; service attached to external `edge_net` -> verified by `test/deploy/compose.config.test.js`.
- `app` mounts `/mnt/compartido:/mnt/compartido:ro` and `reportes_db:/app/src/basedatos` -> verified by `test/deploy/compose.config.test.js`.
- Local nginx artifacts are removed from this repo (`deploy/nginx/nginx.conf` absent; no `nginx` service references in compose) -> verified by `test/deploy/nginx.proxy.test.js`.
- `README.md` documents external gateway routing to `/reporte`, app-private deploy flow (`docker compose up -d --build`), and root `.env` setup -> verified by `test/deploy/readme.deploy.test.js`.
- `.env.example` keeps only allowlisted deploy variables (`EMAIL_USER`, `EMAIL_PASS`, `EMAIL_DIFUSION`) -> verified by `test/deploy/readme.deploy.test.js`.
- Pending by environment: runtime container checks (`docker compose up/ps/logs/down`) remain blocked until Docker is available.

## Follow-up commands when Docker is available
```bash
docker version
docker compose up -d --build
node --test test/deploy/compose.config.test.js test/deploy/nginx.proxy.test.js test/deploy/readme.deploy.test.js
docker compose ps
docker compose logs --no-color --tail=200
docker compose down
```
