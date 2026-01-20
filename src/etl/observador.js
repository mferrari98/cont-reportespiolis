const fs = require("fs");
const readline = require("readline");

const config = require("../config/loader");
const { logamarillo } = require("../control/controlLog");
const { lanzarETL } = require("./etl");
const { lanzarReporte, notificarFallo } = require("../control/controlReporte");

const ID_MOD = "OBSERV";

const DIR_WIZCON = config.direcciones.sca_wizcon;
const DIR_CITEC = config.direcciones.cota45;
const CHECK_INTERVAL = config.observador.tiempo_milis;
const CANT_LINEAS_CITEC = config.observador.citec_lineas;

let filePath = process.argv[2];
let currentModifiedTime = null;
let lastModifiedTime = null;
let antesHuboError = false;
let intervalId = null;

async function iniciar() {
  if (process.argv.length < 3) {
    logamarillo(1, `${ID_MOD} - No hay direccion en linea de comandos, se utilizara config.json`);
    filePath = DIR_WIZCON;
  }

  if (!filePath) {
    logamarillo(1, `${ID_MOD} - Direccion de archivo no definida`);
    return;
  }

  await checkFileModification();
  if (!intervalId) {
    intervalId = setInterval(checkFileModification, CHECK_INTERVAL);
  }
}

async function verUltimoCambio(enviarEmail, options = {}) {
  await lanzarReporte(enviarEmail, currentModifiedTime, options);
}

function parar() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  logamarillo(1, `${ID_MOD} - deteniendo observador`);
}

async function readAndProcessFile() {
  const lines = await datosWizcon();
  const enriched = await datosCitec(lines);
  await lanzarETL(enriched, currentModifiedTime);
  await verUltimoCambio(true);
}

function datosWizcon() {
  return new Promise((resolve, reject) => {
    const lines = [];
    const stream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: stream,
      output: process.stdout,
      terminal: false
    });

    rl.on("line", (line) => {
      lines.push(line);
    });

    rl.on("close", () => {
      logamarillo(2, `${ID_MOD} - se leyeron datos desde wizcon`);
      resolve(lines);
    });

    rl.on("error", (error) => {
      logamarillo(2, `${ID_MOD} - error leyendo wizcon: ${error.message}`);
      reject(error);
    });

    stream.on("error", (error) => {
      logamarillo(2, `${ID_MOD} - error leyendo wizcon: ${error.message}`);
      reject(error);
    });
  });
}

async function datosCitec(lines) {
  try {
    const data = await fs.promises.readFile(DIR_CITEC, "utf8");
    const lineas = data.trim().split("\r\n");

    let posfila = 0;
    let filaMasCercana = null;
    let diferenciaMinima = currentModifiedTime;

    for (let i = lineas.length - 1; i >= Math.max(0, lineas.length - CANT_LINEAS_CITEC); i -= 1) {
      const linea = lineas[i];
      const fecha = linea.split(" - ")[0].trim();

      const fechaNormalizada = normalizarMes(fecha);
      const fechaMs = new Date(fechaNormalizada);

      const diferencia = Math.abs(currentModifiedTime - fechaMs);
      if (diferencia < diferenciaMinima) {
        diferenciaMinima = diferencia;
        filaMasCercana = linea;
        posfila = i;
      }
    }

    if (filaMasCercana) {
      logamarillo(
        2,
        `${ID_MOD} - se leyeron datos desde citec. ${filaMasCercana} fila ${posfila}`
      );
      lines.push(`Cota45              ${filaMasCercana.split(" - ")[1].replace(",", ".")}`);
    } else {
      logamarillo(2, `${ID_MOD} - error leyendo citec: no se encontro fila`);
    }
  } catch (error) {
    logamarillo(2, `${ID_MOD} - error leyendo citec: ${error.message}`);
  }

  return lines;
}

async function checkFileModification() {
  try {
    const stats = await fs.promises.stat(filePath);
    currentModifiedTime = stats.mtime;
  } catch (err) {
    currentModifiedTime = new Date();
    if (!antesHuboError) {
      antesHuboError = true;
      const fechaActual = formatoFecha(currentModifiedTime);
      const fechaAnterior = formatoFecha(lastModifiedTime);
      logamarillo(2, `${ID_MOD} - FALLO: Actual ${fechaActual} ==> Anterior ${fechaAnterior}`);
      try {
        await notificarFallo(err.message, currentModifiedTime);
      } catch (notifyErr) {
        logamarillo(2, `${ID_MOD} - error registrando fallo: ${notifyErr.message}`);
      }
      return;
    }
  }

  antesHuboError = false;
  const fechaActual = formatoFecha(currentModifiedTime);
  const fechaAnterior = formatoFecha(lastModifiedTime);

  if (!lastModifiedTime || currentModifiedTime > lastModifiedTime) {
    lastModifiedTime = currentModifiedTime;
    logamarillo(2, `${ID_MOD} - EXITO: Actual ${fechaActual} ==> Anterior ${fechaAnterior}`);
    try {
      await readAndProcessFile();
    } catch (err) {
      logamarillo(2, `${ID_MOD} - error procesando archivo: ${err.message}`);
    }
  } else {
    logamarillo(1, `${ID_MOD} - El archivo no ha sido modificado desde la ultima lectura`);
  }
}

function normalizarMes(fechaStr) {
  const reemplazos = {
    Ene: "Jan",
    Abr: "Apr",
    Ago: "Aug",
    Dic: "Dec"
  };

  const partes = fechaStr.split(" ");
  if (partes.length >= 2 && reemplazos[partes[1]]) {
    partes[1] = reemplazos[partes[1]];
  }
  return partes.join(" ");
}

function formatoFecha(fechaOriginal) {
  const fecha = new Date(fechaOriginal);
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  const hours = String(fecha.getHours()).padStart(2, "0");
  const minutes = String(fecha.getMinutes()).padStart(2, "0");
  const seconds = String(fecha.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

module.exports = { iniciar, verUltimoCambio, parar };

logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);
