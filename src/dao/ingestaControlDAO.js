const { run, get } = require("../basedatos/db");
const { logamarillo } = require("../control/controlLog");

const ID_MOD = "DAO-INGESTA-CONTROL";

const sql_existsByLoteHash = `
  SELECT 1
  FROM ingesta_control
  WHERE lote_hash = ?
  LIMIT 1
`;

const sql_createIfNotExists = `
  INSERT OR IGNORE INTO ingesta_control (
    fuente_wizcon_hash,
    fuente_citec_hash,
    lote_hash,
    etiempo_origen
  ) VALUES (?, ?, ?, ?)
`;

class IngestaControlDAO {
  async existsByLoteHash(loteHash) {
    logamarillo(1, `${ID_MOD} - existsByLoteHash`);
    try {
      const row = await get(sql_existsByLoteHash, [loteHash]);
      return Boolean(row);
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }

  async createIfNotExists({ fuenteWizconHash, fuenteCitecHash, loteHash, etiempoOrigen }) {
    logamarillo(1, `${ID_MOD} - createIfNotExists`);
    try {
      const result = await run(sql_createIfNotExists, [
        fuenteWizconHash,
        fuenteCitecHash,
        loteHash,
        etiempoOrigen,
      ]);

      return { inserted: result.changes > 0 };
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }
}

module.exports = IngestaControlDAO;
