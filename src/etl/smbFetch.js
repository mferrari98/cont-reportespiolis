const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const DEFAULT_RETRY_DELAYS_MS = [0, 5000, 10000, 20000, 40000];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function downloadFromSmb({
  fileName,
  remotePath,
  localPath,
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
  execFileFn = execFileAsync,
  sleepFn = sleep,
  logFn = () => {},
  env = process.env,
}) {
  if (!env.SMB_USER || !env.SMB_PASS) {
    throw new Error('SMB_USER/SMB_PASS no definidos');
  }

  const attempts = retryDelaysMs.length;

  for (let attemptIndex = 0; attemptIndex < attempts; attemptIndex += 1) {
    try {
      await execFileFn('smbclient', [
        remotePath,
        '-U',
        `${env.SMB_USER}%${env.SMB_PASS}`,
        '-c',
        `get "${fileName}" "${localPath}"`,
      ]);

      return;
    } catch (_error) {
      if (attemptIndex === attempts - 1) {
        throw new Error(`No se pudo descargar ${fileName} tras ${attempts} intentos`);
      }

      const nextAttempt = attemptIndex + 2;
      logFn(`Reintentando descarga ${nextAttempt}/${attempts} de ${fileName}`);
      await sleepFn(retryDelaysMs[attemptIndex + 1]);
    }
  }
}

module.exports = {
  downloadFromSmb,
};
