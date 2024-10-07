const { verLog } = require("../../config.json").desarrollo

const SitioDAO = require("../dao/sitioDAO");
const TipoVariableDAO = require("../dao/tipoVariableDAO");
const HistoricoLecturaDAO = require("../dao/historicoLecturaDAO");
const LogDAO = require("../dao/logDAO");

const EmailMensaje = require("../reporte/emailMensaje");
const Reporte = require("../modelo/reporte")
const { transpilar } = require("../etl/transpilador");

const tipoVariableDAO = new TipoVariableDAO();
const sitioDAO = new SitioDAO();
const historicoLecturaDAO = new HistoricoLecturaDAO();
const logDAO = new LogDAO();

const emailMensaje = new EmailMensaje();
const reporte = new Reporte()

const ID_MOD = "REPORTE";

/**
 * 
 * @param {*} enviarEmail 
 * @param {*} currentModifiedTime 
 * @param {*} cb 
 */
let lanzarReporte = function (enviarEmail, currentModifiedTime, cb) { 
    getNuevosDatos((err, reporte) => {        
        if (!err) {
            transpilar(reporte, currentModifiedTime, () => {
                if (enviarEmail) {
                    emailMensaje.extraerTabla();
                    emailMensaje.renderizar();    
                }
                cb()
            });
        }
    });
}

/**
 * 
 * @param {*} enviarEmail 
 * @param {*} mensaje 
 * @param {*} currentModifiedTime 
 * @param {*} cb 
 */
let notificarFallo = function (_, mensaje, currentModifiedTime, cb) {
    logDAO.create(mensaje, currentModifiedTime, () => cb())
}

/* ===========================================================
===================== FUNCIONES INTERNAS =====================
==============================================================
*/

function getNuevosDatos(callback) {
    
    sitioDAO.getTodosDescriptores((_, descriptores) => {        
        // el objeto reporte se crea siempre, aunque no hay datos para agregar
        reporte.declarar(descriptores, (mi_reporte) => {

            historicoLecturaDAO.getMostRecent((_, rows) => {
                
                let remaining = rows.length;
                rows.forEach((row) => {
                    
                    tipoVariableDAO.getById(row.tipo_id, (err, tipoVarRow) => {
                        sitioDAO.getById(row.sitio_id, (err, sitioRow) => {
                            historicoLecturaDAO.getHistorico(sitioRow.id, (_, historico) => {

                                reporte.definir(mi_reporte, row, tipoVarRow, sitioRow, historico);
                                remaining -= 1;
                                
                                if (remaining === 0)
                                    callback(null, mi_reporte);
                            })
                        });
                    });
                });
                if (remaining === 0)
                    callback(null, mi_reporte);
            });
        })
    });
}

module.exports = { lanzarReporte, notificarFallo };

if (verLog) {
    console.log(`${ID_MOD} - Directorio trabajo:`, process.cwd());
    console.log(`${ID_MOD} - Directorio del archivo:`, __dirname);
}