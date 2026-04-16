const test = require('node:test');
const assert = require('node:assert/strict');

const { runCurlDownload, downloadWithRetries } = require('../../src/etl/smbFetch');

test('downloadWithRetries retries then succeeds on third attempt', async () => {
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

  await downloadWithRetries({
    name: 'citec',
    url: 'https://files.example.com/citec.csv',
    outputPath: '/tmp/citec.csv',
    username: 'operador',
    password: 'fixture-secret',
    retryDelaysMs: [0, 5000, 10000, 20000, 40000],
    execFileFn,
    sleepFn: async (ms) => {
      sleepCalls.push(ms);
    },
    logFn: (message) => {
      logCalls.push(message);
    },
  });

  assert.equal(execCalls.length, 3);
  assert.deepEqual(execCalls[0], [
    'curl',
    [
      '--fail',
      '--silent',
      '--show-error',
      '--user',
      'operador:fixture-secret',
      'https://files.example.com/citec.csv',
      '-o',
      '/tmp/citec.csv',
    ],
  ]);
  assert.deepEqual(sleepCalls, [5000, 10000]);
  assert.equal(logCalls.some((message) => message.includes('citec') && message.includes('1/5')), true);
  assert.equal(logCalls.some((message) => message.includes('citec') && message.includes('2/5')), true);
  assert.equal(logCalls.some((message) => message.includes('citec') && message.includes('3/5')), true);
});

test('downloadWithRetries throws after exhausting retries', async () => {
  await assert.rejects(
    downloadWithRetries({
      name: 'citec',
      url: 'https://files.example.com/citec.csv',
      outputPath: '/tmp/citec.csv',
      username: 'operador',
      password: 'fixture-secret',
      retryDelaysMs: [0, 1000, 2000],
      execFileFn: async () => {
        throw new Error('fallo persistente');
      },
      sleepFn: async () => {},
      logFn: () => {},
    }),
    /No se pudo descargar citec tras 3 intentos/
  );
});

test('downloadWithRetries rejects empty retryDelaysMs array', async () => {
  await assert.rejects(
    downloadWithRetries({
      name: 'citec',
      url: 'https://files.example.com/citec.csv',
      outputPath: '/tmp/citec.csv',
      username: 'operador',
      password: 'fixture-secret',
      retryDelaysMs: [],
      execFileFn: async () => ({ stdout: 'ok', stderr: '' }),
      sleepFn: async () => {},
      logFn: () => {},
    }),
    {
      message: 'retryDelaysMs debe ser un arreglo no vacio de numeros finitos >= 0',
    }
  );
});

test('downloadWithRetries rejects retryDelaysMs with invalid values', async () => {
  await assert.rejects(
    downloadWithRetries({
      name: 'citec',
      url: 'https://files.example.com/citec.csv',
      outputPath: '/tmp/citec.csv',
      username: 'operador',
      password: 'fixture-secret',
      retryDelaysMs: [0, -1],
      execFileFn: async () => ({ stdout: 'ok', stderr: '' }),
      sleepFn: async () => {},
      logFn: () => {},
    }),
    {
      message: 'retryDelaysMs debe ser un arreglo no vacio de numeros finitos >= 0',
    }
  );
});

test('downloadWithRetries rejects non-array retryDelaysMs', async () => {
  await assert.rejects(
    downloadWithRetries({
      name: 'citec',
      url: 'https://files.example.com/citec.csv',
      outputPath: '/tmp/citec.csv',
      username: 'operador',
      password: 'fixture-secret',
      retryDelaysMs: 'bad',
      execFileFn: async () => ({ stdout: 'ok', stderr: '' }),
      sleepFn: async () => {},
      logFn: () => {},
    }),
    {
      message: 'retryDelaysMs debe ser un arreglo no vacio de numeros finitos >= 0',
    }
  );
});

test('downloadWithRetries rejects non-finite retryDelaysMs values', async () => {
  await assert.rejects(
    downloadWithRetries({
      name: 'citec',
      url: 'https://files.example.com/citec.csv',
      outputPath: '/tmp/citec.csv',
      username: 'operador',
      password: 'fixture-secret',
      retryDelaysMs: [0, Number.NaN],
      execFileFn: async () => ({ stdout: 'ok', stderr: '' }),
      sleepFn: async () => {},
      logFn: () => {},
    }),
    {
      message: 'retryDelaysMs debe ser un arreglo no vacio de numeros finitos >= 0',
    }
  );
});

test('runCurlDownload throws when credentials are missing', async () => {
  await assert.rejects(
    runCurlDownload({
      url: 'https://files.example.com/citec.csv',
      outputPath: '/tmp/citec.csv',
      username: '',
      password: '',
      execFileFn: async () => ({ stdout: '', stderr: '' }),
    }),
    {
      message: 'SMB_USER/SMB_PASS no definidos',
    }
  );
});

test('downloadWithRetries sanitizes SMB credentials in logs and thrown error', async () => {
  const password = 'fixture-secret';
  const logs = [];

  await assert.rejects(
    downloadWithRetries({
      name: 'wizcon',
      url: 'smb://10.10.3.2/SERVICOOP/RPT006.DAT',
      outputPath: '/tmp/wizcon.dat',
      username: 'operador',
      password,
      retryDelaysMs: [0],
      execFileFn: async () => {
        throw new Error(`curl: (67) login failed for operador:${password} and smb://operador:${password}@10.10.3.2`);
      },
      sleepFn: async () => {},
      logFn: (message) => {
        logs.push(message);
      },
    }),
    (error) => {
      assert.equal(error.message.includes(password), false);
      assert.equal(error.message.includes('[REDACTED]'), true);
      return true;
    }
  );

  assert.equal(logs.length > 0, true);
  assert.equal(logs.some((message) => message.includes(password)), false);
  assert.equal(logs.some((message) => message.includes('[REDACTED]')), true);
});
