const test = require("node:test");
const assert = require("node:assert/strict");

const { Observador } = require("../../src/etl/observador");

test("runIngestionCycle omite ETL cuando loteHash ya existe", async () => {
  const downloadCalls = [];
  let mkdtempArg = null;
  let cleanupPath = null;
  let createIfNotExistsCalled = false;
  let etlCalled = false;

  const observador = new Observador({
    schedulerEnabled: false,
    tempDir: "/tmp/ingesta-observador-",
    retryDelaysMs: [0],
    smb: {
      wizcon: { url: "https://files.example.com/wizcon.csv" },
      citec: { url: "https://files.example.com/citec.csv" },
      username: "operador",
      password: "fixture-pass",
    },
    deps: {
      fsPromises: {
        mkdir: async () => {},
        mkdtemp: async (basePath) => {
          mkdtempArg = basePath;
          return "/tmp/ingesta-observador-run-123";
        },
        rm: async (targetPath) => {
          cleanupPath = targetPath;
        },
        readFile: async () => "",
      },
      path: {
        join: (...parts) => parts.join("/"),
      },
      downloadWithRetries: async (params) => {
        downloadCalls.push(params);
      },
      buildLoteHashes: async () => ({
        wizconHash: "wizcon-hash",
        citecHash: "citec-hash",
        loteHash: "lote-hash-duplicado",
      }),
      ingestaControlDAO: {
        existsByLoteHash: async () => true,
        createIfNotExists: async () => {
          createIfNotExistsCalled = true;
          return { inserted: true };
        },
      },
      lanzarETL: async () => {
        etlCalled = true;
      },
      lanzarReporte: async () => {},
      logamarillo: () => {},
    },
  });

  await observador.runIngestionCycle("startup");

  assert.equal(etlCalled, false);
  assert.equal(createIfNotExistsCalled, false);
  assert.deepEqual(downloadCalls.map((call) => call.name), ["wizcon", "citec"]);
  assert.equal(mkdtempArg, "/tmp/ingesta-observador-/run-");
  assert.equal(cleanupPath, "/tmp/ingesta-observador-run-123");
});
