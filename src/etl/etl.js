const config = require("../../config.json")

const TipoVariableDAO = require("../dao/tipoVariableDAO");
const SitioDAO = require("../dao/sitioDAO");
const HistoricoLecturaDAO = require("../dao/historicoLecturaDAO");

const tipoVariableDAO = new TipoVariableDAO();
const sitioDAO = new SitioDAO();
const historicoLecturaDAO = new HistoricoLecturaDAO();

const ID_MOD = "ETL";
const SIN_DETERMINAR = "s/d";

const verLog = config.desarrollo.verLog
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
      
      logamarillo(1, `${ID_MOD} - ${msjTVar} ${msjSit}`);

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
        console.error(`${ID_MOD} - Error al buscar por descriptor:`, err);
      } else {
        if (!row) {
          // Si no se encuentra el descriptor, se crea un nuevo registro
          tipoVariableDAO.create(descriptor, index, (err, result) => {
            if (err) {
              console.error(
                `${ID_MOD} - Error al insertar tipo_variable:`,
                err
              );
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
        console.error(`${ID_MOD} - Error al buscar por descriptor:`, err);
      } else {
        if (!row) {
          // Si no se encuentra el descriptor, se crea un nuevo registro
          sitioDAO.create(descriptor, index, (err, result) => {
            if (err) {
              console.error(`${ID_MOD} - Error al insertar sitio:`, err);
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

  const lineas_modif = agregarNulos(lines, umbral);

  insertar(lineas_modif, 1, etiempo, () => {        // nivel
    insertar(lineas_modif, 2, etiempo, () => {      // cloro
      insertar(lineas_modif, 3, etiempo, () => {    // turbiedad
        insertar(lineas_modif, 4, etiempo, () => {  // vol/dia
          callback();
        });
      });
    });
  });
}

function insertar(lineas_modif, columna, timestamp, callback) {

  const tipoVar = getColumna(lineas_modif, columna);

  tipoVariableDAO.getByDescriptor(tipo_variables[columna-1], (err, tipoVariable) => {
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

            if (verLog)
              logamarillo(1, 
                `${ID_MOD} - Insertando historico_lectura {${sitio.descriptor}:${tipoVariable.descriptor}:${valor}}`
              );

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
  const regex = /\s(?=\d|\bs\/d)|(?<=\d|\bs\/d)\s/g;

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

module.exports = { lanzarETL, sindet:SIN_DETERMINAR };

if (verLog) {
  logamarillo(1, `${ID_MOD} - Directorio trabajo:`, process.cwd());
  logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);
}