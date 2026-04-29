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
- El gateway resuelve `/reporte` hacia este servicio por `127.0.0.1:3001`.

## Deploy con Docker Compose (servicio app privado)
- `docker-compose.yml` levanta un unico servicio: `app`.
- `app` publica solo en `127.0.0.1:3001`, sin exponer el puerto a la red local.
- Inicio de los tres stacks (`portal-comunicaciones` + `reportespiolis` + `nginx`): ejecutar los compose de cada repo.
- Pasos rapidos:
  1. Copiar variables: `cp .env.example .env`
  2. Construir e iniciar: `docker compose up -d --build`
  3. Ver estado: `docker compose ps`
  4. Ver logs: `docker compose logs -f app`
  5. Detener: `docker compose down`

## Ejecucion del proceso completo (3 contenedores)

Este proyecto forma parte de un despliegue con tres contenedores:

1. `portal-comunicaciones` (frontend/portal, imagen `cont-portal-comunicaciones`)
2. `reportespiolis` (este repo, servicio `app`, imagen `cont-reportespiolis`)
3. `nginx` (reverse proxy y enrutamiento publico, imagen `cont-nginx`)

Flujo recomendado:

1. Preparar variables de entorno en cada repo (`cp .env.example .env`).
2. Levantar cada compose:
   - `docker compose up -d --build`
3. Verificar que los tres contenedores esten levantados:
   - `docker ps`
4. Probar acceso por gateway:
   - portal landing en `/`
   - reportespiolis en `/reporte`

Para apagar todo el proceso, usar el script de stop del repo `infra-gateway` (o bajar cada compose por separado).
