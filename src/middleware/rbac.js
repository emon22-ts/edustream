const ROLES = { ADMIN: 'admin', MODERATOR: 'moderator', USER: 'user' };

function attachUser(req, res, next) {
  if (req.session && req.session.user) {
    req.user = req.session.user;
  } else if (req.headers['x-user-id']) {
    req.user = { id: req.headers['x-user-id'], name: req.headers['x-user-name'] || 'User', role: req.headers['x-user-role'] || 'user' };
  } else {
    req.user = { id: 'anonymous', name: 'Anonymous', role: 'user' };
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user || req.user.id === 'anonymous') return res.status(401).json({ error: 'Authentication required' });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

function requireOwnership(getOwnerId) {
  return async (req, res, next) => {
    if (!req.user) req.user = { id: 'anonymous', role: 'user', name: 'Anonymous' };
    if (req.user.role === ROLES.ADMIN || req.user.role === ROLES.MODERATOR) return next();
    try {
      const ownerId = await getOwnerId(req);
      if (!ownerId || ownerId === 'anonymous' || ownerId === req.user.id) return next();
      return res.status(403).json({ error: 'You can only modify your own content' });
    } catch(e) { next(e); }
  };
}

module.exports = { attachUser, requireAuth, requireRole, requireOwnership, ROLES };
