// =============================================================
// PRODUCT VARIANTS ROUTES
// =============================================================
const express = require('express');
const db = require('../db/database');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET /api/variants/product/:productId - Get product variants
router.get('/product/:productId', (req, res) => {
  try {
    const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY created_at DESC').all(req.params.productId);
    res.json({ variants });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch variants' });
  }
});

// POST /api/variants - Create variant
router.post('/', auth, adminOnly, (req, res) => {
  const { product_id, name, sku, price, stock, image } = req.body;
  if (!product_id || !name) return res.status(400).json({ error: 'product_id and name are required' });
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const result = db.prepare(
      'INSERT INTO product_variants (product_id, name, sku, price, stock, image) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(product_id, name, sku || null, price || product.price, stock || 0, image || null);
    const variant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ variant });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: 'SKU already exists' });
    res.status(500).json({ error: 'Failed to create variant' });
  }
});

// PUT /api/variants/:id - Update variant
router.put('/:id', auth, adminOnly, (req, res) => {
  const { name, sku, price, stock, image } = req.body;
  try {
    const existing = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Variant not found' });

    db.prepare(
      'UPDATE product_variants SET name = COALESCE(?, name), sku = COALESCE(?, sku), price = COALESCE(?, price), stock = COALESCE(?, stock), image = COALESCE(?, image) WHERE id = ?'
    ).run(name, sku, price, stock, image, req.params.id);
    const variant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(req.params.id);
    res.json({ variant });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: 'SKU already exists' });
    res.status(500).json({ error: 'Failed to update variant' });
  }
});

// DELETE /api/variants/:id - Delete variant
router.delete('/:id', auth, adminOnly, (req, res) => {
  try {
    db.prepare('DELETE FROM product_variants WHERE id = ?').run(req.params.id);
    res.json({ message: 'Variant deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete variant' });
  }
});

module.exports = router;
