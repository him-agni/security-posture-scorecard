const { hasBackend } = require('../../lib/detect');

const RL_LIBS = ['express-rate-limit', 'rate-limiter-flexible', '@fastify/rate-limit', 'koa-ratelimit', 'express-slow-down', '@nestjs/throttler'];
const APPLIED_RE = /\b(rateLimit\s*\(|RateLimiterMemory|RateLimiterRedis|@Throttle|ThrottlerGuard|createRateLimitRule|slowDown\s*\()/;

module.exports = {
  id: 'rate-limiting',
  layer: 'backend',
  label: 'Rate limiting',
  severity: 'medium',
  run(ctx) {
    if (!hasBackend(ctx)) {
      return { id: 'rate-limiting', label: 'Rate limiting', status: 'na', confidence: 'manual', severity: 'medium', findings: [{ message: 'No backend detected — not applicable.' }] };
    }
    const present = RL_LIBS.filter((l) => ctx.deps[l]);
    const applied = present.length ? ctx.grep(APPLIED_RE) : [];

    if (!present.length) {
      return { id: 'rate-limiting', label: 'Rate limiting', status: 'warn', confidence: 'verified', severity: 'medium', findings: [{ message: 'No rate-limiting library found. APIs without rate limiting are exposed to brute-force and abuse.' }] };
    }
    // Present. If we can also see it applied, that's a stronger (still heuristic) signal.
    const status = 'pass';
    const confidence = applied.length ? 'detected' : 'verified';
    const message = applied.length
      ? `Rate limiter present (${present.join(', ')}) and applied in ${applied.length} location${applied.length === 1 ? '' : 's'}. Per-route coverage not verified.`
      : `Rate-limiting library present (${present.join(', ')}), but no application site was detected in source.`;
    return { id: 'rate-limiting', label: 'Rate limiting', status, confidence, severity: 'medium', findings: [{ message }] };
  },
};
