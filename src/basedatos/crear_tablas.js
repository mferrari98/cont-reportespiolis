const { run, exec, get } = require("./db");
const { SQLITE_TIMEZONE_OFFSET } = require("../core/tiempo");

const MIN_SQLITE_VERSION = [3, 25, 0];

async function crearTablas() {
  const errors = {};

  try {
    await run(
      `CREATE TABLE IF NOT EXISTS sitio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        descriptor TEXT NOT NULL,
        orden INTEGER NOT NULL,
        rebalse FLOAT NOT NULL,
        cubicaje FLOAT NOT NULL,
        maxoperativo FLOAT
      )`
    );
    errors.err_sitio = null;
  } catch (err) {
    errors.err_sitio = err;
  }


  try {
    await run(
      `CREATE TABLE IF NOT EXISTS tipo_variable (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        descriptor TEXT NOT NULL,
        orden INTEGER NOT NULL
      )`
    );
    errors.err_tvar = null;
  } catch (err) {
    errors.err_tvar = err;
  }

  try {
    await run(
      `CREATE TABLE IF NOT EXISTS historico_lectura (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sitio_id INTEGER NOT NULL,
        tipo_id INTEGER NOT NULL,
        valor REAL NOT NULL,
        etiempo BIGINT NOT NULL,
        FOREIGN KEY (sitio_id) REFERENCES sitio(id),
        FOREIGN KEY (tipo_id) REFERENCES tipo_variable(id)
      )`
    );
    errors.err_histlect = null;
  } catch (err) {
    errors.err_histlect = err;
  }

  try {
    await run(
      `CREATE INDEX IF NOT EXISTS idx_historico_sitio_tipo
       ON historico_lectura(sitio_id, tipo_id)`
    );
  } catch (err) {
    errors.err_idx_sitio_tipo = err;
  }

  try {
    await run(
      `CREATE INDEX IF NOT EXISTS idx_historico_etiempo
       ON historico_lectura(etiempo DESC)`
    );
  } catch (err) {
    errors.err_idx_etiempo = err;
  }

  try {
    await exec(
      `DELETE FROM historico_lectura
       WHERE id NOT IN (
         SELECT MIN(id)
         FROM historico_lectura
         GROUP BY sitio_id, tipo_id, etiempo
       )`
    );
    errors.err_histlect_dedupe = null;
  } catch (err) {
    errors.err_histlect_dedupe = err;
  }

  try {
    await run(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_historico_medicion_unica
       ON historico_lectura(sitio_id, tipo_id, etiempo)`
    );
    errors.err_idx_histlect_unique = null;
  } catch (err) {
    errors.err_idx_histlect_unique = err;
  }

  try {
    await run(
      `CREATE TABLE IF NOT EXISTS ingesta_control (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fuente_wizcon_hash TEXT NOT NULL,
        fuente_citec_hash TEXT NOT NULL,
        lote_hash TEXT NOT NULL UNIQUE,
        etiempo_origen BIGINT NOT NULL,
        creado_el DATETIME DEFAULT (DATETIME('now', '${SQLITE_TIMEZONE_OFFSET}'))
      )`
    );
    errors.err_ingesta_control = null;
  } catch (err) {
    errors.err_ingesta_control = err;
  }

  try {
    await run(
      `CREATE INDEX IF NOT EXISTS idx_ingesta_control_etiempo
       ON ingesta_control(etiempo_origen DESC)`
    );
    errors.err_idx_ingesta_control_etiempo = null;
  } catch (err) {
    errors.err_idx_ingesta_control_etiempo = err;
  }

  try {
    await run(
      `CREATE TABLE IF NOT EXISTS log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        descriptor TEXT NOT NULL,
        etiempo BIGINT NOT NULL,
        creado_el DATETIME DEFAULT (DATETIME('now', '${SQLITE_TIMEZONE_OFFSET}'))
      )`
    );
    errors.err_log = null;
  } catch (err) {
    errors.err_log = err;
  }

  try {
    const row = await get("SELECT sqlite_version() as version");
    const version = row ? row.version : "";
    if (!supportsWindowFunctions(version)) {
      throw new Error(`SQLite ${version} no soporta window functions; se requiere >= 3.25.0`);
    }
    errors.err_sqlite_version = null;
  } catch (err) {
    errors.err_sqlite_version = err;
  }

  return errors;
}

function supportsWindowFunctions(version) {
  const current = parseVersion(version);
  if (!current) {
    return false;
  }

  for (let i = 0; i < MIN_SQLITE_VERSION.length; i += 1) {
    const actualPart = current[i] || 0;
    const requiredPart = MIN_SQLITE_VERSION[i];
    if (actualPart > requiredPart) {
      return true;
    }
    if (actualPart < requiredPart) {
      return false;
    }
  }

  return true;
}

function parseVersion(version) {
  const parts = String(version || "")
    .split(".")
    .map((part) => Number(part));

  if (parts.length < 2 || parts.some((part) => !Number.isFinite(part) || part < 0)) {
    return null;
  }

  return [parts[0], parts[1], parts[2] || 0];
}

module.exports = { crearTablas };
