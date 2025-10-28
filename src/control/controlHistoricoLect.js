const http = require('http');
const WebSocket = require('ws');

const { logamarillo } = require("../control/controlLog")

// Desviación para poblar base de datos (valor fijo)
const desviacion = 1;

const TipoVariableDAO = require("../dao/tipoVariableDAO");
const SitioDAO = require("../dao/sitioDAO");
const HistoricoLecturaDAO = require("../dao/historicoLecturaDAO");

const tipoVariableDAO = new TipoVariableDAO();
const sitioDAO = new SitioDAO();
const historicoLecturaDAO = new HistoricoLecturaDAO();

const ID_MOD = "CTRL-HLECT"

const fourHours = 4 * 60 * 60 * 1000; // 4 horas * 60 minutos * 60 segundos * 1000 ms
const cant_reportes = 20
const cant_sitios = 11

const MAX_RANGO = 4.5
const MIN_RANGO = 0.1

// NOTA: La función sincronizar() usa WebSocket pero el endpoint /desa/soquete fue eliminado.
// Esta funcionalidad de sincronización ya no está disponible vía HTTP.
// Si se necesita en el futuro, deberá reimplementarse.
const url_soquete = 'http://10.10.4.125:^puerto^/desa/soquete';  // Endpoint eliminado

function HistLectControl() { }

HistLectControl.prototype.sincronizar = function (puerto, cb) {

    let nuevaUrl = url_soquete.replace("^puerto^", puerto);    

    http.get(nuevaUrl, (res) => {
        let data = '';

        // A medida que se reciben datos
        res.on('data', (chunk) => {
            data += chunk;
        });

        // Al finalizar la respuesta
        res.on('end', () => {
            const respuesta = JSON.parse(data);
            logamarillo(3, `${ID_MOD} - (WS-CLI) Datos recibidos:`, respuesta);

            // Abrir WebSocket con el puerto recibido
            const ws = new WebSocket(`ws://10.10.4.125:${respuesta.puerto}`);

            ws.on('open', () => {
                logamarillo(3, `${ID_MOD} - (WS-CLI) WebSocket abierto en puerto ${respuesta.puerto}`);

                // Enviar comando SQL por WebSocket
                const comandoSQL = "SELECT * FROM log WHERE id > 100"; // Ejemplo de comando SQL
                logamarillo(3, `${ID_MOD} - (WS-CLI) enviando cmd "${comandoSQL}"`);

                ws.send(comandoSQL);
            });

            ws.on('message', (message) => {
                const respuesta = JSON.parse(message)
                logamarillo(3, `${ID_MOD} - (WS-CLI) Resultado del servidor:`, respuesta);
                
                ws.close()
                cb(respuesta)
            });

            ws.on('close', () => {
                logamarillo(3, `${ID_MOD} - (WS-CLI) Conexión WebSocket cerrada`);
            });

            ws.on('error', (err) => {
                logamarillo(3, `${ID_MOD} - (WS-CLI) Error en WebSocket:`, err.message);
            });
        });
    }).on('error', (err) => {
        logamarillo(3, `${ID_MOD} - (WS-CLI) Error en la solicitud:`, err.message);
    });
}

HistLectControl.prototype.poblar = function (cb) {

    let remanente = cant_reportes * cant_sitios
    let acumulado = Array.from({ length: cant_reportes }, () => Array(cant_sitios).fill(undefined));
    let timestamp = Date.now()

    tipoVariableDAO.getByDescriptor("Nivel[m]", (err1, tipoVariable) => {

        for (let i = 0; i < cant_reportes; i++) {      // insertar 20 reportes con datos aleatorios

            // estampa de tiempo en formato ISO
            const estampa = new Date(timestamp - (fourHours * i)).toISOString()

            for (let j = 0; j < cant_sitios; j++) {

                let valor = generarValorAleatorio(desviacion);

                sitioDAO.getByOrden(j, (err2, sitio) => {
                    historicoLecturaDAO.create(
                        sitio.id,
                        tipoVariable.id,
                        valor,
                        estampa,
                        (err, result) => {
                            acumulado[i][j] = result

                            if (--remanente == 0)
                                cb(acumulado)
                        }
                    )
                })
            }
        }
    });
}

HistLectControl.prototype.truncate = function (cb) {
    historicoLecturaDAO.truncate(
        (err, result) => { cb(result) }
    )
}

/* ===========================================================
===================== FUNCIONES INTERNAS =====================
==============================================================
*/

function generarValorAleatorio(desviacion) {

    let media = (MAX_RANGO + MIN_RANGO) / 2;  // Media entre 4.5 y 0.1

    // Genera un valor aleatorio entre -1 y 1
    let aleatorio = Math.random() * 2 - 1;
    let valor = media + desviacion * aleatorio;

    // Asegúrate de que el valor esté dentro del rango [0.1, 4.5]
    valor = Math.max(MIN_RANGO, Math.min(MAX_RANGO, valor));

    // Limita el valor a dos decimales
    return Math.floor(valor * 100) / 100;
}

module.exports = HistLectControl;
