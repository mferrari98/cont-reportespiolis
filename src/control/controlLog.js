const fs = require("fs");
const path = require("path");
const util = require("util");

const config = require("../config/loader");

const ID_MOD = "LOG";

let ultimoMensaje = null;
let ultimoNivel = null;
let conteoRepeticiones = 0;

const legacyLevelMap = {
  1: "error",
  2: "info",
  3: "debug"
};

const levelRank = {
  error: 1,
  warn: 2,
  info: 3,
  debug: 4
};

const legacyRank = {
  error: 1,
  warn: 2,
  info: 2,
  debug: 3
};

function normalizeLevel(level) {
  if (typeof level === "number" && Number.isFinite(level)) {
    return level;
  }
  if (typeof level === "string") {
    const lowered = level.toLowerCase();
    if (levelRank[lowered]) {
      return levelRank[lowered];
    }
    const numeric = Number(level);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return levelRank.info;
}

function shouldLog(level) {
  const configLevel = config.logging.level;
  const legacyThreshold = Number(configLevel);
  if (Number.isFinite(legacyThreshold)) {
    const legacyLevel = normalizeLegacy(level);
    return legacyLevel >= legacyThreshold;
  }

  const threshold = normalizeLevel(configLevel);
  return normalizeLevel(level) <= threshold;
}

function normalizeLegacy(level) {
  if (typeof level === "number" && Number.isFinite(level)) {
    return level;
  }
  if (typeof level === "string") {
    const lowered = level.toLowerCase();
    if (legacyRank[lowered]) {
      return legacyRank[lowered];
    }
    const numeric = Number(level);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return legacyRank.info;
}

function formatTimestamp() {
  const now = new Date();
  const gmt3 = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return gmt3.toISOString();
}

function ensureDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (err) {
    process.stderr.write(`[LOG] Error creando directorio ${dirPath}: ${err.message}\n`);
  }
}

function rotateIfNeeded(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const { size } = fs.statSync(filePath);
      if (size < config.logging.maxBytes) {
        return;
      }
    }

    const rotated = `${filePath}.1`;
    if (fs.existsSync(rotated)) {
      fs.unlinkSync(rotated);
    }
    if (fs.existsSync(filePath)) {
      fs.renameSync(filePath, rotated);
    }
  } catch (err) {
    process.stderr.write(`[LOG] Error rotando ${filePath}: ${err.message}\n`);
  }
}

function appendLog(line) {
  const filePath = config.logging.file;
  if (!filePath) {
    return;
  }
  ensureDir(path.dirname(filePath));
  rotateIfNeeded(filePath);
  fs.appendFile(filePath, `${line}\n`, (err) => {
    if (err) {
      process.stderr.write(`[LOG] Error escribiendo ${filePath}: ${err.message}\n`);
    }
  });
}

function writeLine(message) {
  const line = `${formatTimestamp()} [-] ${message}`;
  process.stdout.write(`${line}\n`);
  appendLog(line);
}

function logamarillo(nivel, ...contenido) {
  const message = util.format(...contenido);
  const level = legacyLevelMap[nivel] || "info";

  if (message === ultimoMensaje) {
    conteoRepeticiones += 1;
    return;
  }

  if (conteoRepeticiones > 0 && ultimoMensaje !== null) {
    const resumen = `${ultimoMensaje} (se omitieron ${conteoRepeticiones - 1} repeticiones)`;
    const resumenNivel = legacyLevelMap[ultimoNivel] || level;
    if (shouldLog(resumenNivel)) {
      writeLine(resumen);
    }
  }

  if (shouldLog(level)) {
    writeLine(message);
  }

  ultimoMensaje = message;
  ultimoNivel = nivel;
  conteoRepeticiones = 0;
}

module.exports = { logamarillo };

logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);
