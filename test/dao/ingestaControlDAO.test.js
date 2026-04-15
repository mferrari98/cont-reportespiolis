const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const LOADER_PATH = require.resolve("../../src/config/loader");
const DB_PATH = require.resolve("../../src/basedatos/db");
const CREAR_TABLAS_PATH = require.resolve("../../src/basedatos/crear_tablas");
const DAO_PATH = require.resolve("../../src/dao/ingestaControlDAO");

function clearRequireCache() {
  delete require.cache[DAO_PATH];
  delete require.cache[CREAR_TABLAS_PATH];
  delete require.cache[DB_PATH];
  delete require.cache[LOADER_PATH];
}

test("createIfNotExists returns inserted false for duplicate loteHash", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ingesta-control-"));
  const tempDbPath = path.join(tempDir, "db.sqlite");

  t.after(async () => {
    try {
      clearRequireCache();
      process.env.DB_PATH = tempDbPath;
      const { closeDatabase } = require("../../src/basedatos/db");
      await closeDatabase();
    } finally {
      clearRequireCache();
      delete process.env.DB_PATH;
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  clearRequireCache();
  process.env.DB_PATH = tempDbPath;

  const { crearTablas } = require("../../src/basedatos/crear_tablas");
  const IngestaControlDAO = require("../../src/dao/ingestaControlDAO");

  const errors = await crearTablas();
  assert.equal(errors.err_ingesta_control, null);
  assert.equal(errors.err_idx_ingesta_control_etiempo, null);

  const dao = new IngestaControlDAO();
  const payload = {
    fuenteWizconHash: "wizcon-hash-1",
    fuenteCitecHash: "citec-hash-1",
    loteHash: "lote-hash-1",
    etiempoOrigen: 1760000000000,
  };

  const firstInsert = await dao.createIfNotExists(payload);
  assert.deepEqual(firstInsert, { inserted: true });
  assert.equal(await dao.existsByLoteHash(payload.loteHash), true);

  const secondInsert = await dao.createIfNotExists(payload);
  assert.deepEqual(secondInsert, { inserted: false });
});
