# Reportespiolis

Backend Node.js/Express que genera reportes HTML con datos historicos
(SQLite). Se publica en `/reporte/` via Nginx.

## Configuracion necesaria
- Crear `cont-reportespiolis/.env` a partir de `.env.example`.
- Revisar `config.json` si cambian rutas de entrada/salida.
- `sitios.json` es la fuente de verdad de rebalses/cubicajes y lista de sitios Madryn.
- El orden de visualización se basa en `sitios.json` y en el campo `tipo_variable.orden`.
- `config.json` controla el nivel de log en `logging.level` (1 error, 2 info, 3 debug).
- Los logs de la aplicación se guardan en `cont-reportespiolis/logs/app.log`.

## Estructura
- Diagrama HTML disponible en `/reporte/desa`.

## Deploy con Docker Compose (nginx + app separados)
- `docker-compose.yml` levanta dos servicios: `nginx` como entrada publica y `app` en red interna.
- solo nginx expone puertos al host; app queda privada y se accede solo por proxy interno.
- Pasos rapidos:
  1. Copiar variables: `cp .env.example .env`
  2. Construir e iniciar: `docker compose up -d --build`
  3. Ver estado: `docker compose ps`
  4. Ver logs: `docker compose logs -f app nginx`
  5. Detener: `docker compose down`
