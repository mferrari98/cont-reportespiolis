const { verLog } = require("../../config.json").desarrollo
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

  if (verLog)
    console.log(`${ID_MOD} - create`);

  const db = getDatabase();

  db.run(sql_create, [mensaje, etiempo], function (_) {
    callback();
  });
};

module.exports = LogDAO;