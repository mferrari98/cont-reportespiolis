const { logamarillo } = require("../control/controlLog")
const { getDatabase } = require('../basedatos/db');

const ID_MOD = "DAO-TPOVAR"

const sql_create = `INSERT INTO tipo_variable (descriptor, orden) VALUES (?, ?)`;
const sql_getById = `SELECT * FROM tipo_variable WHERE id = ?`;
const sql_getByDescriptor = `SELECT * FROM tipo_variable WHERE descriptor = ?`;
const sql_getByOrden = `SELECT * FROM tipo_variable WHERE orden = ?`;
const sql_getAll = `SELECT * FROM tipo_variable`;
const sql_getTodosDescriptores = `SELECT DISTINCT descriptor FROM tipo_variable ORDER BY orden`;
const sql_delete = `DELETE FROM tipo_variable WHERE id = ?`;

function TipoVariableDAO() { }

TipoVariableDAO.prototype.create = function (descriptor, orden, callback) {

  logamarillo(1, `${ID_MOD} - create`);
  const db = getDatabase();

  db.run(sql_create, [descriptor, orden], function (err) {
    if (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      return callback(err, null);
    }
    callback(null, { id: this.lastID, descriptor });
  });
};

TipoVariableDAO.prototype.getById = function (id, callback) {

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

TipoVariableDAO.prototype.getByDescriptor = function (descriptor, callback) {

  logamarillo(1, `${ID_MOD} - getByDescriptor`);
  const db = getDatabase();

  db.get(sql_getByDescriptor, [descriptor], (err, row) => {
    if (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      return callback(err, null);
    }
    callback(null, row);
  });
};

TipoVariableDAO.prototype.getByOrden = function (orden, callback) {

  logamarillo(1, `${ID_MOD} - getByOrden`);
  const db = getDatabase();

  db.get(sql_getByOrden, [orden], (err, row) => {
    if (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      return callback(err, null);
    }
    callback(null, row);
  });
};

TipoVariableDAO.prototype.getAll = function (callback) {

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

TipoVariableDAO.prototype.getTodosDescriptores = function (callback) {

  logamarillo(1, `${ID_MOD} - getTodosDescriptores`);
  const db = getDatabase();

  db.all(sql_getTodosDescriptores, [], (err, rows) => {
    if (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      return callback(err, null);
    }
    callback(null, rows);
  });
};

TipoVariableDAO.prototype.delete = function (id, callback) {

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

module.exports = TipoVariableDAO;