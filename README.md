# Reportespiolis

Backend Node.js/Express que genera reportes HTML con datos historicos
(SQLite). Se publica en `/reporte/` via Nginx.

## Configuracion necesaria
- Crear `cont-reportespiolis/.env` a partir de `example-env`.
- Revisar `config.json` si cambian rutas de entrada/salida.
- `sitios.json` es la fuente de verdad de rebalses/cubicajes y lista de sitios Madryn.
- El orden de visualización se basa en `sitios.json` y en el campo `tipo_variable.orden`.
- `config.json` controla el nivel de log en `logging.level` (1 error, 2 info, 3 debug).
- Los logs de la aplicación se guardan en `logs/app.log`.

## Desarrollo
```bash
npm install
npm start
```

## Estructura
- Diagrama HTML disponible en `/reporte/desa`.
