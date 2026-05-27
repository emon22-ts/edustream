// src/middleware/validate.js
// Input validation and XSS prevention

const XSS_PATTERNS = [/<script/i, /javascript:/i, /on\w+\s*=/i, /<iframe/i, /<object/i];

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

function hasXSS(str) {
  return XSS_PATTERNS.some(p => p.test(str));
}

function validateCourse(req, res, next) {
  const { title, description, instructor, category, tags } = req.body;
  if (!title || typeof title !== 'string' || title.trim().length < 2) {
    return res.status(400).json({ error: 'Title must be at least 2 characters' });
  }
  if (title.length > 200) return res.status(400).json({ error: 'Title too long (max 200 chars)' });
  if (hasXSS(title) || hasXSS(description) || hasXSS(instructor)) {
    return res.status(400).json({ error: 'Invalid content detected' });
  }
  if (description && description.length > 2000) {
    return res.status(400).json({ error: 'Description too long (max 2000 chars)' });
  }
  next();
}

function validateComment(req, res, next) {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || text.trim().length < 1) {
    return res.status(400).json({ error: 'Comment cannot be empty' });
  }
  if (text.length > 1000) return res.status(400).json({ error: 'Comment too long (max 1000 chars)' });
  if (hasXSS(text)) return res.status(400).json({ error: 'Invalid content detected' });
  next();
}

function validateRegister(req, res, next) {
  const { name, email, password } = req.body;
  if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Name must be at least 2 characters' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (password.length > 100) return res.status(400).json({ error: 'Password too long' });
  next();
}

module.exports = { sanitizeString, validateCourse, validateComment, validateRegister };
