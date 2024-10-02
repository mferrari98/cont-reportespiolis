const { getDatabase } = require('./db');

const db = getDatabase();

function crearTablas(callback) {
  // tabla sitio
  db.run(
    `CREATE TABLE IF NOT EXISTS sitio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        descriptor TEXT NOT NULL,
        orden INTEGER NOT NULL,
        rebalse FLOAT NOT NULL,
        cubicaje FLOAT NOT NULL
    )`,
    (err) => {
      tablaTipoVariable({err_sitio:err}, callback)
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
      callback(err_previo);
    }
  );
}

module.exports = { crearTablas };