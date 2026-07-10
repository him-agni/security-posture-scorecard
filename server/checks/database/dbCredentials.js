const { hasDatabase } = require('../../lib/detect');

// DB-specific take on the secret scan: connection URI must come from env, not be
// hardcoded. Fully verifiable, critical.
const HARDCODED_RE = /(mongodb(\+srv)?|postgres(ql)?|mysql|mariadb|redis|rediss):\/\/[^:\s'"@]+:[^@\s'"]+@/;
const ENV_USE_RE = /process\.env\.(\w*(MONGO|MONGODB|DATABASE|DB|POSTGRES|PG|MYSQL|REDIS|CONNECTION)\w*)/i;

module.exports = {
  id: 'db-credentials',
  layer: 'database',
  label: 'DB credentials not hardcoded',
  severity: 'critical',
  run(ctx) {
    if (!hasDatabase(ctx)) {
      return { id: 'db-credentials', label: 'DB credentials not hardcoded', status: 'na', confidence: 'manual', severity: 'critical', findings: [{ message: 'No database detected — not applicable.' }] };
    }

    // Hardcoded creds in real source files (env-example files are just templates).
    const sourceHits = ctx.grep(HARDCODED_RE).filter((h) => !h.file.split('/').pop().startsWith('.env'));
    // A committed .env with a DB URL is equally bad.
    const envFiles = ctx.allFiles.filter((f) => {
      const b = f.split('/').pop();
      return b.startsWith('.env') && !/\.(example|sample|template)$/i.test(b) && b !== '.env.example';
    });
    const committedEnvHits = envFiles.filter((f) => HARDCODED_RE.test(ctx.readFile(f) || ''));

    if (sourceHits.length || committedEnvHits.length) {
      const findings = [
        ...sourceHits.slice(0, 8).map((h) => ({ file: h.file, line: h.line, message: 'Hardcoded database connection string with inline credentials.' })),
        ...committedEnvHits.map((f) => ({ file: f, message: 'Committed environment file contains database credentials.' })),
      ];
      return { id: 'db-credentials', label: 'DB credentials not hardcoded', status: 'fail', confidence: 'verified', severity: 'critical', findings };
    }

    if (ctx.grep(ENV_USE_RE).length) {
      return { id: 'db-credentials', label: 'DB credentials not hardcoded', status: 'pass', confidence: 'verified', severity: 'critical', findings: [{ message: 'Database connection is sourced from environment variables, not hardcoded.' }] };
    }

    return { id: 'db-credentials', label: 'DB credentials not hardcoded', status: 'na', confidence: 'manual', severity: 'critical', findings: [{ message: 'A database library is present but no connection configuration was found in source.' }] };
  },
};
