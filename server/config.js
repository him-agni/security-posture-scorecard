// Central config + tunables. Everything the reliability notes mention lives here.
module.exports = {
  port: process.env.PORT || 4000,

  // Comma-separated allowlist for browser callers in production.
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  // Optional GitHub token raises rate limit 60/hr -> 5000/hr. Public repos only.
  githubToken: process.env.GITHUB_TOKEN || undefined,

  // Reliability guards (section 8).
  maxRepoBytes: 60 * 1024 * 1024, // cap extracted repo size (~60 MB)
  scanTimeoutMs: 60 * 1000, // whole-scan timeout so a huge repo can't hang the request
  // Cap concurrent scans — each downloads+extracts a repo, so unbounded parallel
  // requests are a resource-exhaustion vector on this unauthenticated endpoint.
  maxConcurrentScans: Number(process.env.MAX_CONCURRENT_SCANS) || 4,

  // Per-IP request rate limit on the scan endpoint (bounds request *volume*, where
  // maxConcurrentScans bounds in-flight work).
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 20, // requests per window per IP
  },

  // Trust X-Forwarded-For only when explicitly enabled (behind a known proxy).
  // Otherwise req.ip uses the socket address so a spoofed header can't bypass limits.
  trustProxy: process.env.TRUST_PROXY === 'true' || false,

  // Noise reduction: never scan these (lockfiles + vendored deps + VCS + build output).
  ignoredDirs: ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.turbo', 'vendor'],
  ignoredFiles: [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'bun.lockb',
    'composer.lock',
  ],

  // Scoring weights by severity (section 5).
  severityWeights: { critical: 40, high: 25, medium: 15, low: 10 },
};
