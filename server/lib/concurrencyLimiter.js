/**
 * Express middleware that caps the number of in-flight requests. Each scan
 * downloads and extracts a repo, so without this an attacker can exhaust disk /
 * memory with parallel requests. Releases the slot when the response finishes or
 * the client disconnects. In-memory + per-process (fine for a single instance).
 */
function createConcurrencyLimiter({ max, message } = {}) {
  const limit = Number(max) || 1;
  let active = 0;

  function middleware(req, res, next) {
    if (active >= limit) {
      res.set('Retry-After', '5');
      return res.status(429).json({
        error: message || 'Server is busy scanning other repositories. Please retry shortly.',
      });
    }
    active++;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      active--;
    };
    res.on('finish', release);
    res.on('close', release);
    next();
  }

  // Exposed for tests / introspection.
  middleware.active = () => active;
  return middleware;
}

module.exports = { createConcurrencyLimiter };
