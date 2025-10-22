const { logamarillo } = require("../control/controlLog")
const { getDatabase } = require('../basedatos/db');

const ID_MOD = "DAO-LOG";

/*
*************************************************
*************** INI CONSULTAS SQL ***************
************************************************* 
*/

const sql_create = `INSERT INTO log (descriptor, etiempo) VALUES (?, ?)`;

/*
*************************************************
*************** FIN CONSULTAS SQL ***************
************************************************* 
*/

function LogDAO() { }

LogDAO.prototype.create = function (mensaje, etiempo, callback) {

  logamarillo(1, `${ID_MOD} - create`);
  const db = getDatabase();

  db.run(sql_create, [mensaje, etiempo], function (err) {
    if (err) {
      logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
      return callback(err);
    }
    callback();
  });
};

module.exports = LogDAO;