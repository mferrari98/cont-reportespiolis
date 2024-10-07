const { verLog } = require("../../config.json").desarrollo

const fs = require('fs');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const EmailControl = require('./emailControl');

const ID_MOD = "CtrlHTML"

const emailControl = new EmailControl();

function EmailMensaje() { }

EmailMensaje.prototype.extraerTabla = function () {

    const archivoHTML = fs.readFileSync('./web/public/reporte.html', 'utf8');
    const $ = cheerio.load(archivoHTML);

    $('#copiar').remove();

    const headContent = $('head').children().not('script').toString();
    const bodyContent = $('body').children().not('script, #grafBarras, #grafLineas, #grafPie').toString();

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

    fs.writeFileSync('./reporte/salida/tabla.html', newHtml, 'utf8');
}

EmailMensaje.prototype.renderizar = function () {

    (async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(`file://${process.cwd()}/web/public/reporte.html`);
        
        plotBarras(page, () => {
            plotPie(page, () => {
                plotLineas(page, () => {
                    emailControl.enviar()
                    browser.close(); 
                })
            })
        })       
    })()
}

/* ===========================================================
===================== FUNCIONES INTERNAS =====================
==============================================================
*/

async function plotBarras(page, cb) {
    const element = await page.$('#grafBarras');
    await element.screenshot({ path: './reporte/salida/grafBarras.png' });
    cb()
}

async function plotPie(page, cb) {
    const element = await page.$('#grafPie');
    await element.screenshot({ path: './reporte/salida/grafPie.png' });
    cb()
}

async function plotLineas(page, cb) {
    const element = await page.$('#grafLineas');
    await element.screenshot({ path: './reporte/salida/grafLineas.png' });
    cb()
}

module.exports = EmailMensaje;

if (verLog) {
    console.log(`${ID_MOD} - Directorio trabajo:`, process.cwd());
    console.log(`${ID_MOD} - Directorio del archivo:`, __dirname);
}