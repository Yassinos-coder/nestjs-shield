const assert = require('node:assert/strict');
const test = require('node:test');
const { UaUtil } = require('../dist/utils/ua.util');
const { PathUtil } = require('../dist/utils/path.util');

test('global user-agent patterns match consistently across requests', () => {
  const pattern = /bot/g;

  assert.equal(UaUtil.match('crawler bot', [pattern]), true);
  assert.equal(UaUtil.match('crawler bot', [pattern]), true);
  assert.equal(pattern.lastIndex, 0);
});

test('sticky path patterns match consistently across requests', () => {
  const pattern = /^\/private/y;

  assert.equal(PathUtil.matches('/private/data', [pattern]), true);
  assert.equal(PathUtil.matches('/private/data', [pattern]), true);
  assert.equal(pattern.lastIndex, 0);
});
