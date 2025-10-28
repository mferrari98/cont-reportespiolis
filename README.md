# Sistema de Reporte de Historico de Lecturas

## Introduccion

Este sistema permite consultar datos historicos de sensores o sitios de monitoreo de manera eficiente.  
El enfoque principal es proteger la infraestructura de sobrecargas HTTP mediante **paginacion de consultas a la base de datos**.  

La **pagina inicial** devuelve siempre los registros mas recientes, y la navegacion permite avanzar o retroceder en el tiempo.  
Se utiliza un **lote fijo de 100 registros** por pagina, con control de botones Anterior/Siguiente en el cliente web.  

El sistema esta desarrollado en **Node.js** usando **Express** para el backend, y **SQLite** como base de datos.
Se incorporan varios modulos que se encargan de DAO, control de reportes, ETL y manejo de logs.

Para información sobre despliegue y configuración de entornos, consultar [`README-DEPLOYMENT.md`](README-DEPLOYMENT.md).

---

## Arquitectura General

El flujo general del sistema es el siguiente:

1. El cliente web solicita `/reporte`.
2. El **controlReporte** recibe la solicitud y decide qué pagina de datos traer.
3. Se invoca el **DAO historicoLectura** con paginacion inversa para traer los registros mas recientes.
4. Los registros son procesados y enriquecidos con datos de sitio y tipo de variable.
5. Se genera el HTML con la tabla de datos y los controles de paginacion.
6. El cliente puede usar los botones Anterior/Siguiente para navegar entre las paginas.  

---

## Detalle de Modulos

### 1. `src.dao.historicoLecturaDAO.js`

- Gestiona la tabla `historico_lectura`.
- Provee metodos CRUD: `create`, `getById`, `delete`, `truncate`.
- Soporta consultas **paginas descendentes** con `getHistoricoPagDesc`.
- Metodo `getMostRecent` retorna el lote mas reciente.
- Implementa conteo de registros para calcular offset en la paginacion.

### 2. `src.dao.sitioDAO.js`

- Maneja la tabla `sitio`.
- Permite obtener todos los descriptores y un sitio por ID.
- Facilita la relacion entre sitios y datos historicos.

### 3. `src.dao.tipoVariableDAO.js`

- Gestiona los tipos de variables (`tipo_variable`).
- Provee metodo `getById` para obtener la descripcion y metadatos.
- Permite filtrar historicos segun el tipo de variable deseado.

### 4. `src.dao.logDAO.js`

- Registro de eventos y errores en el sistema.
- Metodo `create` para agregar logs con timestamp.
- Utilizado por `controlReporte` para notificar fallos.

### 5. `src.control.controlReporte.js`

- Orquesta la generacion de reportes.
- Lanza reporte con `lanzarReporte(enviarEmail, timestamp, options)`.
- **Paginacion por defecto:** pagina 1 = registros mas recientes.
- Calcula `offset` y `limit` para consultas paginadas.
- Integra datos de sitios, tipo de variable y lecturas historicas.
- Llama a `transpilar` para procesar y renderizar reporte final.
- Opcionalmente envia email con reporte.

### 6. `src.reporte.emailMensaje.js`

- Genera emails con contenido del reporte.
- Permite extraer tablas y renderizar en formato HTML para envio.
- Integrado con `controlReporte` solo si se solicita envio de email.

### 7. `src.modelo.reporte.js`

- Abstraccion de la estructura de reporte.
- Permite declarar columnas y definir filas con datos enriquecidos.
- Facilita la construccion de tablas HTML finales.

### 8. `src.etl.transpilador.js`

- Procesa datos de forma interna antes de la renderizacion.
- Aplica transformaciones necesarias sobre los historicos.
- Integra los datos de sitios y variables con la estructura de reporte.

### 9. `src.web.routes.general.js`

- Rutas Express principales:
  - `GET /` → genera HTML de reporte con paginacion.
  - `GET /favicon.ico` → devuelve favicon.
  - `POST /imagenpt` → recibe imagen en base64 y la guarda.
- Renderiza controles de paginacion:
  - Boton Anterior → retrocede en el tiempo.
  - Boton Siguiente → avanza hacia registros mas recientes.
- Controla pagina actual y limite de registros (100 por defecto).
- Inserta HTML dinamicamente con los botones y scripts JS.

### 10. `src.control.controlLog.js`

- Facilita logs en consola con distintos niveles.
- Integrado en todos los modulos para depuracion.
- Ejemplo: `logamarillo(nivel, mensaje, extra)`.

---

## Funcionamiento de la Paginacion

- **Pagina 1**: lote mas reciente de 100 registros.
- **Anterior**: pagina +1 → registros mas antiguos.
- **Siguiente**: pagina -1 → registros mas recientes.
- Pagina minima = 1, pagina maxima = total de paginas calculado por `ceil(totalRegistros / 100)`.
- Cliente puede navegar sin sobrecargar servidor ni base de datos.

---

## Beneficios del Sistema

- Evita consultas HTTP muy grandes.
- Garantiza que siempre se cargue primero la informacion mas reciente.
- Navegacion intuitiva con botones Anterior/Siguiente.
- Facil extension para envio de emails o reportes automatizados.
- Modular y mantenible: cada DAO y control se encarga de una responsabilidad clara.
- Logs centralizados para trazabilidad y debug.

---

## Consideraciones

- Base de datos SQLite ligera y eficiente para historicos.
- Limite de 100 registros por pagina ajustable via `options.historicoLimit`.
- Sistema preparado para crecer: se pueden agregar filtros adicionales por tipo de variable o sitio.
- HTML generado incluye JS minimo para controles de paginacion.

---

## Diagrama de Flujo ASCII de Paginacion

        +----------------------+
        | Cliente solicita /reporte |
        +----------------------+
                   |
                   v
        +----------------------+
        | controlReporte       |
        | determina pagina=1   |
        +----------------------+
                   |
                   v
        +----------------------+
        | historicoLecturaDAO  |
        | getHistoricoPagDesc  |
        | limit=100, offset=0  |
        +----------------------+
                   |
                   v
        +----------------------+
        | Integracion de datos |
        | (sitios, variables)  |
        +----------------------+
                   |
                   v
        +----------------------+
        | HTML con tabla       |
        | y botones Anterior/Siguiente |
        +----------------------+
                   |
         +---------+---------+
         |                   |
         v                   v


Para pruebas sobre el estado de la BD usar https://sqlitebrowser.org/
