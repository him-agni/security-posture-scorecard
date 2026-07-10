const { hasDatabase } = require('../../lib/detect');

const ORMS = ['mongoose', 'prisma', '@prisma/client', 'typeorm', 'sequelize', 'drizzle-orm', 'knex', 'objection'];
// String-concatenated / interpolated queries — the real injection-risk signal.
const RAW_CONCAT_RE = /\.(query|raw|execute)\s*\(\s*(`[^`]*\$\{|['"][^'"]*['"]\s*\+|['"][^'"]*\+)/;
const SQL_INTERP_RE = /(SELECT|INSERT|UPDATE|DELETE|WHERE)\b[^;`'"]*(\$\{|['"]\s*\+\s*\w)/i;

module.exports = {
  id: 'query-safety',
  layer: 'database',
  label: 'Query safety / injection protection',
  severity: 'high',
  run(ctx) {
    if (!hasDatabase(ctx)) {
      return { id: 'query-safety', label: 'Query safety / injection protection', status: 'na', confidence: 'manual', severity: 'high', findings: [{ message: 'No database detected — not applicable.' }] };
    }
    const raw = [...ctx.grep(RAW_CONCAT_RE), ...ctx.grep(SQL_INTERP_RE)];
    if (raw.length) {
      return {
        id: 'query-safety',
        label: 'Query safety / injection protection',
        status: 'warn',
        confidence: 'detected',
        severity: 'high',
        findings: raw.slice(0, 8).map((h) => ({ file: h.file, line: h.line, message: 'String-concatenated / interpolated query detected — a possible SQL/NoSQL injection vector. Prefer parameterized queries or an ORM.' })),
      };
    }
    const orm = ORMS.filter((o) => ctx.deps[o]);
    if (orm.length) {
      return { id: 'query-safety', label: 'Query safety / injection protection', status: 'pass', confidence: 'detected', severity: 'high', findings: [{ message: `Queries go through an ORM/ODM (${orm.join(', ')}) and no raw string-built queries were detected.` }] };
    }
    return { id: 'query-safety', label: 'Query safety / injection protection', status: 'na', confidence: 'manual', severity: 'high', findings: [{ message: 'No ORM and no raw queries detected — query construction could not be assessed from source.' }] };
  },
};
