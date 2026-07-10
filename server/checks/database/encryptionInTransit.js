const { hasDatabase } = require('../../lib/detect');

// mongodb+srv:// implies TLS; explicit ssl/tls flags count too.
const TLS_RE = /(mongodb\+srv:\/\/|ssl\s*[:=]\s*true|tls\s*[:=]\s*true|sslmode=require|[?&](ssl|tls)=true|rejectUnauthorized|ssl\s*:\s*\{|useTLS|require_ssl)/i;

module.exports = {
  id: 'encryption-in-transit',
  layer: 'database',
  label: 'Encryption in transit (TLS)',
  severity: 'high',
  run(ctx) {
    if (!hasDatabase(ctx)) {
      return { id: 'encryption-in-transit', label: 'Encryption in transit (TLS)', status: 'na', confidence: 'manual', severity: 'high', findings: [{ message: 'No database detected — not applicable.' }] };
    }
    // Look in source AND in .env* templates (connection strings often live there).
    const envFiles = ctx.allFiles.filter((f) => f.split('/').pop().startsWith('.env'));
    const hits = [...ctx.grep(TLS_RE), ...ctx.grep(TLS_RE, envFiles)];
    if (hits.length) {
      return { id: 'encryption-in-transit', label: 'Encryption in transit (TLS)', status: 'pass', confidence: 'detected', severity: 'high', findings: [{ message: 'TLS/SSL indicated in the database connection configuration.' }] };
    }
    return { id: 'encryption-in-transit', label: 'Encryption in transit (TLS)', status: 'warn', confidence: 'detected', severity: 'high', findings: [{ message: 'No TLS/SSL indicator found in the connection config. Traffic to the database may be unencrypted (or TLS is enforced at the provider — verify).' }] };
  },
};
