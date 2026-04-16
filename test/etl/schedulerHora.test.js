const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getNextTopOfHour,
  msUntilNextTopOfHour,
  buildRetryDelaysMs,
} = require('../../src/etl/schedulerHora');

test('getNextTopOfHour next exact hour', () => {
  const now = new Date('2026-04-15T10:15:30.250Z');
  const nextTop = getNextTopOfHour(now);

  assert.deepEqual(nextTop, new Date('2026-04-15T11:00:00.000Z'));
});

test('msUntilNextTopOfHour returns 0 at exact top', () => {
  const now = new Date('2026-04-15T10:00:00.000Z');
  const ms = msUntilNextTopOfHour(now);

  assert.equal(ms, 0);
});

test('buildRetryDelaysMs returns [0,5000,10000,20000,40000] for input [5,10,20,40],5', () => {
  const delaysMs = buildRetryDelaysMs([5, 10, 20, 40], 5);

  assert.deepEqual(delaysMs, [0, 5000, 10000, 20000, 40000]);
});
