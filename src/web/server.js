const express = require('express');
const path = require('path');
const https = require('https');
const fs = require('fs');
const { activo } = require("../../config.json").desarrollo;
const { logamarillo } = require("../control/controlLog");

const ID_MOD = "WEBSERV";
const app = express();
app.use(express.json());

let currentPort = (activo) ? 3001 : 3000;  // Puerto inicial

// Opciones HTTPS
const httpsOptions = {
  key: fs.readFileSync('./src/web/cert/server.key'),
  cert: fs.readFileSync('./src/web/cert/server.crt'),
  passphrase: 'escadadiamasdificil',
};

// Middleware para Content-Security-Policy
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "\
    default-src 'self' https://localhost:" + currentPort + ";\
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://localhost:" + currentPort + ";\
    style-src 'self' 'unsafe-inline' https://localhost:" + currentPort + ";\
    img-src 'self' data: blob: https://localhost:" + currentPort + ";\
    connect-src 'self' https://localhost:" + currentPort + ";\
  ");
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

// Importar rutas
const sitioRoutes = require('./routes/sitio');
const tipoVarRoutes = require('./routes/tipovar');
const generalRoutes = require('./routes/general');
const desarrolloRoutes = require('./routes/desarrollo');

// Crear el servidor HTTPS
const server = https.createServer(httpsOptions, app).listen(currentPort, () => {
  logamarillo(2, `${ID_MOD} - Escuchando en p=${currentPort} (HTTPS)`);
});

// Gestionar conexiones abiertas
const connections = new Set();

server.on('connection', (conn) => {
  connections.add(conn);
  conn.on('close', () => {
    connections.delete(conn);
  });
});

server.on('error', (conn) => {
  logamarillo(1, `${ID_MOD} - Error abriendo puerto`);
});

// Función para cerrar el servidor
function closeServer(cb) {

  logamarillo(1, `${ID_MOD} - destruyendo ${connections.size} conexion`);
  for (const conn of connections) {
    conn.destroy();
  }
  server.close(() => {
    logamarillo(1, `${ID_MOD} - Server closed`);
    cb();
  });
}

module.exports = function (observador) {
  app.use('/sitio', sitioRoutes);
  app.use('/tipovar', tipoVarRoutes);
  app.use('/reporte', generalRoutes(observador));
  app.use('/desa', desarrolloRoutes);

  return {
    closeServer
  };
};