const { run } = require("./db");
const { logamarillo } = require("../control/controlLog");

const ID_MOD = "DB-SCHEMA";

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
    await run(`DROP INDEX IF EXISTS idx_sitio_descriptor`);
  } catch (err) {
    logamarillo(2, `${ID_MOD} - Error eliminando indice de sitio: ${err.message}`);
  }

  try {
    await run(`ALTER TABLE sitio ADD COLUMN maxoperativo FLOAT`);
  } catch (err) {
    if (!err.message.includes("duplicate column name")) {
      logamarillo(2, `${ID_MOD} - Error agregando columna maxoperativo: ${err.message}`);
    }
  }

  try {
    await run(
      `UPDATE sitio SET maxoperativo = maximo_operativo WHERE maximo_operativo IS NOT NULL`
    );
  } catch (err) {
    if (!err.message.includes("no such column")) {
      logamarillo(2, `${ID_MOD} - Error migrando datos: ${err.message}`);
    }
  }

  try {
    await run(`ALTER TABLE sitio DROP COLUMN maximo_operativo`);
  } catch (err) {
    if (!err.message.includes("no such column")) {
      logamarillo(2, `${ID_MOD} - Error eliminando columna maximo_operativo: ${err.message}`);
    }
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
    await run(
      `CREATE TABLE IF NOT EXISTS log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        descriptor TEXT NOT NULL,
        etiempo BIGINT NOT NULL,
        creado_el DATETIME DEFAULT (DATETIME('now', '-3 hours'))
      )`
    );
    errors.err_log = null;
  } catch (err) {
    errors.err_log = err;
  }

  return errors;
}

module.exports = { crearTablas };
