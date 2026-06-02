const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 100, message: { error: 'Too many requests' } });
const writeLimiter = rateLimit({ windowMs: 60*1000, max: 60, message: { error: 'Too many requests' } });
const uploadLimiter = rateLimit({ windowMs: 60*1000, max: 20, message: { error: 'Too many requests' } });
const readLimiter = rateLimit({ windowMs: 60*1000, max: 200, message: { error: 'Too many requests' } });
module.exports = { authLimiter, writeLimiter, uploadLimiter, readLimiter };
