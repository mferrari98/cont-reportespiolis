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
    password: 'super-secreto',
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
      'operador:super-secreto',
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
      password: 'super-secreto',
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
