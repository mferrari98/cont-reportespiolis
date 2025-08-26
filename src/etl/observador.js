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
 * verUltimoCambio ahora acepta options que se pasan a lanzarReporte.
 * options puede contener historicoLimit e historicoPage
 * enviarEmail: boolean, options: { historicoLimit, historicoPage }, cb: callback
 */
function verUltimoCambio(enviarEmail, options, cb) {
  // permitir firma antigua verUltimoCambio(enviarEmail, cb)
  if (typeof options === "function") {
    cb = options;
    options = {};
  }

  lanzarReporte(enviarEmail, currentModifiedTime, options, () => { cb() })
}

function parar() {
  clearInterval(intervalId);
  logamarillo(1, `${ID_MOD} - deteniendo observador`);
}

/* ===========================================================
===================== FUNCIONES INTERNAS =====================
==============================================================
*/

// Funcion para leer y procesar el archivo
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

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    output: process.stdout,
    terminal: false,
  });

  // Escucha cada linea del archivo
  rl.on("line", (line) => {
    lines.push(line);
  });

  rl.on("close", () => {
    logamarillo(2, `${ID_MOD} - se leyeron datos desde wizcon`)
    cb(lines)
  });

  rl.on("error", (error) => {
    logamarillo(2, `${ID_MOD} - error leyendo wizcon: ${error.message}`);
  })
}

function datosCitec(lines, cb) {
  fs.readFile(dir_citec, 'utf8', (error, data) => {

    if (!error) {

      // Dividir el contenido del archivo en lineas
      const lineas = data.trim().split('\r\n');

      let posfila = 0
      let filaMasCercana = null;
      let diferenciaMinima = currentModifiedTime;

      // Iterar desde el final del archivo hacia el principio
      for (let i = lineas.length - 1; i >= lineas.length - 100; i--) {
        const linea = lineas[i];

        // Separar la fecha de valor y convertir a milisegundos
        const fecha = linea.split(' - ')[0].trim()

        let fecha2 = reemplazarMes(fecha, "Ene", "Jan");
        let fecha3 = reemplazarMes(fecha2, "Abr", "Apr");
        let fecha4 = reemplazarMes(fecha3, "Ago", "Aug");
        let fercho = reemplazarMes(fecha4, "Dic", "Dec");

        const fechaMs = new Date(fercho);

        // Calcular la diferencia con la fecha de referencia
        const diferencia = Math.abs(currentModifiedTime - fechaMs);

        // Si la diferencia es menor que la minima encontrada, actualizamos
        if (diferencia < diferenciaMinima) {
          diferenciaMinima = diferencia;
          filaMasCercana = linea;
          posfila = i
        }
      }

      if (filaMasCercana) {
        logamarillo(2, `${ID_MOD} - se leyeron datos desde citec. ${filaMasCercana} fila ${posfila}`)
        lines.push(`Cota45              ${filaMasCercana.split(' - ')[1].replace(',', '.')}`);
      } else
        logamarillo(2, `${ID_MOD} - error leyendo citec: no se encontro fila`);

    } else
      logamarillo(2, `${ID_MOD} - error leyendo citec: ${error.stack}`);

    cb(lines)
  });
}

// Funcion para verificar la fecha de modificacion del archivo
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
      logamarillo(1, `${ID_MOD} - El archivo no ha sido modificado desde la ultima lectura`);
    }
  });
}

function reemplazarMes(fechaStr, mesActual, mesNuevo) {
  let partes = fechaStr.split(" "); // Divide la fecha en partes

  if (partes.length >= 2 && partes[1] === mesActual) {
    partes[1] = mesNuevo; // Reemplaza solo si coincide con mesActual
  }

  return partes.join(" "); // Reconstruye la fecha
}

// Funcion para formatear la fecha
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