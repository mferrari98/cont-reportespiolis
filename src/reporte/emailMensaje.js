const { verLog } = require("../../config.json").desarrollo

const fs = require('fs');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const EmailControl = require('./emailControl');

const ID_MOD = "CtrlHTML"

const emailControl = new EmailControl();

function EmailMensaje() { }

EmailMensaje.prototype.extraerTabla = function() {

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
    plotBarras(() => {
        plotLineas(() => {
            plotPie(() => {
                emailControl.enviar()
            })
            
        })
    })
}

/* ===========================================================
===================== FUNCIONES INTERNAS =====================
==============================================================
*/

async function plotBarras(cb) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`file://${process.cwd()}/web/public/reporte.html`);
   
    // Captura la imagen del div con id "myDiv"
    const element = await page.$('#grafBarras');
    await element.screenshot({ path: './reporte/salida/grafBarras.png' });

    await browser.close();
    cb()
}

async function plotPie(cb) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`file://${process.cwd()}/web/public/reporte.html`);
   
    // Captura la imagen del div con id "myDiv"
    const element = await page.$('#grafPie');
    await element.screenshot({ path: './reporte/salida/grafPie.png' });

    await browser.close();
    cb()
}

async function plotLineas(cb) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`file://${process.cwd()}/web/public/reporte.html`);
   
    // Captura la imagen del div con id "myDiv"
    const element = await page.$('#grafLineas');
    await element.screenshot({ path: './reporte/salida/grafLineas.png' });

    await browser.close();
    cb()
}

module.exports = EmailMensaje;

if (verLog) {
    console.log(`${ID_MOD} - Directorio trabajo:`, process.cwd());
    console.log(`${ID_MOD} - Directorio del archivo:`, __dirname);
}