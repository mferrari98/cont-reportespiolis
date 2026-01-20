const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const config = require("../config/loader");
const { logamarillo } = require("../control/controlLog");
const { sindet } = require("./etl");

const ID_MOD = "TRANS";

const { reportTemplate, reportHtml, reportData, echartsSrc, echartsDest } = config.paths;

async function transpilar(reporte, estampatiempo) {
  let data;
  try {
    data = await fs.promises.readFile(reportTemplate, "utf8");
  } catch (err) {
    logamarillo(2, `${ID_MOD} - Error al leer plantilla: ${err.message}`);
    throw err;
  }

  let contenido = expandirPlantilla(reporte, data);
  contenido = sustituirMarcas(reporte, estampatiempo, contenido);

  const reportPayload = buildReportData(reporte);

  await writeReportHtml(contenido);
  await writeReportData(reportPayload);
}

function expandirPlantilla(reporte, data) {
  const $ = cheerio.load(data);
  const tbody = $("tbody");
  const filaPlantilla = tbody.find("tr").first();

  reporte.forEach((_, i) => {
    const fila = filaPlantilla.clone();
    fila.find("td").eq(0).text(`SITIO_${i}`);
    fila.find("td").eq(1).text(`NIVEL_${i}`);
    fila.find("td").eq(2).text(`CLORO_${i}`);
    fila.find("td").eq(3).text(`TURB_${i}`);
    fila.find("td").eq(4).text(`VOLDIA_${i}`);
    tbody.append(fila);
  });

  filaPlantilla.remove();
  return $.html();
}

function sustituirMarcas(reporte, estampatiempo, contenido) {
  contenido = contenido
    .replaceAll("<!-- ESTAMPATIEMPO -->", fechaLegible(estampatiempo))
    .replaceAll("<!-- HEADER_0 -->", reporte[0].variable.nivel.descriptor)
    .replaceAll("<!-- HEADER_1 -->", reporte[0].variable.cloro.descriptor)
    .replaceAll("<!-- HEADER_2 -->", reporte[0].variable.turbiedad.descriptor)
    .replaceAll("<!-- HEADER_3 -->", reporte[0].variable.voldia.descriptor);

  reporte.forEach((item, i) => {
    const nivelValor = item.variable.nivel.valor;
    const cloroValor = item.variable.cloro.valor;

    const nivelAlert =
      (item.sitio === "L.Maria" || item.sitio === "KM11" || item.sitio === "R6000") &&
      nivelValor < 3;
    const cloroAlert = item.sitio === "P.Pot" && cloroValor < 1;

    contenido = contenido
      .replace(`SITIO_${i}`, item.sitio)
      .replace(
        `NIVEL_${i}`,
        nivelValor === undefined
          ? "-"
          : nivelAlert
            ? `\uD83D\uDD34 ${nivelValor}`
            : nivelValor
      )
      .replace(
        `CLORO_${i}`,
        cloroValor === undefined
          ? "-"
          : cloroAlert
            ? `\uD83D\uDD34 ${cloroValor}`
            : cloroValor
      )
      .replace(
        `TURB_${i}`,
        item.variable.turbiedad.valor === undefined ? "-" : item.variable.turbiedad.valor
      )
      .replace(`VOLDIA_${i}`, item.variable.voldia.valor === undefined ? "-" : item.variable.voldia.valor);
  });

  contenido = contenido
    .replaceAll("<!-- SITIOS -->", reporte.map((objeto) => `'${objeto.sitio}'`))
    .replaceAll(
      "<!-- NIVELES -->",
      reporte.map((objeto) =>
        objeto.variable.nivel.valor !== sindet ? objeto.variable.nivel.valor : 0
      )
    )
    .replaceAll(
      "<!-- NIVELESTOTAL -->",
      parseFloat(
        reporte.reduce(
          (total, objeto) =>
            total + (objeto.variable.nivel.valor !== sindet ? objeto.variable.nivel.valor : 0),
          0
        )
      )
    )
    .replaceAll(
      "<!-- COMPLEMENTO -->",
      reporte.map((objeto) =>
        objeto.variable.nivel.valor !== sindet
          ? ((objeto.variable.nivel.maxoperativo || objeto.variable.nivel.rebalse) -
              objeto.variable.nivel.valor).toFixed(3)
          : 0
      )
    )
    .replaceAll(
      "<!-- COMPLEMENTOTOTAL -->",
      reporte
        .reduce(
          (total, objeto) =>
            total +
            (objeto.variable.nivel.valor !== sindet
              ? parseFloat(
                  ((objeto.variable.nivel.maxoperativo || objeto.variable.nivel.rebalse) -
                    objeto.variable.nivel.valor
                  ).toFixed(3)
                )
              : 0),
          0
        )
        .toFixed(3)
    )
    .replaceAll(
      "<!-- MAXOPERATIVO -->",
      reporte.map((objeto) =>
        (objeto.variable.nivel.maxoperativo || objeto.variable.nivel.rebalse).toFixed(3)
      )
    );

  return contenido;
}

