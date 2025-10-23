const fs = require('fs');
const path = require('path');

const ID_MOD = "CONFIG-LOADER";

/**
 * Expande las referencias a variables de entorno en un objeto
 * Reemplaza strings con formato ${VAR_NAME} por process.env.VAR_NAME
 *
 * @param {any} obj - Objeto a procesar
 * @param {string} currentPath - Ruta del objeto para mensajes de error
 * @returns {any} Objeto procesado con variables expandidas
 */
function expandEnvironmentVariables(obj, currentPath = '') {
    if (typeof obj === 'string') {
        // Buscar patrón ${VAR_NAME}
        const regex = /\$\{([^}]+)\}/g;
        let match;
        let result = obj;

        while ((match = regex.exec(obj)) !== null) {
            const varName = match[1];
            const envValue = process.env[varName];

            if (envValue === undefined) {
                console.warn(`[${ID_MOD}] ⚠️  Variable de entorno "${varName}" no definida en "${currentPath}". Se mantiene el valor original.`);
                continue;
            }

            // Si el string es exactamente ${VAR}, reemplazar todo (mantener tipo)
            if (obj === `\${${varName}}`) {
                // Si el valor contiene comas, convertir a array
                if (envValue.includes(',')) {
                    return envValue.split(',').map(item => item.trim());
                }
                return envValue;
            }

            // Si es parte de un string, reemplazar la porción
            result = result.replace(`\${${varName}}`, envValue);
        }

        return result;
    }

    if (Array.isArray(obj)) {
        return obj.map((item, index) =>
            expandEnvironmentVariables(item, `${currentPath}[${index}]`)
        );
    }

    if (obj !== null && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            const newPath = currentPath ? `${currentPath}.${key}` : key;
            result[key] = expandEnvironmentVariables(value, newPath);
        }
        return result;
    }

    return obj;
}

/**
 * Carga el archivo config.json y expande las variables de entorno
 * @returns {Object} Configuración procesada
 */
function loadConfig() {
    const configPath = path.join(__dirname, '../../config.json');

    try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        const expandedConfig = expandEnvironmentVariables(config);

        console.log(`[${ID_MOD}] ✓ Configuración cargada desde ${configPath}`);
        return expandedConfig;
    } catch (error) {
        console.error(`[${ID_MOD}] ✗ Error cargando configuración:`, error.message);
        throw error;
    }
}

// Exportar la configuración procesada como singleton
module.exports = loadConfig();
