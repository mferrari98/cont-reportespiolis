const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = function (event) {
    const data = JSON.parse(event.data);
    console.log('Mensaje del servidor:', data);

    // Actualizar el valor en la tabla sin recargar la página
    if (data.sitio === 'Toma(Des.)') {
        document.getElementById('nivel-toma-des').textContent = data.nivel;

        // Actualizar el gráfico de barras porcentual
        actualizarGraficoBarras(data.sitio, data.nivel);
    }
};

// Función para actualizar el gráfico de barras con nuevos datos
function actualizarGraficoBarras(sitio, nuevoNivel) {
    // Obtener referencia al gráfico
    const grafico = document.getElementById('grafBarras');
    if (!grafico) return;

    // Lista de sitios en el mismo orden que en reporte.html
    const sitios = ['Toma(Rio)','Toma(Des.)','P.Pot','L.Maria','KM11','R6000','B.OESTE(1K)','B.SAN MIGUEL','NUEVA CHUBUT','B.PUJOL','Doradillo','Cota45'];
    const sitioIndex = sitios.indexOf(sitio);

    if (sitioIndex === -1) return; // Sitio no encontrado

    // Funciones de cálculo (mismas que en reporte.html)
    function calcularPorcentaje(nivel, maxoperativo) {
        if (maxoperativo === null || maxoperativo === undefined || maxoperativo === 0) {
            return null;
        }
        const porcentaje = (nivel / maxoperativo) * 100;
        return Math.min(porcentaje, 100);
    }

    function getMaxoperativo(sitio) {
        const maxoperativos = {
            'Toma(Rio)': null,
            'Toma(Des.)': null,
            'P.Pot': null,
            'L.Maria': 4.45,
            'KM11': 4.4,
            'R6000': 3.5,
            'B.OESTE(1K)': 3.33,
            'B.SAN MIGUEL': 3.05,
            'NUEVA CHUBUT': 3.4,
            'B.PUJOL': 2.06,
            'Doradillo': 2.89,
            'Cota45': 3.09
        };
        return maxoperativos[sitio];
    }

    const maxop = getMaxoperativo(sitio);

    // Obtener datos actuales del gráfico
    let currentData;
    try {
        currentData = document.getElementById('grafBarras').data;
    } catch (e) {
        console.error('No se pudo obtener datos del gráfico:', e);
        return;
    }

    if (!currentData || currentData.length < 2) {
        console.error('Estructura de datos del gráfico inválida');
        return;
    }

    // Actualizar el trace del nivel actual en el índice correcto
    const yValues = [...currentData[0].y];
    const colors = [...currentData[0].marker.color];
    const texts = [...currentData[0].text];
    const hoverTexts = [...currentData[0].hovertext];

    if (maxop === null) {
        yValues[sitioIndex] = null;
        colors[sitioIndex] = '#808080';
        texts[sitioIndex] = nuevoNivel.toFixed(2);
        hoverTexts[sitioIndex] = `${sitio}<br>Nivel: ${nuevoNivel.toFixed(2)}m<br>Sin referencia operativa`;
    } else {
        const porc = calcularPorcentaje(nuevoNivel, maxop);
        yValues[sitioIndex] = porc;

        if (nuevoNivel > maxop) {
            colors[sitioIndex] = '#ff6b6b';
            texts[sitioIndex] = maxop.toFixed(2);
        } else {
            colors[sitioIndex] = getComputedStyle(document.documentElement).getPropertyValue('--color-nivel').trim();
            texts[sitioIndex] = nuevoNivel.toFixed(2);
        }

        const estado = nuevoNivel > maxop ? '¡EXCEDE!' : 'Normal';
        hoverTexts[sitioIndex] = `${sitio}<br>Nivel: ${nuevoNivel.toFixed(2)}m<br>Max Op: ${maxop}m<br>Porcentaje: ${porc.toFixed(1)}%<br>Estado: ${estado}`;
    }

    // Actualizar el trace del nivel actual
    Plotly.restyle('grafBarras', {
        y: [yValues],
        'marker.color': [colors],
        text: [texts],
        hovertext: [hoverTexts]
    }, [0]);

    // Actualizar también el trace restante
    const restanteYValues = [...currentData[1].y];
    const restanteTexts = [...currentData[1].text];
    if (maxop !== null) {
        const porc = calcularPorcentaje(nuevoNivel, maxop);
        restanteYValues[sitioIndex] = 100 - porc;
        restanteTexts[sitioIndex] = maxop.toFixed(2);
    } else {
        restanteYValues[sitioIndex] = 0;
        restanteTexts[sitioIndex] = '';
    }

    Plotly.restyle('grafBarras', {
        y: [restanteYValues],
        text: [restanteTexts]
    }, [1]);
}

ws.onclose = function () {
    console.log('Conexión cerrada');
};

ws.onerror = function (error) {
    console.error('Error en la conexión WebSocket:', error);
};