// =============================================================
// INVENTORY ROUTES
// =============================================================
const express = require('express');
const db = require('../db/database');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET /api/inventory/history/:productId - Get product inventory history
router.get('/history/:productId', auth, adminOnly, (req, res) => {
  try {
    const history = db.prepare(
      'SELECT ih.*, u.name as user_name FROM inventory_history ih LEFT JOIN users u ON ih.user_id = u.id WHERE ih.product_id = ? ORDER BY ih.created_at DESC LIMIT 100'
    ).all(req.params.productId);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory history' });
  }
});

// POST /api/inventory/adjust - Manual stock adjustment
router.post('/adjust', auth, adminOnly, (req, res) => {
  const { product_id, change, reason } = req.body;
  if (!product_id || change === undefined) return res.status(400).json({ error: 'product_id and change are required' });
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const newStock = product.stock + change;
    if (newStock < 0) return res.status(400).json({ error: 'Stock cannot be negative' });

    const tx = db.transaction(() => {
      db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStock, product_id);
      db.prepare('INSERT INTO inventory_history (product_id, change, reason, reference_id, user_id) VALUES (?, ?, ?, NULL, ?)').run(product_id, change, reason || 'Manual adjustment', 1);
    });
    tx();

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    res.json({ product: updated, message: `Stock adjusted by ${change}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to adjust inventory' });
  }
});

module.exports = router;
