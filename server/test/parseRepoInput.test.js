const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseRepoInput } = require('../controllers/scanController');

test('parses a full https GitHub URL', () => {
  assert.deepEqual(parseRepoInput('https://github.com/owner/repo'), { owner: 'owner', repo: 'repo' });
});

test('parses owner/repo shorthand', () => {
  assert.deepEqual(parseRepoInput('sindresorhus/slugify'), { owner: 'sindresorhus', repo: 'slugify' });
});

test('strips a trailing .git', () => {
  assert.deepEqual(parseRepoInput('https://github.com/owner/repo.git'), { owner: 'owner', repo: 'repo' });
});

test('ignores extra path segments (tree/branch)', () => {
  assert.deepEqual(parseRepoInput('https://github.com/owner/repo/tree/main'), { owner: 'owner', repo: 'repo' });
});

test('rejects non-github hosts', () => {
  assert.equal(parseRepoInput('https://gitlab.com/owner/repo'), null);
});

test('rejects invalid GitHub owner and repo names', () => {
  assert.equal(parseRepoInput('-owner/repo'), null);
  assert.equal(parseRepoInput('owner-/repo'), null);
  assert.equal(parseRepoInput('owner/..'), null);
  assert.equal(parseRepoInput('owner/repo with spaces'), null);
});

test('rejects garbage and empty input', () => {
  assert.equal(parseRepoInput('not a url at all'), null);
  assert.equal(parseRepoInput(''), null);
  assert.equal(parseRepoInput(undefined), null);
  assert.equal(parseRepoInput('owner'), null);
});
