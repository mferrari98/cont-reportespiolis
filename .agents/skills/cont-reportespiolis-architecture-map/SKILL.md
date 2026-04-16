---
name: cont-reportespiolis-architecture-map
description: Use when starting work on cont-reportespiolis and you need a fast architecture map, runtime data flow, and safe debugging checklist before editing code.
---

# Cont Reportespiolis Architecture Map

## Overview
Guia corta para entender rapido como funciona la app (ingesta -> BD -> reporte web -> mail) sin recorrer todo el repo.

Objetivo: que en una sesion nueva puedas ubicar el problema, validar el estado y tocar el modulo correcto con cambios quirurgicos.

## When to Use
- Te piden "arreglar reporte/mail" y no tenes contexto previo.
- Hay bug en datos historicos, paginacion o graficos.
- Necesitas saber por que `/` y `/line-data` muestran distinto.
- El observador no detecta cambios o falla SMTP.

## System Map
- **Boot:** `index.js` ejecuta `crearTablas()` -> valida errores de esquema/version -> `observador.iniciar()` -> levanta HTTP (`src/web/server.js`).
- **Ingesta:** `src/etl/observador.js` hace polling de Wizcon/Citec, evita solapamiento con `isChecking` y dispara `lanzarETL`.
- **Persistencia:** `src/etl/etl.js` parsea lineas, normaliza `s/d`, y guarda en `historico_lectura` via `HistoricoLecturaDAO`.
- **Reporte:** `src/control/controlReporte.js` arma modelo con paginacion por estampa (`etiempo`) y trae historicos por sitio en batch.
- **Render web:** `src/etl/transpilador.js` genera HTML+payload; `src/web/routes/general.js` inyecta `window.__REPORT_DATA__` con nonce CSP.
- **Render mail:** `src/reporte/graficos.js` genera PNG SSR (ECharts+canvas), `emailMensaje` arma tabla, `emailControl` envia SMTP.

## Data Model (SQLite)
- `sitio`: descriptor, orden, rebalse, cubicaje, maxoperativo.
- `tipo_variable`: descriptor y orden de columna.
- `historico_lectura`: serie temporal (`sitio_id`, `tipo_id`, `valor`, `etiempo`).
- `log`: eventos/fallos de operacion.

Indices clave:
- `idx_historico_etiempo`
- `idx_historico_sitio_tipo`
- `idx_historico_medicion_unica` (evita duplicados por sitio/tipo/etiempo)

## First 10-Minute Checks
1. `node --check index.js src/etl/observador.js src/control/controlReporte.js`
2. `node index.js` y confirmar logs de `ESQUEMA`, `OBSERV`, `WEBSERV`.
3. `curl "http://127.0.0.1:3000/?historicoPage=1&historicoLimit=10"`
4. `curl "http://127.0.0.1:3000/line-data?historicoPage=1&historicoLimit=10"`
5. Revisar `logs/app.log` si hay saltos de flujo o errores SMTP.

## High-Risk Gotchas
- `tipo_variable.orden` y estructura de `Reporte` deben mantenerse sincronizados.
- La pagina representa una estampa (`etiempo`), no una ventana temporal completa.
- Si tocas CSP (`src/web/server.js`), mantene nonce + script inline de `general.js` compatibles.
- En graficos SSR siempre liberar `chart.dispose()` para evitar fugas.
- No mezclar artefactos generados (`src/web/public/graf*.png`, `report-data.json`) en commits funcionales.

## Safe Change Patterns
- **Bug de datos historicos:** empezar por `src/dao/historicoLecturaDAO.js` + `src/control/controlReporte.js`.
- **Bug visual web:** `src/web/public/js/reporte.js` y luego paridad SSR en `src/reporte/graficos.js`.
- **Bug de mail:** `src/reporte/emailMensaje.js` y `src/reporte/emailControl.js`.
- **Bug de ingesta:** `src/etl/observador.js` y `src/etl/etl.js`.

## Done Criteria
- `/` y `/line-data` responden 200 con paginacion consistente.
- No hay errores de sintaxis (`node --check` en archivos tocados).
- Si cambiaste reportes/graficos, validar flujo web y flujo mail (SSR) en la misma corrida.
