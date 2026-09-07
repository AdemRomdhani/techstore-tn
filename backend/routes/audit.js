// =============================================================
// AUDIT LOG ROUTES (admin only)
// =============================================================
const express = require('express');
const db = require('../db/database');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET /api/audit - Get audit log with pagination
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50, action, entity, user_id } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    let sql = 'SELECT al.*, u.name as user_name, u.email as user_email FROM audit_log al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM audit_log al WHERE 1=1';
    const params = [];
    const cParams = [];

    if (action) { sql += ' AND al.action = ?'; countSql += ' AND al.action = ?'; params.push(action); cParams.push(action); }
    if (entity) { sql += ' AND al.entity = ?'; countSql += ' AND al.entity = ?'; params.push(entity); cParams.push(entity); }
    if (user_id) { sql += ' AND al.user_id = ?'; countSql += ' AND al.user_id = ?'; params.push(user_id); cParams.push(user_id); }

    sql += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const logs = await db.prepare(sql).all(...params);
    const { total } = await db.prepare(countSql).get(...cParams);

    res.json({ logs, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

module.exports = router;
