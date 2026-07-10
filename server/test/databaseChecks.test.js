const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeFixture } = require('./helpers');

const dbCredentials = require('../checks/database/dbCredentials');
const encryptionInTransit = require('../checks/database/encryptionInTransit');
const querySafety = require('../checks/database/querySafety');
const schemaValidation = require('../checks/database/schemaValidation');
const manualChecklist = require('../checks/database/manualChecklist');

function ctxOf(files) {
  const { ctx, cleanup } = makeFixture(files);
  return { ctx, cleanup };
}
const MONGOOSE_PKG = '{"name":"api","dependencies":{"mongoose":"^8"}}';
const mongoCredentialUrl =
  'mongodb://' + 'admin' + ':' + 's3cr3t' + '@' + 'cluster0.mongodb.net/app';
const mongoSrvCredentialUrl =
  'mongodb+srv://' + 'user' + ':' + 'pass' + '@' + 'cluster0.mongodb.net/app';

test('database checks are N/A when there is no database', () => {
  const { ctx, cleanup } = ctxOf({ 'package.json': '{"name":"lib"}', 'src/index.js': 'export const x=1;\n' });
  try {
    assert.equal(dbCredentials.run(ctx).status, 'na');
    assert.equal(encryptionInTransit.run(ctx).status, 'na');
    assert.equal(querySafety.run(ctx).status, 'na');
    assert.deepEqual(manualChecklist.run(ctx).checklist, []);
  } finally {
    cleanup();
  }
});

test('dbCredentials fails on a hardcoded connection string', () => {
  const { ctx, cleanup } = ctxOf({
    'package.json': MONGOOSE_PKG,
    'db.js': `const mongoose = require('mongoose');\nmongoose.connect('${mongoCredentialUrl}');\n`,
  });
  try {
    const r = dbCredentials.run(ctx);
    assert.equal(r.status, 'fail');
    assert.equal(r.confidence, 'verified');
  } finally {
    cleanup();
  }
});

test('dbCredentials passes when the URI comes from process.env', () => {
  const { ctx, cleanup } = ctxOf({
    'package.json': MONGOOSE_PKG,
    'db.js': "const mongoose = require('mongoose');\nmongoose.connect(process.env.MONGODB_URI);\n",
  });
  try {
    assert.equal(dbCredentials.run(ctx).status, 'pass');
  } finally {
    cleanup();
  }
});

test('encryptionInTransit passes on mongodb+srv (implies TLS)', () => {
  const { ctx, cleanup } = ctxOf({
    'package.json': MONGOOSE_PKG,
    '.env.example': `MONGODB_URI=${mongoSrvCredentialUrl}\n`,
    'db.js': 'mongoose.connect(process.env.MONGODB_URI);\n',
  });
  try {
    assert.equal(encryptionInTransit.run(ctx).status, 'pass');
  } finally {
    cleanup();
  }
});

test('encryptionInTransit warns when no TLS indicator is present', () => {
  const { ctx, cleanup } = ctxOf({
    'package.json': '{"name":"api","dependencies":{"pg":"^8"}}',
    'db.js': "const { Pool } = require('pg');\nconst pool = new Pool({ connectionString: process.env.DATABASE_URL });\n",
  });
  try {
    assert.equal(encryptionInTransit.run(ctx).status, 'warn');
  } finally {
    cleanup();
  }
});

test('querySafety warns on a string-concatenated SQL query', () => {
  const { ctx, cleanup } = ctxOf({
    'package.json': '{"name":"api","dependencies":{"pg":"^8"}}',
    'users.js': 'const q = "SELECT * FROM users WHERE id = " + req.params.id;\ndb.query(q);\n',
  });
  try {
    const r = querySafety.run(ctx);
    assert.equal(r.status, 'warn');
    assert.equal(r.confidence, 'detected');
  } finally {
    cleanup();
  }
});

test('querySafety passes when an ORM is used with no raw queries', () => {
  const { ctx, cleanup } = ctxOf({
    'package.json': MONGOOSE_PKG,
    'users.js': 'const User = require("./User");\nconst u = await User.findById(id);\n',
  });
  try {
    assert.equal(querySafety.run(ctx).status, 'pass');
  } finally {
    cleanup();
  }
});

test('schemaValidation passes when a Mongoose schema is defined', () => {
  const { ctx, cleanup } = ctxOf({
    'package.json': MONGOOSE_PKG,
    'User.js': "const mongoose = require('mongoose');\nconst schema = new mongoose.Schema({ email: { type: String, required: true } });\n",
  });
  try {
    assert.equal(schemaValidation.run(ctx).status, 'pass');
  } finally {
    cleanup();
  }
});

test('manualChecklist emits the 4 advisory items when a database exists', () => {
  const { ctx, cleanup } = ctxOf({ 'package.json': MONGOOSE_PKG, 'db.js': 'mongoose.connect(process.env.MONGO_URI);\n' });
  try {
    const r = manualChecklist.run(ctx);
    assert.equal(r.status, 'na');
    assert.equal(r.confidence, 'manual');
    assert.equal(r.checklist.length, 4);
    assert.ok(r.checklist.every((i) => i.why && i.severity && i.label));
    assert.ok(r.checklist.some((i) => i.id === 'encryption-at-rest'));
  } finally {
    cleanup();
  }
});
