// src/middleware/rateLimiter.js
// In-memory rate limiting per IP (no Redis needed on free tier)

const windows = new Map();

function createLimiter(maxRequests, windowMs, message) {
  return (req, res, next) => {
    const key = req.ip + ':' + req.path;
    const now = Date.now();
    const window = windows.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > window.resetAt) {
      window.count = 0;
      window.resetAt = now + windowMs;
    }

    window.count++;
    windows.set(key, window);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - window.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(window.resetAt / 1000));

    if (window.count > maxRequests) {
      return res.status(429).json({ error: message || 'Too many requests. Please wait.' });
    }
    next();
  };
}

// Cleanup old windows every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, window] of windows.entries()) {
    if (now > window.resetAt) windows.delete(key);
  }
}, 5 * 60 * 1000);

module.exports = {
  authLimiter: createLimiter(10, 15 * 60 * 1000, 'Too many auth attempts. Try again in 15 minutes.'),
  writeLimiter: createLimiter(30, 60 * 1000, 'Too many requests. Try again in 1 minute.'),
  uploadLimiter: createLimiter(10, 60 * 1000, 'Too many uploads. Try again in 1 minute.'),
  readLimiter: createLimiter(100, 60 * 1000, 'Too many requests.')
};
