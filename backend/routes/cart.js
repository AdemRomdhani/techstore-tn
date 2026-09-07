// =============================================================
// CART ROUTES
// =============================================================
const express = require('express');
const db = require('../db/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET cart
router.get('/', auth, async (req, res) => {
  try {
    const items = await db.prepare(`
      SELECT
        c.id as cart_id, c.quantity, c.created_at,
        p.id, p.name, p.slug, p.price, p.old_price, p.image, p.stock, p.brand
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ? AND p.active = 1
      ORDER BY c.created_at DESC
    `).all(req.user.id);

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const oldSubtotal = items.reduce((sum, i) => sum + (i.old_price || i.price) * i.quantity, 0);
    const savings = oldSubtotal - subtotal;
    const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);

    res.json({
      items,
      summary: {
        subtotal: +subtotal.toFixed(2),
        savings: +savings.toFixed(2),
        totalQuantity,
        itemCount: items.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// ADD to cart
router.post('/', auth, async (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id required' });
  try {
    const product = await db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(product_id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stock < quantity) return res.status(400).json({ error: 'Insufficient stock' });

    const existing = await db.prepare('SELECT * FROM cart WHERE user_id = ? AND product_id = ?').get(req.user.id, product_id);
    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > product.stock) return res.status(400).json({ error: 'Cannot exceed stock' });
      await db.prepare('UPDATE cart SET quantity = ? WHERE id = ?').run(newQty, existing.id);
    } else {
      await db.prepare('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)').run(req.user.id, product_id, quantity);
    }
    res.json({ message: 'Added to cart' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// UPDATE quantity
router.put('/:id', auth, async (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) return res.status(400).json({ error: 'Invalid quantity' });
  try {
    const item = await db.prepare(`
      SELECT c.*, p.stock FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.id = ? AND c.user_id = ?
    `).get(req.params.id, req.user.id);
    if (!item) return res.status(404).json({ error: 'Cart item not found' });
    if (quantity > item.stock) return res.status(400).json({ error: 'Exceeds stock' });

    await db.prepare('UPDATE cart SET quantity = ? WHERE id = ?').run(quantity, req.params.id);
    res.json({ message: 'Cart updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

// REMOVE item
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM cart WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Item removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

// CLEAR cart
router.delete('/', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM cart WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

module.exports = router;
