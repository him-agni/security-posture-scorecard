/**
 * Dependency-free per-IP fixed-window rate limiter (Express middleware).
 *
 * Bounds request *volume* per client (maxConcurrentScans bounds in-flight work).
 * In-memory + per-process — fine for a single instance; a multi-instance deploy
 * would key this off shared storage (Redis) instead.
 *
 * Guards its own memory with an unref'd sweep of expired buckets, so the map
 * can't grow without bound and the timer never keeps the process alive.
 *
 * @param {object} opts
 * @param {number} opts.windowMs      window length in ms
 * @param {number} opts.max           allowed requests per window per key
 * @param {string} [opts.message]     429 body message
 * @param {(req)=>string} [opts.keyGenerator]  defaults to client IP
 * @param {()=>number} [opts.now]     clock injection for tests
 * @param {number} [opts.sweepMs]     sweep interval (default = windowMs)
 */
function createRateLimiter(opts = {}) {
  const windowMs = Number(opts.windowMs) || 60 * 1000;
  const max = Number(opts.max) || 60;
  const now = opts.now || Date.now;
  const message = opts.message || 'Too many requests. Please slow down and retry shortly.';
  const keyGenerator = opts.keyGenerator || ((req) => req.ip || req.socket?.remoteAddress || 'unknown');

  const buckets = new Map(); // key -> { count, resetAt }

  const sweep = () => {
    const t = now();
    for (const [key, b] of buckets) if (b.resetAt <= t) buckets.delete(key);
  };
  const sweepTimer = setInterval(sweep, opts.sweepMs || windowMs);
  if (typeof sweepTimer.unref === 'function') sweepTimer.unref();

  function middleware(req, res, next) {
    const key = keyGenerator(req);
    const t = now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= t) {
      bucket = { count: 0, resetAt: t + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count++;

    const remaining = Math.max(0, max - bucket.count);
    const resetSec = Math.ceil((bucket.resetAt - t) / 1000);
    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(remaining));
    res.set('RateLimit-Reset', String(resetSec));

    if (bucket.count > max) {
      res.set('Retry-After', String(resetSec));
      return res.status(429).json({ error: message });
    }
    next();
  }

  // Test / lifecycle helpers.
  middleware.stop = () => clearInterval(sweepTimer);
  middleware.reset = () => buckets.clear();
  middleware.size = () => buckets.size;
  return middleware;
}

module.exports = { createRateLimiter };
