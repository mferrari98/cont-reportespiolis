const sqlite3 = require("sqlite3").verbose();

const config = require("../config/loader");
const { logamarillo } = require("../control/controlLog");

const ID_MOD = "DB";

let db;

function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(config.dbPath, (err) => {
      if (err) {
        logamarillo(1, `${ID_MOD} - Error conectando a base de datos: ${err.message}`);
      } else {
        logamarillo(1, `${ID_MOD} - Conectado a base de datos`);
      }
    });
  }
  return db;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      resolve(database);
    } catch (err) {
      reject(err);
    }
  });
}

function closeDatabase() {
  return new Promise((resolve) => {
    if (!db) {
      resolve();
      return;
    }
    db.close(() => {
      logamarillo(1, `${ID_MOD} - Desconectado de base de datos`);
      db = null;
      resolve();
    });
  });
}

async function run(sql, params = []) {
  const database = getDatabase();
  return new Promise((resolve, reject) => {
    database.run(sql, params, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

async function get(sql, params = []) {
  const database = getDatabase();
  return new Promise((resolve, reject) => {
    database.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

async function all(sql, params = []) {
  const database = getDatabase();
  return new Promise((resolve, reject) => {
    database.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

async function exec(sql) {
  const database = getDatabase();
  return new Promise((resolve, reject) => {
    database.exec(sql, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

module.exports = {
  openDatabase,
  closeDatabase,
  getDatabase,
  run,
  get,
  all,
  exec
};
