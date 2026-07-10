const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeFixture } = require('./helpers');
const { globToRegExp, expandBraces } = require('../lib/fileTree');

test('expandBraces expands a single group', () => {
  assert.deepEqual(expandBraces('*.{js,ts}').sort(), ['*.js', '*.ts']);
});

test('globToRegExp: * does not cross directory boundaries', () => {
  const re = globToRegExp('src/*.js');
  assert.ok(re.test('src/app.js'));
  assert.ok(!re.test('src/nested/app.js'));
});

test('globToRegExp: ** crosses directories', () => {
  const re = globToRegExp('**/*.js');
  assert.ok(re.test('app.js'));
  assert.ok(re.test('src/deep/app.js'));
});

test('ctx.glob matches by extension with brace expansion', () => {
  const { ctx, cleanup } = makeFixture({
    'src/a.ts': '',
    'src/b.tsx': '',
    'src/c.js': '',
    'readme.md': '',
  });
  try {
    const hits = ctx.glob('**/*.{ts,tsx}').sort();
    assert.deepEqual(hits, ['src/a.ts', 'src/b.tsx']);
  } finally {
    cleanup();
  }
});

test('ctx.glob and file walk exclude ignored dirs and lockfiles', () => {
  const { ctx, cleanup } = makeFixture({
    'src/app.js': '',
    'node_modules/pkg/index.js': '',
    'dist/bundle.js': '',
    'package-lock.json': '',
  });
  try {
    assert.deepEqual(ctx.allFiles.sort(), ['src/app.js']);
    assert.deepEqual(ctx.glob('**/*.js'), ['src/app.js']);
  } finally {
    cleanup();
  }
});

test('ctx.manifest parses root package.json; fileExists/readFile work', () => {
  const { ctx, cleanup } = makeFixture({
    'package.json': '{"name":"demo","dependencies":{"zod":"^3"}}',
  });
  try {
    assert.equal(ctx.manifest.name, 'demo');
    assert.equal(ctx.manifest.dependencies.zod, '^3');
    assert.ok(ctx.fileExists('package.json'));
    assert.equal(ctx.fileExists('nope.js'), false);
    assert.equal(ctx.readFile('nope.js'), null);
  } finally {
    cleanup();
  }
});