async function ensureDir(dirPath) {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
  } catch (err) {
    logamarillo(2, `${ID_MOD} - Error creando directorio: ${err.message}`);
  }
}

async function copyEcharts() {
  if (!fs.existsSync(echartsSrc)) {
    logamarillo(2, `${ID_MOD} - ECharts no encontrado en ${echartsSrc}`);
    return;
  }

  await ensureDir(path.dirname(echartsDest));
  try {
    await fs.promises.copyFile(echartsSrc, echartsDest);
  } catch (err) {
    logamarillo(2, `${ID_MOD} - Error copiando ECharts: ${err.message}`);
  }
}

async function writeReportHtml(contenido) {
  try {
    await fs.promises.writeFile(reportHtml, contenido);
    logamarillo(1, `${ID_MOD} - Archivo escrito correctamente`);
  } catch (err) {
    logamarillo(2, `${ID_MOD} - Error al escribir reporte: ${err.message}`);
    throw err;
  }
}

async function writeReportData(reportPayload) {
  await copyEcharts();
  try {
    await fs.promises.writeFile(reportData, JSON.stringify(reportPayload));
  } catch (err) {
    logamarillo(2, `${ID_MOD} - Error escribiendo datos del reporte: ${err.message}`);
  }
}

function safeNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function buildPieMdyData(reporte) {
  const reporteMadryn = reporte.filter((objeto) => objeto.esMadryn);
  let totalAgua = 0;
  let totalVacio = 0;
  const siteData = [];
  const sitiosConsiderados = reporteMadryn.map((objeto) => objeto.sitio);

  reporteMadryn.forEach((objeto) => {
    const nivel = safeNumber(objeto?.variable?.nivel?.valor) ?? 0;
    const maxOp = safeNumber(objeto?.variable?.nivel?.maxoperativo ?? objeto?.variable?.nivel?.rebalse) ?? 0;
    const cubicaje = safeNumber(objeto?.variable?.nivel?.cubicaje) ?? 0;
    const llenado = nivel * cubicaje;
    const vacio = Math.max(maxOp - nivel, 0) * cubicaje;

    if (llenado > 0) {
      siteData.push({
        name: objeto.sitio,
        value: Number(llenado.toFixed(3))
      });
    }

    totalAgua += llenado;
    totalVacio += vacio;
  });

  return {
    totals: {
      Agua: Number(totalAgua.toFixed(3)),
      Vacio: Number(totalVacio.toFixed(3))
    },
    sites: siteData,
    sitiosConsiderados
  };
}

function buildLineSeries(reporte) {
  const series = [];

  reporte.forEach((objeto) => {
    const historicos = objeto?.variable?.nivel?.historico;
    if (!Array.isArray(historicos) || historicos.length === 0) {
      return;
    }

    const data = historicos
      .map((row) => {
        const x = safeNumber(row.etiempo);
        const y = safeNumber(row.valor);
        if (x === null || y === null) {
          return null;
        }
        return [x, y];
      })
      .filter(Boolean);

    if (data.length) {
      series.push({
        name: objeto.sitio,
        data
      });
    }
  });

  return series;
}

function buildReportData(reporte) {
  const sitios = [];
  const niveles = [];
  const maxOperativos = [];
  const cubicajes = [];

  reporte.forEach((objeto) => {
    sitios.push(objeto.sitio);
    const nivel = safeNumber(objeto?.variable?.nivel?.valor);
    niveles.push(nivel === null ? 0 : nivel);
    const maxOp = safeNumber(objeto?.variable?.nivel?.maxoperativo ?? objeto?.variable?.nivel?.rebalse);
    maxOperativos.push(maxOp === null ? 0 : maxOp);
    const cubicaje = safeNumber(objeto?.variable?.nivel?.cubicaje);
    cubicajes.push(cubicaje === null ? 0 : cubicaje);
  });

  return {
    sitios,
    niveles,
    maxOperativos,
    cubicajes,
    pieMdy: buildPieMdyData(reporte),
    lineSeries: buildLineSeries(reporte),
    pagination: reporte.paginacion || null
  };
}

function fechaLegible(estampatiempo) {
  const { date, time } = getCurrentDateTime(estampatiempo);
  return `${date} ${time}`;
}

function getCurrentDateTime(estampatiempo) {
  const now = new Date(estampatiempo);
  const options = {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires"
  };
  const formatter = new Intl.DateTimeFormat("es-ES", options);
  const parts = formatter.formatToParts(now);
  const partMap = parts.reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  const date = `${partMap.day}-${partMap.month}-${partMap.year}`;
  const time = `${partMap.hour}:${partMap.minute}:${partMap.second}`;
  return { date, time };
}

module.exports = {
  transpilar,
  buildLineSeries
};
