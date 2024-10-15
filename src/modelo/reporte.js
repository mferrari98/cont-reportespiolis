const TipoVariableDAO = require("../dao/tipoVariableDAO");
const SitioDAO = require("../dao/sitioDAO");

const tipoVariableDAO = new TipoVariableDAO();
const sitioDAO = new SitioDAO();

let sitiosMadryn;

function Reporte() { }

Reporte.prototype.declarar = function (sitios, cb) {

    sitioDAO.getSitiosMadryn((_, sitios) => { sitiosMadryn = sitios });

    let reporte = new Array(sitios.length);

    tipoVariableDAO.getTodosDescriptores((_, descriptores) => {
        for (let index = 0; index < reporte.length; index++) {
            reporte[index] = {  // Modifica el objeto en el índice correspondiente del arreglo
                sitio: sitios[index].descriptor,
                variable: {
                    nivel: {
                        descriptor: descriptores[0].descriptor,
                        valor: undefined,
                        rebalse: sitios[index].rebalse,
                        cubicaje: sitios[index].cubicaje,
                        historico: undefined
                    },
                    cloro: {
                        descriptor: descriptores[1].descriptor,
                        valor: undefined
                    },
                    turbiedad: {
                        descriptor: descriptores[2].descriptor,
                        valor: undefined
                    },
                    voldia: {
                        descriptor: descriptores[3].descriptor,
                        valor: undefined
                    }
                },
                esMadryn: esMadryn(sitios[index])
            };
        };
        cb(reporte)
    })
}

Reporte.prototype.definir = function (reporte, row, tipoVarRow, sitioRow, historicos) {

    const indice_prop = tipoVarRow.orden
    const variableKeys = Object.keys(reporte[sitioRow.orden].variable);

    reporte[sitioRow.orden].variable[variableKeys[indice_prop]].valor = row.valor
    reporte[sitioRow.orden].variable.nivel.historico = historicos
}

let esMadryn = function (sitio) {
    return sitiosMadryn.includes(sitio.descriptor)
}

module.exports = Reporte;
