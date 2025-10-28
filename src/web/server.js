const express = require('express');
const path = require('path');
const http = require('http');
const { logamarillo } = require("../control/controlLog");

const ID_MOD = "WEBSERV";
const app = express();

// Configurar Express para confiar en proxy headers de nginx
app.set('trust proxy', true);

const PORT = 3000;

// Middleware para Content-Security-Policy
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "\
    default-src 'self';\
    script-src 'self' 'unsafe-inline' 'unsafe-eval';\
    style-src 'self' 'unsafe-inline';\
    img-src 'self' data: blob:;\
    connect-src 'self';\
  ");
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  logamarillo(2, `${ID_MOD} - Solicitud para: ${req.path}`);
  next();
});

// Importar rutas
const sitioRoutes = require('./routes/sitio');
const tipoVarRoutes = require('./routes/tipovar');
const generalRoutes = require('./routes/general');

// Crear el servidor HTTP
const server = http.createServer(app).listen(PORT, () => {
  logamarillo(2, `${ID_MOD} - Escuchando en p=${PORT} (HTTP)`);
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
  // Las rutas ahora están en la raíz porque nginx reescribe /reporte/ a /
  app.use('/sitio', sitioRoutes);
  app.use('/tipovar', tipoVarRoutes);
  app.use('/', generalRoutes(observador));

  return {
    closeServer
  };
};