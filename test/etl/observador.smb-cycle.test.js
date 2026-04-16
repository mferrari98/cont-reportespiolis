const test = require("node:test");
const assert = require("node:assert/strict");

const { Observador } = require("../../src/etl/observador");

function buildObservadorWithDownloadFailure(options = {}) {
  const rmCalls = [];
  const notifyCalls = [];
  const downloadError = options.downloadError || new Error("fallo descarga wizcon");

  const observador = new Observador({
    schedulerEnabled: false,
    tempDir: "/tmp/ingesta-observador-",
    retryDelaysMs: [0],
    smb: {
      wizcon: { url: "https://files.example.com/wizcon.csv" },
      citec: { url: "https://files.example.com/citec.csv" },
      username: "operador",
      password: "secreto",
    },
    deps: {
      fsPromises: {
        mkdir: async () => {},
        mkdtemp: async () => "/tmp/ingesta-observador-run-123",
        rm: async (targetPath) => {
          rmCalls.push(targetPath);
        },
        readFile: async () => "",
      },
      path: {
        join: (...parts) => parts.join("/"),
      },
      downloadWithRetries: async () => {
        throw downloadError;
      },
      buildLoteHashes: async () => ({
        wizconHash: "wizcon-hash",
        citecHash: "citec-hash",
        loteHash: "lote-hash",
      }),
      ingestaControlDAO: {
        existsByLoteHash: async () => false,
        createIfNotExists: async () => ({ inserted: true }),
      },
      notificarFallo: async (...args) => {
        notifyCalls.push(args);
        if (typeof options.notificarFalloImpl === "function") {
          return options.notificarFalloImpl(...args);
        }
      },
      logamarillo: () => {},
    },
  });

  return { observador, rmCalls, notifyCalls, downloadError };
}

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
      password: "secreto",
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

test("runIngestionCycle notifica fallo de descarga y resetea isChecking", async () => {
  const { observador, notifyCalls, downloadError } = buildObservadorWithDownloadFailure();

  await observador.runIngestionCycle("hourly");

  assert.equal(notifyCalls.length, 1);
  assert.equal(notifyCalls[0][0], downloadError.message);
  assert.equal(observador.isChecking, false);
});

test("runIngestionCycle no propaga error si notificarFallo falla", async () => {
  const { observador } = buildObservadorWithDownloadFailure({
    notificarFalloImpl: async () => {
      throw new Error("fallo notificando");
    },
  });

  await assert.doesNotReject(() => observador.runIngestionCycle("hourly"));
  assert.equal(observador.isChecking, false);
});

test("runIngestionCycle omite ETL si createIfNotExists devuelve inserted false", async () => {
  let etlCalled = false;
  const logs = [];

  const observador = new Observador({
    schedulerEnabled: false,
    tempDir: "/tmp/ingesta-observador-",
    retryDelaysMs: [0],
    smb: {
      wizcon: { url: "https://files.example.com/wizcon.csv" },
      citec: { url: "https://files.example.com/citec.csv" },
      username: "operador",
      password: "secreto",
    },
    deps: {
      fsPromises: {
        mkdir: async () => {},
        mkdtemp: async () => "/tmp/ingesta-observador-run-123",
        rm: async () => {},
        readFile: async () => "",
      },
      path: {
        join: (...parts) => parts.join("/"),
      },
      downloadWithRetries: async () => {},
      buildLoteHashes: async () => ({
        wizconHash: "wizcon-hash",
        citecHash: "citec-hash",
        loteHash: "lote-hash",
      }),
      ingestaControlDAO: {
        existsByLoteHash: async () => false,
        createIfNotExists: async () => ({ inserted: false }),
      },
      lanzarETL: async () => {
        etlCalled = true;
      },
      lanzarReporte: async () => {},
      logamarillo: (_level, message) => {
        logs.push(message);
      },
    },
  });

  await observador.runIngestionCycle("hourly");

  assert.equal(etlCalled, false);
  assert.equal(logs.some((message) => message.includes("insercion concurrente duplicada")), true);
});

test("runIngestionCycle intenta cleanup aun si falla descarga", async () => {
  const { observador, rmCalls } = buildObservadorWithDownloadFailure();

  await observador.runIngestionCycle("hourly");

  assert.deepEqual(rmCalls, ["/tmp/ingesta-observador-run-123"]);
});
