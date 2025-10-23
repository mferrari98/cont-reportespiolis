#!/bin/bash

# Ruta del directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Archivo .env
ENV_FILE="$SCRIPT_DIR/.env"

# Verificar si existe el archivo .env
if [ -f "$ENV_FILE" ]; then
    echo "📄 Cargando variables de entorno desde .env..."

    # Leer y exportar cada variable del archivo .env
    # Ignora líneas vacías y comentarios (#)
    while IFS='=' read -r key value; do
        # Saltar líneas vacías y comentarios
        [[ -z "$key" || "$key" =~ ^#.*$ ]] && continue

        # Eliminar espacios en blanco alrededor de la clave y valor
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)

        # Exportar la variable
        export "$key=$value"
        echo "  ✓ $key"
    done < "$ENV_FILE"

    echo "✅ Variables de entorno cargadas"
else
    echo "⚠️  Archivo .env no encontrado. Usando valores por defecto de config.json"
fi

# Lanzar la aplicación Node.js
echo "🚀 Iniciando aplicación..."
cd "$SCRIPT_DIR"
exec node index.js
