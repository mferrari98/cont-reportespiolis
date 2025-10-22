const { logamarillo } = require("../control/controlLog")
const { getDatabase } = require('../basedatos/db');

const ID_MOD = "DAO-HISTORICO-LECTURA";

/*
*************************************************
*************** INI CONSULTAS SQL ***************
************************************************* 
*/

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

/* SQL para paginar historico (limit/offset) en orden descendente por fecha para que pagina 1 sea la mas reciente */
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

/* SQL para contar registros históricos sin traerlos a memoria (optimización) */
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

/*
*************************************************
*************** FIN CONSULTAS SQL ***************
************************************************* 
*/

function HistoricoLecturaDAO() { }

HistoricoLecturaDAO.prototype.create = function (sitio_id, tipo_id, valor, etiempo, callback) {

  logamarillo(1, `${ID_MOD} - create`);
  const db = getDatabase();

  db.run(sql_create, [sitio_id, tipo_id, valor, etiempo], function (err) {
    if (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      return callback(err, null);
    }
    callback(null, { id: this.lastID, sitio_id, tipo_id, valor, etiempo });
  });
};

HistoricoLecturaDAO.prototype.getById = function (id, callback) {

  logamarillo(1, `${ID_MOD} - getById`);
  const db = getDatabase();

  db.get(sql_getById, [id], (err, row) => {
    if (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      return callback(err, null);
    }
    callback(null, row);
  });
};

HistoricoLecturaDAO.prototype.existe = function (etiempo, callback) {

  logamarillo(1, `${ID_MOD} - existe`);
  const db = getDatabase();

  db.get(sql_existe, [etiempo], (err, row) => {
    if (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      return callback(err, null);
    }
    callback(null, row.existe);
  });
};

HistoricoLecturaDAO.prototype.getAll = function (callback) {

  logamarillo(1, `${ID_MOD} - getAll`);
  const db = getDatabase();

  db.all(sql_getAll, [], (err, rows) => {
    if (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      return callback(err, null);
    }
    callback(null, rows);
  });
};

HistoricoLecturaDAO.prototype.getMostRecent = function (callback) {

  logamarillo(1, `${ID_MOD} - getMostRecent`);
  const db = getDatabase();

  db.all(sql_getMostRecent, (err, rows) => {
    if (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      return callback(err, null);
    }
    callback(null, rows);
  });
};

HistoricoLecturaDAO.prototype.getHistorico = function (sitio_id, callback) {

  logamarillo(1, `${ID_MOD} - getHistorico`);
  const db = getDatabase();

  db.all(sql_getHistorico, [sitio_id], (err, rows) => {
    if (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      return callback(err, null);
    }
    callback(null, rows);
  });
};

/*
  Nuevo metodo: getHistoricoPagDesc
  Retorna el historico en orden descendente, para que la pagina 1 sea la mas reciente.
*/
HistoricoLecturaDAO.prototype.getHistoricoPagDesc = function (sitio_id, limit, offset, callback) {

  logamarillo(1, `${ID_MOD} - getHistoricoPagDesc limit=${limit} offset=${offset}`);
  const db = getDatabase();

  const l = parseInt(limit) > 0 ? parseInt(limit) : 100;
  const o = parseInt(offset) >= 0 ? parseInt(offset) : 0;

  db.all(sql_getHistorico_pag_desc, [sitio_id, l, o], (err, rows) => {
    callback(null, rows);
  });
};

/**
 * Cuenta los registros históricos de un sitio sin traerlos a memoria
 * Optimización para paginación
 */
HistoricoLecturaDAO.prototype.getHistoricoCount = function (sitio_id, callback) {

  logamarillo(1, `${ID_MOD} - getHistoricoCount sitio_id=${sitio_id}`);
  const db = getDatabase();

  db.get(sql_getHistoricoCount, [sitio_id], (err, row) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, row ? row.total : 0);
    }
  });
};

HistoricoLecturaDAO.prototype.delete = function (id, callback) {

  logamarillo(1, `${ID_MOD} - delete`);
  const db = getDatabase();

  db.run(sql_delete, [id], function (err) {
    if (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      return callback(err, null);
    }
    callback(null, { changes: this.changes });
  });
};

HistoricoLecturaDAO.prototype.truncate = function (callback) {

  logamarillo(1, `${ID_MOD} - truncate`);
  const db = getDatabase();

  db.run(sql_truncate, function (err) {
    if (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      return callback(err, null);
    }
    callback(null, { changes: "se borro todo el contenido de la tabla" });
  });
};

HistoricoLecturaDAO.prototype.listParaCurar = function (segundos, callback) {

  logamarillo(1, `${ID_MOD} - listParaCurar`);
  const db = getDatabase();

  db.all(sql_curar, [segundos, segundos], (err, row) => {
    if (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      return callback(err, null);
    }
    callback(null, row);
  });
};

module.exports = HistoricoLecturaDAO;