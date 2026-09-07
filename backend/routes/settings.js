// =============================================================
// SETTINGS ROUTES
// =============================================================
const express = require('express');
const db = require('../db/database');
const { auth, adminOnly } = require('../middleware/auth');
const { cacheMiddleware, invalidate } = require('../utils/cache');

const router = express.Router();

// GET public settings
router.get('/', cacheMiddleware('settings:all', 300000), (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ADMIN: update settings
router.put('/', auth, adminOnly, (req, res) => {
  const updates = req.body;
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  try {
    Object.entries(updates).forEach(([k, v]) => upsert.run(k, v));
    res.json({ message: 'Settings updated' });
    invalidate('settings:');
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
