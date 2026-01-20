const config = require("../config/loader");
const { logamarillo } = require("../control/controlLog");

const TipoVariableDAO = require("../dao/tipoVariableDAO");
const SitioDAO = require("../dao/sitioDAO");
const HistoricoLecturaDAO = require("../dao/historicoLecturaDAO");

const tipoVariableDAO = new TipoVariableDAO();
const sitioDAO = new SitioDAO();
const historicoLecturaDAO = new HistoricoLecturaDAO();

const ID_MOD = "ETL";
const SIN_DETERMINAR = "s/d";

const UMBRAL = config.observador.umbral_parser_columnas;
const TIPO_VARIABLES = config.etl.tipo_variables;

async function lanzarETL(lines, etiempo) {
  const firstLine = lines[0];
  const tipoVarMsg = await getTipoVariable(firstLine);

  lines.splice(0, 1);
  const sitioMsg = await getSitiosNombre(lines);

  logamarillo(2, `${ID_MOD} - ${tipoVarMsg} ${sitioMsg}`);

  const existe = await historicoLecturaDAO.existe(etiempo);
  if (existe) {
    return;
  }

  await nuevoHistoricoLectura(lines, etiempo);
}

async function getTipoVariable(firstLine) {
  const tipoVariable = firstLine.split(/\s{2,}/).splice(1);
  let created = 0;
  let existing = 0;

  await Promise.all(
    tipoVariable.map(async (descriptor, index) => {
      try {
        const row = await tipoVariableDAO.getByDescriptor(descriptor);
        if (!row) {
          await tipoVariableDAO.create(descriptor, index);
          created += 1;
        } else {
          existing += 1;
        }
      } catch (err) {
        logamarillo(2, `${ID_MOD} - Error al buscar por descriptor: ${err.message}`);
        existing += 1;
      }
    })
  );

  return mensaje("[TpoVar]", created, existing);
}

async function getSitiosNombre(lines) {
  const sitios = lines
    .map((line) => line.split(/\s{2,}/)[0])
    .filter((word) => word !== undefined);

  let created = 0;
  let existing = 0;

  await Promise.all(
    sitios.map(async (descriptor, index) => {
      try {
        const row = await sitioDAO.getByDescriptor(descriptor);
        if (!row) {
          await sitioDAO.create(descriptor, index);
          created += 1;
        } else {
          existing += 1;
        }
      } catch (err) {
        logamarillo(2, `${ID_MOD} - Error al buscar por descriptor: ${err.message}`);
        existing += 1;
      }
    })
  );

  return mensaje("[Sitio]", created, existing);
}

async function nuevoHistoricoLectura(lines, etiempo) {
  const lineasModif = agregarNulos(lines, UMBRAL);
  const errores = [];

  for (let columna = 1; columna <= TIPO_VARIABLES.length; columna += 1) {
    try {
      await insertar(lineasModif, columna, etiempo);
    } catch (err) {
      errores.push(err);
    }
  }

  if (errores.length) {
    logamarillo(2, `${ID_MOD} - Errores al insertar historico: ${errores[0].message}`);
  } else {
    logamarillo(1, `${ID_MOD} - Transaccion completada exitosamente`);
  }
}

async function insertar(lineasModif, columna, timestamp) {
  const tipoVar = getColumna(lineasModif, columna);
  const tipoVariable = await tipoVariableDAO.getByDescriptor(TIPO_VARIABLES[columna - 1]);
  if (!tipoVariable) {
    throw new Error(`TipoVariable no encontrado: ${TIPO_VARIABLES[columna - 1]}`);
  }

  const tasks = tipoVar.map(async (valor, index) => {
    if (valor === SIN_DETERMINAR) {
      return;
    }

    const sitio = await sitioDAO.getByOrden(index);
    if (!sitio) {
      logamarillo(2, `${ID_MOD} - ADVERTENCIA: No se encontro sitio con orden ${index}, saltando...`);
      return;
    }

    await historicoLecturaDAO.create(sitio.id, tipoVariable.id, valor, timestamp);
    logamarillo(
      1,
      `${ID_MOD} - Insertando historico_lectura {${sitio.descriptor}:${tipoVariable.descriptor}:${valor}}`
    );
  });

  await Promise.all(tasks);
}

function mensaje(origen, cont1, cont2) {
  return `${origen} creadas=${cont1} existentes=${cont2}`;
}

function agregarNulos(lines, threshold) {
  const modifiedLines = [];

  for (const line of lines) {
    let modifiedLine = "";
    let spaceCount = 0;
    let i = 0;

    while (i < line.length) {
      if (line[i] === " ") {
        spaceCount += 1;
        if (spaceCount > threshold) {
          modifiedLine += ` ${SIN_DETERMINAR}`;
          spaceCount = 0;
        }
      } else {
        if (spaceCount > 0) {
          modifiedLine += " ";
        }
        modifiedLine += line[i];
        spaceCount = 0;
      }
      i += 1;
    }
    modifiedLines.push(modifiedLine);
  }

  return modifiedLines;
}

function getColumna(modifiedLines, numCol) {
  const columnValues = [];
  const regex = /\s(?=-?\d|\bs\/d)|(?<=-?\d|\bs\/d)\s/g;

  for (const line of modifiedLines) {
    const parts = line.split(regex);
    if (parts.length > numCol) {
      const value = parseFloat(parts[numCol]);
      columnValues.push(Number.isNaN(value) ? parts[numCol] : value);
    } else {
      columnValues.push(SIN_DETERMINAR);
    }
  }

  return columnValues;
}

module.exports = { lanzarETL, sindet: SIN_DETERMINAR };

logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);
