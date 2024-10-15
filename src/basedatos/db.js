const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const { activo } = require("../../config.json").desarrollo
const { logamarillo } = require("../control/controlLog")

const ID_MOD = "DB"

let dbPath

if(activo)
  dbPath = path.resolve(__dirname, 'desarrollo.sqlite');
else
  dbPath = path.resolve(__dirname, 'database.sqlite');

let db;

function openDatabase() {
  if (!db) {
    db = new sqlite3.Database(dbPath, (_) => {
      logamarillo(1, `${ID_MOD} - Conectado a base de datos`)
    });
  }
}

function closeDatabase(cb) {
  db.close((_) => {
    logamarillo(1, `${ID_MOD} - Desconectado de base de datos`)
    cb()
  });
}

function getDatabase() {
  if (!db) {
    openDatabase();
  }
  return db;
}

module.exports = {
  openDatabase,
  closeDatabase,
  getDatabase,
};