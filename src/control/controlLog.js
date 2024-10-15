const fs = require('fs');
const { nivLog } = require("../../config.json").desarrollo

const ID_MOD = "LOG";

let logamarillo = function (nivel, ...contenido) {

    if (nivel >= nivLog)
        console.log(...contenido)

    const estampaTiempo = obtenerEstampaDeTiempo();
    const linea = `${estampaTiempo} [-] ${contenido}\n`;

    // Append la línea al archivo (si no existe, lo crea)
    fs.appendFile('historico.txt', linea, (err) => {
        if (err) {
            logamarillo(1, `${ID_MOD} - Error escribiendo archivo:`, err);
        }
        historia = contenido
    })
}

/* ===========================================================
===================== FUNCIONES INTERNAS =====================
==============================================================
*/

function obtenerEstampaDeTiempo() {
    const fechaActual = new Date();
    // Restamos 3 horas a la fecha actual para ajustarla a GMT-3
    const fechaGMT3 = new Date(fechaActual.getTime() - (3 * 60 * 60 * 1000));
    return fechaGMT3.toISOString(); // Devuelve la fecha en formato ISO
}

module.exports = { logamarillo };

logamarillo(1, `${ID_MOD} - Directorio trabajo:`, process.cwd());
logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);