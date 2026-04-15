const test = require('node:test');
const assert = require('node:assert/strict');

const { downloadFromSmb } = require('../../src/etl/smbFetch');

test('downloadFromSmb retries and succeeds on third attempt', async () => {
  const execCalls = [];
  const sleepCalls = [];
  const logCalls = [];

  const execFileFn = async (...args) => {
    execCalls.push(args);
    if (execCalls.length < 3) {
      throw new Error('fallo temporal');
    }

    return { stdout: 'ok', stderr: '' };
  };

  await downloadFromSmb({
    fileName: 'ventas.csv',
    remotePath: '//srv/reportes',
    localPath: '/tmp/ventas.csv',
    retryDelaysMs: [0, 100, 200, 400, 800],
    execFileFn,
    sleepFn: async (ms) => {
      sleepCalls.push(ms);
    },
    logFn: (message) => {
      logCalls.push(message);
    },
    env: {
      SMB_USER: 'operador',
      SMB_PASS: 'super-secreto',
    },
  });

  assert.equal(execCalls.length, 3);
  assert.deepEqual(sleepCalls, [100, 200]);
  assert.equal(logCalls.length, 2);
  assert.equal(logCalls.every((entry) => !entry.includes('super-secreto')), true);
});

test('downloadFromSmb throws after exhausting retries', async () => {
  const sleepCalls = [];

  await assert.rejects(
    downloadFromSmb({
      fileName: 'ventas.csv',
      remotePath: '//srv/reportes',
      localPath: '/tmp/ventas.csv',
      retryDelaysMs: [0, 100, 200, 400, 800],
      execFileFn: async () => {
        throw new Error('fallo persistente');
      },
      sleepFn: async (ms) => {
        sleepCalls.push(ms);
      },
      logFn: () => {},
      env: {
        SMB_USER: 'operador',
        SMB_PASS: 'super-secreto',
      },
    }),
    {
      message: 'No se pudo descargar ventas.csv tras 5 intentos',
    }
  );

  assert.deepEqual(sleepCalls, [100, 200, 400, 800]);
});

test('downloadFromSmb validates SMB credentials presence', async () => {
  await assert.rejects(
    downloadFromSmb({
      fileName: 'ventas.csv',
      remotePath: '//srv/reportes',
      localPath: '/tmp/ventas.csv',
      env: { SMB_USER: '', SMB_PASS: '' },
      execFileFn: async () => ({ stdout: '', stderr: '' }),
      sleepFn: async () => {},
      logFn: () => {},
    }),
    {
      message: 'SMB_USER/SMB_PASS no definidos',
    }
  );
});
