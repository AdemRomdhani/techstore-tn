// =============================================================
// JWT AUTHENTICATION MIDDLEWARE
// =============================================================
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.startsWith('change_this')) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET must be set to a secure random value in production. Run: openssl rand -base64 64');
  } else {
    console.warn('⚠️  WARNING: JWT_SECRET is using default/weak value - set a secure random value for production!');
  }
}
const ACCESS_TOKEN_EXPIRES = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Generate access token
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );
};

// Generate refresh token - persisted to DB
const generateRefreshToken = (user) => {
  const tokenId = uuidv4();
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, tokenId },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES }
  );
  try {
    db.prepare('INSERT INTO refresh_tokens (id, user_id) VALUES (?, ?)').run(tokenId, user.id);
  } catch (err) {
    console.error('Failed to store refresh token:', err.message);
  }
  return token;
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.tokenId) return null;
    const stored = db.prepare('SELECT id FROM refresh_tokens WHERE id = ? AND user_id = ?').get(decoded.tokenId, decoded.id);
    if (!stored) return null;
    return decoded;
  } catch (err) {
    return null;
  }
};

// Remove refresh token
const removeRefreshToken = (tokenId) => {
  try {
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(tokenId);
  } catch (err) {
    // ignore
  }
};

const auth = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const optionalAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      req.user = jwt.verify(token, JWT_SECRET);
    }
  } catch (err) {
    // ignore
  }
  next();
};

module.exports = {
  auth,
  adminOnly,
  optionalAuth,
  JWT_SECRET,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  removeRefreshToken,
};
