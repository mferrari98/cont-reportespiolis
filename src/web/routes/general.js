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
      const dataPath = path.join(__dirname, "../", './public', 'report-data.json');

      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          logamarillo(2, `${err}`);
          return res.status(500).send('Error leyendo reporte');
        }

        fs.readFile(dataPath, 'utf8', (dataErr, rawData) => {
          let pagination = null;
          if (!dataErr) {
            try {
              const parsed = JSON.parse(rawData);
              pagination = parsed && parsed.pagination ? parsed.pagination : null;
            } catch (parseErr) {
              pagination = null;
            }
          }

          const totalPagesValue = Number.isFinite(pagination?.totalPages) ? pagination.totalPages : null;
          const limitValue = Number.isFinite(pagination?.limit) ? pagination.limit : historicoLimit;
          const pageValue = Number.isFinite(pagination?.page) ? pagination.page : historicoPage;

          const safeTotalPages = totalPagesValue && totalPagesValue > 0 ? totalPagesValue : null;
          const safePage = safeTotalPages
            ? Math.min(Math.max(pageValue, 1), safeTotalPages)
            : Math.max(pageValue, 1);

          // anterior = pagina mas vieja, siguiente = pagina mas nueva
          const prevDisabled = safeTotalPages ? (safePage >= safeTotalPages) : false;
          const nextDisabled = safePage <= 1;
          const prevPage = safeTotalPages ? Math.min(safePage + 1, safeTotalPages) : (safePage + 1);
          const nextPage = Math.max(1, safePage - 1);

          const prevHref = `?historicoPage=${prevPage}&historicoLimit=${limitValue}`;
          const nextHref = `?historicoPage=${nextPage}&historicoLimit=${limitValue}`;
          const prevLink = prevDisabled
            ? '<span id="piolis_prev" style="opacity:0.5; cursor: default;">Anterior</span>'
            : `<a id="piolis_prev" href="${prevHref}">Anterior</a>`;
          const nextLink = nextDisabled
            ? '<span id="piolis_next" style="opacity:0.5; cursor: default;">Siguiente</span>'
            : `<a id="piolis_next" href="${nextHref}">Siguiente</a>`;

          let pageLabel = 'Ultimo reporte';
          if (safePage > 1) {
            const horasAtras = safePage - 1;
            pageLabel = `Reporte ${horasAtras} hora${horasAtras === 1 ? '' : 's'} atras`;
          }

          const navHtml = `
 <!-- INICIO_CONTROLES_PAGINACION -->
 <div id="piolis_paginacion" style="position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%); background: rgba(255,255,255,0.95); border: 1px solid #ccc; padding: 8px 12px; border-radius: 6px; z-index:9999; font-family: Consolas, monospace;">
   ${prevLink}
   <span style="margin:0 8px;">${pageLabel}</span>
   ${nextLink}
 </div>
 <!-- FIN_CONTROLES_PAGINACION -->
 `;

          const newData = data.replace(/<\/body>/i, navHtml + '\n</body>');

          res.send(newData);
        })
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
