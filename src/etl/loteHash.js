const crypto = require("node:crypto");
const fs = require("node:fs/promises");

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function buildLoteHashes(wizconPath, citecPath) {
  const [wizconBuffer, citecBuffer] = await Promise.all([
    fs.readFile(wizconPath),
    fs.readFile(citecPath),
  ]);

  const wizconHash = sha256(wizconBuffer);
  const citecHash = sha256(citecBuffer);
  const loteHash = sha256(`${wizconHash}:${citecHash}`);

  return { wizconHash, citecHash, loteHash };
}

module.exports = { buildLoteHashes };
