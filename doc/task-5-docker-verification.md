# Task 5 Docker Verification Report

## Context
- Branch: `feat/docker-compose-nginx-app-separados`
- Worktree: `/home/mferrari/code/cont-reportespiolis/.worktrees/feat-docker-compose-nginx-app-separados`
- Timestamp: `2026-04-16T13:11:18-03:00`

## Docker availability evidence
- Command: `docker version`
- Exact result: `/bin/bash: line 1: docker: command not found`
- Impact: runtime checks that require Docker remain pending in this environment.

## Non-Docker checks executed
- Command: `node --test test/deploy/compose.config.test.js test/deploy/nginx.proxy.test.js test/deploy/readme.deploy.test.js`
- Result: **PASS** (`9` tests, `0` failures)

## Acceptance mapping (Task 5)
- `app` internal (no published ports) and `nginx` as public entrypoint (`80:80`, `depends_on: app`) -> verified by `test/deploy/compose.config.test.js`.
- `app` mounts `/mnt/compartido:/mnt/compartido:ro` and `reportes_db:/app/src/basedatos` -> verified by `test/deploy/compose.config.test.js`.
- `deploy/nginx/nginx.conf` defines `upstream app_backend` to `app:3000` and proxies with required headers/timeouts -> verified by `test/deploy/nginx.proxy.test.js`.
- `README.md` documents compose deploy flow (`docker compose up -d --build`), `nginx` public + `app` internal, and root `.env` setup -> verified by `test/deploy/readme.deploy.test.js`.
- `.env.example` keeps only allowlisted deploy variables (`EMAIL_USER`, `EMAIL_PASS`, `EMAIL_DIFUSION`) -> verified by `test/deploy/readme.deploy.test.js`.
- Pending: container runtime validation (`docker compose up/ps/logs/down`) cannot be executed until Docker is available.

## Follow-up commands when Docker is available
```bash
docker version
docker compose up -d --build
node --test test/deploy/compose.config.test.js test/deploy/nginx.proxy.test.js test/deploy/readme.deploy.test.js
docker compose ps
docker compose logs --no-color --tail=200
docker compose down
```
