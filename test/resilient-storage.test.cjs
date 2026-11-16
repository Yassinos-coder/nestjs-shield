const assert = require('node:assert/strict');
const test = require('node:test');
const { ResilientStorage } = require('../dist/storage/resilient.storage');
const { StorageFactory } = require('../dist/storage/storage.factory');

test('emits one event on fallback and another when primary storage recovers', async () => {
  let available = false;
  const events = [];
  const primary = {
    async increment() {
      if (!available) throw new Error('redis unavailable');
      return { count: 10, expiresAt: Date.now() + 1_000 };
    },
  };
  const storage = new ResilientStorage(primary, {
    failOpen: true,
    onEvent(event) {
      events.push(event);
    },
  });

  assert.equal((await storage.increment('key', 1_000)).count, 1);
  assert.equal((await storage.increment('key', 1_000)).count, 2);
  assert.deepEqual(events.map((event) => event.type), ['storage-fallback']);
  assert.equal(events[0].operation, 'increment');

  available = true;
  assert.equal((await storage.increment('key', 1_000)).count, 10);
  assert.deepEqual(events.map((event) => event.type), ['storage-fallback', 'storage-recovered']);

  await storage.dispose();
});

test('StorageFactory forwards storage health events from Redis fallback', async () => {
  const events = [];
  const storage = StorageFactory.build({
    storage: {
      type: 'redis',
      client: {
        async eval() {
          throw new Error('redis unavailable');
        },
      },
    },
    onEvent(event) {
      events.push(event);
    },
  });

  await storage.increment('key', 1_000);
  assert.equal(events[0].type, 'storage-fallback');
  await storage.dispose?.();
});
