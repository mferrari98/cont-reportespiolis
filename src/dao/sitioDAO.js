const { logamarillo } = require("../control/controlLog");
const { getDatabase } = require("../basedatos/db");

const ID_MOD = "DAO-SITIO";

const sql_create = `INSERT INTO sitio (descriptor, orden, rebalse, cubicaje, maxoperativo) VALUES (?, ?, ?, ?, ?)`;
const sql_getById = `SELECT * FROM sitio WHERE id = ?`;
const sql_getByDescriptor = `SELECT * FROM sitio WHERE descriptor = ?`;
const sql_getByOrden = `SELECT * FROM sitio WHERE orden = ?`;
const sql_getAll = `SELECT * FROM sitio`;
const sql_getTodosDescriptores = `SELECT DISTINCT descriptor, rebalse, cubicaje, maxoperativo FROM sitio ORDER BY orden`;
const sql_cantSitios = `SELECT COUNT(*) as cant FROM sitio`;
const sql_delete = `DELETE FROM sitio WHERE id = ?`;

const sitioConfigMap = new Map([
	["Toma(Rio)", { rebalse: 4.0, maxoperativo: null }],
	["Toma(Des.)", { rebalse: 3.0, maxoperativo: null }],
	["P.Pot", { rebalse: 3.0, maxoperativo: null }],
	["L.Maria", { rebalse: 5.0, maxoperativo: 4.45 }],
	["KM11", { rebalse: 5.0, maxoperativo: 4.4 }],
	["B.SAN MIGUEL", { rebalse: 4.0, maxoperativo: 3.05 }],
	["R6000", { rebalse: 4.0, maxoperativo: 3.5 }],
	["B.OESTE(1K)", { rebalse: 5.0, maxoperativo: 3.33 }],
	["NUEVA CHUBUT", { rebalse: 4.0, maxoperativo: 3.4 }],
	["B.PUJOL", { rebalse: 3.0, maxoperativo: 2.06 }],
	["Cota45", { rebalse: 4.4, maxoperativo: 3.09 }],
	["Cota126", { rebalse: 4.0, maxoperativo: null }],
	["Doradillo", { rebalse: 4.0, maxoperativo: 2.89 }],
]);

const cubicajeMap = new Map([
	["L.Maria", 1086.95],
	["KM11", 3260.86],
	["B.SAN MIGUEL", 263.15],
	["R6000", 1714.28],
	["B.OESTE(1K)", 342.85],
	["NUEVA CHUBUT", 263.15],
	["B.PUJOL", 80],
	["Cota45", 277.77],
	["Cota(126)", 54.54],
	["Doradillo", 71.83],
]);

function SitioDAO() { }

SitioDAO.prototype.create = function (descriptor, orden, callback) {

	logamarillo(1, `${ID_MOD} - create`);
	const db = getDatabase();
	const config = sitioConfigMap.get(descriptor) || { rebalse: 0.0, maxoperativo: null };
	const rebalse = config.rebalse;
	const maxoperativo = config.maxoperativo;
	const cubicaje = cubicajeMap.get(descriptor) || 0.0;

	db.run(sql_create, [descriptor, orden, rebalse, cubicaje, maxoperativo], function (err) {
		if (err) {
			logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
			return callback(err, null);
		}
		callback(null, { id: this.lastID, descriptor, orden, rebalse, cubicaje, maxoperativo });
	});
};

SitioDAO.prototype.getById = function (id, callback) {
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

SitioDAO.prototype.getByDescriptor = function (descriptor, callback) {
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

SitioDAO.prototype.getByOrden = function (orden, callback) {
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

SitioDAO.prototype.getSitiosMadryn = function (callback) {
	logamarillo(1, `${ID_MOD} - getByOrden`);
	callback(null, [
		"L.Maria",
		"KM11",
		"R6000",
		"B.OESTE(1K)",
		"B.SAN MIGUEL",
		"NUEVA CHUBUT",
		"B.PUJOL",
		"Cota45",
		"Doradillo",
	]);
};

SitioDAO.prototype.getAll = function (callback) {
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

SitioDAO.prototype.getTodosDescriptores = function (callback) {
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

SitioDAO.prototype.cantSitios = function (callback) {
	logamarillo(1, `${ID_MOD} - cantSitios`);
	const db = getDatabase();

	db.get(sql_cantSitios, [], (err, ret) => {
		if (err) {
			logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
			return callback(err, null);
		}
		callback(null, ret.cant);
	});
};

SitioDAO.prototype.delete = function (id, callback) {
	logamarillo(1, `${ID_MOD} - delete`);
	const db = getDatabase();

	db.run(sql_delete, [id], function (err) {
		if (err) {
			logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
			return callback(err, null);
		}
		callback(null, { id });
	});
};

// Método para obtener maxoperativo por descriptor
SitioDAO.prototype.getMaxoperativo = function (descriptor, callback) {
	logamarillo(1, `${ID_MOD} - getMaxoperativo`);

	// Primero intentar obtener del mapa hardcodeado
	const config = sitioConfigMap.get(descriptor);
	if (config !== undefined) {
		return callback(null, config.maxoperativo);
	}

	// Si no está en el mapa, buscar en base de datos
	const db = getDatabase();
	db.get(sql_getByDescriptor, [descriptor], (err, row) => {
		if (err) {
			logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
			return callback(err, null);
		}
		callback(null, row ? row.maxoperativo : null);
	});
};

// Método para obtener rebalse por descriptor (ahora desde el mapa combinado)
SitioDAO.prototype.getRebalse = function (descriptor, callback) {
	logamarillo(1, `${ID_MOD} - getRebalse`);

	// Primero intentar obtener del mapa hardcodeado
	const config = sitioConfigMap.get(descriptor);
	if (config !== undefined) {
		return callback(null, config.rebalse);
	}

	// Si no está en el mapa, buscar en base de datos
	const db = getDatabase();
	db.get(sql_getByDescriptor, [descriptor], (err, row) => {
		if (err) {
			logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
			return callback(err, null);
		}
		callback(null, row ? row.rebalse : null);
	});
};

module.exports = SitioDAO;
