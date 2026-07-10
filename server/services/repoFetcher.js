const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');
const { Readable, Transform } = require('stream');
const tar = require('tar');
const { Octokit } = require('@octokit/rest');
const config = require('./../config');

const octokit = new Octokit({ auth: config.githubToken });

/**
 * Defense-in-depth against zip-slip: reject any archive entry that is absolute
 * or escapes the extraction root via `..`. GitHub tarballs never contain these,
 * but we extract untrusted archives, so we don't rely on that.
 */
function isSafeEntryPath(entryPath) {
  if (typeof entryPath !== 'string' || entryPath.length === 0) return false;
  const normalized = entryPath.replace(/\\/g, '/');
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) return false; // absolute
  return !normalized.split('/').includes('..'); // no traversal segment
}

/**
 * Resolve a repo, download its tarball for the default branch, and extract it to
 * a temp dir. Returns { owner, repo, defaultBranch, tempDir, rootDir }.
 *
 * Owns its temp dir: if anything after mkdtemp fails (or the caller aborts via
 * `signal`), it removes the temp dir before rethrowing, so a failed/timed-out
 * scan never leaks disk. `overrides` exists purely as a test seam.
 */
async function fetchRepo(owner, repo, { signal, overrides = {} } = {}) {
  const doFetch = overrides.fetch || fetch;
  const reposGet = overrides.reposGet || ((args) => octokit.repos.get(args));

  // 1. Resolve default branch + size guard (repo.size is in KB). No temp dir yet,
  //    so a failure here has nothing to clean up.
  let meta;
  try {
    const { data } = await reposGet({ owner, repo, request: { signal } });
    meta = data;
  } catch (err) {
    if (err.status === 404) throw new Error('REPO_NOT_FOUND');
    if (err.status === 403) throw new Error('RATE_LIMITED');
    throw err;
  }
  if (meta.size * 1024 > config.maxRepoBytes) throw new Error('REPO_TOO_LARGE');

  const defaultBranch = meta.default_branch;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scorecard-'));

  // From here on we own tempDir — guarantee cleanup on ANY failure/abort.
  try {
    // 2. Download tarball via codeload (no auth needed for public repos).
    const tarballUrl = `https://codeload.github.com/${owner}/${repo}/tar.gz/${defaultBranch}`;
    const headers = config.githubToken ? { Authorization: `token ${config.githubToken}` } : {};
    const resp = await doFetch(tarballUrl, { headers, signal });
    if (!resp.ok) {
      if (resp.status === 404) throw new Error('REPO_NOT_FOUND');
      if (resp.status === 403 || resp.status === 429) throw new Error('RATE_LIMITED');
      throw new Error(`Tarball download failed: ${resp.status}`);
    }

    // 3. Stream to disk, enforcing the byte cap as we write.
    const tarPath = path.join(tempDir, 'repo.tar.gz');
    let bytes = 0;
    const counter = new Transform({
      transform(chunk, _enc, cb) {
        bytes += chunk.length;
        if (bytes > config.maxRepoBytes) return cb(new Error('REPO_TOO_LARGE'));
        cb(null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(resp.body), counter, createWriteStream(tarPath));

    // 4. Extract with a safe-path filter (zip-slip guard).
    await tar.x({ file: tarPath, cwd: tempDir, filter: isSafeEntryPath });
    await fs.rm(tarPath, { force: true });

    // 5. Find the single wrapper dir GitHub creates (e.g. owner-repo-<sha>/).
    const entries = await fs.readdir(tempDir, { withFileTypes: true });
    const wrapper = entries.find((e) => e.isDirectory());
    const rootDir = wrapper ? path.join(tempDir, wrapper.name) : tempDir;

    return { owner, repo, defaultBranch, tempDir, rootDir };
  } catch (err) {
    await cleanup(tempDir); // never leak a temp dir on failure/abort
    throw err;
  }
}

async function cleanup(tempDir) {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (err) {
    console.error('[cleanup] failed to remove temp dir:', err.message);
  }
}

module.exports = { fetchRepo, cleanup, isSafeEntryPath };
