const assert = require('node:assert/strict');
const test = require('node:test');
const { BurstCheck } = require('../dist/checks/burst.check');
const { BURST_LEASE_REFRESH_MS, BURST_LEASE_TTL_MS } = require('../dist/shield.constants');

test('refreshes active burst leases and releases each slot only once', async () => {
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  let intervalCallback;
  let cleared = false;
  let refresh;
  let decrementCount = 0;
  global.setInterval = (callback, intervalMs) => {
    assert.equal(intervalMs, BURST_LEASE_REFRESH_MS);
    intervalCallback = callback;
    return { unref() {} };
  };
  global.clearInterval = () => {
    cleared = true;
  };

  try {
    const result = await BurstCheck.check(
      {
        async incrementConcurrent() {
          return 1;
        },
        async decrementConcurrent() {
          decrementCount += 1;
          return 0;
        },
        async refreshConcurrent(key, ttlMs) {
          refresh = { key, ttlMs };
        },
      },
      '127.0.0.1',
      { maxConcurrent: 1 },
    );

    intervalCallback();
    await new Promise(setImmediate);
    assert.deepEqual(refresh, { key: 'shield:burst:127.0.0.1', ttlMs: BURST_LEASE_TTL_MS });

    await result.release();
    await result.release();
    assert.equal(cleared, true);
    assert.equal(decrementCount, 1);
  } finally {
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
  }
});
