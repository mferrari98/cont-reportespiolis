const test = require("node:test");
const assert = require("node:assert/strict");

const LOADER_PATH = require.resolve("../../src/config/loader");

function loadConfigFresh() {
  delete require.cache[LOADER_PATH];
  return require("../../src/config/loader");
}

test("loader provides ingesta SMB and retry defaults", () => {
  const config = loadConfigFresh();

  assert.equal(config.observador.reintentos.max, 5);
  assert.deepEqual(config.observador.reintentos.backoff_segundos, [5, 10, 20, 40]);
  assert.equal(config.ingesta.temp_dir, "/tmp/reportespiolis");
  assert.equal(
    config.ingesta.smb.wizcon_url,
    "smb://10.10.3.2/SERVICOOP/RPT006.DAT"
  );
  assert.equal(
    config.ingesta.smb.citec_url,
    "smb://10.10.3.6/compartido/NivelCisSur.txt"
  );
});
