// Tier 2 — heuristic. We can see whether a validation library is *used*, not
// whether every input is actually validated. Wording stays honest.
const VALIDATION_LIBS = ['zod', 'yup', 'joi', 'superstruct', 'valibot', 'class-validator', 'react-hook-form', 'formik', 'ajv'];
const USAGE_RE = /\b(z\.(object|string|number)|Yup\.|yup\.|Joi\.|joi\.|useForm|zodResolver|yupResolver|@IsString|@IsEmail|valibot|superstruct|ajv)\b/;

module.exports = {
  id: 'input-validation',
  layer: 'frontend',
  label: 'Input validation',
  severity: 'medium',
  run(ctx) {
    const deps = { ...(ctx.manifest?.dependencies || {}), ...(ctx.manifest?.devDependencies || {}) };
    const presentLibs = VALIDATION_LIBS.filter((lib) => deps[lib]);

    if (presentLibs.length === 0) {
      return {
        id: 'input-validation',
        label: 'Input validation',
        status: 'warn',
        confidence: 'detected',
        severity: 'medium',
        findings: [{ message: 'No validation library found in dependencies. Cannot confirm inputs are validated.' }],
      };
    }

    // Count source files that actually reference a validation pattern.
    const sourceFiles = ctx.glob('**/*.{js,jsx,ts,tsx}');
    const usedIn = sourceFiles.filter((f) => {
      const c = ctx.readFile(f);
      return c && USAGE_RE.test(c);
    });

    const status = usedIn.length > 0 ? 'pass' : 'warn';
    const message =
      usedIn.length > 0
        ? `Validation library present (${presentLibs.join(', ')}); usage detected in ${usedIn.length} file${usedIn.length === 1 ? '' : 's'}.`
        : `Validation library present (${presentLibs.join(', ')}) but no usage detected in source.`;

    return {
      id: 'input-validation',
      label: 'Input validation',
      status,
      confidence: 'detected',
      severity: 'medium',
      findings: [{ message }],
      meta: { presentLibs, usedInCount: usedIn.length },
    };
  },
};
