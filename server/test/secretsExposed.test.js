const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeFixture } = require('./helpers');
const secretsExposed = require('../checks/frontend/secretsExposed');

// Convenience: run the check over a fixture and return the result.
function run(files) {
  const { ctx, cleanup } = makeFixture(files);
  try {
    return secretsExposed.run(ctx);
  } finally {
    cleanup();
  }
}

const ruleIds = (r) => r.findings.map((f) => f.ruleId);
const stripeLikeKey = 'sk_' + 'live_' + 'abcdefghijklmnopqrstuvwx';

test('clean repo passes with no findings', () => {
  const r = run({
    'package.json': '{"name":"clean"}',
    'src/index.js': 'export const greet = (n) => `hi ${n}`;\n',
    '.gitignore': 'node_modules\n.env\n',
  });
  assert.equal(r.status, 'pass');
  assert.equal(r.confidence, 'verified');
  assert.equal(r.findings.length, 0);
});

test('detects a GitHub token in source', () => {
  const r = run({
    'src/config.js': 'const t = "ghp_1234567890abcdefghijklmnopqrstuvwxyz12";\n',
  });
  assert.equal(r.status, 'fail');
  assert.ok(ruleIds(r).includes('github-token'));
});

test('detects a Stripe live secret key', () => {
  const r = run({ 'src/pay.js': `const k = "${stripeLikeKey}";\n` });
  assert.ok(ruleIds(r).includes('stripe-secret-key'));
});

test('detects an AWS access key id (no placeholder word)', () => {
  const r = run({ 'src/aws.js': 'const id = "AKIAABCDEFGHIJKLMNOP";\n' });
  assert.ok(ruleIds(r).includes('aws-access-key-id'));
});

test('detects a DB connection string with credentials', () => {
  const r = run({ '.env.local': 'DB=postgres://user:supersecret@host:5432/db\n' });
  assert.ok(ruleIds(r).includes('postgres-connection-string'));
});

test('detects a private-key PEM block', () => {
  const r = run({
    'src/notes.txt': '-----BEGIN OPENSSH PRIVATE KEY-----\nZmFrZQ==\n-----END OPENSSH PRIVATE KEY-----\n',
  });
  assert.ok(ruleIds(r).includes('private-key-block'));
});

test('suppresses obvious placeholders (no false positive)', () => {
  const r = run({
    'src/config.js':
      'const key = "your-api-key-here";\nconst aws = "AKIAIOSFODNN7EXAMPLE";\nconst k = "changeme";\n',
  });
  assert.equal(r.findings.length, 0, `unexpected findings: ${JSON.stringify(r.findings)}`);
});

test('flags a committed real .env file', () => {
  const r = run({ '.env': 'API_KEY=whatever\n' });
  assert.ok(ruleIds(r).includes('committed-env-file'));
});

test('does NOT flag .env.example as a committed env file', () => {
  const r = run({ '.env.example': 'API_KEY=\n', '.gitignore': '.env\n' });
  assert.ok(!ruleIds(r).includes('committed-env-file'));
});

test('flags .env missing from .gitignore', () => {
  const r = run({ '.env.example': 'API_KEY=\n', '.gitignore': 'node_modules\ndist\n' });
  assert.ok(ruleIds(r).includes('env-not-gitignored'));
});

test('does not flag gitignore when .env IS ignored', () => {
  const r = run({ '.env.example': 'API_KEY=\n', '.gitignore': 'node_modules\n.env\n' });
  assert.ok(!ruleIds(r).includes('env-not-gitignored'));
});

test('flags a private-key file by name/extension', () => {
  const r = run({ 'id_rsa': 'fake\n', 'certs/server.pem': 'fake\n' });
  const ids = ruleIds(r);
  assert.equal(ids.filter((x) => x === 'private-key-file').length, 2);
});

test('ignores node_modules and lockfiles (noise reduction)', () => {
  const r = run({
    'node_modules/pkg/index.js': 'const t = "ghp_1234567890abcdefghijklmnopqrstuvwxyz12";\n',
    'package-lock.json': '{"key":"ghp_1234567890abcdefghijklmnopqrstuvwxyz12"}',
    'src/app.js': 'export const x = 1;\n',
  });
  assert.equal(r.status, 'pass');
  assert.equal(r.findings.length, 0);
});

test('reports a line number for in-source matches', () => {
  const r = run({ 'src/config.js': '// header\n\nconst t = "ghp_1234567890abcdefghijklmnopqrstuvwxyz12";\n' });
  const f = r.findings.find((x) => x.ruleId === 'github-token');
  assert.equal(f.line, 3);
});
