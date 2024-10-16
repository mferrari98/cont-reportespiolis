const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const { logamarillo } = require("../control/controlLog")

const EmailControl = require('./emailControl');
const emailControl = new EmailControl();

const ID_MOD = "CTRL-HTML"

function EmailMensaje() { }

EmailMensaje.prototype.extraerTabla = function (cb) {

    const archivoHTML = fs.readFileSync('./src/web/public/reporte.html', 'utf8');
    const $ = cheerio.load(archivoHTML);

    $('#copiar').remove();

    const headContent = $('head').children().not('script').toString();
    const bodyContent = $('body').children().not('script, #grafBarras, #grafLineas, #grafPieMdy, #grafPieTw').toString();

    // armar un nuevo html
    const newHtml = `
    <!DOCTYPE html>
    <html lang="es">
        <head>
            ${headContent}
        </head>

        <body>
            ${bodyContent}
        </body>
    </html>
    `;

    const filePath = './src/reporte/salida/tabla.html';
    const dir = path.dirname(filePath);

    // Crear la carpeta si no existe
    fs.mkdir(dir, { recursive: true }, (err) => {
        // Escribir el archivo
        fs.writeFile(filePath, newHtml, 'utf8', (err) => {
            cb();
        });
    });
}

EmailMensaje.prototype.renderizar = function () {

    (async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(`file:///${process.cwd()}/src/web/public/reporte.html`);

        await plotBarras(page)
        await plotPieMdy(page)
        await plotLineas(page)

        emailControl.enviar()
        browser.close();
    })()
}

/* ===========================================================
===================== FUNCIONES INTERNAS =====================
==============================================================
*/

async function plotBarras(page) {
    const element = await page.$('#grafBarras');
    await element.screenshot({ path: './src/reporte/salida/grafBarras.png' });
}

async function plotPieMdy(page) {
    const element = await page.$('#grafPieMdy');
    await element.screenshot({ path: './src/reporte/salida/grafPieMdy.png' });
}

async function plotLineas(page) {
    const element = await page.$('#grafLineas');
    try {
        await element.screenshot({ path: './src/reporte/salida/grafLineas.png' });
    } catch (e) {
        logamarillo(1, `${ID_MOD} - error escrinyoteando serie de tiempo`);
    }
}

module.exports = EmailMensaje;

logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);