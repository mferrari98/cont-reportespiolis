const fs = require("fs");
const readline = require("readline");

const config = require("../../config.json")
const { logamarillo } = require("../control/controlLog")
const { lanzarETL } = require("./etl");
const { lanzarReporte, notificarFallo } = require("../control/controlReporte")

const ID_MOD = "OBSERV";

const dir_wizcon = config.direcciones.sca_wizcon
const dir_citec = config.direcciones.cota45

let filePath = process.argv[2];
let currentModifiedTime;
let lastModifiedTime = null;
const checkInterval = config.observador.tiempo_milis

let antes_hubo_error = false

function iniciar() {
  // Verifica que se haya proporcionado el archivo como argumento
  if (process.argv.length < 3) {
    logamarillo(1, `${ID_MOD} - No hay direccion en linea de comandos, se utilizara definicion de config.json`);

    filePath = dir_wizcon
    checkFileModification();
  }
}

/**
 * 
 * @param {*} enviarEmail 
 * @param {*} cb 
 */
function verUltimoCambio(enviarEmail, cb) {
  lanzarReporte(enviarEmail, currentModifiedTime, () => { cb() })
}

function parar() {
  clearInterval(intervalId);
  logamarillo(1, `${ID_MOD} - deteniendo observador`);
}

/* ===========================================================
===================== FUNCIONES INTERNAS =====================
==============================================================
*/

// Función para leer y procesar el archivo
function readAndProcessFile() {

  let lines = [];

  datosWizcon(lines, (lin_wiz) => {
    datosCitec(lin_wiz, (lin_wiztec) => {

      lanzarETL(lin_wiztec, currentModifiedTime, () => {
        verUltimoCambio(true, () => { })
      })
    })
  })
}

function datosWizcon(lines, cb) {

  try {
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      output: process.stdout,
      terminal: false,
    });

    // Escucha cada línea del archivo
    rl.on("line", (line) => {
      lines.push(line);
    });

    rl.on("close", () => {
      logamarillo(2, `${ID_MOD} - se leyeron datos desde wizcon`)
      cb(lines)
    });

  } catch (error) {
    logamarillo(2, `${ID_MOD} - Error al leer el archivo: ${error.message}`);
  }
}

function datosCitec(lines, cb) {
  fs.readFile(dir_citec, 'utf8', (err, data) => {

    // Dividir el contenido del archivo en líneas
    const lineas = data.trim().split('\n');

    let posfila = 0
    let filaMasCercana = null;
    let diferenciaMinima = currentModifiedTime;

    // Iterar desde el final del archivo hacia el principio
    for (let i = lineas.length - 1; i >= 0; i--) {
      const linea = lineas[i];

      // Separar la fecha de valor y convertir a milisegundos
      const fecha = linea.split(' - ')[0].trim()
      const fechaMs = new Date(fecha).getTime();

      // Calcular la diferencia con la fecha de referencia
      const diferencia = Math.abs(currentModifiedTime - fechaMs);

      // Si la diferencia es menor que la mínima encontrada, actualizamos
      if (diferencia < diferenciaMinima) {
        diferenciaMinima = diferencia;
        filaMasCercana = linea;
        posfila = i
      }
    }

    // Llamar al callback con la fila más cercana encontrada
    if (filaMasCercana) {
      logamarillo(2, `${ID_MOD} - se leyeron datos desde citec. %s fila %s`, filaMasCercana, posfila)
      lines.push(`Cota45              ${filaMasCercana.split(' - ')[1].replace(',', '.')}`);
      cb(lines)
    }
  });
}

// Función para verificar la fecha de modificación del archivo
function checkFileModification() {
  fs.stat(filePath, (err, stats) => {

    if (err)
      currentModifiedTime = new Date();
    else
      currentModifiedTime = stats.mtime;

    const fechaActual = formatoFecha(currentModifiedTime);
    const fechaAnterior = formatoFecha(lastModifiedTime);

    if (err && !antes_hubo_error) {
      antes_hubo_error = true
      logamarillo(2, `${ID_MOD} - FALLO: Actual ${fechaActual} ==> Anterior ${fechaAnterior}`);
      notificarFallo(err.message, currentModifiedTime, () => { })
      return;
    }

    antes_hubo_error = false

    if (!lastModifiedTime || currentModifiedTime > lastModifiedTime) {

      lastModifiedTime = currentModifiedTime;
      logamarillo(2, `${ID_MOD} - EXITO: Actual ${fechaActual} ==> Anterior ${fechaAnterior}`);

      readAndProcessFile();
    } else {
      logamarillo(1, `${ID_MOD} - El archivo no ha sido modificado desde la última lectura`);
    }
  });
}

// Función para formatear la fecha
function formatoFecha(fechaOriginal) {
  const fecha = new Date(fechaOriginal);

  // Obtiene los componentes de la fecha
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  const hours = String(fecha.getHours()).padStart(2, "0");
  const minutes = String(fecha.getMinutes()).padStart(2, "0");
  const seconds = String(fecha.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

const intervalId = setInterval(checkFileModification, checkInterval);

module.exports = { iniciar, verUltimoCambio, parar };

logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);
