// =============================================================
// STATS ROUTE (admin - was /api/users/admin/stats)
// =============================================================
const express = require('express');
const db = require('../db/database');
const { auth, adminOnly } = require('../middleware/auth');
const { cacheMiddleware } = require('../utils/cache');
const router = express.Router();

router.get('/', auth, adminOnly, cacheMiddleware(() => 'admin:stats', 60000), async (req, res) => {
  try {
    const { start, end } = req.query;
    let dateFilter = '';
    const params = [];
    if (start) { dateFilter += ' AND created_at >= $' + (params.length + 1); params.push(start); }
    if (end) { dateFilter += ' AND created_at <= $' + (params.length + 1); params.push(end); }

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
    };
    res.json({ stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
