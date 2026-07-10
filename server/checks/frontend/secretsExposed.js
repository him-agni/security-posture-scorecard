const { rules, looksLikePlaceholder } = require('../../lib/secretPatterns');

// Extensions worth scanning line-by-line for secret material.
const SCAN_GLOB =
  '**/*.{js,jsx,ts,tsx,mjs,cjs,json,yml,yaml,txt,md,py,rb,go,java,php,sh,bash,vue,svelte,html,xml,ini,conf,cfg,properties,tf,Dockerfile}';

const MAX_LINE_LEN = 2000; // skip minified / data-blob lines
const MAX_FINDINGS_PER_FILE = 25;

function scanFileForSecrets(rel, content) {
  const findings = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > MAX_LINE_LEN) continue;
    for (const rule of rules) {
      const m = line.match(rule.regex);
      if (!m) continue;
      const matched = m[0];
      if (looksLikePlaceholder(matched)) continue;
      findings.push({
        file: rel,
        line: i + 1,
        message: `${rule.description} detected`,
        ruleId: rule.id,
        severity: rule.severity,
      });
      if (findings.length >= MAX_FINDINGS_PER_FILE) return findings;
    }
  }
  return findings;
}

module.exports = {
  id: 'secrets-exposed',
  layer: 'frontend',
  label: 'Exposed secrets',
  severity: 'critical',
  run(ctx) {
    const findings = [];

    // 1. Pattern scan over source + config files (plus any .env* file).
    const envFiles = ctx.allFiles.filter((f) => {
      const base = f.split('/').pop();
      return base.startsWith('.env');
    });
    const scanTargets = new Set([...ctx.glob(SCAN_GLOB), ...envFiles]);
    for (const rel of scanTargets) {
      const content = ctx.readFile(rel);
      if (content == null) continue;
      findings.push(...scanFileForSecrets(rel, content));
    }

    // 2. A committed real .env file (not .env.example / .env.sample / .env.template).
    const committedEnv = envFiles.filter((f) => {
      const base = f.split('/').pop();
      return !/\.(example|sample|template|dist|local\.example)$/i.test(base) &&
        base !== '.env.example' && base !== '.env.sample' && base !== '.env.template';
    });
    for (const f of committedEnv) {
      // .env.example etc already excluded; flag remaining real env files.
      if (/^\.env(\.(local|development|production|staging|prod|dev|test))?$/.test(f.split('/').pop())) {
        findings.push({
          file: f,
          message: 'Environment file committed to the repository',
          ruleId: 'committed-env-file',
          severity: 'critical',
        });
      }
    }

    // 3. .env missing from .gitignore (only matters if the repo uses env files).
    const usesEnv = envFiles.length > 0 || ctx.fileExists('.env.example');
    if (usesEnv) {
      const gitignore = ctx.readFile('.gitignore') || '';
      const ignoresEnv = /(^|\n)\s*\.env(\b|\*|\/|\s|$)/.test(gitignore) ||
        /(^|\n)\s*\*\.env/.test(gitignore);
      if (!ignoresEnv) {
        findings.push({
          file: '.gitignore',
          message: '.env is not listed in .gitignore — secrets risk being committed',
          ruleId: 'env-not-gitignored',
          severity: 'high',
        });
      }
    }

    // 4. Private-key material files in the repo.
    const keyFiles = ctx.allFiles.filter((f) => {
      const base = f.split('/').pop();
      return base === 'id_rsa' || base === 'id_dsa' || base === 'id_ecdsa' ||
        base === 'id_ed25519' || /\.(pem|key|pfx|p12|keystore)$/i.test(base);
    });
    for (const f of keyFiles) {
      findings.push({
        file: f,
        message: 'Private-key / certificate file present in the repository',
        ruleId: 'private-key-file',
        severity: 'critical',
      });
    }

    return {
      id: 'secrets-exposed',
      label: 'Exposed secrets',
      status: findings.length ? 'fail' : 'pass',
      confidence: 'verified',
      severity: 'critical',
      findings,
    };
  },
};
