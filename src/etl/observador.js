const fs = require("fs");
const os = require("node:os");
const path = require("node:path");
const readline = require("readline");

const config = require("../config/loader");
const IngestaControlDAO = require("../dao/ingestaControlDAO");
const { logamarillo } = require("../control/controlLog");
const { lanzarETL } = require("./etl");
const { lanzarReporte, notificarFallo } = require("../control/controlReporte");
const { downloadWithRetries } = require("./smbFetch");
const { buildLoteHashes } = require("./loteHash");
const { msUntilNextTopOfHour, buildRetryDelaysMs } = require("./schedulerHora");

const ID_MOD = "OBSERV";

class Observador {
  constructor(options = {}) {
    const observadorCfg = config.observador || {};
    const ingestaCfg = config.ingesta || {};
    const smbCfg = options.smb || ingestaCfg.smb || {};

    this.dirWizcon = options.dirWizcon || config.direcciones.sca_wizcon || "";
    this.dirCitec = options.dirCitec || config.direcciones.cota45 || "";
    this.cantLineasCitec = options.cantLineasCitec || observadorCfg.citec_lineas || 100;
    this.currentModifiedTime = null;
    this.timeoutId = null;
    this.isChecking = false;

    const cfgRetryDelaysMs = Array.isArray(ingestaCfg.retryDelaysMs)
      ? ingestaCfg.retryDelaysMs
      : Array.isArray(ingestaCfg.retryDelaysSeconds)
        ? buildRetryDelaysMs(ingestaCfg.retryDelaysSeconds, ingestaCfg.firstAttemptDelaySeconds)
        : [0, 5000, 10000, 20000, 40000];

    this.retryDelaysMs = Array.isArray(options.retryDelaysMs) ? options.retryDelaysMs : cfgRetryDelaysMs;
    this.schedulerEnabled =
      typeof options.schedulerEnabled === "boolean"
        ? options.schedulerEnabled
        : typeof ingestaCfg.schedulerEnabled === "boolean"
          ? ingestaCfg.schedulerEnabled
          : true;

    this.tempDir = options.tempDir || ingestaCfg.tempDir || path.join(os.tmpdir(), "reportespiolis-ingesta");

    this.smb = {
      wizcon: {
        url: smbCfg?.wizcon?.url || this.dirWizcon,
      },
      citec: {
        url: smbCfg?.citec?.url || this.dirCitec,
      },
      username: smbCfg.username || process.env.SMB_USER || "",
      password: smbCfg.password || process.env.SMB_PASS || "",
    };

    const deps = options.deps || {};
    this.fsPromises = deps.fsPromises || fs.promises;
    this.path = deps.path || path;
    this.downloadWithRetries = deps.downloadWithRetries || downloadWithRetries;
    this.buildLoteHashes = deps.buildLoteHashes || buildLoteHashes;
    this.ingestaControlDAO = deps.ingestaControlDAO || new IngestaControlDAO();
    this.lanzarETL = deps.lanzarETL || lanzarETL;
    this.lanzarReporte = deps.lanzarReporte || lanzarReporte;
    this.notificarFallo = deps.notificarFallo || notificarFallo;
    this.logamarillo = deps.logamarillo || logamarillo;
    this.msUntilNextTopOfHour = deps.msUntilNextTopOfHour || msUntilNextTopOfHour;
    this.setTimeoutFn = deps.setTimeout || setTimeout;
    this.clearTimeoutFn = deps.clearTimeout || clearTimeout;
  }

  async iniciar() {
    await this.runIngestionCycle("startup");
    if (this.schedulerEnabled) {
      this.programarSiguienteCiclo();
    }
  }

  async verUltimoCambio(enviarEmail, options = {}) {
    await this.lanzarReporte(enviarEmail, this.currentModifiedTime, options);
  }

  parar() {
    if (this.timeoutId) {
      this.clearTimeoutFn(this.timeoutId);
      this.timeoutId = null;
    }
    this.logamarillo(1, `${ID_MOD} - deteniendo observador`);
  }

  programarSiguienteCiclo() {
    if (!this.schedulerEnabled) {
      return;
    }

    const delayMs = this.msUntilNextTopOfHour(new Date());
    this.timeoutId = this.setTimeoutFn(async () => {
      this.timeoutId = null;
      await this.runIngestionCycle("hourly");
      this.programarSiguienteCiclo();
    }, delayMs);

    this.logamarillo(1, `${ID_MOD} - proximo ciclo en ${delayMs} ms`);
  }

