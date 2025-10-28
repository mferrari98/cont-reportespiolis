const config = require("../config/loader")
const { logamarillo } = require("../control/controlLog")
const { getDatabase } = require("../basedatos/db");

const TipoVariableDAO = require("../dao/tipoVariableDAO");
const SitioDAO = require("../dao/sitioDAO");
const HistoricoLecturaDAO = require("../dao/historicoLecturaDAO");

const tipoVariableDAO = new TipoVariableDAO();
const sitioDAO = new SitioDAO();
const historicoLecturaDAO = new HistoricoLecturaDAO();

const ID_MOD = "ETL";
const SIN_DETERMINAR = "s/d";

const umbral = config.observador.umbral_parser_columnas

const tipo_variables = ["Nivel[m]", "Cloro[mlg/l]", "Turbiedad[UTN]", "VOL/DIA[m3/dia]"]
/**
 * 
 * @param {es el reporte en texto plano, con campos separados por un blanco no determinado
 * pueden ser tabs o espacios} lines 
 * 
 * esta funcion lanza el proceso ETL completo en sus tres llamadas encadenadas:
 * getTipoVariable, getSitiosNombre y nuevoHistoricoLectura, quienes realizan
 * el proceso de extraccion, transformacion y carga por su cuenta.
 */
function lanzarETL(lines, etiempo, cb) {
  getTipoVariable(lines[0], (msjTVar) => {

    lines.splice(0, 1);
    getSitiosNombre(lines, (msjSit) => {

      logamarillo(2, `${ID_MOD} - ${msjTVar} ${msjSit}`);

      historicoLecturaDAO.existe(etiempo, (_, existe) => {

        if (existe)
          cb()
        else
          nuevoHistoricoLectura(lines, etiempo, () => { cb() });
      })
    });
  });
}

/* ===========================================================
===================== FUNCIONES INTERNAS =====================
==============================================================
*/

function getTipoVariable(firstLine, cb) {
  let entidades_creadas = 0;
  let entidades_existentes = 0;

  /*
    toma la primer linea, y le aplica sucesivamente:
    - conversion a array usando como separado todo continuo con 2 o mas blancos
    - descarta el primer elemento tal que ['a', 'b', 'c'] retorna ['b', 'c']
    */
  let tipo_variable = firstLine
    .split(/\s{2,}/)
    .splice(1);

  for (const [index, descriptor] of tipo_variable.entries()) {
    tipoVariableDAO.getByDescriptor(descriptor, (err, row) => {
      if (err) {
        logamarillo(2, `${ID_MOD} - Error al buscar por descriptor:`, err);
      } else {
        if (!row) {
          // Si no se encuentra el descriptor, se crea un nuevo registro
          tipoVariableDAO.create(descriptor, index, (err, result) => {
            if (err) {
              logamarillo(2, `${ID_MOD} - Error al insertar tipo_variable:`, err);
            } else {
              entidades_creadas++;
              if (
                finValidacion(
                  tipo_variable,
                  entidades_creadas,
                  entidades_existentes
                )
              )
                cb(
                  mensaje("[TpoVar]", entidades_creadas, entidades_existentes)
                );
            }
          });
        } else {
          entidades_existentes++;
          if (
            finValidacion(
              tipo_variable,
              entidades_creadas,
              entidades_existentes
            )
          )
            cb(mensaje("[TpoVar]", entidades_creadas, entidades_existentes));
        }
      }
    });
  }
}

function getSitiosNombre(lines, cb) {
  let entidades_creadas = 0;
  let entidades_existentes = 0;

  let sitios = lines
    .map((line) => line.split(/\s{2,}/)[0])
    .filter((word) => word !== undefined);

  for (const [index, descriptor] of sitios.entries()) {
    sitioDAO.getByDescriptor(descriptor, (err, row) => {
      if (err) {
        logamarillo(2, `${ID_MOD} - Error al buscar por descriptor:`, err);
      } else {
        if (!row) {
          // Si no se encuentra el descriptor, se crea un nuevo registro
          sitioDAO.create(descriptor, index, (err, result) => {
            if (err) {
              logamarillo(2, `${ID_MOD} - Error al insertar sitio:`, err);
            } else {
              entidades_creadas++;
              if (
                finValidacion(sitios, entidades_creadas, entidades_existentes)
              )
                cb(mensaje("[Sitio]", entidades_creadas, entidades_existentes));
            }
          });
        } else {
          entidades_existentes++;
          if (finValidacion(sitios, entidades_creadas, entidades_existentes))
            cb(mensaje("[Sitio]", entidades_creadas, entidades_existentes));
        }
      }
    });
  }
}

function nuevoHistoricoLectura(lines, etiempo, callback) {

  const db = getDatabase();
  const lineas_modif = agregarNulos(lines, umbral);

  // Envolver todas las inserciones en una transacción
  db.serialize(() => {
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        logamarillo(2, `${ID_MOD} - Error iniciando transacción: ${err.message}`);
        return callback(err);
      }

      insertar(lineas_modif, 1, etiempo, (err1) => {        // nivel
        if (err1) return rollback(db, callback, err1);

        insertar(lineas_modif, 2, etiempo, (err2) => {      // cloro
          if (err2) return rollback(db, callback, err2);

          insertar(lineas_modif, 3, etiempo, (err3) => {    // turbiedad
            if (err3) return rollback(db, callback, err3);

            insertar(lineas_modif, 4, etiempo, (err4) => {  // vol/dia
              if (err4) return rollback(db, callback, err4);

              db.run('COMMIT', (err) => {
                if (err) {
                  logamarillo(2, `${ID_MOD} - Error en commit: ${err.message}`);
                  return rollback(db, callback, err);
                }
                logamarillo(1, `${ID_MOD} - Transacción completada exitosamente`);
                callback();
              });
            });
          });
        });
      });
    });
  });
}

