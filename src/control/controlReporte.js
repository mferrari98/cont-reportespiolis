const config = require("../config/loader");
const { logamarillo } = require("../control/controlLog");

const SitioDAO = require("../dao/sitioDAO");
const TipoVariableDAO = require("../dao/tipoVariableDAO");
const HistoricoLecturaDAO = require("../dao/historicoLecturaDAO");
const LogDAO = require("../dao/logDAO");

const EmailMensaje = require("../reporte/emailMensaje");
const Reporte = require("../modelo/reporte");
const { transpilar, buildLineSeries } = require("../etl/transpilador");

const tipoVariableDAO = new TipoVariableDAO();
const sitioDAO = new SitioDAO();
const historicoLecturaDAO = new HistoricoLecturaDAO();
const logDAO = new LogDAO();

const emailMensaje = new EmailMensaje();
const reporteModel = new Reporte();

const ID_MOD = "REPORTE";
const DEFAULT_HISTORICO_LIMIT = config.report.historico.defaultLimit;
const MAX_PAGINAS = 48;

async function lanzarReporte(enviarEmail, estampatiempo, options = {}) {
  const { reporte, estampaReporte } = await getNuevosDatos(options);

  let estampaFinal = estampatiempo;
  if (estampaReporte !== null && typeof estampaReporte !== "undefined") {
    const estampaNumero = Number(estampaReporte);
    estampaFinal = Number.isFinite(estampaNumero) ? estampaNumero : estampaReporte;
  }

  await transpilar(reporte, estampaFinal);

  if (enviarEmail) {
    await emailMensaje.extraerTabla();
    await emailMensaje.renderizar();
  }
}

async function obtenerLineas(options = {}) {
  const { reporte } = await getNuevosDatos(options);
  return {
    lineSeries: buildLineSeries(reporte),
    pagination: reporte.paginacion || null
  };
}

async function notificarFallo(mensaje, currentModifiedTime) {
  await logDAO.create(mensaje, currentModifiedTime);
}

async function getNuevosDatos(options = {}) {
  const parsedLimit = options.historicoLimit ? parseInt(options.historicoLimit, 10) : NaN;
  const historicoLimit = Number.isFinite(parsedLimit) ? parsedLimit : DEFAULT_HISTORICO_LIMIT;
  const parsedPage = options.historicoPage ? parseInt(options.historicoPage, 10) : NaN;
  const requestedPage = Number.isFinite(parsedPage) ? parsedPage : 1;
  const safeRequestedPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const sitios = await sitioDAO.getTodosDescriptores();
  const reporte = await reporteModel.declarar(sitios);

  const totalCount = await historicoLecturaDAO.getHistoricoEtiempoCount();
  const parsedTotal = Number(totalCount);
  const safeTotal = Number.isFinite(parsedTotal) ? parsedTotal : 0;
  const totalPages = safeTotal > 0 ? Math.min(safeTotal, MAX_PAGINAS) : 1;
  const safePage = Math.min(safeRequestedPage, totalPages);

  reporte.paginacion = {
    page: safePage,
    limit: historicoLimit,
    totalPages,
    totalCount: safeTotal
  };

  if (safeTotal === 0) {
    return { reporte, estampaReporte: null };
  }

  const pageOffset = safePage - 1;
  const targetEtiempo = await historicoLecturaDAO.getHistoricoEtiempoPagDesc(pageOffset);
  if (targetEtiempo === null || typeof targetEtiempo === "undefined") {
    return { reporte, estampaReporte: null };
  }

  const rows = await historicoLecturaDAO.getByEtiempo(targetEtiempo);
  if (!rows || rows.length === 0) {
    return { reporte, estampaReporte: targetEtiempo };
  }

  const [tipoVariables, sitiosAll] = await Promise.all([
    tipoVariableDAO.getAll(),
    sitioDAO.getAll()
  ]);

  const tipoVarById = new Map(tipoVariables.map((row) => [row.id, row]));
  const sitioById = new Map(sitiosAll.map((row) => [row.id, row]));

  const historicoBySitioId = new Map();
  const uniqueSitios = Array.from(new Set(rows.map((row) => row.sitio_id)));

  await Promise.all(
    uniqueSitios.map(async (sitioId) => {
      const sitioRow = sitioById.get(sitioId);
      if (!sitioRow) {
        historicoBySitioId.set(sitioId, []);
        return;
      }
      const historico = await historicoLecturaDAO.getHistoricoPagDescHasta(
        sitioRow.id,
        historicoLimit,
        0,
        targetEtiempo
      );
      historicoBySitioId.set(sitioId, historico || []);
    })
  );

  rows.forEach((row) => {
    const tipoVarRow = tipoVarById.get(row.tipo_id);
    const sitioRow = sitioById.get(row.sitio_id);
    if (!tipoVarRow || !sitioRow) {
      return;
    }
    const historico = historicoBySitioId.get(row.sitio_id) || [];
    reporteModel.definir(reporte, row, tipoVarRow, sitioRow, historico);
  });

  return { reporte, estampaReporte: targetEtiempo };
}

module.exports = { lanzarReporte, notificarFallo, obtenerLineas };

logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);
