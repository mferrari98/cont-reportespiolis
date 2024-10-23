const { logamarillo } = require("../../control/controlLog")

const express = require('express');
const router = express.Router();

const ID_MOD = "Render"

const SitioDAO = require('../../dao/sitioDAO');
const sitioDAO = new SitioDAO();

router.get('/', async (req, res) => {
  logamarillo(1, `${ID_MOD} - ${req.query}`);

  sitioDAO.getAll((err, rows) => {
    if (err) {
      logamarillo(2, 'Error fetching sitio:', err);
      res.status(500).send('Error interno del servidor');
    } else {
      res.json(rows); // Envía la respuesta como JSON con los registros obtenidos
    }
  });
});

router.get('/:id', async (req, res) => {
  logamarillo(1, `${ID_MOD} - ${req.body}`);
});

router.post('/', async (req, res) => {
  logamarillo(1, `${ID_MOD} - ${req.body}`);
});

router.put('/:id', async (req, res) => {
  logamarillo(1, `${ID_MOD} - ${req.body}`);
});

router.delete('/:id', async (req, res) => {
  logamarillo(1, `${ID_MOD} - ${req.body}`);
});

module.exports = router;