const { hasBackend } = require('../../lib/detect');

const AUTH_LIBS = [
  'jsonwebtoken', 'jose', 'passport', 'next-auth', '@auth/core', 'express-session',
  'cookie-session', 'lucia', '@lucia-auth/adapter-prisma', 'express-jwt', 'oauth',
  'openid-client', '@clerk/clerk-sdk-node', '@clerk/nextjs', 'firebase-admin',
  'supertokens-node', 'oidc-provider', 'grant',
];

module.exports = {
  id: 'auth-present',
  layer: 'backend',
  label: 'Authentication library',
  severity: 'high',
  run(ctx) {
    if (!hasBackend(ctx)) {
      return { id: 'auth-present', label: 'Authentication library', status: 'na', confidence: 'manual', severity: 'high', findings: [{ message: 'No backend detected — not applicable.' }] };
    }
    const present = AUTH_LIBS.filter((l) => ctx.deps[l]);
    const status = present.length ? 'pass' : 'warn';
    return {
      id: 'auth-present',
      label: 'Authentication library',
      status,
      confidence: 'verified',
      severity: 'high',
      findings: [
        {
          message: present.length
            ? `Authentication library present: ${present.join(', ')}.`
            : 'No authentication library found in dependencies. If this API is public that may be fine; otherwise auth could not be confirmed.',
        },
      ],
    };
  },
};
