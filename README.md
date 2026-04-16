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
- Configurar `SMB_USER` y `SMB_PASS` en `.env` para autenticar contra los recursos SMB.
- `config.json` define `ingesta.temp_dir` para staging local de archivos antes del procesamiento.
- `config.json` define `ingesta.smb.wizcon_url` y `ingesta.smb.citec_url` como fuentes horarias.
- `observador.reintentos.max` y `observador.reintentos.backoff_segundos` controlan los reintentos con backoff.
- En contenedor, el paquete `curl` queda disponible para chequeos operativos y troubleshooting.
