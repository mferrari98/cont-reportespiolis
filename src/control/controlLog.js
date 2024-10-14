const { verLog } = require("../../config.json").desarrollo

const LogDAO = require("../dao/logDAO");
const logDAO = new LogDAO();

const ID_MOD = "LOG";

let lanzarReporte = function (enviarEmail, currentModifiedTime, cb) {
    getNuevosDatos((err, reporte) => {
        if (!err) {
            transpilar(reporte, currentModifiedTime, () => {
                
                if (enviarEmail) {
                    emailMensaje.extraerTabla(() => {
                        emailMensaje.renderizar();
                        cb()
                    });
                }
                else
                    cb()
            });
        }
    });
}

/* ===========================================================
===================== FUNCIONES INTERNAS =====================
==============================================================
*/

module.exports = { lanzarReporte };

if (verLog) {
    console.log(`${ID_MOD} - Directorio trabajo:`, process.cwd());
    console.log(`${ID_MOD} - Directorio del archivo:`, __dirname);
}