const { logamarillo } = require("../../control/controlLog")

const fs = require('fs');
const express = require('express');
const path = require('path');
const router = express.Router();

let observador

router.get('/', async (req, res) => {
  try {
    // ahora pagina 1 = registros mas recientes
    const historicoLimit = req.query.historicoLimit ? parseInt(req.query.historicoLimit) : 200;
    const historicoPage = req.query.historicoPage ? parseInt(req.query.historicoPage) : 1;

    // Validación de inputs
    if (isNaN(historicoLimit) || isNaN(historicoPage)) {
      return res.status(400).send('Error: Parámetros inválidos');
    }
    if (historicoLimit < 1 || historicoLimit > 1000) {
      return res.status(400).send('Error: historicoLimit debe estar entre 1 y 1000');
    }
    if (historicoPage < 1) {
      return res.status(400).send('Error: historicoPage debe ser >= 1');
    }

    const options = {
      historicoLimit,
      historicoPage
    };

    // Llamamos al observador para regenerar reporte.html con la pagina solicitada
    observador.verUltimoCambio(false, options, () => {
      const filePath = path.join(__dirname, "../", './public', 'reporte.html');

      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          logamarillo(2, `${err}`);
          return res.status(500).send('Error leyendo reporte');
        }

        // prev = mas viejo, next = mas nuevo
        const prevDisabled = ''; // siempre habilitado; se puede mejorar deshabilitando si pagina=ultima
        const nextDisabled = (historicoPage <= 1) ? 'disabled' : '';
        const prevPage = historicoPage + 1; // anterior = mas atras en el tiempo
        const nextPage = Math.max(1, historicoPage - 1); // siguiente = mas reciente

        const navHtml = `
<!-- INICIO_CONTROLES_PAGINACION -->
<div id="piolis_paginacion" style="position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%); background: rgba(255,255,255,0.95); border: 1px solid #ccc; padding: 8px 12px; border-radius: 6px; z-index:9999; font-family: Consolas, monospace;">
  <button id="piolis_prev">Anterior</button>
  <span style="margin:0 8px;">Pagina ${historicoPage}</span>
  <button id="piolis_next" ${nextDisabled}>Siguiente</button>
  <input type="hidden" id="piolis_limit" value="${historicoLimit}" />
</div>

<script>
  (function(){
    const limit = document.getElementById('piolis_limit').value || ${historicoLimit};
    document.getElementById('piolis_prev').addEventListener('click', function(){
      const p = ${prevPage};
      location.href = '/reporte?historicoPage=' + p + '&historicoLimit=' + limit;
    });
    document.getElementById('piolis_next').addEventListener('click', function(){
      const p = ${nextPage};
      location.href = '/reporte?historicoPage=' + p + '&historicoLimit=' + limit;
    });
  })();
</script>
<!-- FIN_CONTROLES_PAGINACION -->
`;

        const newData = data.replace(/<\/body>/i, navHtml + '\n</body>');

        res.send(newData);
      })
    })
  } catch (error) {
    logamarillo(2, error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'favicon.ico'));
});

router.post('/imagenpt', (req, res) => {
  const imageData = req.body.image;

  const buffer = Buffer.from(imageData, 'base64');

  fs.writeFile('reporte/salida/graficoPLOTLY.png', buffer, (err) => {
    if (err) {
      logamarillo(2, 'Error al guardar la imagen:', err);
      return res.status(500).json({ message: 'Error al guardar la imagen' });
    }
    res.json({ message: 'Imagen guardada exitosamente' });
  });
});

module.exports = (parametro) => {
  observador = parametro
  return router;
};