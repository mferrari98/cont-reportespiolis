const fs = require("fs");
const readline = require("readline");

const config = require("../config/loader");
const { logamarillo } = require("../control/controlLog");
const { lanzarETL } = require("./etl");
const { lanzarReporte, notificarFallo } = require("../control/controlReporte");

const ID_MOD = "OBSERV";

class Observador {
  constructor(options = {}) {
    this.dirWizcon = options.dirWizcon || config.direcciones.sca_wizcon;
    this.dirCitec = options.dirCitec || config.direcciones.cota45;
    this.checkInterval = options.checkInterval || config.observador.tiempo_milis;
    this.cantLineasCitec = options.cantLineasCitec || config.observador.citec_lineas;
    // Precedencia: option > argv[2] (modo manual) > config.json.
    this.filePath = options.filePath || process.argv[2] || null;
    this.currentModifiedTime = null;
    this.lastModifiedTime = null;
    this.antesHuboError = false;
    this.intervalId = null;
    this.isChecking = false;
    // Bind para reutilizar la misma función en setInterval.
    this._tick = this.checkFileModification.bind(this);
  }

  async iniciar() {
    if (!this.filePath) {
      logamarillo(1, `${ID_MOD} - No hay direccion en linea de comandos, se utilizara config.json`);
      this.filePath = this.dirWizcon;
    }

    if (!this.filePath) {
      logamarillo(1, `${ID_MOD} - Direccion de archivo no definida`);
      return;
    }

    await this.checkFileModification();
    if (!this.intervalId) {
      this.intervalId = setInterval(this._tick, this.checkInterval);
    }
  }

  async verUltimoCambio(enviarEmail, options = {}) {
    await lanzarReporte(enviarEmail, this.currentModifiedTime, options);
  }

  parar() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logamarillo(1, `${ID_MOD} - deteniendo observador`);
  }

  async readAndProcessFile() {
    const lines = await this.datosWizcon();
    const enriched = await this.datosCitec(lines);
    await lanzarETL(enriched, this.currentModifiedTime);
    await this.verUltimoCambio(true);
  }

  datosWizcon() {
    return new Promise((resolve, reject) => {
      const lines = [];
      const stream = fs.createReadStream(this.filePath);
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

  async datosCitec(lines) {
    try {
      const data = await fs.promises.readFile(this.dirCitec, "utf8");
      const lineas = data.split(/\r?\n/).map((linea) => linea.trim()).filter(Boolean);

      const currentMs = new Date(this.currentModifiedTime).getTime();
      if (!Number.isFinite(currentMs)) {
        return lines;
      }

      let posfila = 0;
      let filaMasCercana = null;
      let valorFilaMasCercana = null;
      let diferenciaMinima = Number.POSITIVE_INFINITY;

      // Solo se inspeccionan las últimas N líneas para evitar leer el archivo completo.
      for (let i = lineas.length - 1; i >= Math.max(0, lineas.length - this.cantLineasCitec); i -= 1) {
        const linea = lineas[i];
        const parsedLine = parseCitecLinea(linea);
        if (!parsedLine) {
          continue;
        }

        const fechaMs = parseCitecDate(parsedLine.fecha);
        if (fechaMs === null) {
          continue;
        }

        const diferencia = Math.abs(currentMs - fechaMs);
        if (diferencia < diferenciaMinima) {
          diferenciaMinima = diferencia;
          filaMasCercana = linea;
          valorFilaMasCercana = parsedLine.valor;
          posfila = i;
        }
      }

      if (filaMasCercana) {
        logamarillo(
          2,
          `${ID_MOD} - se leyeron datos desde citec. ${filaMasCercana} fila ${posfila}`
        );
        // Agregamos la lectura de Cota45 desde Citec al lote principal de Wizcon.
        lines.push(`Cota45              ${String(valorFilaMasCercana).replace(",", ".")}`);
      } else {
        logamarillo(2, `${ID_MOD} - error leyendo citec: no se encontro fila`);
      }
    } catch (error) {
      logamarillo(2, `${ID_MOD} - error leyendo citec: ${error.message}`);
    }

    return lines;
  }

  async checkFileModification() {
    if (this.isChecking) {
      logamarillo(1, `${ID_MOD} - chequeo en curso, se omite ciclo superpuesto`);
      return;
    }

    this.isChecking = true;
    try {
      try {
        const stats = await fs.promises.stat(this.filePath);
        this.currentModifiedTime = stats.mtime;
      } catch (err) {
        this.currentModifiedTime = new Date();
        // Evita notificar repetidamente el mismo fallo si el archivo sigue inaccesible.
        if (!this.antesHuboError) {
          this.antesHuboError = true;
          const fechaActual = formatoFecha(this.currentModifiedTime);
          const fechaAnterior = formatoFecha(this.lastModifiedTime);
          logamarillo(2, `${ID_MOD} - FALLO: Actual ${fechaActual} ==> Anterior ${fechaAnterior}`);
          try {
            await notificarFallo(err.message, this.currentModifiedTime);
          } catch (notifyErr) {
            logamarillo(2, `${ID_MOD} - error registrando fallo: ${notifyErr.message}`);
          }
          return;
        }
      }

      this.antesHuboError = false;
      const fechaActual = formatoFecha(this.currentModifiedTime);
      const fechaAnterior = formatoFecha(this.lastModifiedTime);

      if (!this.lastModifiedTime || this.currentModifiedTime > this.lastModifiedTime) {
        this.lastModifiedTime = this.currentModifiedTime;
        logamarillo(2, `${ID_MOD} - EXITO: Actual ${fechaActual} ==> Anterior ${fechaAnterior}`);
        try {
          await this.readAndProcessFile();
        } catch (err) {
          logamarillo(2, `${ID_MOD} - error procesando archivo: ${err.message}`);
        }
      } else {
        logamarillo(1, `${ID_MOD} - El archivo no ha sido modificado desde la ultima lectura`);
      }
    } finally {
      this.isChecking = false;
    }
  }
}

function parseCitecLinea(linea) {
  const separatorIndex = linea.lastIndexOf(" - ");
  if (separatorIndex === -1) {
    return null;
  }

  const fecha = linea.slice(0, separatorIndex).trim();
  const valor = linea.slice(separatorIndex + 3).trim();
  if (!fecha || !valor) {
    return null;
  }

  return { fecha, valor };
}

function parseCitecDate(fechaStr) {
  const fechaNormalizada = normalizarMes(fechaStr.replace(/\./g, ""));
  const parsed = Date.parse(fechaNormalizada);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizarMes(fechaStr) {
  const reemplazos = {
    Ene: "Jan",
    Feb: "Feb",
    Mar: "Mar",
    Abr: "Apr",
    May: "May",
    Jun: "Jun",
    Jul: "Jul",
    Ago: "Aug",
    Sep: "Sep",
    Oct: "Oct",
    Nov: "Nov",
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

module.exports = { Observador };

logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);
