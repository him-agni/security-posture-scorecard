const { rules, looksLikePlaceholder } = require('../../lib/secretPatterns');

// Env prefixes that get inlined into the browser bundle — anything here ships
// to the client, so a real secret value is a browser-readable secret.
const CLIENT_PREFIXES = ['VITE_', 'REACT_APP_', 'NEXT_PUBLIC_', 'PUBLIC_', 'GATSBY_', 'EXPO_PUBLIC_'];

// A value "looks like a real secret" if it hits any of our secret rules or is a
// long high-entropy-ish blob (not a URL/boolean/number/short flag).
function valueLooksSecret(value) {
  if (!value) return false;
  const v = value.trim().replace(/^["']|["']$/g, '');
  if (looksLikePlaceholder(v)) return false;
  if (rules.some((r) => r.regex.test(v))) return true;
  if (/^(true|false|\d+|https?:\/\/|localhost|\/)/i.test(v)) return false;
  // 20+ chars mixing letters and digits — smells like a key, not a config flag.
  return v.length >= 20 && /[A-Za-z]/.test(v) && /\d/.test(v) && !/\s/.test(v);
}

module.exports = {
  id: 'client-secret-exposure',
  layer: 'frontend',
  label: 'Client-exposed secrets',
  severity: 'high',
  run(ctx) {
    const findings = [];
    const envFiles = ctx.allFiles.filter((f) => f.split('/').pop().startsWith('.env'));
    const sourceFiles = ctx.glob('**/*.{js,jsx,ts,tsx,mjs,cjs,vue,svelte}');
    const targets = new Set([...envFiles, ...sourceFiles]);

    const prefixRe = new RegExp(`\\b(${CLIENT_PREFIXES.map((p) => p.replace('_', '_')).join('|')})[A-Z0-9_]+`);

    for (const rel of targets) {
      const content = ctx.readFile(rel);
      if (content == null) continue;
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!prefixRe.test(line)) continue;
        // Match `PREFIX_NAME = value` / `PREFIX_NAME: value`.
        const m = line.match(/\b((?:VITE_|REACT_APP_|NEXT_PUBLIC_|PUBLIC_|GATSBY_|EXPO_PUBLIC_)[A-Z0-9_]+)\s*[:=]\s*(.+)$/);
        if (!m) continue;
        const [, name, rawValue] = m;
        if (valueLooksSecret(rawValue)) {
          findings.push({
            file: rel,
            line: i + 1,
            message: `Client-exposed env var "${name}" holds a secret-looking value (ships to the browser)`,
            ruleId: 'client-exposed-secret',
            severity: 'high',
          });
        }
      }
    }

    return {
      id: 'client-secret-exposure',
      label: 'Client-exposed secrets',
      status: findings.length ? 'fail' : 'pass',
      confidence: 'verified',
      severity: 'high',
      findings,
    };
  },
};
