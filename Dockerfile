FROM node:20-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        python3 \
        build-essential \
        libcairo2-dev \
        libjpeg-dev \
        libgif-dev \
        libpango1.0-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --build-from-source=sqlite3

COPY config.json ./
COPY sitios.json ./
COPY index.js ./
COPY src ./src

CMD ["npm", "start"]
