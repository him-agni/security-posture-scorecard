// Presence is verifiable; correct usage is not. This check only asserts that
// recommended security tooling appears in the manifest.
const RECOMMENDED = [
  { names: ['zod', 'yup', 'joi', 'valibot', 'class-validator', 'ajv'], label: 'a schema/validation library', why: 'validate and sanitize untrusted input' },
  { names: ['helmet'], label: 'helmet (security headers)', why: 'set safe HTTP response headers' },
  { names: ['dotenv'], label: 'dotenv', why: 'keep secrets out of source via env files' },
];

module.exports = {
  id: 'dependency-presence',
  layer: 'frontend',
  label: 'Security tooling present',
  severity: 'low',
  run(ctx) {
    if (!ctx.manifest) {
      return {
        id: 'dependency-presence',
        label: 'Security tooling present',
        status: 'na',
        confidence: 'manual',
        severity: 'low',
        findings: [{ message: 'No package.json at repo root — dependency presence not assessed.' }],
      };
    }

    const deps = { ...(ctx.manifest.dependencies || {}), ...(ctx.manifest.devDependencies || {}) };
    const findings = [];
    let missing = 0;

    for (const rec of RECOMMENDED) {
      const found = rec.names.find((n) => deps[n]);
      if (found) {
        findings.push({ message: `Present: ${found} — ${rec.label}.` });
      } else {
        missing++;
        findings.push({ message: `Missing: ${rec.label} (to ${rec.why}).` });
      }
    }

    // Low-severity nudge: warn only if the majority is absent.
    const status = missing >= 2 ? 'warn' : 'pass';

    return {
      id: 'dependency-presence',
      label: 'Security tooling present',
      status,
      confidence: 'verified',
      severity: 'low',
      findings,
      meta: { missing },
    };
  },
};
