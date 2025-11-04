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
        cubicaje FLOAT NOT NULL,
        maximo_operativo FLOAT
    )`,
    (err) => {
      err_previo["err_sitio"] = err

      // Índice para búsquedas por descriptor (ETL y API)
      db.run(
        `CREATE INDEX IF NOT EXISTS idx_sitio_descriptor
         ON sitio(descriptor)`,
        (errIdx) => {
          if (errIdx) err_previo["err_idx_descriptor"] = errIdx

          // Añadir columna maximo_operativo si no existe (para tablas existentes)
          db.run(
            `ALTER TABLE sitio ADD COLUMN maximo_operativo FLOAT`,
            (errAlter) => {
              // Ignorar error si la columna ya existe
              if (errAlter && !errAlter.message.includes('duplicate column name')) {
                console.log('Error añadiendo columna maximo_operativo:', errAlter.message);
              }

              // Actualizar sitios existentes con valores de maximo_operativo hardcodeados
              const actualizaciones = [
                "UPDATE sitio SET maximo_operativo = 4.45 WHERE descriptor = 'L.Maria'",
                "UPDATE sitio SET maximo_operativo = 4.4 WHERE descriptor = 'KM11'",
                "UPDATE sitio SET maximo_operativo = 3.5 WHERE descriptor = 'R6000'",
                "UPDATE sitio SET maximo_operativo = 3.33 WHERE descriptor = 'B.OESTE(1K)'",
                "UPDATE sitio SET maximo_operativo = 3.05 WHERE descriptor = 'B.SAN MIGUEL'",
                "UPDATE sitio SET maximo_operativo = 3.4 WHERE descriptor = 'NUEVA CHUBUT'",
                "UPDATE sitio SET maximo_operativo = 2.06 WHERE descriptor = 'B.PUJOL'",
                "UPDATE sitio SET maximo_operativo = 3.09 WHERE descriptor = 'Cota45'",
                "UPDATE sitio SET maximo_operativo = 2.89 WHERE descriptor = 'Doradillo'"
              ];

              let actualizacionesRestantes = actualizaciones.length;

              actualizaciones.forEach(sql => {
                db.run(sql, (errUpdate) => {
                  if (errUpdate) {
                    console.log('Error actualizando maximo_operativo:', errUpdate.message);
                  }
                  actualizacionesRestantes--;
                  if (actualizacionesRestantes === 0) {
                    tablaTipoVariable(err_previo, callback);
                  }
                });
              });
            }
          );
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