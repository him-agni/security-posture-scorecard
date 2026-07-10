const { hasBackend } = require('../../lib/detect');

// A wildcard origin is a *verifiable* misconfiguration, so this is a real fail,
// not a heuristic. Distinguish "wide open" from "configured" from "no CORS".
const WILDCARD_RE = /(origin\s*:\s*['"]\*['"]|Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*['"]|cors\s*\(\s*\)|res\.header\s*\(\s*['"]Access-Control-Allow-Origin['"]\s*,\s*['"]\*['"])/;
const CONFIGURED_RE = /\b(cors\s*\(\s*\{|corsOptions|origin\s*:\s*(\[|process\.env|function|\(|['"]https?:))/;

module.exports = {
  id: 'cors-config',
  layer: 'backend',
  label: 'CORS configuration',
  severity: 'medium',
  run(ctx) {
    if (!hasBackend(ctx)) {
      return { id: 'cors-config', label: 'CORS configuration', status: 'na', confidence: 'manual', severity: 'medium', findings: [{ message: 'No backend detected — not applicable.' }] };
    }
    const wildcard = ctx.grep(WILDCARD_RE);
    if (wildcard.length) {
      return {
        id: 'cors-config',
        label: 'CORS configuration',
        status: 'fail',
        confidence: 'verified',
        severity: 'medium',
        findings: wildcard.slice(0, 8).map((m) => ({ file: m.file, line: m.line, message: 'Wide-open CORS (`origin: "*"` or unconfigured `cors()`) — any site can call this API with the browser\'s credentials disabled but still read responses.' })),
      };
    }
    const configured = ctx.grep(CONFIGURED_RE);
    if (configured.length) {
      return { id: 'cors-config', label: 'CORS configuration', status: 'pass', confidence: 'detected', severity: 'medium', findings: [{ message: `CORS appears explicitly configured (${configured.length} site(s)). Allowed origins not individually verified.` }] };
    }
    return { id: 'cors-config', label: 'CORS configuration', status: 'na', confidence: 'manual', severity: 'medium', findings: [{ message: 'No CORS configuration detected. If the API is same-origin only, that is expected.' }] };
  },
};
