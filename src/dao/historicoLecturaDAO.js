const { verLog } = require("../../config.json").desarrollo
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
const sql_delete = `DELETE FROM historico_lectura WHERE id = ?`;
// sqlite no acepta truncate, por lo que debe emularse su comportamiento con delete
const sql_truncate = `DELETE FROM historico_lectura; DELETE FROM SQLITE_SEQUENCE WHERE name="historico_lectura"`;

/*
*************************************************
*************** FIN CONSULTAS SQL ***************
************************************************* 
*/

function HistoricoLecturaDAO() { }

HistoricoLecturaDAO.prototype.create = function (sitio_id, tipo_id, valor, etiempo, callback) {

  if (verLog)
    console.log(`${ID_MOD} - create`);

  const db = getDatabase();

  db.run(sql_create, [sitio_id, tipo_id, valor, etiempo], function (_) {
    callback(null, { id: this.lastID, sitio_id, tipo_id, valor, etiempo });
  });
};

HistoricoLecturaDAO.prototype.getById = function (id, callback) {

  if (verLog)
    console.log(`${ID_MOD} - getById`);

  const db = getDatabase();

  db.get(sql_getById, [id], (_, row) => {
    callback(null, row);
  });
};

HistoricoLecturaDAO.prototype.existe = function (etiempo, callback) {

  if (verLog)
    console.log(`${ID_MOD} - existe`);

  const db = getDatabase();

  db.get(sql_existe, [etiempo], (_, row) => {    
    callback(null, row.existe);
  });
};


HistoricoLecturaDAO.prototype.getAll = function (callback) {

  if (verLog)
    console.log(`${ID_MOD} - getAll`);

  const db = getDatabase();

  db.all(sql_getAll, [], (_, rows) => {
    callback(null, rows);
  });
};

HistoricoLecturaDAO.prototype.getMostRecent = function (callback) {

  if (verLog)
    console.log(`${ID_MOD} - getMostRecent`);

  const db = getDatabase();

  db.all(sql_getMostRecent, (_, rows) => {
    callback(null, rows);
  });
};

HistoricoLecturaDAO.prototype.getHistorico = function (sitio_id, callback) {

  if (verLog)
    console.log(`${ID_MOD} - getHistorico`);

  const db = getDatabase();

  db.all(sql_getHistorico, [sitio_id], (_, rows) => {
    callback(null, rows);
  });
};

HistoricoLecturaDAO.prototype.delete = function (id, callback) {

  if (verLog)
    console.log(`${ID_MOD} - delete`);

  const db = getDatabase();

  db.run(sql_delete, [id], function (err) {
    callback(null, { changes: this.changes });
  });
};

HistoricoLecturaDAO.prototype.truncate = function (callback) {

  if (verLog)
    console.log(`${ID_MOD} - truncate`);

  const db = getDatabase();

  db.run(sql_truncate, function (err) {
    // TRUNCATE no devuelve el número de filas afectadas
    callback(null, { changes: "se borro todo el contenido de la tabla" });
  });
};

module.exports = HistoricoLecturaDAO;