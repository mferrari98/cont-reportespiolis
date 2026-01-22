const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../..");
const CONFIG_PATH = path.join(ROOT_DIR, "config.json");
const SITIOS_PATH = path.join(ROOT_DIR, "sitios.json");
const ENV_PATH = path.join(ROOT_DIR, ".env");

const DEFAULTS = {
  direcciones: {
    sca_wizcon: "",
    cota45: ""
  },
  email: {
    credenciales: {
      user: "",
      pass: ""
    },
    difusion: "",
    smtp: {
      host: "post.servicoop.com",
      fallback: "10.10.1.40",
      port: 25,
      from: "comunicaciones.servicoop@servicoop.com"
    },
    tls: {
      rejectUnauthorized: false
    }
  },
  observador: {
    umbral_parser_columnas: 20,
    tiempo_milis: 40000,
    citec_lineas: 100
  },
  etl: {
    tipo_variables: [
      "Nivel[m]",
      "Cloro[mlg/l]",
      "Turbiedad[UTN]",
      "VOL/DIA[m3/dia]"
    ]
  },
  server: {
    port: 3000,
    trustProxy: true
  },
  logging: {
    level: "info",
    maxBytes: 10 * 1024 * 1024,
    dir: path.join(ROOT_DIR, "logs"),
    file: ""
  },
  report: {
    historico: {
      defaultLimit: 48,
      maxLimit: 200000
    },
    webUrl: "http://10.10.9.252/reporte"
  },
  sitios: {
    defaults: [],
    madryn: []
  }
};

// Carga un .env básico sin pisar variables ya presentes en el entorno.
function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) {
    return;
  }

  const raw = fs.readFileSync(ENV_PATH, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }

    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value;
    }
  });
}

// Permite sustituir ${VAR} en config.json. Si el valor es solo la variable y contiene comas, devuelve array.
function expandEnvironmentVariables(obj, currentPath = "") {
  if (typeof obj === "string") {
    const regex = /\$\{([^}]+)\}/g;
    let match;
    let result = obj;

    while ((match = regex.exec(obj)) !== null) {
      const varName = match[1];
      const envValue = process.env[varName];

      if (envValue === undefined) {
        continue;
      }

      if (obj === `\${${varName}}`) {
        if (envValue.includes(",")) {
          return envValue.split(",").map((item) => item.trim());
        }
        return envValue;
      }

      result = result.replace(`\${${varName}}`, envValue);
    }

    return result;
  }

  if (Array.isArray(obj)) {
    return obj.map((item, index) =>
      expandEnvironmentVariables(item, `${currentPath}[${index}]`)
    );
  }

  if (obj !== null && typeof obj === "object") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      result[key] = expandEnvironmentVariables(value, newPath);
    }
    return result;
  }

  return obj;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(target, source) {
  if (!isPlainObject(source)) {
    return Array.isArray(source) ? source.slice() : source;
  }

  const result = { ...target };
  Object.entries(source).forEach(([key, value]) => {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMerge(result[key], value);
      return;
    }
    result[key] = Array.isArray(value) ? value.slice() : value;
  });

  return result;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.trim()) {
    return null;
  }
  return JSON.parse(raw);
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeEmailDiffusion(value) {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    if (trimmed.includes(",")) {
      return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
    }
    return trimmed;
  }
  return value;
}

function loadSitiosConfig(configOverrides) {
  const sitiosFile = readJson(SITIOS_PATH);
  const sitiosConfig =
    sitiosFile && typeof sitiosFile === "object"
      ? sitiosFile
      : configOverrides?.sitios || {};

  const defaults = Array.isArray(sitiosConfig?.defaults)
    ? sitiosConfig.defaults
    : Array.isArray(sitiosConfig?.sitios)
      ? sitiosConfig.sitios
      : [];

  const madryn = Array.isArray(sitiosConfig?.madryn) ? sitiosConfig.madryn : [];

  return {
    defaults,
    madryn
  };
}

