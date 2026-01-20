const { run, get, all, exec } = require("../basedatos/db");
const { logamarillo } = require("../control/controlLog");

const ID_MOD = "DAO-HISTORICO-LECTURA";

const sql_create = `INSERT INTO historico_lectura (sitio_id, tipo_id, valor, etiempo) VALUES (?, ?, ?, ?)`;
const sql_getById = `SELECT * FROM historico_lectura WHERE id = ?`;
const sql_existe = `
  SELECT EXISTS (
    SELECT 1
    FROM historico_lectura 
    WHERE etiempo = ?
  ) AS existe;
`;
const sql_getAll = `SELECT * FROM historico_lectura`;
const sql_getMostRecent = `
  SELECT hl.*
  FROM historico_lectura hl
  JOIN sitio s ON hl.sitio_id = s.id
  WHERE hl.etiempo = (SELECT MAX(etiempo) FROM historico_lectura)
  ORDER BY s.orden;
`;
const sql_getHistorico = `
  SELECT hl.*
  FROM historico_lectura hl
  JOIN tipo_variable tv ON hl.tipo_id = tv.id
  WHERE hl.sitio_id = ? AND tv.descriptor = 'Nivel[m]'
  ORDER BY etiempo;
`;
const sql_getHistoricoEtiempoCount = `
  SELECT COUNT(DISTINCT hl.etiempo) as total
  FROM historico_lectura hl
  JOIN tipo_variable tv ON hl.tipo_id = tv.id
  WHERE tv.descriptor = 'Nivel[m]'
`;
const sql_getHistoricoEtiempoPagDesc = `
  SELECT hl.etiempo
  FROM historico_lectura hl
  JOIN tipo_variable tv ON hl.tipo_id = tv.id
  WHERE tv.descriptor = 'Nivel[m]'
  GROUP BY hl.etiempo
  ORDER BY hl.etiempo DESC
  LIMIT 1 OFFSET ?
`;
const sql_getByEtiempo = `
  SELECT hl.*
  FROM historico_lectura hl
  JOIN sitio s ON hl.sitio_id = s.id
  WHERE hl.etiempo = ?
  ORDER BY s.orden;
`;
const sql_getHistorico_pag_desc = `
  SELECT *
  FROM (
    SELECT hl.*
    FROM historico_lectura hl
    JOIN tipo_variable tv ON hl.tipo_id = tv.id
    WHERE hl.sitio_id = ? AND tv.descriptor = 'Nivel[m]'
    ORDER BY etiempo DESC
    LIMIT ? OFFSET ?
  ) sub
  ORDER BY etiempo ASC;
`;
const sql_getHistorico_pag_desc_hasta = `
  SELECT *
  FROM (
    SELECT hl.*
    FROM historico_lectura hl
    JOIN tipo_variable tv ON hl.tipo_id = tv.id
    WHERE hl.sitio_id = ? AND tv.descriptor = 'Nivel[m]' AND hl.etiempo <= ?
    ORDER BY etiempo DESC
    LIMIT ? OFFSET ?
  ) sub
  ORDER BY etiempo ASC;
`;
const sql_getHistoricoCount = `
  SELECT COUNT(*) as total
  FROM historico_lectura hl
  JOIN tipo_variable tv ON hl.tipo_id = tv.id
  WHERE hl.sitio_id = ? AND tv.descriptor = 'Nivel[m]'
`;
const sql_delete = `DELETE FROM historico_lectura WHERE id = ?`;
const sql_truncate = `DELETE FROM historico_lectura; DELETE FROM SQLITE_SEQUENCE WHERE name="historico_lectura"`;
const sql_curar = `
  SELECT *, etiempo / 1000 % 3600 AS desv_sobre, abs(etiempo / 1000 % 3600 - 3600) as desv_sub
  FROM historico_lectura
  WHERE
    CASE
      WHEN desv_sobre > 900 THEN desv_sub > ?
      WHEN desv_sobre <= 900 THEN desv_sobre > ?
    END
`;

class HistoricoLecturaDAO {
  async create(sitio_id, tipo_id, valor, etiempo) {
    logamarillo(1, `${ID_MOD} - create`);
    try {
      const result = await run(sql_create, [sitio_id, tipo_id, valor, etiempo]);
      return { id: result.lastID, sitio_id, tipo_id, valor, etiempo };
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

  async existe(etiempo) {
    logamarillo(1, `${ID_MOD} - existe`);
    try {
      const row = await get(sql_existe, [etiempo]);
      return row ? row.existe === 1 : false;
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

  async getMostRecent() {
    logamarillo(1, `${ID_MOD} - getMostRecent`);
    try {
      return await all(sql_getMostRecent, []);
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }

  async getHistorico(sitio_id) {
    logamarillo(1, `${ID_MOD} - getHistorico`);
    try {
      return await all(sql_getHistorico, [sitio_id]);
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }

  async getHistoricoEtiempoCount() {
    logamarillo(1, `${ID_MOD} - getHistoricoEtiempoCount`);
    try {
      const row = await get(sql_getHistoricoEtiempoCount, []);
      return row ? row.total : 0;
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }

  async getHistoricoEtiempoPagDesc(offset) {
    logamarillo(1, `${ID_MOD} - getHistoricoEtiempoPagDesc offset=${offset}`);
    const safeOffset = Number.isFinite(Number(offset)) ? Math.max(parseInt(offset, 10), 0) : 0;
    try {
      const row = await get(sql_getHistoricoEtiempoPagDesc, [safeOffset]);
      return row ? row.etiempo : null;
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }

  async getByEtiempo(etiempo) {
    logamarillo(1, `${ID_MOD} - getByEtiempo etiempo=${etiempo}`);
    try {
      return await all(sql_getByEtiempo, [etiempo]);
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }

  async getHistoricoPagDesc(sitio_id, limit, offset) {
    logamarillo(1, `${ID_MOD} - getHistoricoPagDesc limit=${limit} offset=${offset}`);
    const l = Number.isFinite(Number(limit)) && Number(limit) > 0 ? parseInt(limit, 10) : 100;
    const o = Number.isFinite(Number(offset)) && Number(offset) >= 0 ? parseInt(offset, 10) : 0;
    try {
      return await all(sql_getHistorico_pag_desc, [sitio_id, l, o]);
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }

  async getHistoricoPagDescHasta(sitio_id, limit, offset, etiempo) {
    logamarillo(1, `${ID_MOD} - getHistoricoPagDescHasta limit=${limit} offset=${offset} etiempo=${etiempo}`);
    const l = Number.isFinite(Number(limit)) && Number(limit) > 0 ? parseInt(limit, 10) : 100;
    const o = Number.isFinite(Number(offset)) && Number(offset) >= 0 ? parseInt(offset, 10) : 0;
    try {
      return await all(sql_getHistorico_pag_desc_hasta, [sitio_id, etiempo, l, o]);
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }

  async getHistoricoCount(sitio_id) {
    logamarillo(1, `${ID_MOD} - getHistoricoCount sitio_id=${sitio_id}`);
    try {
      const row = await get(sql_getHistoricoCount, [sitio_id]);
      return row ? row.total : 0;
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

  async truncate() {
    logamarillo(1, `${ID_MOD} - truncate`);
    try {
      await exec(sql_truncate);
      return { changes: "se borro todo el contenido de la tabla" };
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }

  async listParaCurar(segundos) {
    logamarillo(1, `${ID_MOD} - listParaCurar`);
    try {
      return await all(sql_curar, [segundos, segundos]);
    } catch (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      throw err;
    }
  }
}

module.exports = HistoricoLecturaDAO;
