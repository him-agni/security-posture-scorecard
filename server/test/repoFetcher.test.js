const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { fetchRepo, isSafeEntryPath } = require('../services/repoFetcher');

// Count fetchRepo's own temp dirs (prefix 'scorecard-'), excluding the test
// fixtures created by makeFixture (prefix 'scorecard-test-').
function fetcherTempDirs() {
  return fs
    .readdirSync(os.tmpdir())
    .filter((n) => n.startsWith('scorecard-') && !n.startsWith('scorecard-test-'));
}

test('does not leak a temp dir when the tarball download fails', async () => {
  const before = new Set(fetcherTempDirs());
  await assert.rejects(
    fetchRepo('owner', 'repo', {
      overrides: {
        reposGet: async () => ({ data: { default_branch: 'main', size: 1 } }),
        fetch: async () => ({ ok: false, status: 404 }), // fails AFTER mkdtemp
      },
    }),
    /REPO_NOT_FOUND/
  );
  const after = fetcherTempDirs().filter((n) => !before.has(n));
  assert.deepEqual(after, [], `leaked temp dir(s): ${after.join(', ')}`);
});

test('does not leak a temp dir when extraction fails', async () => {
  const before = new Set(fetcherTempDirs());
  await assert.rejects(
    fetchRepo('owner', 'repo', {
      overrides: {
        reposGet: async () => ({ data: { default_branch: 'main', size: 1 } }),
        // Not a valid gzip stream -> pipeline/extraction throws after mkdtemp.
        fetch: async () => ({ ok: true, status: 200, body: require('stream').Readable.toWeb(require('stream').Readable.from(Buffer.from('not a tarball'))) }),
      },
    })
  );
  const after = fetcherTempDirs().filter((n) => !before.has(n));
  assert.deepEqual(after, [], `leaked temp dir(s): ${after.join(', ')}`);
});

test('metadata failure creates no temp dir at all', async () => {
  const before = new Set(fetcherTempDirs());
  await assert.rejects(
    fetchRepo('owner', 'repo', {
      overrides: {
        reposGet: async () => { const e = new Error('nope'); e.status = 404; throw e; },
      },
    }),
    /REPO_NOT_FOUND/
  );
  const after = fetcherTempDirs().filter((n) => !before.has(n));
  assert.deepEqual(after, []);
});

test('metadata size guard rejects very large repos before creating a temp dir', async () => {
  const before = new Set(fetcherTempDirs());
  await assert.rejects(
    fetchRepo('owner', 'monster', {
      overrides: {
        reposGet: async () => ({ data: { default_branch: 'main', size: 900 * 1024 } }),
      },
    }),
    /REPO_TOO_LARGE/
  );
  const after = fetcherTempDirs().filter((n) => !before.has(n));
  assert.deepEqual(after, []);
});

test('metadata 403 without rate-limit signal is treated as not found/private', async () => {
  await assert.rejects(
    fetchRepo('owner', 'private', {
      overrides: {
        reposGet: async () => {
          const err = new Error('Resource not accessible by integration');
          err.status = 403;
          err.response = { headers: { 'x-ratelimit-remaining': '59' } };
          throw err;
        },
      },
    }),
    /REPO_NOT_FOUND/
  );
});

test('metadata 403 with rate-limit signal is treated as rate limited', async () => {
  await assert.rejects(
    fetchRepo('owner', 'repo', {
      overrides: {
        reposGet: async () => {
          const err = new Error('API rate limit exceeded');
          err.status = 403;
          err.response = { headers: { 'x-ratelimit-remaining': '0' } };
          throw err;
        },
      },
    }),
    /RATE_LIMITED/
  );
});

test('isSafeEntryPath rejects zip-slip / absolute paths', () => {
  // safe
  assert.equal(isSafeEntryPath('repo-abc/src/index.js'), true);
  assert.equal(isSafeEntryPath('repo-abc/a.b..c/file'), true); // ".." only inside a name, not a segment
  // unsafe
  assert.equal(isSafeEntryPath('../etc/passwd'), false);
  assert.equal(isSafeEntryPath('repo/../../etc/passwd'), false);
  assert.equal(isSafeEntryPath('/etc/passwd'), false);
  assert.equal(isSafeEntryPath('C:\\Windows\\system32'), false);
  assert.equal(isSafeEntryPath('a\\..\\..\\b'), false); // backslash traversal
  assert.equal(isSafeEntryPath(''), false);
});
