const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const INVALID_RETRY_DELAYS_MSG = 'retryDelaysMs debe ser un arreglo no vacio de numeros finitos >= 0';
const REDACTED = '[REDACTED]';

function sanitizeSmbErrorMessage(message, { password }) {
  let sanitized = String(message || '');

  if (!sanitized) {
    return 'error SMB sin detalle';
  }

  if (password) {
    sanitized = sanitized.split(password).join(REDACTED);
  }

  sanitized = sanitized.replace(/(\/\/[^\s/:@]+:)([^@\s/]+)(@)/g, `$1${REDACTED}$3`);

  return sanitized;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runCurlDownload({
  url,
  outputPath,
  username,
  password,
  execFileFn = execFileAsync,
}) {
  if (!username || !password) {
    throw new Error('SMB_USER/SMB_PASS no definidos');
  }

  await execFileFn('curl', [
    '--fail',
    '--silent',
    '--show-error',
    '--user',
    `${username}:${password}`,
    url,
    '-o',
    outputPath,
  ]);
}

async function downloadWithRetries({
  name,
  url,
  outputPath,
  username,
  password,
  retryDelaysMs,
  execFileFn = execFileAsync,
  sleepFn = sleep,
  logFn = () => {},
}) {
  const hasValidRetryDelays =
    Array.isArray(retryDelaysMs) &&
    retryDelaysMs.length > 0 &&
    retryDelaysMs.every((delayMs) => Number.isFinite(delayMs) && delayMs >= 0);

  if (!hasValidRetryDelays) {
    throw new Error(INVALID_RETRY_DELAYS_MSG);
  }

  let lastErrorMessage = '';

  for (let attemptIndex = 0; attemptIndex < retryDelaysMs.length; attemptIndex += 1) {
    const attempt = attemptIndex + 1;
    const totalAttempts = retryDelaysMs.length;
    const delayMs = retryDelaysMs[attemptIndex];

    if (delayMs > 0) {
      await sleepFn(delayMs);
    }

    logFn(`Descargando ${name} intento ${attempt}/${totalAttempts}`);

    try {
      await runCurlDownload({
        url,
        outputPath,
        username,
        password,
        execFileFn,
      });

      return;
    } catch (error) {
      lastErrorMessage = sanitizeSmbErrorMessage(error.message, { username, password });
      logFn(`Fallo descarga ${name} intento ${attempt}/${totalAttempts}: ${lastErrorMessage}`);
    }
  }

  throw new Error(
    `No se pudo descargar ${name} tras ${retryDelaysMs.length} intentos: ${lastErrorMessage}`
  );
}

module.exports = {
  runCurlDownload,
  downloadWithRetries,
};
