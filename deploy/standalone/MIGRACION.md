# Reportes Piolis standalone

Rescate creado el 2026-08-20 desde la app productiva en
`/home/mferrari/servicios-telecom/cont-reportespiolis`.

## Estado rescatado

- Commit funcional: `5dff1fb8c52d054d9c6aacfe740bf82b3a817a5c`
- Tag local: `funcional-produccion-2026-08-20`
- Imagen productiva observada: `servicios-telecom-reportespiolis`
- Digest/ID de imagen observado: `sha256:ff9c3e1e712be72d42e2dfdee3a4bf5047320847351292f2a2891294c6d8a63f`
- Contenedor productivo observado: `cont-reportespiolis`, healthy, sin detenerlo.

## Runtime necesario

Crear estos archivos/directorios junto a este `compose.yml`:

- `.env`: partir de `.env.example`; en el rescate local se redujo la lista
  de difusion a un unico destinatario operativo.
- `data/database.sqlite`: snapshot de la base productiva.
- `logs/`: directorio persistente de logs.
- `/mnt/compartido`: bind mount de solo lectura.

## Ejecutar aislado

Desde esta carpeta:

```bash
docker compose up -d --build
```

Por defecto publica la app en el puerto host `3001`:

```bash
curl -I http://127.0.0.1:3001/
```

Para usar otro puerto:

```bash
REPORTESPIOLIS_HOST_PORT=3010 docker compose up -d --build
```

## Conectar al Nginx actual

Para que Nginx pueda resolver el contenedor standalone por la red existente:

```bash
docker compose -f compose.yml -f compose.proxy.yml up -d --build
```

Ese modo agrega el alias Docker `reportespiolis-standalone` en la red externa
`servicios-telecom_proyectos_network`. Luego el upstream de Nginx debe apuntar a
`reportespiolis-standalone:3000`.

## Desacople del stack viejo

El archivo `desacople-servicios-telecom.patch` documenta el cambio esperado
para:

- sacar `sistema-reportespiolis` del `docker-compose.yml` principal;
- quitar el volumen de logs de Reportes Piolis del monitor;
- hacer que Nginx apunte al contenedor standalone.

No fue aplicado sobre produccion durante el rescate.
