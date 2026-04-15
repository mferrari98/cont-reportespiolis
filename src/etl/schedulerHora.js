function getNextTopOfHour(now = new Date()) {
  const nextTop = new Date(now);
  nextTop.setMinutes(0, 0, 0);
  nextTop.setHours(nextTop.getHours() + 1);
  return nextTop;
}

function msUntilNextTopOfHour(now = new Date()) {
  if (
    now.getMinutes() === 0 &&
    now.getSeconds() === 0 &&
    now.getMilliseconds() === 0
  ) {
    return 0;
  }

  return getNextTopOfHour(now).getTime() - now.getTime();
}

function buildRetryDelaysMs(retryDelaysSeconds, _firstAttemptDelaySeconds) {
  const delaysMs = retryDelaysSeconds.map((delaySeconds) => delaySeconds * 1000);
  return [0, ...delaysMs];
}

module.exports = {
  getNextTopOfHour,
  msUntilNextTopOfHour,
  buildRetryDelaysMs,
};
