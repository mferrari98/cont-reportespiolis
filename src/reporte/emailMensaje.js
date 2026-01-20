const fs = require("fs");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

const config = require("../config/loader");
const { logamarillo } = require("../control/controlLog");

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
      const reportUrl = `http://127.0.0.1:${config.server.port}/reporte.html`;
      await page.goto(reportUrl, { waitUntil: "networkidle0" });
      await page.waitForFunction("window.reportReady === true", { timeout: 20000 });

      await plotBarras(page);
      await plotPieMdy(page);
      await plotLineas(page);

      await emailControl.enviar();
    } finally {
      await browser.close();
    }
  }
}

async function plotBarras(page) {
  const element = await page.$("#grafBarras");
  if (!element) {
    logamarillo(2, `${ID_MOD} - Elemento #grafBarras no encontrado, omitiendo captura`);
    return;
  }

  try {
    const boundingBox = await element.boundingBox();
    if (!boundingBox || boundingBox.height === 0) {
      logamarillo(2, `${ID_MOD} - Elemento #grafBarras sin altura, omitiendo captura`);
      return;
    }
    await element.screenshot({ path: config.paths.reportImages.barras });
  } catch (error) {
    logamarillo(2, `${ID_MOD} - No se pudo capturar #grafBarras: ${error.message}`);
  }
}

async function plotPieMdy(page) {
  const element = await page.$("#grafPieMdy");
  if (!element) {
    logamarillo(2, `${ID_MOD} - Elemento #grafPieMdy no encontrado, omitiendo captura`);
    return;
  }

  try {
    await page.evaluate(() => {
      const container = document.getElementById("grafPieMdy");
      if (!container) {
        return;
      }
      const size = container.offsetHeight || 360;
      container.style.width = `${size}px`;
      container.style.maxWidth = `${size}px`;
      container.style.minWidth = `${size}px`;
      container.style.height = `${size}px`;

      if (window.echarts) {
        const chart = window.echarts.getInstanceByDom(container);
        if (chart) {
          chart.resize();
        }
      }
    });
    await sleep(100);
    const boundingBox = await element.boundingBox();
    if (!boundingBox || boundingBox.height === 0) {
      logamarillo(2, `${ID_MOD} - Elemento #grafPieMdy sin altura, omitiendo captura`);
      return;
    }
    await element.screenshot({ path: config.paths.reportImages.pieMdy });
  } catch (error) {
    logamarillo(2, `${ID_MOD} - No se pudo capturar #grafPieMdy: ${error.message}`);
  }
}

async function plotLineas(page) {
  const element = await page.$("#grafLineas");
  if (!element) {
    return;
  }

  try {
    await element.screenshot({ path: config.paths.reportImages.lineas });
  } catch (error) {
    logamarillo(1, `${ID_MOD} - error capturando serie de tiempo`);
  }
}

module.exports = EmailMensaje;

logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);
