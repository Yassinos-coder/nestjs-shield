const assert = require('node:assert/strict');
const test = require('node:test');
const { ShieldEngine } = require('../dist/shield.engine');

test('keeps the rate-limit rejection when releasing a burst slot fails', async () => {
  let releaseCount = 0;
  const storage = {
    async incrementConcurrent() {
      return 1;
    },
    async decrementConcurrent() {
      releaseCount += 1;
      throw new Error('release failed');
    },
    async consumeToken() {
      return { allowed: false, remaining: 0, resetMs: 1_000, limit: 1 };
    },
  };
  const engine = new ShieldEngine(
    {
      burst: { maxConcurrent: 1 },
      rateLimit: { limit: 1, ttl: 60_000 },
    },
    storage,
  );

  const result = await engine.run(
    { headers: {}, ip: '127.0.0.1' },
    { setHeader() {} },
  );

  assert.equal(result.allowed, false);
  assert.equal(result.exception.getStatus(), 429);
  assert.equal(releaseCount, 1);
});
