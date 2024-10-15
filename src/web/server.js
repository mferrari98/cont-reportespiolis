/*
lo podes probar con
  curl -Uri "http://10.10.4.125:3000/sitio" -Method POST -ContentType "application/json" -Body '{"descriptor":"ee3"}'
*/
const express = require('express');
const path = require('path');

const { activo } = require("../../config.json").desarrollo
const { logamarillo } = require("../control/controlLog")

const ID_MOD = "WEBSERV"

const app = express();
app.use(express.json());

let currentPort = (activo) ? 3001 : 3000;        // Puerto inicial

/*
Middleware para configurar Content-Security-Policy
*/
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "\
    script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:" + currentPort + ";\
    style-src 'self' 'unsafe-inline' http://localhost:" + currentPort + ";\
    img-src 'self' data: blob: http://localhost:" + currentPort + ";\
    connect-src 'self' http://localhost:" + currentPort + ";\
    "
  );
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));
/*
alta de rutas para organizar mejor el codigo
*/
const sitioRoutes = require('./routes/sitio');
const tipoVarRoutes = require('./routes/tipovar');
const generalRoutes = require('./routes/general');
const desarrolloRoutes = require('./routes/desarrollo');

/*
levantar server
*/
const server = app.listen(currentPort, () => {
  logamarillo(1, `${ID_MOD} - Escuchando en p=${currentPort}`);
});

/*
gestionar conexiones abiertas
para poder hacer un cierre autoritario cuando sea necesario
*/
const connections = new Set();

server.on('connection', (conn) => {
  connections.add(conn);
  conn.on('close', () => {
    connections.delete(conn);
  });
});

server.on('error', (conn) => {
  logamarillo(1, `${ID_MOD} - Error abriendo puerto`);
})

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

  // Retornar lo que quieras, por ejemplo, iniciar un servidor o cualquier lógica
  return {
    closeServer
  };
};