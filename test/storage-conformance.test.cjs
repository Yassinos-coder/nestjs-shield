const assert = require('node:assert/strict');
const test = require('node:test');
const { FixedWindow } = require('../dist/algorithms/fixed-window');
const { LeakyBucket } = require('../dist/algorithms/leaky-bucket');
const { SlidingWindowCounter } = require('../dist/algorithms/sliding-window-counter');
const { SlidingWindowLog } = require('../dist/algorithms/sliding-window-log');
const { TokenBucket } = require('../dist/algorithms/token-bucket');
const { MemoryStorage } = require('../dist/storage/memory.storage');
const { RedisStorage } = require('../dist/storage/redis.storage');
const { RateLimitCheck } = require('../dist/checks/rate-limit.check');

const storageFactories = [['memory', async () => ({ storage: new MemoryStorage() })]];
if (process.env.SHIELD_TEST_REDIS_URL) {
  storageFactories.push([
    'redis',
    async () => {
      const Redis = require('ioredis');
      const client = new Redis(process.env.SHIELD_TEST_REDIS_URL);
      const storage = new RedisStorage({
        client,
        keyPrefix: `shield-test:${process.pid}:${Date.now()}:${Math.random()}`,
      });
      return {
        storage,
        async dispose() {
          await client.quit();
        },
      };
    },
  ]);
}

for (const [name, create] of storageFactories) {
  test(`${name} storage supports rate-limit algorithms and concurrent leases`, async () => {
    const adapter = await create();
    const { storage } = adapter;
    const key = `${name}:${Date.now()}:${Math.random()}`;
    try {
      const algorithms = [
        [TokenBucket, 'consumeToken'],
        [SlidingWindowCounter, 'slidingWindowCounter'],
        [SlidingWindowLog, 'slidingWindowLog'],
        [FixedWindow, 'fixedWindow'],
        [LeakyBucket, 'leakyBucket'],
      ];
      for (const [algorithm, suffix] of algorithms) {
        const first = await algorithm.check(storage, `${key}:${suffix}`, 1, 60_000);
        const second = await algorithm.check(storage, `${key}:${suffix}`, 1, 60_000);
        assert.equal(first.allowed, true, `${suffix} should allow the first hit`);
        assert.equal(second.allowed, false, `${suffix} should reject the next hit`);
      }

      for (const algorithm of [
        'token-bucket',
        'sliding-window',
        'sliding-window-log',
        'fixed-window',
        'leaky-bucket',
      ]) {
        const req = { headers: {}, method: 'GET', url: `/${key}/${algorithm}` };
        const config = { algorithm, limit: 1, ttl: 60_000 };
        assert.equal((await RateLimitCheck.check(storage, req, '127.0.0.1', config)).allowed, true);
        assert.equal((await RateLimitCheck.check(storage, req, '127.0.0.1', config)).allowed, false);
      }

      assert.equal(await storage.incrementConcurrent(key), 1);
      await storage.refreshConcurrent?.(key, 60_000);
      assert.equal(await storage.decrementConcurrent(key), 0);

      await storage.set(`${key}:value`, 'stored', 60_000);
      assert.equal(await storage.get(`${key}:value`), 'stored');
      await storage.delete(`${key}:value`);
      assert.equal(await storage.get(`${key}:value`), null);
    } finally {
      await storage.dispose?.();
      await adapter.dispose?.();
    }
  });
}
