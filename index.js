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

const ID_MOD = "SUPERINDEX"

crearTablas((err) => {

    let resultado = Object.keys(err)
        .map(key => `${key}: ${err[key] === null ? "null" : err[key]}`)
        .join(", ");
    
    logamarillo(2, `ESQUEMA - resumen errores -> ${resultado}`)
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

logamarillo(1, `${ID_MOD} - Directorio trabajo:`, process.cwd());
logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);