const { run, get, all } = require("../basedatos/db");
const { logamarillo } = require("../control/controlLog");

const ID_MOD = "DAO-TPOVAR";

const sql_create = `INSERT INTO tipo_variable (descriptor, orden) VALUES (?, ?)`;
const sql_getById = `SELECT * FROM tipo_variable WHERE id = ?`;
const sql_getByDescriptor = `SELECT * FROM tipo_variable WHERE descriptor = ?`;
const sql_getByOrden = `SELECT * FROM tipo_variable WHERE orden = ?`;
const sql_getAll = `SELECT * FROM tipo_variable`;
const sql_getTodosDescriptores = `SELECT DISTINCT descriptor, orden FROM tipo_variable ORDER BY orden`;
const sql_delete = `DELETE FROM tipo_variable WHERE id = ?`;

class TipoVariableDAO {
  async create(descriptor, orden) {
    logamarillo(1, `${ID_MOD} - create`);
    try {
      const result = await run(sql_create, [descriptor, orden]);
      return { id: result.lastID, descriptor, orden };
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }

  async getById(id) {
    logamarillo(1, `${ID_MOD} - getById`);
    try {
      return await get(sql_getById, [id]);
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }

  async getByDescriptor(descriptor) {
    logamarillo(1, `${ID_MOD} - getByDescriptor`);
    try {
      return await get(sql_getByDescriptor, [descriptor]);
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }

  async getByOrden(orden) {
    logamarillo(1, `${ID_MOD} - getByOrden`);
    try {
      return await get(sql_getByOrden, [orden]);
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }

  async getAll() {
    logamarillo(1, `${ID_MOD} - getAll`);
    try {
      return await all(sql_getAll, []);
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }

  async getTodosDescriptores() {
    logamarillo(1, `${ID_MOD} - getTodosDescriptores`);
    try {
      return await all(sql_getTodosDescriptores, []);
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }

  async delete(id) {
    logamarillo(1, `${ID_MOD} - delete`);
    try {
      const result = await run(sql_delete, [id]);
      return { changes: result.changes };
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }
}

module.exports = TipoVariableDAO;
