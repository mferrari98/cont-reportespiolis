const config = require("../config/loader");

const TipoVariableDAO = require("../dao/tipoVariableDAO");

const tipoVariableDAO = new TipoVariableDAO();

const sitiosMadryn = new Set(config.sitios.madryn || []);

class Reporte {
  async declarar(sitios) {
    const descriptores = await tipoVariableDAO.getTodosDescriptores();

    return sitios.map((sitio, index) => ({
      sitio: sitio.descriptor,
      variable: {
        nivel: {
          descriptor: descriptores[0]?.descriptor,
          valor: undefined,
          rebalse: sitio.rebalse,
          maxoperativo: sitio.maxoperativo,
          cubicaje: sitio.cubicaje,
          historico: undefined
        },
        cloro: {
          descriptor: descriptores[1]?.descriptor,
          valor: undefined
        },
        turbiedad: {
          descriptor: descriptores[2]?.descriptor,
          valor: undefined
        },
        voldia: {
          descriptor: descriptores[3]?.descriptor,
          valor: undefined
        }
      },
      esMadryn: sitiosMadryn.has(sitio.descriptor)
    }));
  }

  definir(reporte, row, tipoVarRow, sitioRow, historicos) {
    const indiceProp = tipoVarRow.orden;
    const variableKeys = Object.keys(reporte[sitioRow.orden].variable);

    reporte[sitioRow.orden].variable[variableKeys[indiceProp]].valor = row.valor;
    reporte[sitioRow.orden].variable.nivel.historico = historicos;
  }
}

module.exports = Reporte;
