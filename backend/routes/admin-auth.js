// =============================================================
// ADMIN AUTH ROUTES - High Security
// =============================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const {
  auth,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  removeRefreshToken,
  JWT_SECRET,
} = require('../middleware/auth');

const router = express.Router();

// Login attempts tracking (in-memory, resets on server restart)
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

function isLocked(email) {
  const record = loginAttempts.get(email);
  if (!record) return false;
  if (record.count >= MAX_ATTEMPTS) {
    if (Date.now() - record.lastAttempt < LOCKOUT_TIME) {
      return true;
    }
    loginAttempts.delete(email);
  }
  return false;
}

function recordAttempt(email, success) {
  if (success) {
    loginAttempts.delete(email);
    return;
  }
  const record = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
  record.count++;
  record.lastAttempt = Date.now();
  loginAttempts.set(email, record);
}

// POST /api/admin-auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check lockout
    if (isLocked(email)) {
      return res.status(429).json({ error: 'Too many failed attempts. Try again in 15 minutes.' });
    }

    try {
      const user = await db.prepare('SELECT * FROM users WHERE email = ? AND role = ?').get(email, 'admin');
      if (!user) {
        recordAttempt(email, false);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!user.active) {
        return res.status(403).json({ error: 'Account is disabled' });
      }

      const valid = bcrypt.compareSync(password, user.password);
      if (!valid) {
        recordAttempt(email, false);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      recordAttempt(email, true);

      // Clean up old refresh tokens for this user
      await db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(user.id);

      const userSafe = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      const accessToken = generateAccessToken(userSafe);
      const refreshToken = await generateRefreshToken(userSafe);

      // Log the login
      try {
        await db.prepare('INSERT INTO audit_log (user_id, action, entity, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
          .run(user.id, 'login', 'user', user.id, JSON.stringify({ email: user.email }), req.ip);
      } catch (e) { /* ignore audit errors */ }

      res.json({ user: userSafe, token: accessToken, refreshToken });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// POST /api/admin-auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = await verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await db.prepare('SELECT id, name, email, role, active FROM users WHERE id = ? AND role = ?').get(decoded.id, 'admin');
    if (!user || !user.active) {
      return res.status(401).json({ error: 'User not found or disabled' });
    }

    // Rotate refresh token
    await removeRefreshToken(decoded.tokenId);
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = await generateRefreshToken(user);

    res.json({ token: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// GET /api/admin-auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await db.prepare('SELECT id, name, email, role, phone, address, city, zip, country, avatar, created_at FROM users WHERE id = ? AND role = ?').get(req.user.id, 'admin');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/admin-auth/me
router.put('/me', auth, async (req, res) => {
  const { name, phone, address, city, zip, country, avatar } = req.body;
  try {
    await db.prepare(`
      UPDATE users SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        zip = COALESCE(?, zip),
        country = COALESCE(?, country),
        avatar = COALESCE(?, avatar)
      WHERE id = ? AND role = 'admin'
    `).run(name, phone, address, city, zip, country, avatar || null, req.user.id);

    const user = await db.prepare('SELECT id, name, email, role, phone, address, city, zip, country, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/admin-auth/change-password
router.put(
  '/change-password',
  auth,
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be 8+ chars'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    try {
      const user = await db.prepare('SELECT password FROM users WHERE id = ? AND role = ?').get(req.user.id, 'admin');
      if (!bcrypt.compareSync(currentPassword, user.password)) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Enforce strong password
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(newPassword)) {
        return res.status(400).json({ error: 'Password must include uppercase, lowercase, number, and special character' });
      }

      const hash = bcrypt.hashSync(newPassword, 12);
      await db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);

      // Invalidate all refresh tokens (force re-login on all devices)
      await db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(req.user.id);

      res.json({ message: 'Password updated. Please login again.' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

// POST /api/admin-auth/logout
router.post('/logout', auth, async (req, res) => {
  try {
    // Remove all refresh tokens for this user
    await db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;
