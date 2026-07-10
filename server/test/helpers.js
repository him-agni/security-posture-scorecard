const os = require('os');
const path = require('path');
const fs = require('fs');
const { buildContext } = require('../lib/fileTree');

/**
 * Write a map of { 'relative/path': 'contents' } to a fresh temp dir and return
 * a real check context over it (exercises fileTree too, not a mock).
 * Returns { ctx, dir, cleanup }.
 *
 * NOTE: all "secrets" in fixtures are fabricated test strings, not live creds.
 */
function makeFixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scorecard-test-'));
  for (const [rel, contents] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents);
  }
  const ctx = buildContext(dir);
  const cleanup = () => fs.rmSync(dir, { recursive: true, force: true });
  return { ctx, dir, cleanup };
}

module.exports = { makeFixture };