  async runIngestionCycle(reason = "manual") {
    if (this.isChecking) {
      this.logamarillo(1, `${ID_MOD} - chequeo en curso, se omite ciclo superpuesto`);
      return;
    }

    this.isChecking = true;
    let runDir = null;

    try {
      await this.fsPromises.mkdir(this.tempDir, { recursive: true });
      runDir = await this.fsPromises.mkdtemp(this.path.join(this.tempDir, "run-"));

      const wizconPath = this.path.join(runDir, "wizcon.dat");
      const citecPath = this.path.join(runDir, "citec.txt");

      await this.downloadWithRetries({
        name: "wizcon",
        url: this.smb.wizcon.url,
        outputPath: wizconPath,
        username: this.smb.username,
        password: this.smb.password,
        retryDelaysMs: this.retryDelaysMs,
        logFn: (message) => this.logamarillo(1, `${ID_MOD} - ${message}`),
      });

      await this.downloadWithRetries({
        name: "citec",
        url: this.smb.citec.url,
        outputPath: citecPath,
        username: this.smb.username,
        password: this.smb.password,
        retryDelaysMs: this.retryDelaysMs,
        logFn: (message) => this.logamarillo(1, `${ID_MOD} - ${message}`),
      });

      const hashes = await this.buildLoteHashes(wizconPath, citecPath);
      const isDuplicate = await this.ingestaControlDAO.existsByLoteHash(hashes.loteHash);

      if (isDuplicate) {
        this.logamarillo(1, `${ID_MOD} - lote duplicado, se omite ETL (${reason})`);
        return;
      }

      this.currentModifiedTime = new Date();

      await this.ingestaControlDAO.createIfNotExists({
        fuenteWizconHash: hashes.wizconHash,
        fuenteCitecHash: hashes.citecHash,
        loteHash: hashes.loteHash,
        etiempoOrigen: this.currentModifiedTime.getTime(),
      });

      const lines = await this.datosWizcon(wizconPath);
      const enriched = await this.datosCitec(lines, citecPath);
      await this.lanzarETL(enriched, this.currentModifiedTime);
      await this.verUltimoCambio(true);
    } catch (err) {
      this.logamarillo(2, `${ID_MOD} - error en ciclo ${reason}: ${err.message}`);
      try {
        await this.notificarFallo(err.message, new Date());
      } catch (notifyErr) {
        this.logamarillo(2, `${ID_MOD} - error registrando fallo: ${notifyErr.message}`);
      }
    } finally {
      if (runDir) {
        try {
          await this.fsPromises.rm(runDir, { recursive: true, force: true });
        } catch (cleanupErr) {
          this.logamarillo(2, `${ID_MOD} - error limpiando temporal: ${cleanupErr.message}`);
        }
      }
      this.isChecking = false;
    }
  }

  datosWizcon(filePath) {
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
        this.logamarillo(2, `${ID_MOD} - se leyeron datos desde wizcon`);
        resolve(lines);
      });

      rl.on("error", (error) => {
        this.logamarillo(2, `${ID_MOD} - error leyendo wizcon: ${error.message}`);
        reject(error);
      });

      stream.on("error", (error) => {
        this.logamarillo(2, `${ID_MOD} - error leyendo wizcon: ${error.message}`);
        reject(error);
      });
    });
  }

  async datosCitec(lines, citecPath) {
    try {
      const data = await this.fsPromises.readFile(citecPath, "utf8");
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
        this.logamarillo(
          2,
          `${ID_MOD} - se leyeron datos desde citec. ${filaMasCercana} fila ${posfila}`
        );
        // Agregamos la lectura de Cota45 desde Citec al lote principal de Wizcon.
        lines.push(`Cota45              ${String(valorFilaMasCercana).replace(",", ".")}`);
      } else {
        this.logamarillo(2, `${ID_MOD} - error leyendo citec: no se encontro fila`);
      }
    } catch (error) {
      this.logamarillo(2, `${ID_MOD} - error leyendo citec: ${error.message}`);
    }

    return lines;
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

module.exports = { Observador };

logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);
