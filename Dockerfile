# Usar Node.js con Debian para mejor compatibilidad con Puppeteer
FROM node:20-slim

# Establecer el directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema para Puppeteer
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias de Node.js
RUN npm ci --only=production

# Copiar el código fuente
COPY . .

# Crear directorios necesarios si no existen
RUN mkdir -p src/basedatos src/web/public datos

# Establecer Puppeteer para usar Chrome instalado
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

# Exponer el puerto que usa la aplicación (3000)
EXPOSE 3000

# Variable de entorno para el puerto (sobrescribir si es necesario)
ENV PORT=3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]