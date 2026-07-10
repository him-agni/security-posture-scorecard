const { fetchRepo, cleanup } = require('../services/repoFetcher');
const { runScan } = require('../services/scanRunner');
const { scoreReport } = require('../services/scorer');
const config = require('../config');

// Very small URL guard: accept github.com URLs or owner/repo shorthand.
const OWNER_RE = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;
const REPO_RE = /^[\w.-]{1,100}$/;

function normalizeParsed(owner, repo) {
  const cleanRepo = repo.replace(/\.git$/i, '');
  if (!OWNER_RE.test(owner) || !REPO_RE.test(cleanRepo) || cleanRepo === '.' || cleanRepo === '..') {
    return null;
  }
  return { owner, repo: cleanRepo };
}

function parseRepoInput(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const input = raw.trim();

  // owner/repo shorthand
  const shorthand = input.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (shorthand) return normalizeParsed(shorthand[1], shorthand[2]);

  // full github URL
  try {
    const url = new URL(input);
    if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return normalizeParsed(parts[0], parts[1]);
  } catch {
    return null;
  }
}

async function postScan(req, res) {
  const parsed = parseRepoInput(req.body?.repoUrl);
  if (!parsed) {
    return res.status(400).json({
      error: 'Provide a public GitHub repo as a URL (https://github.com/owner/repo) or owner/repo shorthand.',
    });
  }

  let ctx;
  // Abort in-flight I/O (the tarball download) when the scan times out, and keep
  // the timer handle so we can clear it — otherwise it lingers for the full
  // timeout after a fast scan.
  const abort = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      abort.abort();
      reject(new Error('SCAN_TIMEOUT'));
    }, config.scanTimeoutMs);
  });

  try {
    ctx = await Promise.race([fetchRepo(parsed.owner, parsed.repo, { signal: abort.signal }), timeout]);
    const layers = await Promise.race([runScan(ctx), timeout]);
    const report = scoreReport({
      repo: `${parsed.owner}/${parsed.repo}`,
      defaultBranch: ctx.defaultBranch,
      layers,
    });
    return res.json(report);
  } catch (err) {
    if (err.message === 'SCAN_TIMEOUT') {
      return res.status(504).json({ error: 'Scan timed out — repository may be too large.' });
    }
    if (err.status === 404 || err.message === 'REPO_NOT_FOUND') {
      return res.status(404).json({ error: 'Repository not found or not public.' });
    }
    if (err.status === 403 || err.message === 'RATE_LIMITED') {
      return res.status(429).json({
        error: 'GitHub API rate limit hit. Set a GITHUB_TOKEN to raise the limit.',
      });
    }
    if (err.message === 'REPO_TOO_LARGE') {
      return res.status(413).json({ error: 'Repository exceeds the size cap for scanning.' });
    }
    console.error('[scan] failed:', err);
    return res.status(500).json({ error: 'Scan failed unexpectedly.' });
  } finally {
    clearTimeout(timer);
    // Clean up the temp dir on the success path and on a timeout during runScan.
    // (fetchRepo already self-cleans if it fails or is aborted before returning.)
    if (ctx?.tempDir) await cleanup(ctx.tempDir);
  }
}

module.exports = { postScan, parseRepoInput };
