const { hasBackend } = require('../../lib/detect');

const LOG_LIBS = ['winston', 'pino', 'morgan', 'bunyan', 'pino-http', 'signale', '@nestjs/common'];
// @nestjs/common ships a Logger, but only count it if a logger is actually used.
const USE_RE = /\b(winston|pino|morgan|bunyan|logger\.(info|warn|error|debug)|new\s+Logger\()/;

module.exports = {
  id: 'logging',
  layer: 'backend',
  label: 'Logging',
  severity: 'low',
  run(ctx) {
    if (!hasBackend(ctx)) {
      return { id: 'logging', label: 'Logging', status: 'na', confidence: 'manual', severity: 'low', findings: [{ message: 'No backend detected — not applicable.' }] };
    }
    const present = LOG_LIBS.filter((l) => l !== '@nestjs/common' && ctx.deps[l]);
    const used = ctx.grep(USE_RE);
    if (present.length || used.length) {
      return {
        id: 'logging',
        label: 'Logging',
        status: 'pass',
        confidence: present.length ? 'verified' : 'detected',
        severity: 'low',
        findings: [{ message: present.length ? `Logging library present: ${present.join(', ')}${used.length ? `; used in ${used.length} place(s).` : '.'}` : `Logger usage detected in ${used.length} place(s).` }],
      };
    }
    return { id: 'logging', label: 'Logging', status: 'warn', confidence: 'verified', severity: 'low', findings: [{ message: 'No structured logging library detected. Auditing and incident response are harder without logs.' }] };
  },
};
