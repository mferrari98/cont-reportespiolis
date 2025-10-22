const { logamarillo } = require("../control/controlLog")

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
 * lanzarReporte ahora por defecto trae pagina 1 con los registros mas recientes
 * y acepta options = { historicoLimit, historicoPage }
 */
let lanzarReporte = function (enviarEmail, estampatiempo, options, cb) {
    if (typeof options === "function") {
        cb = options;
        options = {};
    }

    getNuevosDatos(options, (err, reporte) => {
        if (!err) {
            transpilar(reporte, estampatiempo, () => {

                if (enviarEmail) {
                    emailMensaje.extraerTabla(() => {
                        emailMensaje.renderizar();
                        cb()
                    });
                }
                else
                    cb()
            });
        } else {
            cb(err);
        }
    });
}

let notificarFallo = function (mensaje, currentModifiedTime, cb) {
    logDAO.create(mensaje, currentModifiedTime, () => cb())
}

/* ===========================================================
===================== FUNCIONES INTERNAS =====================
==============================================================
*/

/**
 * getNuevosDatos con paginacion invertida:
 * pagina 1 = registros mas recientes
 */
function getNuevosDatos(options, callback) {

    options = options || {};
    const historicoLimit = options.historicoLimit ? parseInt(options.historicoLimit) : 100; // ahora limite fijo 100
    let historicoPage = options.historicoPage ? parseInt(options.historicoPage) : 1;

    sitioDAO.getTodosDescriptores((_, descriptores) => {
        reporte.declarar(descriptores, (mi_reporte) => {

            historicoLecturaDAO.getMostRecent((_, rows) => {

                let remaining = rows.length;
                if (remaining === 0) {
                    callback(null, mi_reporte);
                    return;
                }

                rows.forEach((row) => {

                    tipoVariableDAO.getById(row.tipo_id, (err, tipoVarRow) => {
                        sitioDAO.getById(row.sitio_id, (err, sitioRow) => {

                            // calcular offset invertido
                            const totalCountCallback = (totalCount) => {
                                let totalPages = Math.ceil(totalCount / historicoLimit);
                                if (historicoPage > totalPages) historicoPage = totalPages;

                                const offset = (historicoPage - 1) * historicoLimit;

                                const cbHistorico = (_, historico) => {
                                    reporte.definir(mi_reporte, row, tipoVarRow, sitioRow, historico);
                                    remaining -= 1;
                                    if (remaining === 0)
                                        callback(null, mi_reporte);
                                };

                                historicoLecturaDAO.getHistoricoPagDesc(sitioRow.id, historicoLimit, offset, cbHistorico);
                            };

                            // primero contamos registros totales para cada sitio
                            historicoLecturaDAO.getHistoricoCount(sitioRow.id, (err, totalCount) => {
                                totalCountCallback(totalCount);
                            });

                        });
                    });
                });
            });
        })
    });
}

module.exports = { lanzarReporte, notificarFallo };

logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);