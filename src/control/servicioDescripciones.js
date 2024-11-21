const fs = require('fs');

const data = fs.readFileSync("./doc/mods_desc.json", 'utf8');
const descripcion = JSON.parse(data);

// Obtener un tooltip por clave
function getDescripcion(key) {
    return descripcion[key] || null;
}

module.exports = {    
    getDescripcion
};
