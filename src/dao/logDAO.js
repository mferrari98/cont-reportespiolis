const { run } = require("../basedatos/db");
const { logamarillo } = require("../control/controlLog");

const ID_MOD = "DAO-LOG";

const sql_create = `INSERT INTO log (descriptor, etiempo) VALUES (?, ?)`;

class LogDAO {
  async create(mensaje, etiempo) {
    logamarillo(1, `${ID_MOD} - create`);
    try {
      await run(sql_create, [mensaje, etiempo]);
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }
}

module.exports = LogDAO;
