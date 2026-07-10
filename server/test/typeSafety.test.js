const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeFixture } = require('./helpers');
const check = require('../checks/frontend/typeSafety');

function run(files) {
  const { ctx, cleanup } = makeFixture(files);
  try {
    return check.run(ctx);
  } finally {
    cleanup();
  }
}

test('passes when tsconfig has strict mode on', () => {
  const r = run({
    'tsconfig.json': '{ "compilerOptions": { "strict": true } }',
    'src/app.ts': 'export const x: number = 1;\n',
  });
  assert.equal(r.status, 'pass');
  assert.equal(r.meta.strict, true);
});

test('warns when tsconfig exists but strict is off', () => {
  const r = run({
    'tsconfig.json': '{ "compilerOptions": { "strict": false } }',
    'src/app.ts': 'export const x = 1;\n',
  });
  assert.equal(r.status, 'warn');
  assert.equal(r.meta.strict, false);
});

test('warns when the project is plain JS (no TypeScript)', () => {
  const r = run({ 'src/a.js': 'export const x = 1;\n', 'src/b.js': 'export const y = 2;\n' });
  assert.equal(r.status, 'warn');
  assert.equal(r.meta.tsFiles, 0);
});

test('tolerates comments in tsconfig when probing strict', () => {
  const r = run({
    'tsconfig.json': '{\n  // strictness matters\n  "compilerOptions": { "strict": true }\n}',
    'src/app.ts': 'export const x: number = 1;\n',
  });
  assert.equal(r.meta.strict, true);
  assert.equal(r.status, 'pass');
});

test('does not count .d.ts files toward TS share', () => {
  const r = run({
    'tsconfig.json': '{ "compilerOptions": { "strict": true } }',
    'src/app.ts': 'export const x: number = 1;\n',
    'types/global.d.ts': 'declare const G: string;\n',
  });
  assert.equal(r.meta.tsFiles, 1);
});
