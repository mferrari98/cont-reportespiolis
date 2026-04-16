# Reportespiolis

Backend Node.js/Express que genera reportes HTML con datos historicos
(SQLite). Se publica en `/reporte/` via Nginx.

## Configuracion necesaria
- Crear `cont-reportespiolis/.env` a partir de `example-env`.
- Revisar `config.json` si cambian rutas de entrada/salida.
- `sitios.json` es la fuente de verdad de rebalses/cubicajes y lista de sitios Madryn.
- El orden de visualización se basa en `sitios.json` y en el campo `tipo_variable.orden`.
- `config.json` controla el nivel de log en `logging.level` (1 error, 2 info, 3 debug).
- Los logs de la aplicación se guardan en `cont-reportespiolis/logs/app.log`.

## Estructura
- Diagrama HTML disponible en `/reporte/desa`.

## Ingesta SMB horaria
- El observador corre una vez al iniciar y luego cada hora en `HH:00`.
- Variables obligatorias en `.env`: `SMB_USER` y `SMB_PASS`.
- Los archivos temporales de cada corrida se guardan en `/tmp/reportespiolis/<runId>/`.
- Si la descarga SMB falla, intenta 5 veces y aborta ese ciclo sin ejecutar ETL parcial.
- Si el contenido descargado no cambia, el ciclo se omite por deduplicacion via hash.
