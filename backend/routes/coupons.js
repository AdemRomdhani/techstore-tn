// =============================================================
// COUPONS ROUTES (admin CRUD)
// =============================================================
const express = require('express');
const db = require('../db/database');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET all coupons (admin)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const coupons = await db.prepare('SELECT * FROM coupons ORDER BY id DESC').all();
    res.json({ coupons });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// POST create coupon (admin)
router.post('/', auth, adminOnly, async (req, res) => {
  const { code, discount_percent, max_uses, expires_at } = req.body;
  if (!code || !discount_percent) {
    return res.status(400).json({ error: 'Code and discount_percent are required' });
  }
  if (discount_percent < 1 || discount_percent > 100) {
    return res.status(400).json({ error: 'Discount must be between 1 and 100' });
  }
  try {
    const existing = await db.prepare('SELECT id FROM coupons WHERE code = ?').get(code.toUpperCase());
    if (existing) {
      return res.status(400).json({ error: 'Coupon code already exists' });
    }
    const result = await db.prepare(
      'INSERT INTO coupons (code, discount_percent, max_uses, expires_at) VALUES (?, ?, ?, ?)'
    ).run(code.toUpperCase(), discount_percent, max_uses || 100, expires_at || null);
    const coupon = await db.prepare('SELECT * FROM coupons WHERE id = ?').get(Number(result.lastInsertRowid));
    res.status(201).json({ coupon });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

// PUT update coupon (admin)
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { code, discount_percent, max_uses, expires_at, active } = req.body;
  try {
    const existing = await db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Coupon not found' });

    if (code && code.toUpperCase() !== existing.code) {
      const dup = await db.prepare('SELECT id FROM coupons WHERE code = ? AND id != ?').get(code.toUpperCase(), req.params.id);
      if (dup) return res.status(400).json({ error: 'Coupon code already exists' });
    }

    await db.prepare(`
      UPDATE coupons SET
        code = COALESCE(?, code),
        discount_percent = COALESCE(?, discount_percent),
        max_uses = COALESCE(?, max_uses),
        expires_at = ?,
        active = COALESCE(?, active)
      WHERE id = ?
    `).run(
      code ? code.toUpperCase() : null,
      discount_percent !== undefined ? discount_percent : null,
      max_uses !== undefined ? max_uses : null,
      expires_at !== undefined ? expires_at : existing.expires_at,
      active !== undefined ? (active ? 1 : 0) : null,
      req.params.id
    );
    const coupon = await db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id);
    res.json({ coupon });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

// DELETE coupon (admin)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
    res.json({ message: 'Coupon deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

module.exports = router;
