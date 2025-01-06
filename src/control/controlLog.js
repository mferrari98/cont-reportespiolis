const fs = require('fs');
const { nivLog } = require("../../config.json").desarrollo

const ID_MOD = "LOG";

let ultimoMensaje = null;
let conteoRepeticiones = 0;

let logamarillo = function (nivel, ...contenido) {

    const mensaje = contenido.join(' '); // Unir el contenido para comparar

    if (nivel >= nivLog)
        console.log(mensaje)

    const estampaTiempo = obtenerEstampaDeTiempo();
    

    // Si el mensaje es el mismo que el anterior, aumentar el conteo de repeticiones
    if (mensaje === ultimoMensaje) {
        conteoRepeticiones++;
    } else {
        // Si hay repeticiones registradas, guardar el último mensaje repetido
        if (conteoRepeticiones > 0) {
            const lineaFinalRepetido = `${estampaTiempo} [-] ${ultimoMensaje} (se omitieron ${conteoRepeticiones - 1} repeticiones)\n`;
            fs.appendFile('historico.txt', lineaFinalRepetido, (err) => {
                if (err) {
                    logamarillo(1, `Error escribiendo archivo:`, err);
                }
            });
        }

        // Guardar la nueva línea y reiniciar el contador de repeticiones
        const lineaNueva = `${estampaTiempo} [-] ${mensaje}\n`;
        fs.appendFile('historico.txt', lineaNueva, (err) => {
            if (err) {
                logamarillo(1, `Error escribiendo archivo:`, err);
            }
        });

        // Actualizar los registros
        ultimoMensaje = mensaje;
        conteoRepeticiones = 0; // Reiniciar el conteo
    }
};

/* ===========================================================
===================== FUNCIONES INTERNAS =====================
==============================================================
*/

function obtenerEstampaDeTiempo() {
    const fechaActual = new Date();
    // Restamos 3 horas a la fecha actual para ajustarla a GMT-3
    const fechaGMT3 = new Date(fechaActual.getTime() - (3 * 60 * 60 * 1000));
    return fechaGMT3.toISOString(); // Devuelve la fecha en formato ISO
}

module.exports = { logamarillo };

logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);