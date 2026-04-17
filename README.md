# Reportespiolis

Backend Node.js/Express que genera reportes HTML con datos historicos
(SQLite). Se publica en `/reporte/` via gateway externo.

## Configuracion necesaria
- Crear `.env` en la raiz del repo a partir de `.env.example`.
- Revisar `config.json` si cambian rutas de entrada/salida.
- `sitios.json` es la fuente de verdad de rebalses/cubicajes y lista de sitios Madryn.
- El orden de visualización se basa en `sitios.json` y en el campo `tipo_variable.orden`.
- `config.json` controla el nivel de log en `logging.level` (1 error, 2 info, 3 debug).
- Los logs de la aplicación se guardan en `cont-reportespiolis/logs/app.log`.

## Estructura
- Diagrama HTML disponible en `/reporte/desa`.

## Arquitectura multi-repo
- Este repo solo contiene el servicio `app` (Node.js/Express) y su almacenamiento (`reportes_db`).
- La exposicion publica y el enrutamiento HTTP viven en un gateway externo de otro repo.
- El gateway debe resolver `/reporte` hacia este servicio por la red Docker `edge_net`.

## Deploy con Docker Compose (servicio app privado)
- `docker-compose.yml` levanta un unico servicio: `app`.
- `app` no publica puertos al host; queda privado en la red externa `edge_net`.
- Requisito previo: la red Docker externa `edge_net` debe existir (`docker network create edge_net`).
- Pasos rapidos:
  1. Copiar variables: `cp .env.example .env`
  2. Crear red externa (si no existe): `docker network create edge_net`
  3. Construir e iniciar: `docker compose up -d --build`
  4. Ver estado: `docker compose ps`
  5. Ver logs: `docker compose logs -f app`
  6. Detener: `docker compose down`
