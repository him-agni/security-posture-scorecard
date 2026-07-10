// Tier 2 — heuristic. We can detect a protected-route *pattern*; we cannot
// prove every route is guarded. Wording reflects that.
const ROUTER_LIBS = ['react-router', 'react-router-dom', '@tanstack/react-router', 'next', '@remix-run/react'];
const GUARD_RE = /\b(ProtectedRoute|RequireAuth|PrivateRoute|AuthGuard|withAuth|requireAuth|useRequireAuth|AuthenticatedRoute|middleware)\b/;

module.exports = {
  id: 'route-protection',
  layer: 'frontend',
  label: 'Route protection',
  severity: 'medium',
  run(ctx) {
    const deps = { ...(ctx.manifest?.dependencies || {}), ...(ctx.manifest?.devDependencies || {}) };
    const usesRouter = ROUTER_LIBS.some((lib) => deps[lib]);

    if (!usesRouter) {
      // No client-side router → this check doesn't apply. Informational, no score impact.
      return {
        id: 'route-protection',
        label: 'Route protection',
        status: 'na',
        confidence: 'manual',
        severity: 'medium',
        findings: [{ message: 'No client-side router detected — route protection not applicable at this layer.' }],
      };
    }

    const sourceFiles = ctx.glob('**/*.{js,jsx,ts,tsx}');
    const guardFiles = sourceFiles.filter((f) => {
      const c = ctx.readFile(f);
      return c && GUARD_RE.test(c);
    });

    const status = guardFiles.length > 0 ? 'pass' : 'warn';
    const message =
      guardFiles.length > 0
        ? `Protected-route pattern detected in ${guardFiles.length} file${guardFiles.length === 1 ? '' : 's'}. Coverage of individual routes not verified.`
        : 'Router in use but no protected-route pattern detected. Auth guarding could not be confirmed.';

    return {
      id: 'route-protection',
      label: 'Route protection',
      status,
      confidence: 'detected',
      severity: 'medium',
      findings: [{ message, files: guardFiles.slice(0, 10) }],
      meta: { guardFileCount: guardFiles.length },
    };
  },
};
