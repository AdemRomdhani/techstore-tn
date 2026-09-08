// =============================================================
// REVIEWS ROUTES
// =============================================================
const express = require('express');
const db = require('../db/database');
const { auth, adminOnly, optionalAuth } = require('../middleware/auth');
const router = express.Router();

// CREATE review (supports anonymous reviews)
router.post('/', optionalAuth, async (req, res) => {
  const { product_id, rating, comment, name } = req.body;
  if (!product_id || !rating) return res.status(400).json({ error: 'product_id and rating required' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

  try {
    const userId = req.user ? req.user.id : null;
    const displayName = (req.user && req.user.name) || name || 'Anonyme';

    let verified = 0;
    if (userId) {
      const purchased = await db.prepare(`
        SELECT 1 FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.user_id = ? AND oi.product_id = ? AND o.status IN ('delivered','shipped','processing')
        LIMIT 1
      `).get(userId, product_id);
      verified = purchased ? 1 : 0;
    }

    if (userId) {
      const existing = await db.prepare('SELECT id FROM reviews WHERE user_id = ? AND product_id = ?').get(userId, product_id);
      if (existing) {
        await db.prepare('UPDATE reviews SET rating = ?, comment = ?, verified = ? WHERE id = ?').run(rating, comment, verified, existing.id);
      } else {
        await db.prepare('INSERT INTO reviews (user_id, product_id, rating, comment, verified) VALUES (?, ?, ?, ?, ?)').run(userId, product_id, rating, comment, verified);
      }
    } else {
      const existingAnon = await db.prepare('SELECT id FROM reviews WHERE user_id IS NULL AND product_id = ? AND user_name = ?').get(product_id, displayName);
      if (existingAnon) {
        await db.prepare('UPDATE reviews SET rating = ?, comment = ? WHERE id = ?').run(rating, comment, existingAnon.id);
      } else {
        await db.prepare('INSERT INTO reviews (user_id, product_id, rating, comment, verified, user_name) VALUES (NULL, ?, ?, ?, ?, ?)').run(product_id, rating, comment, 0, displayName);
      }
    }

    // Update product aggregate rating
    const stats = await db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as cnt FROM reviews WHERE product_id = ?').get(product_id);
    const avgRating = stats.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0;
    await db.prepare('UPDATE products SET rating = ?, reviews_count = ? WHERE id = ?').run(avgRating, stats.cnt, product_id);

    const review = await db.prepare('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT 1').get(product_id);

    res.status(201).json({ review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// GET all reviews (admin)
router.get('/admin/all', auth, adminOnly, async (req, res) => {
  try {
    const reviews = await db.prepare(`
      SELECT r.*,
        CASE WHEN r.user_id IS NOT NULL THEN u.name ELSE r.user_name END as display_name,
        u.avatar as user_avatar,
        p.name as product_name
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN products p ON r.product_id = p.id
      ORDER BY r.created_at DESC
    `).all();
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// GET reviews for product
router.get('/product/:productId', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const reviews = await db.prepare(`
      SELECT r.*,
        CASE WHEN r.user_id IS NOT NULL THEN u.name ELSE r.user_name END as display_name,
        u.avatar as user_avatar
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.params.productId, limit, offset);
    const total = await db.prepare('SELECT COUNT(*) as cnt FROM reviews WHERE product_id = ?').get(req.params.productId);
    res.json({ reviews, total: total.cnt });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// DELETE review (own or admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await db.prepare('SELECT id, role, active FROM users WHERE id = ?').get(req.user.id);
    if (!user || user.active === 0) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }
    const review = await db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    const isAdmin = user.role === 'admin';
    const isOwner = review.user_id !== null && review.user_id === user.id;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);

    const stats = await db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as cnt FROM reviews WHERE product_id = ?').get(review.product_id);
    const avgRating = stats.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0;
    await db.prepare('UPDATE products SET rating = ?, reviews_count = ? WHERE id = ?').run(avgRating, stats.cnt, review.product_id);

    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

module.exports = router;
