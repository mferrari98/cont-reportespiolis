const { getDatabase } = require('./db');

const db = getDatabase();

function crearTablas(callback) {
  let err_tablas = []
  tablaSitio(err_tablas, (err_compilados) => { callback(err_compilados) })
}

// tabla sitio
const tablaSitio = (err_previo, callback) => {
  db.run(
    `CREATE TABLE IF NOT EXISTS sitio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        descriptor TEXT NOT NULL,
        orden INTEGER NOT NULL,
        rebalse FLOAT NOT NULL,
        cubicaje FLOAT NOT NULL
    )`,
    (err) => {
      err_previo["err_sitio"] = err
      tablaTipoVariable(err_previo, callback)
    }
  );
}

// tabla tipo_variable
const tablaTipoVariable = (err_previo, callback) => {
  db.run(
    `CREATE TABLE IF NOT EXISTS tipo_variable (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        descriptor TEXT NOT NULL,
        orden INTEGER NOT NULL
    )`,
    (err) => {
      err_previo["err_tvar"] = err
      tablaHistoricosLectura(err_previo, callback)
    }
  );
}

// tabla 'historico_lectura'
const tablaHistoricosLectura = (err_previo, callback) => {
  db.run(
    `CREATE TABLE IF NOT EXISTS historico_lectura (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sitio_id INTEGER NOT NULL,
      tipo_id INTEGER NOT NULL,
      valor REAL NOT NULL,
      etiempo BIGINT NOT NULL,
      FOREIGN KEY (sitio_id) REFERENCES sitio(id),
      FOREIGN KEY (tipo_id) REFERENCES tipo_variable(id)
  )`,
    (err) => {
      err_previo["err_histlect"] = err
      tablaLog(err_previo, callback)
    }
  );
}

const tablaLog = (err_previo, callback) => {
  db.run(
    `CREATE TABLE IF NOT EXISTS log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      descriptor TEXT NOT NULL,
      etiempo BIGINT NOT NULL,
      creado_el DATETIME DEFAULT (DATETIME('now', '-3 hours'))
  )`,
    (err) => {
      err_previo["err_log"] = err
      callback(err_previo);
    }
  );
}

module.exports = { crearTablas };