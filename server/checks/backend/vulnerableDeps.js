const { parseNpmLock, queryOsv } = require('../../lib/osvClient');

// Optional, high-value, genuinely `verified`: checks the lockfile's exact
// versions against the OSV vulnerability database. Async. Degrades to `manual`
// if there's no lockfile or the API is unreachable — never blocks the scan.
module.exports = {
  id: 'vulnerable-deps',
  layer: 'backend',
  label: 'Known-vulnerable dependencies',
  severity: 'high',
  async run(ctx) {
    const lockRaw =
      ctx.readFile('package-lock.json') ||
      ctx.readFile('npm-shrinkwrap.json');

    if (!lockRaw) {
      return { id: 'vulnerable-deps', label: 'Known-vulnerable dependencies', status: 'na', confidence: 'manual', severity: 'high', findings: [{ message: 'No npm lockfile found — cannot resolve exact versions to check against OSV. Commit a package-lock.json to enable this check.' }] };
    }

    let packages;
    try {
      packages = parseNpmLock(JSON.parse(lockRaw));
    } catch {
      return { id: 'vulnerable-deps', label: 'Known-vulnerable dependencies', status: 'na', confidence: 'manual', severity: 'high', findings: [{ message: 'Lockfile could not be parsed.' }] };
    }

    const vulnerable = await queryOsv(packages);
    if (vulnerable === null) {
      return { id: 'vulnerable-deps', label: 'Known-vulnerable dependencies', status: 'na', confidence: 'manual', severity: 'high', findings: [{ message: 'OSV database was unreachable — check not run. (Offline or rate-limited.)' }] };
    }

    if (vulnerable.length === 0) {
      return { id: 'vulnerable-deps', label: 'Known-vulnerable dependencies', status: 'pass', confidence: 'verified', severity: 'high', findings: [{ message: `Checked ${packages.length} resolved packages against OSV — no known advisories.` }] };
    }

    return {
      id: 'vulnerable-deps',
      label: 'Known-vulnerable dependencies',
      status: 'fail',
      confidence: 'verified',
      severity: 'high',
      findings: vulnerable.slice(0, 20).map((v) => ({
        message: `${v.name}@${v.version} — ${v.count} known advisory${v.count === 1 ? '' : 'ies'} (${v.ids.join(', ')})`,
      })),
    };
  },
};
