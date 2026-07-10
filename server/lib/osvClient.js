// Minimal OSV (osv.dev) client. Given {name, version} packages, returns which
// have known advisories. Network + best-effort: any failure returns null so the
// check degrades to "manual / not run" rather than breaking the scan.
const OSV_BATCH_URL = 'https://api.osv.dev/v1/querybatch';
const MAX_PACKAGES = 500;
const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Extract exact-versioned packages from a parsed lockfile.
 * Supports npm lockfile v2/v3 ("packages") and v1 ("dependencies").
 */
function parseNpmLock(lockJson) {
  const out = new Map(); // name@version -> {name, version}
  if (lockJson.packages) {
    for (const [path, info] of Object.entries(lockJson.packages)) {
      if (!path || !info?.version) continue; // "" is the root project
      const name = path.split('node_modules/').pop();
      if (name && info.version) out.set(`${name}@${info.version}`, { name, version: info.version });
    }
  } else if (lockJson.dependencies) {
    const walk = (deps) => {
      for (const [name, info] of Object.entries(deps)) {
        if (info?.version) out.set(`${name}@${info.version}`, { name, version: info.version });
        if (info?.dependencies) walk(info.dependencies);
      }
    };
    walk(lockJson.dependencies);
  }
  return [...out.values()].slice(0, MAX_PACKAGES);
}

async function queryOsv(packages, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (!packages.length) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const body = {
      queries: packages.map((p) => ({
        package: { name: p.name, ecosystem: 'npm' },
        version: p.version,
      })),
    };
    const res = await fetch(OSV_BATCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    // results[] aligns positionally with queries[].
    const vulnerable = [];
    (data.results || []).forEach((r, i) => {
      const vulns = r?.vulns || [];
      if (vulns.length) {
        vulnerable.push({
          name: packages[i].name,
          version: packages[i].version,
          ids: vulns.map((v) => v.id).slice(0, 5),
          count: vulns.length,
        });
      }
    });
    return vulnerable;
  } catch {
    return null; // aborted, offline, or malformed — caller treats as "not run"
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { parseNpmLock, queryOsv };
