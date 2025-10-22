const { getDatabase } = require('./db');

const db = getDatabase();

function crearTablas(callback) {
  let err_tablas = []
  tablaSitio(err_tablas, (err_compilados) => {    
    callback(err_compilados)
  })
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

      // Índice para búsquedas por descriptor (ETL y API)
      db.run(
        `CREATE INDEX IF NOT EXISTS idx_sitio_descriptor
         ON sitio(descriptor)`,
        (errIdx) => {
          if (errIdx) err_previo["err_idx_descriptor"] = errIdx

          tablaTipoVariable(err_previo, callback)
        }
      );
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

      // Crear índices para optimización de queries
      // Índice compuesto para consultas N+1 (join por sitio_id y tipo_id)
      db.run(
        `CREATE INDEX IF NOT EXISTS idx_historico_sitio_tipo
         ON historico_lectura(sitio_id, tipo_id)`,
        (errIdx1) => {
          if (errIdx1) err_previo["err_idx_sitio_tipo"] = errIdx1

          // Índice temporal descendente para consultas recientes y paginación
          db.run(
            `CREATE INDEX IF NOT EXISTS idx_historico_etiempo
             ON historico_lectura(etiempo DESC)`,
            (errIdx2) => {
              if (errIdx2) err_previo["err_idx_etiempo"] = errIdx2

              tablaLog(err_previo, callback)
            }
          );
        }
      );
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