function buildPaths(config) {
  const publicDir = path.join(ROOT_DIR, "src", "web", "public");
  const reportDir = path.join(ROOT_DIR, "src", "reporte", "salida");

  return {
    root: ROOT_DIR,
    publicDir,
    reportDir,
    reportTemplate: path.join(ROOT_DIR, "src", "etl", "plantilla.piolis"),
    reportHtml: path.join(publicDir, "reporte.html"),
    reportData: path.join(publicDir, "report-data.json"),
    reportTable: path.join(reportDir, "tabla.html"),
    echartsSrc: path.join(ROOT_DIR, "node_modules", "echarts", "dist", "echarts.min.js"),
    echartsDest: path.join(publicDir, "js", "echarts.min.js"),
    reportImages: {
      barras: path.join(publicDir, "grafBarras.png"),
      pieMdy: path.join(publicDir, "grafPieMdy.png"),
      pieTw: path.join(publicDir, "grafPieTw.png"),
      lineas: path.join(publicDir, "grafLineas.png")
    }
  };
}

// Resuelve el archivo de log final respetando el directorio configurado.
function resolveLogFile(config) {
  const logDir = config.logging.dir;
  const customFile = config.logging.file;
  if (customFile) {
    return path.resolve(customFile);
  }
  // Mantener logs dentro del directorio configurado aunque no exista todavía.
  if (logDir) {
    return path.join(logDir, "app.log");
  }
  return path.join(process.cwd(), "app.log");
}

function applyEnvOverrides(config) {
  if (process.env.EMAIL_USER) {
    config.email.credenciales.user = process.env.EMAIL_USER;
  }
  if (process.env.EMAIL_PASS) {
    config.email.credenciales.pass = process.env.EMAIL_PASS;
  }
  if (process.env.EMAIL_DIFUSION) {
    config.email.difusion = process.env.EMAIL_DIFUSION;
  }

  if (process.env.OBSERVADOR_UMBRAL_COLUMNAS) {
    config.observador.umbral_parser_columnas = parseNumber(
      process.env.OBSERVADOR_UMBRAL_COLUMNAS,
      config.observador.umbral_parser_columnas
    );
  }
  if (process.env.OBSERVADOR_TIEMPO_MILIS) {
    config.observador.tiempo_milis = parseNumber(
      process.env.OBSERVADOR_TIEMPO_MILIS,
      config.observador.tiempo_milis
    );
  }

  if (process.env.REPORTE_HISTORICO_LIMIT) {
    config.report.historico.defaultLimit = parseNumber(
      process.env.REPORTE_HISTORICO_LIMIT,
      config.report.historico.defaultLimit
    );
  }
  if (process.env.REPORTE_HISTORICO_MAX) {
    config.report.historico.maxLimit = parseNumber(
      process.env.REPORTE_HISTORICO_MAX,
      config.report.historico.maxLimit
    );
  }
  if (process.env.LOG_MAX_BYTES) {
    config.logging.maxBytes = parseNumber(process.env.LOG_MAX_BYTES, config.logging.maxBytes);
  }

  if (process.env.PORT) {
    config.server.port = parseNumber(process.env.PORT, config.server.port);
  }
  if (process.env.TRUST_PROXY) {
    config.server.trustProxy = process.env.TRUST_PROXY === "true";
  }

  if (process.env.ETL_TIPO_VARIABLES) {
    config.etl.tipo_variables = process.env.ETL_TIPO_VARIABLES.split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function loadConfig() {
  loadEnvFile();

  let fileConfig = {};
  const rawConfig = readJson(CONFIG_PATH);
  if (rawConfig) {
    fileConfig = expandEnvironmentVariables(rawConfig);
  }

  let config = deepMerge(DEFAULTS, fileConfig);
  config.sitios = loadSitiosConfig(config);

  applyEnvOverrides(config);
  config.email.difusion = normalizeEmailDiffusion(config.email.difusion);

  config.dbPath = process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(ROOT_DIR, "src", "basedatos", "database.sqlite");

  config.paths = buildPaths(config);
  config.logging.file = resolveLogFile(config);

  return config;
}

module.exports = loadConfig();
