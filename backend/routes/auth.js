// =============================================================
// AUTH ROUTES - Register, Login, Get current user
// =============================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { auth, JWT_SECRET, generateAccessToken, generateRefreshToken, verifyRefreshToken, removeRefreshToken } = require('../middleware/auth');

const router = express.Router();

// Stricter limiter for auth endpoints: 5 attempts per 15 min per IP (audit: backend/server.js:68 global 200 is too loose for login)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Brute-force protection: in-memory login attempt tracking
const loginAttempts = new Map();
const LOGIN_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 10;
const LOCKOUT_TIME = 30 * 60 * 1000; // 30 minutes lockout

const getLoginKey = (email, ip) => `${email}:${ip}`;

const checkLoginRateLimit = (email, ip) => {
  const key = getLoginKey(email, ip);
  const record = loginAttempts.get(key);
  if (!record) return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS };
  if (Date.now() - record.lockedUntil > 0) {
    loginAttempts.delete(key);
    return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS };
  }
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    const remainingMs = record.lockedUntil - Date.now();
    return { allowed: false, remainingMs };
  }
  return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS - record.count };
};

const recordFailedLogin = (email, ip) => {
  const key = getLoginKey(email, ip);
  let record = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  record.count++;
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_TIME;
  }
  loginAttempts.set(key, record);
};

const resetLoginAttempts = (email, ip) => {
  loginAttempts.delete(getLoginKey(email, ip));
};

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, minLength: 2 }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               phone: { type: string }
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error
 */
// REGISTER
router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 chars'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be 6+ chars'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone } = req.body;

    try {
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const hash = bcrypt.hashSync(password, 10);
      const result = db
        .prepare('INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)')
        .run(name, email, hash, phone || null, 'customer');

      const user = db.prepare('SELECT id, name, email, role, phone, address, city, zip, country, avatar, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      res.status(201).json({ user, token: accessToken, refreshToken });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// LOGIN - stricter rate limit (max 5 / 15min per IP) + in-memory brute-force check
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const ip = req.ip;

    try {
      const rateCheck = checkLoginRateLimit(email, ip);
      if (!rateCheck.allowed) {
        const minutes = Math.ceil(rateCheck.remainingMs / 60000);
        return res.status(429).json({ error: `Too many failed attempts. Try again in ${minutes} minutes.` });
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) {
        recordFailedLogin(email, ip);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const valid = bcrypt.compareSync(password, user.password);
      if (!valid) {
        recordFailedLogin(email, ip);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      resetLoginAttempts(email, ip);
      delete user.password;
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      res.json({ user, token: accessToken, refreshToken });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// GET CURRENT USER
router.get('/me', auth, (req, res) => {
  try {
    const user = db
      .prepare('SELECT id, name, email, role, phone, address, city, zip, country, avatar, created_at FROM users WHERE id = ?')
      .get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// UPDATE PROFILE
router.put('/me', auth, (req, res) => {
  try {
    const { name, phone, address, city, zip, country, avatar } = req.body;
    db.prepare(`
      UPDATE users SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        zip = COALESCE(?, zip),
        country = COALESCE(?, country),
        avatar = COALESCE(?, avatar)
      WHERE id = ?
    `).run(name, phone, address, city, zip, country, avatar || null, req.user.id);

    const user = db
      .prepare('SELECT id, name, email, role, phone, address, city, zip, country, avatar, created_at FROM users WHERE id = ?')
      .get(req.user.id);
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// CHANGE PASSWORD
router.put(
  '/change-password',
  auth,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { currentPassword, newPassword } = req.body;
      const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (!bcrypt.compareSync(currentPassword, user.password)) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      const hash = bcrypt.hashSync(newPassword, 10);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);
      res.json({ message: 'Password updated' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

// FORGOT PASSWORD - generate reset token
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (!user) {
        return res.json({ message: 'If the email exists, a reset link has been sent' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      db.prepare('DELETE FROM password_resets WHERE email = ?').run(email);
      db.prepare('INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)').run(email, token, expiresAt);

      res.json({ message: 'If the email exists, a reset link has been sent' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to process request' });
    }
  }
);

// RESET PASSWORD - use token to set new password
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be 6+ chars'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    try {
      const record = db.prepare(
        "SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > datetime('now')"
      ).get(token);

      if (!record) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      const hash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET password = ? WHERE email = ?').run(hash, record.email);
      db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(record.id);

      res.json({ message: 'Password reset successful' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
);

// REFRESH TOKEN
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const user = db.prepare('SELECT id, name, email, role, phone, address, city, zip, country, avatar, created_at FROM users WHERE id = ?').get(decoded.id);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  // Rotate: remove old refresh token, issue new pair
  removeRefreshToken(decoded.tokenId);
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  res.json({ token: newAccessToken, refreshToken: newRefreshToken });
});

// LOGOUT - delete refresh token (audit: was missing - tokens lived until expiry)
router.post('/logout', (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const decoded = verifyRefreshToken(refreshToken);
    if (decoded && decoded.tokenId) {
      removeRefreshToken(decoded.tokenId);
    } else {
      try {
        const unverified = jwt.decode(refreshToken);
        if (unverified && unverified.tokenId) removeRefreshToken(unverified.tokenId);
      } catch (_) {}
    }
  }
  res.json({ message: 'Logged out' });
});

// LOGOUT ALL - delete all refresh tokens for current user (requires auth)
router.post('/logout-all', auth, (req, res) => {
  try {
    db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'Logged out from all devices' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to logout' });
  }
});

module.exports = router;
