// =============================================================
// USERS ROUTES (admin only)
// =============================================================
const express = require('express');
const db = require('../db/database');
const { auth, adminOnly } = require('../middleware/auth');
const { cacheMiddleware, invalidate } = require('../utils/cache');

const router = express.Router();

// ADMIN: stats (must be before /:id to avoid being matched by it)
router.get('/admin/stats', auth, adminOnly, cacheMiddleware((req) => `admin:stats:${JSON.stringify(req.query)}`, 60000), async (req, res) => {
  try {
    const { start, end } = req.query;
    let dateFilter = '';
    const params = [];
    if (start) {
      dateFilter += ' AND created_at >= ?';
      params.push(start);
    }
    if (end) {
      dateFilter += ' AND created_at <= ?';
      params.push(end);
    }

    const stats = {
      totalUsers: (await db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'customer'").get()).c,
      totalProducts: (await db.prepare('SELECT COUNT(*) as c FROM products WHERE active = 1').get()).c,
      totalOrders: (await db.prepare(`SELECT COUNT(*) as c FROM orders WHERE 1=1${dateFilter}`).get(...params)).c,
      totalRevenue: (await db.prepare(`SELECT COALESCE(SUM(total), 0) as r FROM orders WHERE status != 'cancelled'${dateFilter}`).get(...params)).r,
      pendingOrders: (await db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'pending'").get()).c,
      processingOrders: (await db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'processing'").get()).c,
      lowStockProducts: (await db.prepare('SELECT COUNT(*) as c FROM products WHERE stock < 10 AND active = 1').get()).c,
      recentOrders: await db.prepare(`
        SELECT o.*, u.name as user_name, u.email as user_email
        FROM orders o JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC LIMIT 10
      `).all(),
      topProducts: await db.prepare(`
        SELECT p.id, p.name, p.image, p.price, SUM(oi.quantity) as sold, SUM(oi.quantity * oi.price) as revenue
        FROM order_items oi JOIN products p ON oi.product_id = p.id
        GROUP BY p.id ORDER BY sold DESC LIMIT 5
      `).all(),
      revenueByDay: await db.prepare(`
        SELECT DATE(created_at) as date, COALESCE(SUM(total), 0) as revenue
        FROM orders WHERE status != 'cancelled' AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at) ORDER BY date
      `).all(),
      ordersByStatus: await db.prepare(`
        SELECT status, COUNT(*) as count FROM orders GROUP BY status
      `).all(),
      userGrowth: await db.prepare(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at) ORDER BY date
      `).all(),
    };
    res.json({ stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET all users (admin)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const users = await db.prepare(`
      SELECT id, name, email, role, phone, address, city, country, active, created_at,
      (SELECT COUNT(*) FROM orders WHERE user_id = users.id) as orders_count,
      (SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = users.id AND status != 'cancelled') as total_spent
      FROM users
      ORDER BY created_at DESC
    `).all();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET single user
router.get('/:id', auth, adminOnly, async (req, res) => {
  try {
    const user = await db.prepare(`
      SELECT id, name, email, role, phone, address, city, country, active, created_at
      FROM users WHERE id = ?
    `).get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const recentOrders = await db.prepare(`
      SELECT o.*, COUNT(oi.id) as items_count
      FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC LIMIT 10
    `).all(req.params.id);
    res.json({ user, recentOrders });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// UPDATE user (admin)
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { name, email, role, phone, address, city, country, active } = req.body;
  try {
    await db.prepare(`
      UPDATE users SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        role = COALESCE(?, role),
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        country = COALESCE(?, country),
        active = COALESCE(?, active)
      WHERE id = ?
    `).run(name, email, role, phone, address, city, country, active !== undefined ? (active ? 1 : 0) : null, req.params.id);
    const user = await db.prepare('SELECT id, name, email, role, phone, address, city, country, active, created_at FROM users WHERE id = ?').get(req.params.id);
    res.json({ user });
    invalidate('admin:stats');
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// TOGGLE user active status
router.put('/:id/toggle-active', auth, adminOnly, async (req, res) => {
  try {
    const user = await db.prepare('SELECT id, active FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const newActive = user.active === 1 ? 0 : 1;
    await db.prepare('UPDATE users SET active = ? WHERE id = ?').run(newActive, req.params.id);
    const updated = await db.prepare('SELECT id, name, email, role, phone, address, city, country, active, created_at FROM users WHERE id = ?').get(req.params.id);
    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
});

// DELETE user
router.delete('/:id', auth, adminOnly, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  try {
    await db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ message: 'User deleted' });
    invalidate('admin:stats');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
