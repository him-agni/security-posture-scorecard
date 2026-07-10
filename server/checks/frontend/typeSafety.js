module.exports = {
  id: 'type-safety',
  layer: 'frontend',
  label: 'Type safety',
  severity: 'medium',
  run(ctx) {
    const findings = [];
    const tsFiles = ctx.glob('**/*.{ts,tsx}').filter((f) => !f.endsWith('.d.ts'));
    const jsFiles = ctx.glob('**/*.{js,jsx,mjs,cjs}');
    const total = tsFiles.length + jsFiles.length;
    const tsShare = total ? Math.round((tsFiles.length / total) * 100) : 0;

    const hasTsconfig = ctx.fileExists('tsconfig.json');
    let strict = false;
    if (hasTsconfig) {
      const raw = ctx.readFile('tsconfig.json') || '';
      // Tolerate comments/trailing commas in tsconfig by regex-probing, not JSON.parse.
      strict = /"strict"\s*:\s*true/.test(raw);
    }

    let status = 'pass';

    if (!hasTsconfig && tsFiles.length === 0) {
      status = 'warn';
      findings.push({
        message: `No TypeScript in use (${jsFiles.length} JS files, 0 TS). Type safety not enforced.`,
      });
    } else if (!hasTsconfig) {
      status = 'warn';
      findings.push({ message: `TS files present but no tsconfig.json found.` });
    } else if (!strict) {
      status = 'warn';
      findings.push({
        message: `tsconfig.json present but "strict" mode is off — many type guarantees are relaxed.`,
      });
    } else {
      findings.push({
        message: `TypeScript strict mode enabled. ${tsShare}% of source files are TS (${tsFiles.length}/${total}).`,
      });
    }

    return {
      id: 'type-safety',
      label: 'Type safety',
      status,
      confidence: 'verified',
      severity: 'medium',
      findings,
      meta: { hasTsconfig, strict, tsShare, tsFiles: tsFiles.length, jsFiles: jsFiles.length },
    };
  },
};
