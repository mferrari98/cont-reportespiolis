const { logamarillo } = require("./src/control/controlLog");
const { crearTablas } = require("./src/basedatos/crear_tablas");
const { closeDatabase } = require("./src/basedatos/db");
const observador = require("./src/etl/observador");
const createServer = require("./src/web/server");

const ID_MOD = "SUPERINDEX";

async function bootstrap() {
  try {
    const serverHandle = createServer(observador);
    const resumenErrores = await crearTablas();

    const resultado = Object.keys(resumenErrores)
      .map((key) => `${key}: ${resumenErrores[key] === null ? "null" : resumenErrores[key]}`)
      .join(", ");

    logamarillo(2, `ESQUEMA - resumen errores -> ${resultado}`);
    await observador.iniciar();

    const shutdown = async () => {
      observador.parar();
      await serverHandle.closeServer();
      await closeDatabase();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    logamarillo(1, `${ID_MOD} - Error inicializando: ${err.message}`);
    process.exit(1);
  }
}

process.on("unhandledRejection", (reason) => {
  logamarillo(1, `${ID_MOD} - Rechazo no manejado: ${reason}`);
});

process.on("uncaughtException", (err) => {
  logamarillo(1, `${ID_MOD} - Excepcion no manejada: ${err.message}`);
});

bootstrap();

logamarillo(1, `${ID_MOD} - Directorio trabajo:`, process.cwd());
logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);
