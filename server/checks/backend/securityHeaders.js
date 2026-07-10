const { hasBackend } = require('../../lib/detect');

const HELMET_LIBS = ['helmet', '@fastify/helmet', 'koa-helmet'];
const APPLIED_RE = /\b(helmet\s*\(|app\.use\s*\(\s*helmet|fastify\.register\s*\(\s*helmet|contentSecurityPolicy)/;

module.exports = {
  id: 'security-headers',
  layer: 'backend',
  label: 'Security headers (helmet)',
  severity: 'medium',
  run(ctx) {
    if (!hasBackend(ctx)) {
      return { id: 'security-headers', label: 'Security headers (helmet)', status: 'na', confidence: 'manual', severity: 'medium', findings: [{ message: 'No backend detected — not applicable.' }] };
    }
    const present = HELMET_LIBS.filter((l) => ctx.deps[l]);
    if (!present.length) {
      return { id: 'security-headers', label: 'Security headers (helmet)', status: 'warn', confidence: 'verified', severity: 'medium', findings: [{ message: 'No security-headers middleware (helmet) found. Responses may ship without CSP, HSTS, X-Frame-Options, etc.' }] };
    }
    const applied = ctx.grep(APPLIED_RE);
    return {
      id: 'security-headers',
      label: 'Security headers (helmet)',
      status: 'pass',
      confidence: applied.length ? 'detected' : 'verified',
      severity: 'medium',
      findings: [{ message: applied.length ? `helmet present (${present.join(', ')}) and applied.` : `helmet present (${present.join(', ')}); application site not detected in source.` }],
    };
  },
};
