const express = require('express');
const { postScan } = require('../controllers/scanController');
const { createConcurrencyLimiter } = require('../lib/concurrencyLimiter');
const { createRateLimiter } = require('../lib/rateLimiter');
const config = require('../config');

const router = express.Router();

// Two complementary guards on the expensive scan endpoint:
//   rateLimiter  — bounds request VOLUME per IP (abuse / brute force)
//   scanLimiter  — bounds concurrent IN-FLIGHT work (resource exhaustion)
const rateLimiter = createRateLimiter(config.rateLimit);
const scanLimiter = createConcurrencyLimiter({ max: config.maxConcurrentScans });

router.post('/scan', rateLimiter, scanLimiter, postScan);

module.exports = router;
