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

test("Observador wires tempDir SMB urls and retry delays from config keys", () => {
  const { config, Observador } = loadFreshObservadorAndConfig();
  const observador = new Observador();

  const expectedRetryDelaysMs = [
    0,
    ...config.observador.reintentos.backoff_segundos.map((delaySeconds) => delaySeconds * 1000),
  ].slice(0, config.observador.reintentos.max);

  assert.equal(observador.tempDir, config.ingesta.temp_dir);
  assert.equal(observador.smb.wizcon.url, config.ingesta.smb.wizcon_url);
  assert.equal(observador.smb.citec.url, config.ingesta.smb.citec_url);
  assert.deepEqual(observador.retryDelaysMs, expectedRetryDelaysMs);
});
