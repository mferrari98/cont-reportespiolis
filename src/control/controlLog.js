const { nivLog } = require("../../config.json").desarrollo

const ID_MOD = "LOG";

let logamarillo = function (nivel, ...contenido) {

    if (nivel >= nivLog)
        console.log(...contenido)
}

/* ===========================================================
===================== FUNCIONES INTERNAS =====================
==============================================================
*/

module.exports = { logamarillo };

logamarillo(1, `${ID_MOD} - Directorio trabajo:`, process.cwd());
logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);