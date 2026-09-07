// =============================================================
// CATEGORY ROUTES
// =============================================================
const express = require('express');
const db = require('../db/database');
const { auth, adminOnly } = require('../middleware/auth');
const { cacheMiddleware, invalidate } = require('../utils/cache');

const router = express.Router();

const slugify = (str) =>
  str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

// GET all categories (with sort_order)
router.get('/', cacheMiddleware('categories:all', 120000), (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.active = 1
      GROUP BY c.id
      ORDER BY COALESCE(c.sort_order, 999999), c.name
    `).all();
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET single category
router.get('/:id', (req, res) => {
  try {
    const isNumeric = /^\d+$/.test(req.params.id);
    const category = db.prepare(`SELECT * FROM categories WHERE ${isNumeric ? 'id = ?' : 'slug = ?'}`).get(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json({ category });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// ADMIN: create
router.post('/', auth, adminOnly, (req, res) => {
  const { name, description, image, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const slug = slugify(name);
  try {
    const result = db.prepare(`
      INSERT INTO categories (name, slug, description, image, icon)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, slug, description || '', image || '', icon || 'bi-tag');
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ category });
    invalidate('categories:');
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Category already exists' });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// ADMIN: reorder categories (must be before /:id)
router.put('/admin/reorder', auth, adminOnly, (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' });
  try {
    const stmt = db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?');
    const tx = db.transaction(() => {
      order.forEach((id, index) => {
        stmt.run(index, id);
      });
    });
    tx();
    res.json({ message: 'Categories reordered', order });
    invalidate('categories:');
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder categories' });
  }
});

// ADMIN: update
router.put('/:id', auth, adminOnly, (req, res) => {
  const { name, description, image, icon } = req.body;
  try {
    db.prepare(`
      UPDATE categories SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        image = COALESCE(?, image),
        icon = COALESCE(?, icon)
      WHERE id = ?
    `).run(name, description, image, icon, req.params.id);
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    res.json({ category });
    invalidate('categories:');
  } catch (err) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// ADMIN: delete
router.delete('/:id', auth, adminOnly, (req, res) => {
  try {
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ message: 'Category deleted' });
    invalidate('categories:');
    invalidate('products:');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
