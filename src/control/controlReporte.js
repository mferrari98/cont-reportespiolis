const { logamarillo } = require("../control/controlLog")

const SitioDAO = require("../dao/sitioDAO");
const TipoVariableDAO = require("../dao/tipoVariableDAO");
const HistoricoLecturaDAO = require("../dao/historicoLecturaDAO");
const LogDAO = require("../dao/logDAO");

const EmailMensaje = require("../reporte/emailMensaje");
const Reporte = require("../modelo/reporte")
const { transpilar, buildLineSeries } = require("../etl/transpilador");

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

    getNuevosDatos(options, (err, reporte, estampaReporte) => {
        if (!err) {
            let estampaFinal = estampatiempo;
            if (estampaReporte !== null && typeof estampaReporte !== "undefined") {
                const estampaNumero = Number(estampaReporte);
                estampaFinal = Number.isFinite(estampaNumero) ? estampaNumero : estampaReporte;
            }
            transpilar(reporte, estampaFinal, () => {

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

let obtenerLineas = function (options, cb) {
    if (typeof options === "function") {
        cb = options;
        options = {};
    }

    getNuevosDatos(options, (err, reporte) => {
        if (err) {
            cb(err);
            return;
        }

        const lineSeries = buildLineSeries(reporte);
        const pagination = reporte.paginacion || null;
        cb(null, { lineSeries, pagination });
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
 * getNuevosDatos con paginacion invertida por hora:
 * pagina 1 = hora mas reciente
 */
function getNuevosDatos(options, callback) {

    options = options || {};
    const historicoLimit = options.historicoLimit ? parseInt(options.historicoLimit) : 200;
    const requestedPage = options.historicoPage ? parseInt(options.historicoPage) : 1;
    const safeRequestedPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const maxPaginas = 48;

    sitioDAO.getTodosDescriptores((_, descriptores) => {
        reporte.declarar(descriptores, (mi_reporte) => {

            historicoLecturaDAO.getHistoricoEtiempoCount((_, totalCount) => {
                const parsedTotal = Number(totalCount);
                const safeTotal = Number.isFinite(parsedTotal) ? parsedTotal : 0;
                const totalPages = safeTotal > 0 ? Math.min(safeTotal, maxPaginas) : 1;
                const safePage = Math.min(safeRequestedPage, totalPages);

                mi_reporte.paginacion = {
                    page: safePage,
                    limit: historicoLimit,
                    totalPages
                };

                if (safeTotal === 0) {
                    callback(null, mi_reporte, null);
                    return;
                }

                const pageOffset = safePage - 1;

                historicoLecturaDAO.getHistoricoEtiempoPagDesc(pageOffset, (_, etiempo) => {
                    const targetEtiempo = etiempo;
                    if (targetEtiempo === null || typeof targetEtiempo === "undefined") {
                        callback(null, mi_reporte, null);
                        return;
                    }

                    historicoLecturaDAO.getByEtiempo(targetEtiempo, (_, rows) => {
                        let remaining = rows.length;
                        let finalized = false;

                        const finalize = () => {
                            if (finalized) {
                                return;
                            }
                            finalized = true;
                            callback(null, mi_reporte, targetEtiempo);
                        };

                        if (remaining === 0) {
                            finalize();
                            return;
                        }

                        rows.forEach((row) => {
                            tipoVariableDAO.getById(row.tipo_id, (err, tipoVarRow) => {
                                sitioDAO.getById(row.sitio_id, (err, sitioRow) => {
                                    const cbHistorico = (_, historico) => {
                                        if (tipoVarRow && sitioRow) {
                                            reporte.definir(mi_reporte, row, tipoVarRow, sitioRow, historico);
                                        }
                                        remaining -= 1;
                                        if (remaining === 0) {
                                            finalize();
                                        }
                                    };

                                    const historicoOffset = 0;
                                    if (sitioRow) {
                                        historicoLecturaDAO.getHistoricoPagDescHasta(
                                            sitioRow.id,
                                            historicoLimit,
                                            historicoOffset,
                                            targetEtiempo,
                                            cbHistorico
                                        );
                                    } else {
                                        cbHistorico(null, []);
                                    }
                                });
                            });
                        });
                    });
                });
            });
        })
    });
}

module.exports = { lanzarReporte, notificarFallo, obtenerLineas };

logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);
