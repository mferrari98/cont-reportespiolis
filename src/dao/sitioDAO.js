const { logamarillo } = require("../control/controlLog");
const { getDatabase } = require("../basedatos/db");

const ID_MOD = "DAO-SITIO";

const sql_create = `INSERT INTO sitio (descriptor, orden, rebalse, cubicaje, maximo_operativo) VALUES (?, ?, ?, ?, ?)`;
const sql_getById = `SELECT * FROM sitio WHERE id = ?`;
const sql_getByDescriptor = `SELECT * FROM sitio WHERE descriptor = ?`;
const sql_getByOrden = `SELECT * FROM sitio WHERE orden = ?`;
const sql_getAll = `SELECT * FROM sitio`;
const sql_getTodosDescriptores = `SELECT DISTINCT descriptor, rebalse, cubicaje, maximo_operativo FROM sitio ORDER BY orden`;
const sql_cantSitios = `SELECT COUNT(*) as cant FROM sitio`;
const sql_delete = `DELETE FROM sitio WHERE id = ?`;

const rebalseMap = new Map([
	["Toma(Rio)", 4.0],
	["Toma(Des.)", 3.0],
	["P.Pot", 3.0],
	["L.Maria", 5.0],
	["KM11", 5.0],
	["B.SAN MIGUEL", 4.0],
	["R6000", 4.0],
	["B.OESTE(1K)", 5.0],
	["NUEVA CHUBUT", 4.0],
	["B.PUJOL", 3.0],
	["Cota45", 4.4],
	["Cota126", 4.0],
	["Doradillo", 4.0],
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

const maximoOperativoMap = new Map([
	["L.Maria", 4.45],
	["KM11", 4.4],
	["R6000", 3.5],
	["B.OESTE(1K)", 3.33],
	["B.SAN MIGUEL", 3.05],
	["NUEVA CHUBUT", 3.4],
	["B.PUJOL", 2.06],
	["Cota45", 3.09],
	["Doradillo", 2.89],
]);

function SitioDAO() { }

SitioDAO.prototype.create = function (descriptor, orden, callback) {

	logamarillo(1, `${ID_MOD} - create`);
	const db = getDatabase();
	const rebalse = rebalseMap.get(descriptor) || 0.0;
	const cubicaje = cubicajeMap.get(descriptor) || 0.0;
	const maximoOperativo = maximoOperativoMap.get(descriptor) || null;

	db.run(sql_create, [descriptor, orden, rebalse, cubicaje, maximoOperativo], function (err) {
		if (err) {
			logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
			return callback(err, null);
		}
		callback(null, { id: this.lastID, descriptor, orden, rebalse, maximoOperativo });
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

// Nuevo método para obtener maximo_operativo por descriptor
SitioDAO.prototype.getMaximoOperativo = function (descriptor, callback) {
	logamarillo(1, `${ID_MOD} - getMaximoOperativo`);

	// Primero intentar obtener del mapa hardcodeado
	const maximoOperativo = maximoOperativoMap.get(descriptor);
	if (maximoOperativo !== undefined) {
		return callback(null, maximoOperativo);
	}

	// Si no está en el mapa, buscar en base de datos
	const db = getDatabase();
	db.get(sql_getByDescriptor, [descriptor], (err, row) => {
		if (err) {
			logamarillo(2, `${ID_MOD} - Error DB: ${err.message}`);
			return callback(err, null);
		}
		callback(null, row ? row.maximo_operativo : null);
	});
};

module.exports = SitioDAO;
