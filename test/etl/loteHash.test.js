const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { buildLoteHashes } = require("../../src/etl/loteHash");

test("buildLoteHashes changes loteHash when one source changes", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "lote-hash-"));
  const wizconPath = path.join(tempDir, "wizcon.csv");
  const citecPath = path.join(tempDir, "citec.csv");

  try {
    await fs.writeFile(wizconPath, "w1\n");
    await fs.writeFile(citecPath, "c1\n");

    const first = await buildLoteHashes(wizconPath, citecPath);

    await fs.writeFile(wizconPath, "w2\n");

    const second = await buildLoteHashes(wizconPath, citecPath);

    assert.notEqual(first.wizconHash, second.wizconHash);
    assert.equal(first.citecHash, second.citecHash);
    assert.notEqual(first.loteHash, second.loteHash);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
