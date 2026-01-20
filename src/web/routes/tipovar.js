const express = require("express");

const { logamarillo } = require("../../control/controlLog");
const { asyncHandler } = require("../../core/http");

const TipoVariableDAO = require("../../dao/tipoVariableDAO");
const tipoVariableDAO = new TipoVariableDAO();

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await tipoVariableDAO.getAll();
    res.json(rows);
  })
);

router.use((err, req, res, next) => {
  logamarillo(2, `Error fetching tipo_variable: ${err.message}`);
  next(err);
});

module.exports = router;
