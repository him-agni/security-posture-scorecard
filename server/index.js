const express = require('express');
const cors = require('cors');
const config = require('./config');
const scanRoute = require('./routes/scan');

const app = express();

// Only trust X-Forwarded-For when explicitly configured, so a spoofed header
// can't forge a client IP and bypass the per-IP rate limit.
app.set('trust proxy', config.trustProxy);

const corsOptions =
  config.allowedOrigins.length > 0
    ? { origin: config.allowedOrigins }
    : { origin: true };

app.use(cors(corsOptions));
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'security-scorecard', time: new Date().toISOString() });
});

app.use('/api', scanRoute);

// Fallback error handler so nothing leaks a stack trace to the client.
app.use((err, _req, res, _next) => {
  // A malformed / oversized JSON body is a client error, not a server fault.
  if (err.type === 'entity.parse.failed' || err.status === 400) {
    return res.status(400).json({ error: 'Malformed JSON body.' });
  }
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({ error: 'Request body too large.' });
  }
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Internal error' });
});

// Only bind a port when run directly — importing the app in tests must not listen.
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Security Scorecard API listening on http://localhost:${config.port}`);
    if (!config.githubToken) {
      console.log('No GITHUB_TOKEN set — using unauthenticated GitHub API (60 requests/hr).');
    }
  });
}

module.exports = app;
