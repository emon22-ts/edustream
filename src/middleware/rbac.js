// src/middleware/rbac.js
// Role-Based Access Control — roles: admin, moderator, user

const ROLES = { ADMIN: 'admin', MODERATOR: 'moderator', USER: 'user' };

// Require specific role(s)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session?.user) return res.status(401).json({ error: 'Authentication required' });
    const userRole = req.session.user.role || ROLES.USER;
    if (!roles.includes(userRole)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

// Require any authenticated user
function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

// Attach user from session (no rejection — for read endpoints)
function attachUser(req, res, next) {
  if (req.session?.user) req.user = req.session.user;
  next();
}

// Ownership check — user must own the resource OR be admin/moderator
function requireOwnership(getOwnerId) {
  return async (req, res, next) => {
    if (!req.session?.user) return res.status(401).json({ error: 'Authentication required' });
    const user = req.session.user;
    if (user.role === ROLES.ADMIN || user.role === ROLES.MODERATOR) return next();
    try {
      const ownerId = await getOwnerId(req);
      if (!ownerId) return res.status(404).json({ error: 'Resource not found' });
      if (ownerId !== user.id) return res.status(403).json({ error: 'You can only modify your own content' });
      next();
    } catch(err) { res.status(500).json({ error: 'Ownership check failed' }); }
  };
}

module.exports = { requireAuth, requireRole, attachUser, requireOwnership, ROLES };
