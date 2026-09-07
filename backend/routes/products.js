// =============================================================
// PRODUCT ROUTES - CRUD, search, filter, featured
// =============================================================
const express = require('express');
const db = require('../db/database');
const { auth, adminOnly } = require('../middleware/auth');
const { cacheMiddleware, invalidate } = require('../utils/cache');

const router = express.Router();

// Slugify helper
const slugify = (str) =>
  str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search term
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Category slug
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [newest, oldest, price-asc, price-desc, rating-desc, popular] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12 }
 *     responses:
 *       200:
 *         description: Paginated list of products
 */
// GET /api/products - list with filters
router.get('/', (req, res) => {
  try {
    const {
      search,
      category,
      categoryId,
      minPrice,
      maxPrice,
      featured,
      stock_status,
      sort = 'newest',
      page = 1,
      limit = 12,
    } = req.query;

    let useFts = false;
    if (search) {
      try {
        db.prepare("SELECT 1 FROM products_fts WHERE products_fts MATCH ? LIMIT 1").get(search + '*');
        useFts = true;
      } catch (e) {
        useFts = false;
      }
    }

    let sql;
    const params = [];
    const isAdmin = req.user && req.user.role === 'admin';

    if (useFts) {
      sql = `SELECT p.*, c.name as category_name, c.slug as category_slug,
             rank FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             JOIN products_fts fts ON fts.rowid = p.id
             WHERE products_fts MATCH ?`;
      params.push(search + '*');
      if (!isAdmin) { sql += ' AND p.active = 1'; }
    } else {
      sql = `SELECT p.*, c.name as category_name, c.slug as category_slug
             FROM products p LEFT JOIN categories c ON p.category_id = c.id`;
      if (isAdmin) {
        sql += ' WHERE 1=1';
      } else {
        sql += ' WHERE p.active = 1';
      }
    }

    if (!useFts && search) {
      sql += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (category) {
      sql += ' AND c.slug = ?';
      params.push(category);
    }
    if (categoryId) {
      sql += ' AND p.category_id = ?';
      params.push(categoryId);
    }
    if (minPrice) {
      sql += ' AND p.price >= ?';
      params.push(parseFloat(minPrice));
    }
    if (maxPrice) {
      sql += ' AND p.price <= ?';
      params.push(parseFloat(maxPrice));
    }
    if (featured === 'true' || featured === '1') {
      sql += ' AND p.featured = 1';
    }
    if (stock_status === 'in-stock') {
      sql += ' AND p.stock > 10';
    } else if (stock_status === 'low-stock') {
      sql += ' AND p.stock >= 1 AND p.stock <= 10';
    } else if (stock_status === 'out-of-stock') {
      sql += ' AND p.stock = 0';
    }

    // Sorting
    const sortMap = {
      newest: 'p.created_at DESC',
      oldest: 'p.created_at ASC',
      'price-asc': 'p.price ASC',
      'price-desc': 'p.price DESC',
      'name-asc': 'p.name ASC',
      'name-desc': 'p.name DESC',
      'rating-desc': 'p.rating DESC',
      'popular': 'p.reviews_count DESC',
      'relevance': 'rank',
    };
    sql += ' ORDER BY ' + (sortMap[sort] || sortMap.newest);

    // Pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 12));
    const offset = (pageNum - 1) * limitNum;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const products = db.prepare(sql).all(...params);

    // Count
    let countSql;
    const cParams = [];
    if (useFts) {
      countSql = `SELECT COUNT(*) as total FROM products p
                  JOIN products_fts fts ON fts.rowid = p.id
                  WHERE products_fts MATCH ?`;
      cParams.push(search + '*');
      if (!isAdmin) { countSql += ' AND p.active = 1'; }
    } else {
      countSql = isAdmin
        ? 'SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1'
        : 'SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.active = 1';
      if (!useFts && search) {
        countSql += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)';
        cParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
    }
    if (category) { countSql += ' AND c.slug = ?'; cParams.push(category); }
    if (categoryId) { countSql += ' AND p.category_id = ?'; cParams.push(categoryId); }
    if (minPrice) { countSql += ' AND p.price >= ?'; cParams.push(parseFloat(minPrice)); }
    if (maxPrice) { countSql += ' AND p.price <= ?'; cParams.push(parseFloat(maxPrice)); }
    if (featured === 'true' || featured === '1') { countSql += ' AND p.featured = 1'; }
    if (stock_status === 'in-stock') { countSql += ' AND p.stock > 10'; }
    else if (stock_status === 'low-stock') { countSql += ' AND p.stock >= 1 AND p.stock <= 10'; }
    else if (stock_status === 'out-of-stock') { countSql += ' AND p.stock = 0'; }

    const { total } = db.prepare(countSql).get(...cParams);

    // Inject user-specific data using Set for O(1) lookups
    let userWishlist = new Set();
    let cartMap = {};
    if (req.user) {
      const wishlistRows = db.prepare('SELECT product_id FROM wishlist WHERE user_id = ?').all(req.user.id);
      userWishlist = new Set(wishlistRows.map(r => r.product_id));
      const userCart = db.prepare('SELECT product_id, quantity FROM cart WHERE user_id = ?').all(req.user.id);
      userCart.forEach(c => { cartMap[c.product_id] = c.quantity; });
    }

    const enriched = products.map(p => ({
      ...p,
      in_wishlist: userWishlist.has(p.id),
      in_cart_quantity: cartMap[p.id] || 0,
      discount_percent: p.old_price ? Math.round(((p.old_price - p.price) / p.old_price) * 100) : 0,
    }));

    res.json({
      products: enriched,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * @swagger
 * /api/products/featured:
 *   get:
 *     summary: Get featured products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of featured products
 */
// GET /api/products/featured
router.get('/featured', cacheMiddleware('products:featured', 120000), (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.featured = 1 AND p.active = 1
      ORDER BY p.rating DESC LIMIT 8
    `).all();

    const enriched = products.map(p => ({
      ...p,
      discount_percent: p.old_price ? Math.round(((p.old_price - p.price) / p.old_price) * 100) : 0,
    }));

    res.json({ products: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch featured products' });
  }
});

// GET /api/products/:id - get by id OR slug
router.get('/:id', (req, res) => {
  try {
    const isNumeric = /^\d+$/.test(req.params.id);
    const product = db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${isNumeric ? 'p.id = ?' : 'p.slug = ?'}
    `).get(req.params.id);

    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Reviews (include anonymous reviews)
    const reviews = db.prepare(`
      SELECT r.*,
        CASE WHEN r.user_id IS NOT NULL THEN u.name ELSE r.user_name END as display_name,
        u.avatar as user_avatar
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC LIMIT 20
    `).all(product.id);

    // Real review count from actual reviews table
    const reviewStats = db.prepare('SELECT COUNT(*) as cnt, AVG(rating) as avg_rating FROM reviews WHERE product_id = ?').get(product.id);
    product.reviews_count = reviewStats.cnt || 0;
    product.rating = reviewStats.avg_rating ? Math.round(reviewStats.avg_rating * 10) / 10 : 0;

    // Related products
    const related = db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = ? AND p.id != ? AND p.active = 1
      LIMIT 4
    `).all(product.category_id, product.id);

    const relatedEnriched = related.map(p => ({
      ...p,
      discount_percent: p.old_price ? Math.round(((p.old_price - p.price) / p.old_price) * 100) : 0,
    }));

    product.discount_percent = product.old_price ? Math.round(((product.old_price - product.price) / product.old_price) * 100) : 0;
    product.reviews = reviews;

    if (req.user) {
      product.in_wishlist = !!db.prepare('SELECT 1 FROM wishlist WHERE user_id = ? AND product_id = ?').get(req.user.id, product.id);
      const cart = db.prepare('SELECT quantity FROM cart WHERE user_id = ? AND product_id = ?').get(req.user.id, product.id);
      product.in_cart_quantity = cart ? cart.quantity : 0;
    }

    res.json({ product, related: relatedEnriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// ADMIN: create product
router.post('/', auth, adminOnly, (req, res) => {
  const {
    name, description, price, old_price, stock, image, images,
    category_id, brand, featured,
  } = req.body;

  if (!name || price === undefined || price === null || price === '') return res.status(400).json({ error: 'Name and price are required' });

  const slug = slugify(name) + '-' + Date.now();
  try {
    const result = db.prepare(`
      INSERT INTO products (name, slug, description, price, old_price, stock, image, images, category_id, brand, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, slug, description || '', price, old_price || null,
      stock || 0, image || '', images ? JSON.stringify(images) : null,
      category_id || null, brand || null, featured ? 1 : 0
    );
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    db.prepare('INSERT INTO audit_log (user_id, action, entity, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)').run(
      req.user.id, 'create', 'product', product.id, JSON.stringify({ name, price, stock }), req.ip
    );
    res.status(201).json({ product });
    invalidate('products:');
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// ADMIN: update product
router.put('/:id', auth, adminOnly, (req, res) => {
  const {
    name, description, price, old_price, stock, image, images,
    category_id, brand, featured, active,
  } = req.body;
  try {
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    db.prepare(`
      UPDATE products SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        old_price = COALESCE(?, old_price),
        stock = COALESCE(?, stock),
        image = COALESCE(?, image),
        images = COALESCE(?, images),
        category_id = COALESCE(?, category_id),
        brand = COALESCE(?, brand),
        featured = COALESCE(?, featured),
        active = COALESCE(?, active)
      WHERE id = ?
    `).run(
      name, description, price, old_price, stock, image,
      images ? JSON.stringify(images) : null,
      category_id, brand,
      featured !== undefined ? (featured ? 1 : 0) : null,
      active !== undefined ? (active ? 1 : 0) : null,
      req.params.id
    );
    if (stock !== undefined && stock !== existing.stock) {
      db.prepare('INSERT INTO inventory_history (product_id, change, reason, user_id) VALUES (?, ?, ?, ?)').run(
        existing.id, stock - existing.stock, 'Admin stock update', 1
      );
    }
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    db.prepare('INSERT INTO audit_log (user_id, action, entity, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)').run(
      req.user.id, 'update', 'product', product.id, JSON.stringify({ name: product.name, price: product.price, stock: product.stock }), req.ip
    );
    res.json({ product });
    invalidate('products:');
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// ADMIN: delete product
router.delete('/:id', auth, adminOnly, (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (product) {
      db.prepare('INSERT INTO audit_log (user_id, action, entity, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)').run(
        req.user.id, 'delete', 'product', product.id, JSON.stringify({ name: product.name, price: product.price }), req.ip
      );
    }
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ message: 'Product deleted' });
    invalidate('products:');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ADMIN: bulk delete products
router.post('/admin/bulk-delete', auth, adminOnly, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
  try {
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM products WHERE id IN (${placeholders})`).run(...ids);
    res.json({ message: `${ids.length} products deleted` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete products' });
  }
});

// ADMIN: bulk update products
router.post('/admin/bulk-update', auth, adminOnly, (req, res) => {
  const { ids, data } = req.body;
  if (!Array.isArray(ids) || ids.length === 0 || !data) return res.status(400).json({ error: 'ids and data required' });
  try {
    const setClauses = [];
    const params = [];
    if (data.featured !== undefined) { setClauses.push('featured = ?'); params.push(data.featured ? 1 : 0); }
    if (data.active !== undefined) { setClauses.push('active = ?'); params.push(data.active ? 1 : 0); }
    if (setClauses.length === 0) return res.status(400).json({ error: 'No fields to update' });
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`UPDATE products SET ${setClauses.join(', ')} WHERE id IN (${placeholders})`).run(...params, ...ids);
    res.json({ message: `${ids.length} products updated` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk update products' });
  }
});

module.exports = router;
