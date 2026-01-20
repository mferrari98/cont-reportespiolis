const fs = require("fs");
const path = require("path");
const express = require("express");

const config = require("../../config/loader");
const { logamarillo } = require("../../control/controlLog");
const { obtenerLineas } = require("../../control/controlReporte");
const { AppError, ValidationError } = require("../../core/errors");
const { asyncHandler } = require("../../core/http");

const router = express.Router();

let observador;

const MAX_HISTORICO_LIMIT = config.report.historico.maxLimit;
const DEFAULT_HISTORICO_LIMIT = config.report.historico.defaultLimit;

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { historicoLimit, historicoPage } = parseHistoricoParams(req);
    await observador.verUltimoCambio(false, { historicoLimit, historicoPage });

    const filePath = config.paths.reportHtml;
    const dataPath = config.paths.reportData;

    let data;
    try {
      data = await fs.promises.readFile(filePath, "utf8");
    } catch (err) {
      logamarillo(2, `${err}`);
      throw new AppError("Error leyendo reporte");
    }

    let pagination = null;
    try {
      const rawData = await fs.promises.readFile(dataPath, "utf8");
      const parsed = JSON.parse(rawData);
      pagination = parsed && parsed.pagination ? parsed.pagination : null;
    } catch (err) {
      pagination = null;
    }

    const totalPagesValue = Number.isFinite(pagination?.totalPages) ? pagination.totalPages : null;
    const limitValue = Number.isFinite(pagination?.limit) ? pagination.limit : historicoLimit;
    const pageValue = Number.isFinite(pagination?.page) ? pagination.page : historicoPage;

    const safeTotalPages = totalPagesValue && totalPagesValue > 0 ? totalPagesValue : null;
    const safePage = safeTotalPages ? Math.min(Math.max(pageValue, 1), safeTotalPages) : Math.max(pageValue, 1);

    const prevDisabled = safeTotalPages ? safePage >= safeTotalPages : false;
    const nextDisabled = safePage <= 1;
    const prevPage = safeTotalPages ? Math.min(safePage + 1, safeTotalPages) : safePage + 1;
    const nextPage = Math.max(1, safePage - 1);

    const prevHref = `?historicoPage=${prevPage}&historicoLimit=${limitValue}`;
    const nextHref = `?historicoPage=${nextPage}&historicoLimit=${limitValue}`;
    const prevLink = prevDisabled
      ? '<span id="piolis_prev" style="opacity:0.5; cursor: default;">Anterior</span>'
      : `<a id="piolis_prev" href="${prevHref}">Anterior</a>`;
    const nextLink = nextDisabled
      ? '<span id="piolis_next" style="opacity:0.5; cursor: default;">Siguiente</span>'
      : `<a id="piolis_next" href="${nextHref}">Siguiente</a>`;

    let pageLabel = "Ultimo reporte";
    if (safePage > 1) {
      const horasAtras = safePage - 1;
      pageLabel = `Reporte ${horasAtras} hora${horasAtras === 1 ? "" : "s"} atras`;
    }

    const navHtml = `
 <!-- INICIO_CONTROLES_PAGINACION -->
 <div id="piolis_paginacion" style="position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%); background: rgba(255,255,255,0.95); border: 1px solid #ccc; padding: 8px 12px; border-radius: 6px; z-index:9999; font-family: Consolas, monospace;">
   ${prevLink}
   <span style="margin:0 8px;">${pageLabel}</span>
   ${nextLink}
 </div>
 <!-- FIN_CONTROLES_PAGINACION -->
 `;

    const newData = data.replace(/<\/body>/i, `${navHtml}\n</body>`);
    res.send(newData);
  })
);

router.get(
  "/line-data",
  asyncHandler(async (req, res) => {
    const { historicoLimit, historicoPage } = parseHistoricoParams(req);
    const data = await obtenerLineas({ historicoLimit, historicoPage });
    res.setHeader("Cache-Control", "no-store");
    return res.json(data);
  })
);

router.get("/favicon.ico", (req, res) => {
  res.sendFile(path.join(config.paths.publicDir, "favicon.ico"));
});

router.get("/desa", (req, res) => {
  res.sendFile(path.join(config.paths.publicDir, "desa.html"));
});

router.post(
  "/imagenpt",
  asyncHandler(async (req, res) => {
    const imageData = req.body.image;
    if (!imageData) {
      throw new ValidationError("Falta image en el body");
    }
    const buffer = Buffer.from(imageData, "base64");
    const filePath = path.join(config.paths.reportDir, "graficoPLOTLY.png");

    await fs.promises.writeFile(filePath, buffer);
    res.json({ message: "Imagen guardada exitosamente" });
  })
);

function parseHistoricoParams(req) {
  const historicoLimit = req.query.historicoLimit
    ? parseInt(req.query.historicoLimit, 10)
    : DEFAULT_HISTORICO_LIMIT;
  const historicoPage = req.query.historicoPage ? parseInt(req.query.historicoPage, 10) : 1;

  if (Number.isNaN(historicoLimit) || Number.isNaN(historicoPage)) {
    throw new ValidationError("Parametros invalidos");
  }
  if (historicoLimit < 1 || historicoLimit > MAX_HISTORICO_LIMIT) {
    throw new ValidationError(`historicoLimit debe estar entre 1 y ${MAX_HISTORICO_LIMIT}`);
  }
  if (historicoPage < 1) {
    throw new ValidationError("historicoPage debe ser >= 1");
  }

  return { historicoLimit, historicoPage };
}

module.exports = (parametro) => {
  observador = parametro;
  return router;
};
