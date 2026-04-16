const fs = require("fs");
const cheerio = require("cheerio");

const config = require("../config/loader");
const { logamarillo } = require("../control/controlLog");
const { generarGraficos } = require("./graficos");

const EmailControl = require("./emailControl");
const emailControl = new EmailControl();

const ID_MOD = "CTRL-HTML";

function stripStyleProp(styleValue, propName) {
  if (!styleValue) {
    return "";
  }

  const regex = new RegExp(`${propName}\\s*:[^;]+;?`, "gi");
  return styleValue.replace(regex, "").trim();
}

class EmailMensaje {
  async extraerTabla() {
    const archivoHTML = await fs.promises.readFile(config.paths.reportHtml, "utf8");
    const $ = cheerio.load(archivoHTML);

    $("#copiar, #barrasup, #TituloVolumenes, #grafBarras, #grafPieMdy, #grafPieTw, #pieMdySitios, #lineasControles, #grafLineas").remove();

    const title = $("h1").first();
    const updated = $("div")
      .filter((_, el) => {
        return $(el).text().toLowerCase().includes("actualización");
      })
      .first();
    const table = $("table").first();

    if (title.length) {
      const current = title.attr("style") || "";
      title.attr("style", `${stripStyleProp(current, "margin")}; margin: 10px 0 4px;`);
    }

    if (updated.length) {
      const current = updated.attr("style") || "";
      updated.attr("style", `${stripStyleProp(current, "margin")}; margin: 4px 0 8px;`);
    }

    if (table.length) {
      const current = table.attr("style") || "";
      table.attr("style", `${stripStyleProp(current, "margin")}; margin: 8px auto 6px;`);
    }

    const bodyContent = `${title.toString()}${updated.toString()}${table.toString()}`;
    const newHtml = `<div style="margin: 0; padding: 0;">${bodyContent}</div>`;

    await fs.promises.mkdir(config.paths.reportDir, { recursive: true });
    await fs.promises.writeFile(config.paths.reportTable, newHtml, "utf8");
  }

  async renderizar() {
    try {
      const reportDataPath = config.paths.reportData;
      const rawData = await fs.promises.readFile(reportDataPath, "utf8");
      const reporteData = JSON.parse(rawData);

      logamarillo(2, `${ID_MOD} - Generando graficos server-side`);
      const chartResults = await generarGraficos(reporteData);

      await emailControl.enviar(chartResults);
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error generando graficos: ${err.message}`);
      throw err;
    }
  }
}

module.exports = EmailMensaje;

logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);
