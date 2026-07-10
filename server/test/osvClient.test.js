const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseNpmLock } = require('../lib/osvClient');

test('parses an npm lockfile v3 ("packages") into name@version', () => {
  const lock = {
    packages: {
      '': { name: 'root', version: '1.0.0' },
      'node_modules/express': { version: '4.18.2' },
      'node_modules/lodash': { version: '4.17.21' },
      'node_modules/@scope/pkg': { version: '2.0.0' },
    },
  };
  const pkgs = parseNpmLock(lock);
  const byName = Object.fromEntries(pkgs.map((p) => [p.name, p.version]));
  assert.equal(byName['express'], '4.18.2');
  assert.equal(byName['lodash'], '4.17.21');
  assert.equal(byName['@scope/pkg'], '2.0.0');
  // The root project ("") is excluded.
  assert.ok(!pkgs.some((p) => p.name === 'root' || p.name === ''));
});

test('parses an npm lockfile v1 ("dependencies") recursively', () => {
  const lock = {
    dependencies: {
      express: { version: '4.18.2', dependencies: { 'body-parser': { version: '1.20.1' } } },
      lodash: { version: '4.17.21' },
    },
  };
  const pkgs = parseNpmLock(lock);
  const names = pkgs.map((p) => p.name).sort();
  assert.deepEqual(names, ['body-parser', 'express', 'lodash']);
});

test('deduplicates identical name@version entries', () => {
  const lock = {
    packages: {
      'node_modules/a': { version: '1.0.0' },
      'node_modules/b/node_modules/a': { version: '1.0.0' },
    },
  };
  assert.equal(parseNpmLock(lock).length, 1);
});
