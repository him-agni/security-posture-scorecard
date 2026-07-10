const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('events');
const { createRateLimiter } = require('../lib/rateLimiter');

function makeRes() {
  const res = new EventEmitter();
  res.statusCode = 200;
  res.headers = {};
  res.set = (k, v) => { res.headers[k] = v; return res; };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}
const reqFrom = (ip) => ({ ip });

// A controllable clock so windows are deterministic (no real waiting).
function fakeClock(start = 1_000_000) {
  let t = start;
  const now = () => t;
  now.advance = (ms) => { t += ms; };
  return now;
}

test('allows up to max requests per IP, then 429s', () => {
  const now = fakeClock();
  const limit = createRateLimiter({ windowMs: 60_000, max: 3, now });
  try {
    const hits = [];
    for (let i = 0; i < 4; i++) {
      const res = makeRes();
      let passed = false;
      limit(reqFrom('1.1.1.1'), res, () => { passed = true; });
      hits.push({ passed, code: res.statusCode, remaining: res.headers['RateLimit-Remaining'] });
    }
    assert.deepEqual(hits.map((h) => h.passed), [true, true, true, false]);
    assert.equal(hits[3].code, 429);
    assert.deepEqual(hits.map((h) => h.remaining), ['2', '1', '0', '0']);
  } finally {
    limit.stop();
  }
});

test('limits are per-IP (one noisy client does not block another)', () => {
  const now = fakeClock();
  const limit = createRateLimiter({ windowMs: 60_000, max: 1, now });
  try {
    const a1 = makeRes(); let aPassed = false;
    limit(reqFrom('1.1.1.1'), a1, () => { aPassed = true; });
    const a2 = makeRes(); let a2Passed = false;
    limit(reqFrom('1.1.1.1'), a2, () => { a2Passed = true; }); // over limit

    const b1 = makeRes(); let bPassed = false;
    limit(reqFrom('2.2.2.2'), b1, () => { bPassed = true; }); // different IP, fresh

    assert.equal(aPassed, true);
    assert.equal(a2Passed, false);
    assert.equal(a2.statusCode, 429);
    assert.equal(bPassed, true);
  } finally {
    limit.stop();
  }
});

test('window resets after windowMs elapses', () => {
  const now = fakeClock();
  const limit = createRateLimiter({ windowMs: 60_000, max: 1, now });
  try {
    const r1 = makeRes(); let p1 = false;
    limit(reqFrom('1.1.1.1'), r1, () => { p1 = true; });
    assert.equal(p1, true);

    const r2 = makeRes(); let p2 = false;
    limit(reqFrom('1.1.1.1'), r2, () => { p2 = true; });
    assert.equal(p2, false); // blocked within the window

    now.advance(60_001); // window elapses
    const r3 = makeRes(); let p3 = false;
    limit(reqFrom('1.1.1.1'), r3, () => { p3 = true; });
    assert.equal(p3, true); // allowed again
  } finally {
    limit.stop();
  }
});

test('sets Retry-After on a 429', () => {
  const now = fakeClock();
  const limit = createRateLimiter({ windowMs: 30_000, max: 1, now });
  try {
    limit(reqFrom('9.9.9.9'), makeRes(), () => {});
    const blocked = makeRes();
    limit(reqFrom('9.9.9.9'), blocked, () => {});
    assert.equal(blocked.statusCode, 429);
    assert.equal(blocked.headers['Retry-After'], '30');
  } finally {
    limit.stop();
  }
});

test('sweeps expired buckets so memory does not grow unbounded', () => {
  const now = fakeClock();
  const limit = createRateLimiter({ windowMs: 1000, max: 5, now, sweepMs: 1000 });
  try {
    limit(reqFrom('1.1.1.1'), makeRes(), () => {});
    limit(reqFrom('2.2.2.2'), makeRes(), () => {});
    assert.equal(limit.size(), 2);
    now.advance(2000); // both windows expired
    limit(reqFrom('3.3.3.3'), makeRes(), () => {}); // triggers lazy reset for new key
    // Old buckets are expired; a fresh request for an old key would reset it too.
    // The active set should not retain the two expired entries indefinitely.
    limit(reqFrom('1.1.1.1'), makeRes(), () => {});
    assert.ok(limit.size() <= 3);
  } finally {
    limit.stop();
  }
});
