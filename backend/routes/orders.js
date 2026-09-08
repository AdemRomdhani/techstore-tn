// =============================================================
// ORDERS ROUTES
// =============================================================
const express = require('express');
const db = require('../db/database');
const { sendEmail, templates } = require('../services/email');
const { createNotification, notifyAdmins } = require('../services/notifications');
const { t } = require('../services/i18n');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GUEST: Create order (no auth required)
router.post('/guest', async (req, res) => {
  const { items, nom, prenom, adresse, numero, payment_method, coupon_code } = req.body;

  if (!nom || !prenom || !adresse || !numero) {
    return res.status(400).json({ error: 'Nom, prenom, adresse et numero sont requis' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Panier vide' });
  }

  try {
    const shipping_name = `${prenom} ${nom}`;
    const shipping_address = adresse;
    const shipping_city = '';
    const shipping_phone = numero;

    // Fetch product info for each item
    const productIds = items.map(i => i.product_id);
    const placeholders = productIds.map(() => '?').join(',');
    const products = await db.prepare(`SELECT * FROM products WHERE id IN (${placeholders}) AND active = 1`).all(...productIds);
    const productMap = {};
    products.forEach(p => { productMap[p.id] = p; });

    // Build order items with prices from DB
    const orderItems = [];
    for (const item of items) {
      const product = productMap[item.product_id];
      if (!product) return res.status(400).json({ error: `Produit ${item.product_id} introuvable` });
      if (item.quantity > product.stock) return res.status(400).json({ error: `Stock insuffisant pour ${product.name}` });
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        product_image: product.image,
        price: product.price,
        quantity: item.quantity,
      });
    }

    let subtotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);

    // Apply coupon
    let discountPercent = 0;
    let couponId = null;
    if (coupon_code) {
      const coupon = await db.prepare(`SELECT * FROM coupons WHERE code = ? AND active = 1 AND (expires_at IS NULL OR expires_at > NOW()) AND used_count < max_uses`).get(coupon_code.toUpperCase());
      if (coupon) {
        discountPercent = coupon.discount_percent;
        couponId = coupon.id;
      }
    }

    const discount = subtotal * (discountPercent / 100);

    // Calculate tax
    let totalTax = 0;
    const taxRates = await db.prepare('SELECT * FROM tax_rates WHERE active = 1').all();
    taxRates.forEach(t => { totalTax += (subtotal - discount) * t.rate; });
    totalTax = +totalTax.toFixed(2);

    // Calculate shipping
    let shipping = 0;
    const freeThreshold = parseFloat((await db.prepare(`SELECT value FROM settings WHERE key = 'free_shipping_threshold'`).get())?.value || 50);
    const standardShipping = parseFloat((await db.prepare(`SELECT value FROM settings WHERE key = 'standard_shipping'`).get())?.value || 5.99);
    shipping = subtotal >= freeThreshold ? 0 : standardShipping;

    const total = subtotal - discount + totalTax + shipping;

    let orderId;
    const tx = db.transaction(async (client) => {
      if (couponId) {
        await client.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = $1', [couponId]);
      }

      let guestUser = (await client.query("SELECT id FROM users WHERE email = 'guest@system.local'")).rows[0];
      if (!guestUser) {
        const bcrypt = require('bcryptjs');
        const hash = bcrypt.hashSync('guest_' + Date.now(), 10);
        const result = await client.query("INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id", ['Guest', 'guest@system.local', hash, 'customer']);
        guestUser = { id: result.rows[0].id };
      }

      const orderResult = await client.query(`
        INSERT INTO orders (user_id, total, status, payment_method, shipping_name, shipping_nom, shipping_prenom, shipping_address, shipping_city, shipping_zip, shipping_country, shipping_phone, notes)
        VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [guestUser.id, total, payment_method || 'cod', shipping_name, nom, prenom, shipping_address, shipping_city, '', 'Tunisie', shipping_phone, '']);
      orderId = orderResult.rows[0].id;

      for (const i of orderItems) {
        await client.query(`INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity) VALUES ($1, $2, $3, $4, $5, $6)`, [orderId, i.product_id, i.product_name, i.product_image, i.price, i.quantity]);
        await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [i.quantity, i.product_id]);
        await client.query('INSERT INTO inventory_history (product_id, change, reason, reference_id, user_id) VALUES ($1, $2, $3, $4, NULL)', [i.product_id, -i.quantity, 'Order #' + orderId, orderId]);
      }
    });
    await tx();

    const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const finalItems = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

    notifyAdmins(t('newOrder'), `Nouvelle commande #${orderId} de ${shipping_name}`, 'info', `/orders/${orderId}`);

    res.status(201).json({
      order: { ...order, items: finalItems },
      summary: { subtotal: +subtotal.toFixed(2), discount: +discount.toFixed(2), tax: totalTax, shipping, total: +total.toFixed(2) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la création de la commande' });
  }
});

// GUEST: Get order by ID - requires order ID + phone number for verification
router.get('/guest/:id', async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'Phone number required for verification' });
  try {
    const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    if (order.shipping_phone !== phone) return res.status(403).json({ error: 'Access denied' });
    const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
    res.json({ order: { ...order, items } });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération de la commande' });
  }
});

// Validate coupon
router.post('/coupon/validate', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ valid: false, error: 'Code requis' });
  try {
    const coupon = await db.prepare(`SELECT * FROM coupons WHERE code = ? AND active = 1 AND (expires_at IS NULL OR expires_at > NOW()) AND used_count < max_uses`).get(code.toUpperCase());
    if (!coupon) return res.json({ valid: false, error: 'Code invalide ou expiré' });
    res.json({ valid: true, coupon: { code: coupon.code, discount_percent: coupon.discount_percent, max_uses: coupon.max_uses, used_count: coupon.used_count } });
  } catch (err) {
    res.status(500).json({ valid: false, error: 'Erreur de validation' });
  }
});

