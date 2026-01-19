const fs = require("fs")
const path = require("path")
const util = require("util")
const { logamarillo } = require("./src/control/controlLog")

const originalLog = console.log.bind(console)
const originalWarn = console.warn.bind(console)
const originalError = console.error.bind(console)

const LOG_MAX_BYTES = 10 * 1024 * 1024
const LOG_DIR = "/logs/reportespiolis"
const defaultLogFile = fs.existsSync(LOG_DIR)
    ? path.join(LOG_DIR, "app.log")
    : path.join(process.cwd(), "app.log")
const LOG_FILE = process.env.LOG_FILE || defaultLogFile

const formatTimestamp = () => {
    const now = new Date()
    const gmt3 = new Date(now.getTime() - (3 * 60 * 60 * 1000))
    return gmt3.toISOString()
}

const rotateIfNeeded = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            const { size } = fs.statSync(filePath)
            if (size < LOG_MAX_BYTES) {
                return
            }
        }

        const rotated = `${filePath}.1`
        if (fs.existsSync(rotated)) {
            fs.unlinkSync(rotated)
        }
        if (fs.existsSync(filePath)) {
            fs.renameSync(filePath, rotated)
        }
    } catch (err) {
        originalWarn(`[LOG ROTATE] Error rotando ${filePath}`, err)
    }
}

const appendLog = (message) => {
    rotateIfNeeded(LOG_FILE)
    fs.appendFile(LOG_FILE, `${message}\n`, (err) => {
        if (err) {
            originalError(`[LOG WRITE] Error escribiendo ${LOG_FILE}`, err)
        }
    })
}

const wrapConsole = (fn) => (...args) => {
    const timestamp = formatTimestamp()
    const formatted = util.format(...args)
    const message = `${timestamp} [-] ${formatted}`
    fn(message)
    appendLog(message)
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
