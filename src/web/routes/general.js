const { logamarillo } = require("../../control/controlLog")

const fs = require('fs');
const express = require('express');
const path = require('path');
const router = express.Router();

let observador

router.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'favicon.ico'));
});

router.get('/', async (req, res) => {
  try {
    observador.verUltimoCambio(false, () => {
      const filePath = path.join(__dirname, '..', 'public', 'reporte.html');
      res.sendFile(filePath);
    })
  } catch (error) {
    logamarillo(2, error);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/imagenpt', (req, res) => {
  const imageData = req.body.image;

  // Decodificar la imagen base64
  const buffer = Buffer.from(imageData, 'base64');

  // Guardar la imagen en el servidor
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