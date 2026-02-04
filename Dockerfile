FROM node:20-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        wget \
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
        python3 \
        make \
        g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm_config_build_from_source=true npm ci \
    && apt-get purge -y python3 make g++ \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

COPY config.json ./
COPY sitios.json ./
COPY index.js ./
COPY src ./src

CMD ["npm", "start"]
