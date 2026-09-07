// =============================================================
// SHIPPING ROUTES
// =============================================================
const express = require('express');
const db = require('../db/database');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET /api/shipping/calculate - Calculate shipping
router.get('/calculate', async (req, res) => {
  const { country, amount } = req.query;
  const amt = parseFloat(amount) || 0;
  try {
    // Read settings for standard shipping and free threshold
    const standardShipping = parseFloat((await db.prepare("SELECT value FROM settings WHERE key = 'standard_shipping'").get())?.value || 5.99);
    const freeThreshold = parseFloat((await db.prepare("SELECT value FROM settings WHERE key = 'free_shipping_threshold'").get())?.value || 50);

    // Check if order qualifies for free shipping
    if (amt >= freeThreshold) {
      return res.json({ shipping: 0, zone: null, message: 'Free shipping' });
    }

    // Try shipping zones first
    let sql = 'SELECT * FROM shipping_zones WHERE active = 1';
    const params = [];
    if (country) { sql += ' AND (countries IS NULL OR countries LIKE ?)'; params.push(`%${country}%`); }
    const zones = await db.prepare(sql).all(...params);
    if (zones.length > 0) {
      const zone = zones.find(z => z.free_above && amt >= z.free_above) || zones[0];
      const shipping = zone.free_above && amt >= zone.free_above ? 0 : zone.rate;
      return res.json({ shipping: +shipping.toFixed(2), zone: { id: zone.id, name: zone.name, estimated_days: zone.estimated_days } });
    }

    // Fall back to settings standard_shipping
    res.json({ shipping: +standardShipping.toFixed(2), zone: null, message: 'Standard shipping' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate shipping' });
  }
});

// GET /api/shipping/zones - Get all zones
router.get('/zones', auth, adminOnly, async (req, res) => {
  try {
    const zones = await db.prepare('SELECT * FROM shipping_zones ORDER BY created_at DESC').all();
    res.json({ zones });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shipping zones' });
  }
});

// POST /api/shipping/zones - Create zone
router.post('/zones', auth, adminOnly, async (req, res) => {
  const { name, countries, rate, free_above, estimated_days } = req.body;
  if (!name || rate === undefined) return res.status(400).json({ error: 'Name and rate are required' });
  try {
    const result = await db.prepare(
      'INSERT INTO shipping_zones (name, countries, rate, free_above, estimated_days) VALUES (?, ?, ?, ?, ?)'
    ).run(name, countries ? JSON.stringify(countries) : null, rate, free_above || null, estimated_days || null);
    const zone = await db.prepare('SELECT * FROM shipping_zones WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ zone });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create shipping zone' });
  }
});

// PUT /api/shipping/zones/:id - Update zone
router.put('/zones/:id', auth, adminOnly, async (req, res) => {
  const { name, countries, rate, free_above, estimated_days, active } = req.body;
  try {
    const existing = await db.prepare('SELECT * FROM shipping_zones WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Shipping zone not found' });
    await db.prepare(
      'UPDATE shipping_zones SET name = COALESCE(?, name), countries = COALESCE(?, countries), rate = COALESCE(?, rate), free_above = COALESCE(?, free_above), estimated_days = COALESCE(?, estimated_days), active = COALESCE(?, active) WHERE id = ?'
    ).run(name, countries ? JSON.stringify(countries) : null, rate, free_above, estimated_days, active !== undefined ? (active ? 1 : 0) : null, req.params.id);
    const zone = await db.prepare('SELECT * FROM shipping_zones WHERE id = ?').get(req.params.id);
    res.json({ zone });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update shipping zone' });
  }
});

// DELETE /api/shipping/zones/:id - Delete zone
router.delete('/zones/:id', auth, adminOnly, async (req, res) => {
  try {
    await db.prepare('DELETE FROM shipping_zones WHERE id = ?').run(req.params.id);
    res.json({ message: 'Shipping zone deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete shipping zone' });
  }
});

module.exports = router;
