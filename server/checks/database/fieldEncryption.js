const { hasDatabase } = require('../../lib/detect');

const ENC_LIBS = ['mongoose-field-encryption', 'mongoose-encryption', '@aws-crypto/client-node', 'ciphertext', 'sequelize-encrypted', 'prisma-field-encryption', 'node-vault'];

// Absence isn't a fail — most apps don't field-encrypt, and penalizing every
// one for it would be dishonest. Present => a (verified-ish) bonus pass;
// absent => informational `na` that doesn't move the score.
module.exports = {
  id: 'field-encryption',
  layer: 'database',
  label: 'Field-level encryption',
  severity: 'medium',
  run(ctx) {
    if (!hasDatabase(ctx)) {
      return { id: 'field-encryption', label: 'Field-level encryption', status: 'na', confidence: 'manual', severity: 'medium', findings: [{ message: 'No database detected — not applicable.' }] };
    }
    const libs = ENC_LIBS.filter((l) => ctx.deps[l]);
    if (libs.length) {
      return { id: 'field-encryption', label: 'Field-level encryption', status: 'pass', confidence: 'detected', severity: 'medium', findings: [{ message: `Field-level encryption library present: ${libs.join(', ')}.` }] };
    }
    return { id: 'field-encryption', label: 'Field-level encryption', status: 'na', confidence: 'manual', severity: 'medium', findings: [{ message: 'No field-level encryption library detected. Often acceptable — relevant mainly for sensitive PII columns.' }] };
  },
};
