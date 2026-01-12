const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const { logamarillo } = require("../control/controlLog")

const EmailControl = require('./emailControl');
const emailControl = new EmailControl();

const ID_MOD = "CTRL-HTML"

function stripStyleProp(styleValue, propName) {
    if (!styleValue) {
        return '';
    }

    const regex = new RegExp(`${propName}\\s*:[^;]+;?`, 'gi');
    return styleValue.replace(regex, '').trim();
}

function EmailMensaje() { }

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

EmailMensaje.prototype.extraerTabla = function (cb) {

    const archivoHTML = fs.readFileSync('./src/web/public/reporte.html', 'utf8');
    const $ = cheerio.load(archivoHTML);

    $('#copiar, #barrasup, #TituloVolumenes, #grafBarras, #grafPieMdy, #grafPieTw, #pieMdySitios, #lineasControles, #grafLineas').remove();

    const title = $('h1').first();
    const updated = $('div').filter((_, el) => {
        return $(el).text().toLowerCase().includes('actualización');
    }).first();
    const table = $('table').first();

    if (title.length) {
        const current = title.attr('style') || '';
        title.attr('style', `${stripStyleProp(current, 'margin')}; margin: 10px 0 4px;`);
    }

    if (updated.length) {
        const current = updated.attr('style') || '';
        updated.attr('style', `${stripStyleProp(current, 'margin')}; margin: 4px 0 8px;`);
    }

    if (table.length) {
        const current = table.attr('style') || '';
        table.attr('style', `${stripStyleProp(current, 'margin')}; margin: 8px auto 6px;`);
    }

    const bodyContent = `${title.toString()}${updated.toString()}${table.toString()}`;

    const newHtml = `<div style="margin: 0; padding: 0;">${bodyContent}</div>`;

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
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
        await page.goto('http://127.0.0.1:3000/reporte.html', { waitUntil: 'networkidle0' });
        await page.waitForFunction('window.reportReady === true', { timeout: 20000 });

        await plotBarras(page)
        await plotPieMdy(page)
        //await plotPieTw(page)
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
    if (!element) {
        console.log('Aviso: Elemento #grafBarras no encontrado, omitiendo captura');
        return;
    }

    try {
        const boundingBox = await element.boundingBox();
        if (!boundingBox || boundingBox.height === 0) {
            console.log('Aviso: Elemento #grafBarras tiene altura 0, omitiendo captura');
            return;
        }
        await element.screenshot({ path: './src/web/public/grafBarras.png' });
    } catch (error) {
        console.log('Aviso: No se pudo capturar #grafBarras:', error.message);
    }
}

async function plotPieMdy(page) {
    const element = await page.$('#grafPieMdy');
    if (!element) {
        console.log('Aviso: Elemento #grafPieMdy no encontrado, omitiendo captura');
        return;
    }

    try {
        await page.evaluate(() => {
            const container = document.getElementById('grafPieMdy');
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
            console.log('Aviso: Elemento #grafPieMdy tiene altura 0, omitiendo captura');
            return;
        }
        await element.screenshot({ path: './src/web/public/grafPieMdy.png' });
    } catch (error) {
        console.log('Aviso: No se pudo capturar #grafPieMdy:', error.message);
    }
}

async function plotPieTw(page) {
    const element = await page.$('#grafPieTw');
    if (!element) {
        console.log('Aviso: Elemento #grafPieTw no encontrado, omitiendo captura');
        return;
    }

    try {
        await page.evaluate(() => {
            const container = document.getElementById('grafPieTw');
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
            console.log('Aviso: Elemento #grafPieTw tiene altura 0, omitiendo captura');
            return;
        }
        await element.screenshot({ path: './src/web/public/grafPieTw.png' });
    } catch (error) {
        console.log('Aviso: No se pudo capturar #grafPieTw:', error.message);
    }
}

async function plotLineas(page) {
    const element = await page.$('#grafLineas');
    if (!element) {
        return;
    }

    try {
        await element.screenshot({ path: './src/web/public/grafLineas.png' });
    } catch (e) {
        logamarillo(1, `${ID_MOD} - error escrinyoteando serie de tiempo`);
    }
}

module.exports = EmailMensaje;

logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);
