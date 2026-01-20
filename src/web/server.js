const express = require("express");
const path = require("path");
const http = require("http");

const config = require("../config/loader");
const { logamarillo } = require("../control/controlLog");
const { notFoundHandler, errorHandler } = require("../core/http");

const ID_MOD = "WEBSERV";
const app = express();

app.set("trust proxy", config.server.trustProxy);

const PORT = config.server.port;

const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "form-action 'self'"
].join("; ");

app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", CSP_POLICY);
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  logamarillo(2, `${ID_MOD} - Solicitud para: ${req.path}`);
  next();
});

const sitioRoutes = require("./routes/sitio");
const tipoVarRoutes = require("./routes/tipovar");
const generalRoutes = require("./routes/general");

const server = http.createServer(app).listen(PORT, () => {
  logamarillo(2, `${ID_MOD} - Escuchando en p=${PORT} (HTTP)`);
});

const connections = new Set();

server.on("connection", (conn) => {
  connections.add(conn);
  conn.on("close", () => {
    connections.delete(conn);
  });
});

server.on("error", () => {
  logamarillo(1, `${ID_MOD} - Error abriendo puerto`);
});

function closeServer() {
  logamarillo(1, `${ID_MOD} - destruyendo ${connections.size} conexion`);
  for (const conn of connections) {
    conn.destroy();
  }

  return new Promise((resolve) => {
    server.close(() => {
      logamarillo(1, `${ID_MOD} - Server closed`);
      resolve();
    });
  });
}

module.exports = function (observador) {
  app.use("/sitio", sitioRoutes);
  app.use("/tipovar", tipoVarRoutes);
  app.use("/", generalRoutes(observador));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return { closeServer };
};
