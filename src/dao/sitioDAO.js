const config = require("../config/loader");
const { run, get, all } = require("../basedatos/db");
const { logamarillo } = require("../control/controlLog");

const ID_MOD = "DAO-SITIO";

const sql_create = `INSERT INTO sitio (descriptor, orden, rebalse, cubicaje, maxoperativo) VALUES (?, ?, ?, ?, ?)`;
const sql_getById = `SELECT * FROM sitio WHERE id = ?`;
const sql_getByDescriptor = `SELECT * FROM sitio WHERE descriptor = ?`;
const sql_getByOrden = `SELECT * FROM sitio WHERE orden = ?`;
const sql_getAll = `SELECT * FROM sitio`;
const sql_getTodosDescriptores = `SELECT DISTINCT descriptor, rebalse, cubicaje, maxoperativo FROM sitio ORDER BY orden`;
const sql_cantSitios = `SELECT COUNT(*) as cant FROM sitio`;
const sql_delete = `DELETE FROM sitio WHERE id = ?`;

const sitioDefaults = new Map(
  (config.sitios.defaults || []).map((sitio) => [
    sitio.descriptor,
    {
      rebalse: sitio.rebalse ?? 0.0,
      maxoperativo: sitio.maxoperativo ?? null,
      cubicaje: sitio.cubicaje ?? 0.0
    }
  ])
);

const sitiosMadryn = new Set(config.sitios.madryn || []);

function getDefaults(descriptor) {
  return sitioDefaults.get(descriptor) || {
    rebalse: 0.0,
    maxoperativo: null,
    cubicaje: 0.0
  };
}

class SitioDAO {
  async create(descriptor, orden) {
    logamarillo(1, `${ID_MOD} - create`);
    const defaults = getDefaults(descriptor);

    try {
      const result = await run(sql_create, [
        descriptor,
        orden,
        defaults.rebalse,
        defaults.cubicaje,
        defaults.maxoperativo
      ]);
      return {
        id: result.lastID,
        descriptor,
        orden,
        rebalse: defaults.rebalse,
        cubicaje: defaults.cubicaje,
        maxoperativo: defaults.maxoperativo
      };
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

  async getSitiosMadryn() {
    logamarillo(1, `${ID_MOD} - getSitiosMadryn`);
    return Array.from(sitiosMadryn);
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

  async cantSitios() {
    logamarillo(1, `${ID_MOD} - cantSitios`);
    try {
      const row = await get(sql_cantSitios, []);
      return row ? row.cant : 0;
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }

  async delete(id) {
    logamarillo(1, `${ID_MOD} - delete`);
    try {
      await run(sql_delete, [id]);
      return { id };
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }

  async getMaxoperativo(descriptor) {
    logamarillo(1, `${ID_MOD} - getMaxoperativo`);
    const defaults = sitioDefaults.get(descriptor);
    if (defaults !== undefined) {
      return defaults.maxoperativo;
    }

    const row = await this.getByDescriptor(descriptor);
    return row ? row.maxoperativo : null;
  }

  async getRebalse(descriptor) {
    logamarillo(1, `${ID_MOD} - getRebalse`);
    const defaults = sitioDefaults.get(descriptor);
    if (defaults !== undefined) {
      return defaults.rebalse;
    }

    const row = await this.getByDescriptor(descriptor);
    return row ? row.rebalse : null;
  }
}

module.exports = SitioDAO;
