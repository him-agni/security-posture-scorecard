/**
 * Regex ruleset for the flagship secret scan. Patterns reference gitleaks'
 * rules but are trimmed to high-signal, low-false-positive matchers.
 *
 * Each rule: { id, description, regex, severity }.
 * `regex` runs per-line so we can report a line number. Keep them global-free
 * here — the scanner adds flags itself.
 */
const rules = [
  {
    id: 'aws-access-key-id',
    description: 'AWS Access Key ID',
    regex: /\b(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}\b/,
    severity: 'critical',
  },
  {
    id: 'aws-secret-access-key',
    description: 'AWS Secret Access Key',
    regex: /aws_?secret_?access_?key["'\s:=]+([A-Za-z0-9/+=]{40})\b/i,
    severity: 'critical',
  },
  {
    id: 'github-token',
    description: 'GitHub Personal Access / OAuth / App token',
    regex: /\b(ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{36,255}\b/,
    severity: 'critical',
  },
  {
    id: 'gitlab-token',
    description: 'GitLab Personal Access Token',
    regex: /\bglpat-[A-Za-z0-9_-]{20}\b/,
    severity: 'critical',
  },
  {
    id: 'stripe-secret-key',
    description: 'Stripe Secret / Restricted Key',
    regex: /\b(sk|rk)_(live|test)_[A-Za-z0-9]{24,}\b/,
    severity: 'critical',
  },
  {
    id: 'google-api-key',
    description: 'Google API Key',
    regex: /\bAIza[0-9A-Za-z_-]{35}\b/,
    severity: 'high',
  },
  {
    id: 'openai-api-key',
    description: 'OpenAI API Key',
    regex: /\bsk-(proj-)?[A-Za-z0-9_-]{20,}T3BlbkFJ[A-Za-z0-9_-]{20,}\b/,
    severity: 'critical',
  },
  {
    id: 'anthropic-api-key',
    description: 'Anthropic API Key',
    regex: /\bsk-ant-[A-Za-z0-9-]{20,}\b/,
    severity: 'critical',
  },
  {
    id: 'slack-token',
    description: 'Slack Token',
    regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
    severity: 'high',
  },
  {
    id: 'slack-webhook',
    description: 'Slack Webhook URL',
    regex: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]+/,
    severity: 'medium',
  },
  {
    id: 'private-key-block',
    description: 'Private key material (PEM block)',
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/,
    severity: 'critical',
  },
  {
    id: 'jwt',
    description: 'JSON Web Token',
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
    severity: 'medium',
  },
  {
    id: 'twilio-api-key',
    description: 'Twilio API Key',
    regex: /\bSK[0-9a-fA-F]{32}\b/,
    severity: 'high',
  },
  {
    id: 'sendgrid-api-key',
    description: 'SendGrid API Key',
    regex: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/,
    severity: 'high',
  },
  {
    id: 'mongodb-connection-string',
    description: 'MongoDB connection string with credentials',
    regex: /mongodb(\+srv)?:\/\/[^:\s]+:[^@\s]+@/,
    severity: 'high',
  },
  {
    id: 'postgres-connection-string',
    description: 'Postgres/MySQL connection string with credentials',
    regex: /\b(postgres(ql)?|mysql):\/\/[^:\s]+:[^@\s]+@/,
    severity: 'high',
  },
  {
    id: 'generic-assigned-secret',
    description: 'Generic hardcoded secret assignment',
    // key/secret/token/password = "long-ish value". Kept last & medium to limit noise.
    regex: /(?:api[_-]?key|secret|token|passw(?:or)?d|access[_-]?key)["'\s]*[:=]\s*["'][A-Za-z0-9_\-!@#$%^&*+/=]{16,}["']/i,
    severity: 'medium',
  },
];

// Obvious placeholders we should not flag (cuts the biggest false-positive class).
const placeholderHints = [
  'your',
  'example',
  'placeholder',
  'changeme',
  'change_me',
  'xxxx',
  'dummy',
  'sample',
  'test123',
  '<',
  '{{',
  '...',
  'redacted',
  'insert',
  'my-secret',
  'foobar',
];

function looksLikePlaceholder(matchText) {
  const lower = matchText.toLowerCase();
  return placeholderHints.some((h) => lower.includes(h));
}

module.exports = { rules, looksLikePlaceholder };
