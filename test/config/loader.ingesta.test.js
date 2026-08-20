const test = require("node:test");
const assert = require("node:assert/strict");

const LOADER_PATH = require.resolve("../../src/config/loader");

function loadConfigFresh() {
  delete require.cache[LOADER_PATH];
  return require("../../src/config/loader");
}

function withEnv(overrides, fn) {
  const previous = {};
  for (const key of Object.keys(overrides)) {
    previous[key] = process.env[key];
    process.env[key] = overrides[key];
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
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

test("loader enables email delivery by default", () => {
  const config = withEnv({ EMAIL_ENABLED: "" }, () => loadConfigFresh());

  assert.equal(config.email.enabled, true);
});

test("loader disables email delivery with EMAIL_ENABLED=false", () => {
  const config = withEnv({ EMAIL_ENABLED: "false" }, () => loadConfigFresh());

  assert.equal(config.email.enabled, false);
});

test("loader accepts numeric and no-style false values for EMAIL_ENABLED", () => {
  const zeroConfig = withEnv({ EMAIL_ENABLED: "0" }, () => loadConfigFresh());
  const noConfig = withEnv({ EMAIL_ENABLED: "no" }, () => loadConfigFresh());

  assert.equal(zeroConfig.email.enabled, false);
  assert.equal(noConfig.email.enabled, false);
});
