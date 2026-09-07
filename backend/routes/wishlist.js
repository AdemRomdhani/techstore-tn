// =============================================================
// WISHLIST ROUTES
// =============================================================
const express = require('express');
const db = require('../db/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET wishlist
router.get('/', auth, async (req, res) => {
  try {
    const items = await db.prepare(`
      SELECT w.id as wishlist_id, w.created_at,
             p.id, p.name, p.slug, p.price, p.old_price, p.image, p.stock, p.brand, p.rating
      FROM wishlist w
      JOIN products p ON w.product_id = p.id
      WHERE w.user_id = ? AND p.active = 1
      ORDER BY w.created_at DESC
    `).all(req.user.id);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// ADD to wishlist
router.post('/', auth, async (req, res) => {
  const { product_id } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id required' });
  try {
    const existing = await db.prepare('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?').get(req.user.id, product_id);
    if (existing) return res.status(400).json({ error: 'Already in wishlist' });
    await db.prepare('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)').run(req.user.id, product_id);
    res.status(201).json({ message: 'Added to wishlist' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// REMOVE
router.delete('/:productId', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?').run(req.user.id, req.params.productId);
    res.json({ message: 'Removed from wishlist' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove' });
  }
});

module.exports = router;
