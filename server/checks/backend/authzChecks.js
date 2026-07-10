const { hasBackend } = require('../../lib/detect');

const AUTHZ_LIBS = ['casl', '@casl/ability', 'accesscontrol', 'rbac', 'node-casbin', 'casbin', '@casl/react'];
const AUTHZ_RE = /\b(req\.user\.(role|roles|isAdmin|permissions)|hasRole|hasPermission|checkPermission|can\(|ability\.can|authorize\(|requireRole|@Roles\(|RolesGuard|ensurePermission|isAuthorized)\b/;

module.exports = {
  id: 'authz-checks',
  layer: 'backend',
  label: 'Authorization / role checks',
  severity: 'high',
  run(ctx) {
    if (!hasBackend(ctx)) {
      return { id: 'authz-checks', label: 'Authorization / role checks', status: 'na', confidence: 'manual', severity: 'high', findings: [{ message: 'No backend detected — not applicable.' }] };
    }
    const libs = AUTHZ_LIBS.filter((l) => ctx.deps[l]);
    const hits = ctx.grep(AUTHZ_RE);
    if (hits.length || libs.length) {
      return {
        id: 'authz-checks',
        label: 'Authorization / role checks',
        status: 'pass',
        confidence: 'detected',
        severity: 'high',
        findings: [{ message: `Authorization pattern detected${libs.length ? ` (${libs.join(', ')})` : ''}${hits.length ? ` in ${hits.length} place(s)` : ''}. Enforcement on every sensitive route is not verified.` }],
      };
    }
    return { id: 'authz-checks', label: 'Authorization / role checks', status: 'warn', confidence: 'detected', severity: 'high', findings: [{ message: 'No role/permission checks detected. Authenticated users may not be authorization-scoped (broken access control is the #1 OWASP risk).' }] };
  },
};
