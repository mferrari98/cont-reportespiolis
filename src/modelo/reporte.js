const TipoVariableDAO = require("../dao/tipoVariableDAO");
const tipoVariableDAO = new TipoVariableDAO();

function Reporte() { }

Reporte.prototype.declarar = function (sitios, cb) {
    
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
                }
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

module.exports = Reporte;
