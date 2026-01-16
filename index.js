const { logamarillo } = require("./src/control/controlLog")

const originalLog = console.log.bind(console)
const originalWarn = console.warn.bind(console)
const originalError = console.error.bind(console)

const formatTimestamp = () => {
    const now = new Date()
    const gmt3 = new Date(now.getTime() - (3 * 60 * 60 * 1000))
    return gmt3.toISOString()
}

const wrapConsole = (fn) => (...args) => {
    const timestamp = formatTimestamp()
    fn(`${timestamp} [-]`, ...args)
}

console.log = wrapConsole(originalLog)
console.warn = wrapConsole(originalWarn)
console.error = wrapConsole(originalError)

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
