const assert = require('node:assert/strict');
const test = require('node:test');
const { ShieldEngine } = require('../dist/shield.engine');
const { PayloadCheck } = require('../dist/checks/payload.check');

test('rejects a parsed body that exceeds the byte limit', () => {
  const body = { message: 'ééé' };
  const result = PayloadCheck.run({ headers: {}, body }, { maxBodyBytes: 10 });

  assert.equal(result.allowed, false);
  assert.equal(result.status, 413);
});

test('uses raw body bytes when available', () => {
  const result = PayloadCheck.run(
    { headers: {}, rawBody: Buffer.from('12345'), body: '1' },
    { maxBodyBytes: 4 },
  );

  assert.equal(result.allowed, false);
  assert.match(result.reason, /5 exceeds limit 4/);
});

test('returns 431 for oversized headers through the engine', async () => {
  const engine = new ShieldEngine(
    { payload: { maxHeaderBytes: 1 } },
    {},
  );
  const result = await engine.run(
    { headers: { 'x-test': 'large' }, ip: '127.0.0.1' },
    { setHeader() {} },
  );

  assert.equal(result.allowed, false);
  assert.equal(result.exception.getStatus(), 431);
});