// Función helper para rollback
function rollback(db, callback, originalError) {
  db.run('ROLLBACK', (rollbackErr) => {
    if (rollbackErr) {
      logamarillo(2, `${ID_MOD} - Error en rollback: ${rollbackErr.message}`);
    }
    logamarillo(2, `${ID_MOD} - Transacción revertida: ${originalError.message}`);
    callback(originalError);
  });
}

function insertar(lineas_modif, columna, timestamp, callback) {

  const tipoVar = getColumna(lineas_modif, columna);

  tipoVariableDAO.getByDescriptor(tipo_variables[columna - 1], (err, tipoVariable) => {
    if (err) {
      callback(err);
      return;
    }

    let remaining = tipoVar.length;
    if (remaining === 0) {
      callback(null);
      return;
    }

    for (let i = 0; i < tipoVar.length; i++) {
      const valor = tipoVar[i];

      if (valor == SIN_DETERMINAR) {  // no insertar en bd
        remaining--
        continue
      }

      sitioDAO.getByOrden(i, (err, sitio) => {
        if (err) {
          callback(err);
          return;
        }

        // Validar que el sitio exista antes de usarlo
        if (!sitio) {
          logamarillo(2, `${ID_MOD} - ADVERTENCIA: No se encontró sitio con orden ${i}, saltando...`);
          remaining--;
          if (remaining === 0) {
            callback(null);
          }
          return;
        }

        historicoLecturaDAO.create(
          sitio.id,
          tipoVariable.id,
          valor,
          timestamp,
          (err, result) => {
            if (err) {
              callback(err);
              return;
            }
            logamarillo(1, `${ID_MOD} - Insertando historico_lectura {${sitio.descriptor}:${tipoVariable.descriptor}:${valor}}`);

            remaining--
            if (remaining === 0) {
              callback(null);
            }
          }
        );
      });
    }
  });
}

function finValidacion(tipo_variable, entidades_creadas, entidades_existentes) {
  return tipo_variable.length == entidades_creadas + entidades_existentes;
}

function mensaje(origen, cont1, cont2) {
  return origen + ` creadas=${cont1} existentes=${cont2}`;
}

/**
 * recorre cada línea de texto en `lines` y agrega un marcador donde los blancos exceden un umbral (`threshold`).
 * El objetivo es insertar este marcador en los lugares donde se espera que haya un valor, pero está ausente,
 * basado en la longitud del espacio en blanco entre los valores existentes.
 *
 * @param {string[]} lines - Un arreglo de cadenas de texto, donde cada cadena representa una línea que
 * contiene diferentes valores separados por espacios en blanco.
 * @param {number} threshold - Un número entero que representa la cantidad máxima de espacios consecutivos
 * permitidos antes de insertar el marcador.
 *
 * @returns {string[]} - Un arreglo de cadenas de texto en donde todas las filas
 * poseen la misma cantidad de columnas, lo que facilita el tratamiento del fuente
 */
function agregarNulos(lines, threshold) {
  const modifiedLines = [];

  for (let line of lines) {
    let modifiedLine = "";
    let spaceCount = 0;
    let i = 0;

    // Recorrer la línea carácter por carácter
    while (i < line.length) {
      if (line[i] === " ") {
        spaceCount++;
        if (spaceCount > threshold) {
          modifiedLine += " " + SIN_DETERMINAR; // Insertar un 0 si el espacio es mayor que el umbral
          spaceCount = 0;
        }
      } else {
        if (spaceCount > 0) modifiedLine += " ";

        /*
        si no encuenta un blanco, copia la linea en la salida tal como la
        leyó en la antrada "modifiedLine += line[i]"
        */
        modifiedLine += line[i];
        spaceCount = 0;
      }
      i++;
    }
    modifiedLines.push(modifiedLine);
  }

  return modifiedLines;
}

/**
 * Extrae los valores de una columna específica de un arreglo de líneas
 *
 * @param {Array<string>} modifiedLines - Un arreglo de líneas de texto, cada una representando
 *                                         una fila de datos
 * @param {number} numCol - El índice de la columna de la que se desea extraer los valores.
 *                           Debe ser un número entero que representa la posición de la columna
 * @returns {Array<number>} Un arreglo que contiene los valores de la columna especificada para
 *                           cada línea.
 */
function getColumna(modifiedLines, numCol) {
  const columnValues = [];
  
  /*

  (?=-?\d|\bs\/d): Verifica un espacio seguido de:
    *) Un signo negativo opcional -? seguido de un dígito (\d).
    *) O bien la secuencia s/d.

  (?<=-?\d|\bs\/d): Verifica un espacio precedido de:
    Un signo negativo opcional -? seguido de un dígito.
    O bien la secuencia s/d.

  */
  const regex = /\s(?=-?\d|\bs\/d)|(?<=-?\d|\bs\/d)\s/g;

  for (let line of modifiedLines) {

    /*
    dividir linea solo cuando hay un número a los lados del espacio
    este patron resuelve falsos positivo como se daria en "B.SAN MIGUEL 1.2" -> [B.SAN, MIGUEL, 1.2, ...]
    cuando lo correcto es [B.SAN MIGUEL, 1.2, ...]
    */
    const parts = line.split(regex);
    
    // Si la columna solicitada existe en la línea, añadirla al arreglo
    if (parts.length > numCol) {
      const value = parseFloat(parts[numCol]);
      columnValues.push(isNaN(value) ? parts[numCol] : value);
    } else {
      columnValues.push(SIN_DETERMINAR); // O cualquier otro valor que indique que la columna no existe
    }
  }

  return columnValues;
}

module.exports = { lanzarETL, sindet: SIN_DETERMINAR };

logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);