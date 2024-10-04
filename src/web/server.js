/*
lo podes probar con
  curl -Uri "http://10.10.4.125:3000/sitio" -Method POST -ContentType "application/json" -Body '{"descriptor":"ee3"}'
*/
const express = require('express');
const path = require('path');

const ID_MOD = "WEBSERV"

const app = express();
app.use(express.json());

const MAX_RETRIES = 3; // Límite de intentos para encontrar un puerto
let currentPort = 3000; // Puerto inicial

/*
Middleware para configurar Content-Security-Policy
*/
app.use((req, res, next) => {
 res.setHeader("Content-Security-Policy", "\
    script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:" + currentPort + ";\
    style-src 'self' 'unsafe-inline' http://localhost:" + currentPort + ";\
    img-src 'self' data: blob: http://localhost:" + currentPort + ";\
    connect-src 'self' http://localhost:" + currentPort + " https://raw.githubusercontent.com;\
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
const server = app.listen(3000, () => {
  console.log(`${ID_MOD} - Escuchando p=3000`);
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

function closeServer(cb) {

  console.log(`WEBSERV - destruyendo ${connections.size} conexion`);
  for (const conn of connections) {
    conn.destroy();
  }

  server.close(() => {
    console.log('WEBSERV - Server closed');
    cb();
  });
}

module.exports = function (observador) {

  app.use('/sitio', sitioRoutes);
  app.use('/tipovar', tipoVarRoutes);
  app.use('/reporte', generalRoutes(observador));
  app.use('/bd', desarrolloRoutes);

  // Retornar lo que quieras, por ejemplo, iniciar un servidor o cualquier lógica
  return {
    closeServer
  };
};