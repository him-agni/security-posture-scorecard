const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('events');
const { createConcurrencyLimiter } = require('../lib/concurrencyLimiter');

// Minimal Express-ish res double.
function makeRes() {
  const res = new EventEmitter();
  res.statusCode = 200;
  res.headers = {};
  res.set = (k, v) => { res.headers[k] = v; return res; };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; res.emit('finish'); return res; };
  return res;
}

test('allows up to max concurrent requests, rejects the next with 429', () => {
  const limit = createConcurrencyLimiter({ max: 2 });
  const results = [];
  const run = () => {
    const res = makeRes();
    let passed = false;
    limit({}, res, () => { passed = true; });
    results.push({ res, passed });
    return results[results.length - 1];
  };

  const a = run();
  const b = run();
  const c = run(); // over the limit

  assert.equal(a.passed, true);
  assert.equal(b.passed, true);
  assert.equal(c.passed, false);
  assert.equal(c.res.statusCode, 429);
  assert.equal(c.res.headers['Retry-After'], '5');
  assert.equal(limit.active(), 2);
});

test('releases a slot when a response finishes', () => {
  const limit = createConcurrencyLimiter({ max: 1 });
  const first = makeRes();
  let firstPassed = false;
  limit({}, first, () => { firstPassed = true; });
  assert.equal(firstPassed, true);
  assert.equal(limit.active(), 1);

  // second is rejected while the first is in flight
  const second = makeRes();
  let secondPassed = false;
  limit({}, second, () => { secondPassed = true; });
  assert.equal(secondPassed, false);
  assert.equal(second.statusCode, 429);

  // finishing the first frees the slot
  first.emit('finish');
  assert.equal(limit.active(), 0);

  const third = makeRes();
  let thirdPassed = false;
  limit({}, third, () => { thirdPassed = true; });
  assert.equal(thirdPassed, true);
});

test('does not double-release on both finish and close', () => {
  const limit = createConcurrencyLimiter({ max: 1 });
  const res = makeRes();
  limit({}, res, () => {});
  assert.equal(limit.active(), 1);
  res.emit('finish');
  res.emit('close'); // must not drive active negative
  assert.equal(limit.active(), 0);
});
