const express = require("express");

const { logamarillo } = require("../../control/controlLog");
const { asyncHandler } = require("../../core/http");

const SitioDAO = require("../../dao/sitioDAO");
const sitioDAO = new SitioDAO();

const router = express.Router();
const ID_MOD = "Render";

router.get(
  "/",
  asyncHandler(async (req, res) => {
    logamarillo(1, `${ID_MOD} - ${JSON.stringify(req.query)}`);
    const rows = await sitioDAO.getAll();
    res.json(rows);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    logamarillo(1, `${ID_MOD} - ${JSON.stringify(req.params)}`);
    res.status(501).json({ message: "No implementado" });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    logamarillo(1, `${ID_MOD} - ${JSON.stringify(req.body)}`);
    res.status(501).json({ message: "No implementado" });
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    logamarillo(1, `${ID_MOD} - ${JSON.stringify(req.body)}`);
    res.status(501).json({ message: "No implementado" });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    logamarillo(1, `${ID_MOD} - ${JSON.stringify(req.body)}`);
    res.status(501).json({ message: "No implementado" });
  })
);

module.exports = router;
