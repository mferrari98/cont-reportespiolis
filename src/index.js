const { logamarillo } = require("./control/controlLog")

const { closeDatabase } = require('./basedatos/db');
/*
observar cambios en el archivo de referencia
*/
const observador = require('./etl/observador')
/*
desplegar servidor web el reporte generado
*/
const { closeServer } = require("./web/server")(observador)
/*
armar esquema de base de datos
*/
const { crearTablas } = require('./basedatos/crear_tablas');

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