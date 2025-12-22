# Usar Debian slim para mejor compatibilidad con Puppeteer y módulos nativos
FROM node:20-slim

WORKDIR /app

# Instalar dependencias para Puppeteer (sin Chrome completo)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        fonts-liberation \
        libnss3 \
        libatk-bridge2.0-0 \
        libdrm2 \
        libxkbcommon0 \
        libxcomposite1 \
        libxdamage1 \
        libxrandr2 \
        libgbm1 \
        libxss1 \
        libasound2 \
        libcups2 \
        libgtk-3-0 \
        libgconf-2-4 \
        libxfixes3 \
        libatk1.0-0 \
        libcairo-gobject2 \
        libpango-1.0-0 \
        libgdk-pixbuf2.0-0 \
        libxcursor1 \
        libxi6 \
        libxtst6 \
        libpangocairo-1.0-0 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
