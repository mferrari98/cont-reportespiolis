const test = require("node:test");
const assert = require("node:assert/strict");

const LOADER_PATH = require.resolve("../../src/config/loader");
const OBSERVADOR_PATH = require.resolve("../../src/etl/observador");

function loadFreshObservadorAndConfig() {
  delete require.cache[LOADER_PATH];
  delete require.cache[OBSERVADOR_PATH];

  const config = require("../../src/config/loader");
  const { Observador } = require("../../src/etl/observador");

  return { config, Observador };
}

test("Observador wires mounted-file defaults from config", () => {
  const originalArgv = process.argv;
  process.argv = process.argv.slice(0, 2);

  try {
    const { config, Observador } = loadFreshObservadorAndConfig();
    const observador = new Observador();

    assert.equal(observador.dirWizcon, config.direcciones.sca_wizcon);
    assert.equal(observador.dirCitec, config.direcciones.cota45);
    assert.equal(observador.checkInterval, config.observador.tiempo_milis);
    assert.equal(observador.cantLineasCitec, config.observador.citec_lineas);
    assert.equal(observador.filePath, null);
  } finally {
    process.argv = originalArgv;
  }
});
