const { hasBackend } = require('../../lib/detect');

const HASH_LIBS = ['bcrypt', 'bcryptjs', 'argon2', '@node-rs/argon2', '@node-rs/bcrypt', 'scrypt-kdf'];
const USE_RE = /\b(bcrypt\.(hash|compare)|argon2\.(hash|verify)|hashSync|compareSync|crypto\.scrypt|pbkdf2)/;
// A signal the app even handles passwords (so we don't warn on OAuth-only apps).
const PW_CONTEXT_RE = /\b(password|passwd|\.hash\b|credentials|login|register|signup)\b/i;

module.exports = {
  id: 'password-hashing',
  layer: 'backend',
  label: 'Password hashing',
  severity: 'high',
  run(ctx) {
    if (!hasBackend(ctx)) {
      return { id: 'password-hashing', label: 'Password hashing', status: 'na', confidence: 'manual', severity: 'high', findings: [{ message: 'No backend detected — not applicable.' }] };
    }
    const libs = HASH_LIBS.filter((l) => ctx.deps[l]);
    const used = ctx.grep(USE_RE);

    if (used.length) {
      return { id: 'password-hashing', label: 'Password hashing', status: 'pass', confidence: 'detected', severity: 'high', findings: [{ message: `Password-hashing usage detected in ${used.length} place(s) (${libs.join(', ') || 'crypto'}). Correct salting/rounds not verified.` }] };
    }
    if (libs.length) {
      return { id: 'password-hashing', label: 'Password hashing', status: 'warn', confidence: 'detected', severity: 'high', findings: [{ message: `Hashing library present (${libs.join(', ')}) but no hashing call detected in source.` }] };
    }
    // No lib and no usage. Only meaningful if the app looks like it handles passwords.
    if (ctx.grep(PW_CONTEXT_RE).length) {
      return { id: 'password-hashing', label: 'Password hashing', status: 'warn', confidence: 'detected', severity: 'high', findings: [{ message: 'Password-like handling detected but no hashing library or call found. Passwords may be stored in plaintext.' }] };
    }
    return { id: 'password-hashing', label: 'Password hashing', status: 'na', confidence: 'manual', severity: 'high', findings: [{ message: 'No password handling detected (e.g. OAuth/passwordless) — not applicable.' }] };
  },
};
