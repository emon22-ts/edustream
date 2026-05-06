// src/middleware/auth.js
// Validates Microsoft Entra ID (Azure AD) JWT tokens via JWKS
// Used to protect write operations (POST/PUT/DELETE)

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { config } = require('../config');

let client = null;

function getJwksClient() {
  if (!client && config.tenantId) {
    client = jwksClient({
      jwksUri: `https://login.microsoftonline.com/${config.tenantId}/discovery/v2.0/keys`,
      cache: true,
      cacheMaxAge: 86400000 // 24h
    });
  }
  return client;
}

function getKey(header, callback) {
  getJwksClient().getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

// Soft-auth middleware: attaches user if token present, doesn't reject anonymous reads
function attachUser(req, res, next) {
  if (!config.authEnabled) return next();
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  const token = authHeader.slice(7);
  jwt.verify(token, getKey, {
    audience: config.clientId,
    issuer: `https://login.microsoftonline.com/${config.tenantId}/v2.0`,
    algorithms: ['RS256']
  }, (err, decoded) => {
    if (!err) req.user = { id: decoded.oid, name: decoded.name, email: decoded.preferred_username };
    next();
  });
}

// Hard-auth middleware: rejects requests without a valid token
function requireAuth(req, res, next) {
  if (!config.authEnabled) return next(); // Auth disabled in dev
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

module.exports = { attachUser, requireAuth };
