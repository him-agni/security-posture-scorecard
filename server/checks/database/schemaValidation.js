const { hasDatabase } = require('../../lib/detect');

const SCHEMA_RE = /(new\s+(mongoose\.)?Schema\s*\(|@Entity\s*\(|@Column\s*\(|sequelize\.define\s*\(|DataTypes\.|z\.object\s*\(|createSchema\s*\(|@Prop\s*\()/;

module.exports = {
  id: 'schema-validation',
  layer: 'database',
  label: 'Schema / model validation',
  severity: 'medium',
  run(ctx) {
    if (!hasDatabase(ctx)) {
      return { id: 'schema-validation', label: 'Schema / model validation', status: 'na', confidence: 'manual', severity: 'medium', findings: [{ message: 'No database detected — not applicable.' }] };
    }
    // A Prisma schema file is a strong verified signal on its own.
    const hasPrismaSchema = ctx.fileExists('prisma/schema.prisma');
    const hits = ctx.grep(SCHEMA_RE);
    if (hasPrismaSchema || hits.length) {
      return {
        id: 'schema-validation',
        label: 'Schema / model validation',
        status: 'pass',
        confidence: 'detected',
        severity: 'medium',
        findings: [{ message: hasPrismaSchema ? 'Prisma schema present with typed models.' : `Schema/model definitions detected in ${hits.length} place(s). Field-level validation rules not individually verified.` }],
      };
    }
    return { id: 'schema-validation', label: 'Schema / model validation', status: 'warn', confidence: 'detected', severity: 'medium', findings: [{ message: 'No schema/model definitions detected. Documents/rows may be written without shape or validation guarantees.' }] };
  },
};