// CUSTOMER: Get my orders
router.get('/my', auth, async (req, res) => {
  try {
    const orders = await db.prepare(`
      SELECT o.*, COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `).all(req.user.id);
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// CUSTOMER: Get single order detail
router.get('/my/:id', auth, async (req, res) => {
  try {
    const order = await db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
    res.json({ order: { ...order, items } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// CUSTOMER: Cancel my order (only if pending)
router.put('/my/:id/cancel', auth, async (req, res) => {
  try {
    const order = await db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending orders can be cancelled' });
    }

    const tx = db.transaction(async (client) => {
      await client.query("UPDATE orders SET status = 'cancelled' WHERE id = $1", [req.params.id]);
      const items = (await client.query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id])).rows;
      for (const item of items) {
        if (item.product_id) {
          await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
        }
      }
    });
    await tx();

    const updated = await db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    res.json({ order: updated, message: 'Order cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// ADMIN: get all orders
router.get('/admin/all', auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT o.*, COUNT(oi.id) as item_count FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id`;
    const params = [];
    if (status) { sql += ' WHERE o.status = ?'; params.push(status); }
    sql += ' GROUP BY o.id ORDER BY o.created_at DESC';
    const orders = await db.prepare(sql).all(...params);
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ADMIN: export orders as CSV (must be before /:id)
router.get('/admin/export', auth, adminOnly, async (req, res) => {
  try {
    const { status, start, end } = req.query;
    let sql = `SELECT o.id, o.total, o.status, o.payment_method, o.shipping_name, o.shipping_address, o.shipping_city, o.shipping_country, o.created_at, COUNT(oi.id) as item_count FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND o.status = ?'; params.push(status); }
    if (start) { sql += ' AND o.created_at >= ?'; params.push(start); }
    if (end) { sql += ' AND o.created_at <= ?'; params.push(end); }
    sql += ' GROUP BY o.id ORDER BY o.created_at DESC';
    const orders = await db.prepare(sql).all(...params);
    const header = 'ID;Total;Status;Payment;Name;Address;City;Country;Items;Created At\n';
    const rows = orders.map(o => [
      o.id,
      o.total,
      o.status,
      o.payment_method,
      o.shipping_name,
      o.shipping_address,
      o.shipping_city,
      o.shipping_country,
      o.item_count,
      o.created_at
    ].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(';')).join('\n');
    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=orders_export.csv');
    res.send(bom + header + rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export orders' });
  }
});

// ADMIN: get single order detail
router.get('/admin/:id', auth, adminOnly, async (req, res) => {
  try {
    const order = await db.prepare(`SELECT o.* FROM orders o WHERE o.id = ?`).get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
    const notes = await db.prepare('SELECT * FROM order_notes WHERE order_id = ? ORDER BY created_at DESC').all(req.params.id);
    res.json({ order: { ...order, items, notes, nom: order.shipping_nom || '', prenom: order.shipping_prenom || '' } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ADMIN: update order status
router.put('/admin/:id/status', auth, adminOnly, async (req, res) => {
  const { status, note } = req.body;
  const valid = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    await db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    if (note) { await db.prepare('INSERT INTO order_notes (order_id, note) VALUES (?, ?)').run(req.params.id, note); }
    const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// ADMIN: delete order
router.delete('/admin/:id', auth, adminOnly, async (req, res) => {
  try {
    const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const tx = db.transaction(async (client) => {
      const items = (await client.query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id])).rows;
      for (const item of items) {
        if (item.product_id) {
          await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
        }
      }
      await client.query('DELETE FROM order_notes WHERE order_id = $1', [req.params.id]);
      await client.query('DELETE FROM order_items WHERE order_id = $1', [req.params.id]);
      await client.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    });
    await tx();

    res.json({ message: 'Order deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

module.exports = router;
