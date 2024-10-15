const { logamarillo } = require("./src/control/controlLog")

const { closeDatabase } = require('./src/basedatos/db');
/*
observar cambios en el archivo de referencia
*/
const observador = require('./src/etl/observador')
/*
desplegar servidor web el reporte generado
*/
const { closeServer } = require("./src/web/server")(observador)
/*
armar esquema de base de datos
*/
const { crearTablas } = require('./src/basedatos/crear_tablas');

crearTablas((err) => {
    logamarillo(2, "ESQUEMA - resumen errores ->", err)
    observador.iniciar()
});

process.on('SIGINT', () => {
    observador.parar()
    closeServer(() => {
        closeDatabase(() => {
            process.exit(0);
        })
    })
});