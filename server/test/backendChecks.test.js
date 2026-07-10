const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeFixture } = require('./helpers');

const authPresent = require('../checks/backend/authPresent');
const corsConfig = require('../checks/backend/corsConfig');
const rateLimiting = require('../checks/backend/rateLimiting');
const securityHeaders = require('../checks/backend/securityHeaders');
const passwordHashing = require('../checks/backend/passwordHashing');
const authzChecks = require('../checks/backend/authzChecks');

function ctxOf(files) {
  const { ctx, cleanup } = makeFixture(files);
  return { ctx, cleanup };
}
// A minimal express app so hasBackend() is true.
const EXPRESS_PKG = '{"name":"api","dependencies":{"express":"^4"}}';
const SERVER = "const express = require('express'); const app = express();\n";

test('backend checks are N/A when there is no backend', () => {
  const { ctx, cleanup } = ctxOf({ 'package.json': '{"name":"lib"}', 'src/index.js': 'export const x=1;\n' });
  try {
    assert.equal(authPresent.run(ctx).status, 'na');
    assert.equal(rateLimiting.run(ctx).status, 'na');
    assert.equal(corsConfig.run(ctx).status, 'na');
  } finally {
    cleanup();
  }
});

test('authPresent passes when an auth library is present', () => {
  const { ctx, cleanup } = ctxOf({
    'package.json': '{"name":"api","dependencies":{"express":"^4","jsonwebtoken":"^9"}}',
    'server.js': SERVER,
  });
  try {
    assert.equal(authPresent.run(ctx).status, 'pass');
  } finally {
    cleanup();
  }
});

test('authPresent warns when a backend has no auth library', () => {
  const { ctx, cleanup } = ctxOf({ 'package.json': EXPRESS_PKG, 'server.js': SERVER });
  try {
    assert.equal(authPresent.run(ctx).status, 'warn');
  } finally {
    cleanup();
  }
});

test('corsConfig fails on a wildcard origin (verifiable misconfig)', () => {
  const { ctx, cleanup } = ctxOf({
    'package.json': '{"name":"api","dependencies":{"express":"^4","cors":"^2"}}',
    'server.js': SERVER + "app.use(cors({ origin: '*' }));\n",
  });
  try {
    const r = corsConfig.run(ctx);
    assert.equal(r.status, 'fail');
    assert.equal(r.confidence, 'verified');
  } finally {
    cleanup();
  }
});

test('corsConfig passes when origin is explicitly configured', () => {
  const { ctx, cleanup } = ctxOf({
    'package.json': '{"name":"api","dependencies":{"express":"^4","cors":"^2"}}',
    'server.js': SERVER + "app.use(cors({ origin: 'https://app.example.com' }));\n",
  });
  try {
    assert.equal(corsConfig.run(ctx).status, 'pass');
  } finally {
    cleanup();
  }
});

test('rateLimiting: present + applied is detected/pass; absent is warn', () => {
  const applied = ctxOf({
    'package.json': '{"name":"api","dependencies":{"express":"^4","express-rate-limit":"^7"}}',
    'server.js': SERVER + "const rateLimit = require('express-rate-limit');\napp.use(rateLimit({ windowMs: 1000 }));\n",
  });
  try {
    const r = rateLimiting.run(applied.ctx);
    assert.equal(r.status, 'pass');
    assert.equal(r.confidence, 'detected');
  } finally {
    applied.cleanup();
  }

  const absent = ctxOf({ 'package.json': EXPRESS_PKG, 'server.js': SERVER });
  try {
    assert.equal(rateLimiting.run(absent.ctx).status, 'warn');
  } finally {
    absent.cleanup();
  }
});

test('securityHeaders warns without helmet, passes with it', () => {
  const without = ctxOf({ 'package.json': EXPRESS_PKG, 'server.js': SERVER });
  try {
    assert.equal(securityHeaders.run(without.ctx).status, 'warn');
  } finally {
    without.cleanup();
  }
  const withHelmet = ctxOf({
    'package.json': '{"name":"api","dependencies":{"express":"^4","helmet":"^7"}}',
    'server.js': SERVER + 'app.use(helmet());\n',
  });
  try {
    assert.equal(securityHeaders.run(withHelmet.ctx).status, 'pass');
  } finally {
    withHelmet.cleanup();
  }
});

test('passwordHashing detects bcrypt usage', () => {
  const { ctx, cleanup } = ctxOf({
    'package.json': '{"name":"api","dependencies":{"express":"^4","bcrypt":"^5"}}',
    'auth.js': SERVER + "const bcrypt = require('bcrypt');\nconst hash = await bcrypt.hash(password, 10);\n",
  });
  try {
    const r = passwordHashing.run(ctx);
    assert.equal(r.status, 'pass');
    assert.equal(r.confidence, 'detected');
  } finally {
    cleanup();
  }
});

test('passwordHashing warns on password handling with no hashing', () => {
  const { ctx, cleanup } = ctxOf({
    'package.json': EXPRESS_PKG,
    'auth.js': SERVER + 'function register(user, password) { db.save({ user, password }); }\n',
  });
  try {
    assert.equal(passwordHashing.run(ctx).status, 'warn');
  } finally {
    cleanup();
  }
});

test('authzChecks detects a role check pattern', () => {
  const { ctx, cleanup } = ctxOf({
    'package.json': EXPRESS_PKG,
    'routes.js': SERVER + 'app.get("/admin", (req, res) => { if (req.user.role !== "admin") return res.sendStatus(403); });\n',
  });
  try {
    assert.equal(authzChecks.run(ctx).status, 'pass');
  } finally {
    cleanup();
  }
});
