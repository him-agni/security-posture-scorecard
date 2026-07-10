const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeFixture } = require('./helpers');
const check = require('../checks/frontend/clientSecretExposure');

function run(files) {
  const { ctx, cleanup } = makeFixture(files);
  try {
    return check.run(ctx);
  } finally {
    cleanup();
  }
}

const stripeLikeKey = 'sk_' + 'live_' + 'abcdefghijklmnopqrstuvwx';

test('flags a VITE_ var holding a secret-looking value', () => {
  const r = run({ '.env': `VITE_STRIPE_KEY=${stripeLikeKey}\n` });
  assert.equal(r.status, 'fail');
  assert.match(r.findings[0].message, /VITE_STRIPE_KEY/);
});

test('does NOT flag a client var pointing at a public URL', () => {
  const r = run({ '.env': 'VITE_API_URL=https://api.example.com/v1\n' });
  assert.equal(r.status, 'pass');
});

test('does NOT flag a boolean/short config flag', () => {
  const r = run({ '.env': 'VITE_FEATURE_X=true\nNEXT_PUBLIC_PORT=3000\n' });
  assert.equal(r.status, 'pass');
});

test('ignores non-client-prefixed secrets (those are secretsExposed\'s job)', () => {
  const r = run({ '.env': `SERVER_SECRET=${stripeLikeKey}\n` });
  assert.equal(r.status, 'pass');
});

test('flags a client var with a long high-entropy value', () => {
  const r = run({ 'src/config.js': 'export const REACT_APP_TOKEN = "a1b2c3d4e5f6g7h8i9j0k1l2";\n' });
  assert.equal(r.status, 'fail');
});
