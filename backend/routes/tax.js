// =============================================================
// TAX ROUTES
// =============================================================
const express = require('express');
const db = require('../db/database');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET /api/tax/calculate - Calculate tax
router.get('/calculate', async (req, res) => {
  const { amount, country, state, city } = req.query;
  const amt = parseFloat(amount) || 0;
  try {
    let sql = 'SELECT * FROM tax_rates WHERE active = 1';
    const params = [];
    if (country) { sql += ' AND (country IS NULL OR country = ?)'; params.push(country); }
    if (state) { sql += ' AND (state IS NULL OR state = ?)'; params.push(state); }
    if (city) { sql += ' AND (city IS NULL OR city = ?)'; params.push(city); }
    const rates = await db.prepare(sql).all(...params);
    let totalTax = 0;
    rates.forEach(r => { totalTax += amt * r.rate; });
    res.json({ tax: +totalTax.toFixed(2), breakdown: rates.map(r => ({ name: r.name, rate: r.rate, amount: +(amt * r.rate).toFixed(2) })) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate tax' });
  }
});

// GET /api/tax - Get all tax rates
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const rates = await db.prepare('SELECT * FROM tax_rates ORDER BY created_at DESC').all();
    res.json({ rates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tax rates' });
  }
});

// POST /api/tax - Create tax rate
router.post('/', auth, adminOnly, async (req, res) => {
  const { name, rate, country, state, city } = req.body;
  if (!name || rate === undefined) return res.status(400).json({ error: 'Name and rate are required' });
  try {
    const result = await db.prepare(
      'INSERT INTO tax_rates (name, rate, country, state, city) VALUES (?, ?, ?, ?, ?)'
    ).run(name, rate, country || null, state || null, city || null);
    const taxRate = await db.prepare('SELECT * FROM tax_rates WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ taxRate });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create tax rate' });
  }
});

// PUT /api/tax/:id - Update tax rate
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { name, rate, country, state, city, active } = req.body;
  try {
    const existing = await db.prepare('SELECT * FROM tax_rates WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tax rate not found' });
    await db.prepare(
      'UPDATE tax_rates SET name = COALESCE(?, name), rate = COALESCE(?, rate), country = COALESCE(?, country), state = COALESCE(?, state), city = COALESCE(?, city), active = COALESCE(?, active) WHERE id = ?'
    ).run(name, rate, country, state, city, active !== undefined ? (active ? 1 : 0) : null, req.params.id);
    const taxRate = await db.prepare('SELECT * FROM tax_rates WHERE id = ?').get(req.params.id);
    res.json({ taxRate });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tax rate' });
  }
});

// DELETE /api/tax/:id - Delete tax rate
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await db.prepare('DELETE FROM tax_rates WHERE id = ?').run(req.params.id);
    res.json({ message: 'Tax rate deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete tax rate' });
  }
});

module.exports = router;
