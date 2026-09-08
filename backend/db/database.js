// =============================================================
// DATABASE SETUP & SCHEMA - PostgreSQL (Neon)
// =============================================================
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// =============================================================
// COMPATIBILITY LAYER - mimics better-sqlite3 API
// Converts ? placeholders to $1, $2, ... for pg
// =============================================================
function convertPlaceholders(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

function normalizeParams(params) {
  if (params === undefined || params === null) return [];
  if (!Array.isArray(params)) return [params];
  return params.map(p => (p === undefined ? null : p));
}

const compatDb = {
  prepare(sql) {
    const pgSql = convertPlaceholders(sql);
    return {
      get(...params) {
        const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        return pool.query(pgSql, normalizeParams(flat)).then(r => r.rows[0] || undefined);
      },
      all(...params) {
        const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        return pool.query(pgSql, normalizeParams(flat)).then(r => r.rows);
      },
      run(...params) {
        const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const normalized = normalizeParams(flat);
        // Add RETURNING id if it's an INSERT without RETURNING
        let sqlToRun = pgSql;
        if (/^\s*INSERT\s/i.test(sql) && !/RETURNING/i.test(sql)) {
          sqlToRun = pgSql.replace(/;?\s*$/, ' RETURNING id');
        }
        return pool.query(sqlToRun, normalized).then(r => ({
          changes: r.rowCount,
          lastInsertRowid: r.rows[0] ? r.rows[0].id : undefined,
        }));
      },
    };
  },

  exec(sql) {
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
    return statements.reduce((prev, stmt) => prev.then(() => pool.query(stmt)), Promise.resolve());
  },

  transaction(fn) {
    return async (...args) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(client, ...args);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    };
  },

  pragma() {},
  close() { return pool.end(); },
  pool,
};

module.exports = compatDb;
module.exports.pool = pool;

// =============================================================
// SCHEMA CREATION
// =============================================================
const initSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'customer' CHECK(role IN ('customer','admin')),
      phone TEXT,
      address TEXT,
      city TEXT,
      zip TEXT,
      country TEXT,
      avatar TEXT,
      active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      image TEXT,
      icon TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      price NUMERIC NOT NULL,
      old_price NUMERIC,
      stock INTEGER DEFAULT 0,
      image TEXT,
      images TEXT,
      category_id INTEGER,
      brand TEXT,
      rating NUMERIC DEFAULT 0,
      reviews_count INTEGER DEFAULT 0,
      featured INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS cart (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wishlist (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      total NUMERIC NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','shipped','delivered','cancelled')),
      payment_method TEXT,
      shipping_name TEXT,
      shipping_address TEXT,
      shipping_city TEXT,
      shipping_zip TEXT,
      shipping_country TEXT,
      shipping_phone TEXT,
      shipping_nom TEXT,
      shipping_prenom TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      product_image TEXT,
      price NUMERIC NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS order_notes (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL,
      note TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      product_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      verified INTEGER DEFAULT 0,
      user_name TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      discount_percent INTEGER NOT NULL,
      max_uses INTEGER DEFAULT 100,
      used_count INTEGER DEFAULT 0,
      expires_at TIMESTAMP,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sku TEXT UNIQUE,
      price NUMERIC,
      stock INTEGER DEFAULT 0,
      image TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tax_rates (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      rate NUMERIC NOT NULL,
      country TEXT,
      state TEXT,
      city TEXT,
      active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS shipping_zones (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      countries TEXT,
      rate NUMERIC NOT NULL,
      free_above NUMERIC,
      estimated_days TEXT,
      active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      read INTEGER DEFAULT 0,
      link TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventory_history (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL,
      change INTEGER NOT NULL,
      reason TEXT,
      reference_id INTEGER,
      user_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Indexes
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
    CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_cart_user ON cart(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
    CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity, entity_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
    CREATE INDEX IF NOT EXISTS idx_inventory_history_product ON inventory_history(product_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
    CREATE INDEX IF NOT EXISTS idx_products_active_featured ON products(active, featured);
    CREATE INDEX IF NOT EXISTS idx_products_active_created ON products(active, created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_cart_user_product ON cart(user_id, product_id);
    CREATE INDEX IF NOT EXISTS idx_wishlist_user_product ON wishlist(user_id, product_id);
    CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
  `);

  // Ensure guest user exists
  try {
    const guest = await pool.query("SELECT id FROM users WHERE email = 'guest@system.local'");
    if (guest.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('guest_' + Date.now(), 10);
      await pool.query("INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)", ['Guest', 'guest@system.local', hash, 'customer']);
      console.log('  ✅ Created guest user');
    }
  } catch (err) {
    // Ignore
  }

  // Ensure admin user exists (for first-time setup)
  try {
    const admin = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    if (admin.rows.length === 0) {
      console.log('  ⚠️  No admin user found - run seed to create one');
    }
  } catch (err) {}

  // PostgreSQL full-text search setup
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;`);

  await pool.query(`
    CREATE OR REPLACE FUNCTION products_search_trigger() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.brand, '')), 'A');
      RETURN NEW;
    END
    $$ LANGUAGE plpgsql;
  `);

  await pool.query(`DROP TRIGGER IF EXISTS products_search_update ON products;`);
  await pool.query(`
    CREATE TRIGGER products_search_update
      BEFORE INSERT OR UPDATE ON products
      FOR EACH ROW EXECUTE FUNCTION products_search_trigger();
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN(search_vector);`);

  // Rebuild search vector for existing products
  await pool.query(`
    UPDATE products SET search_vector =
      setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(brand, '')), 'A')
    WHERE search_vector IS NULL;
  `);

  console.log('  ✅ PostgreSQL schema ready');
  console.log('  ✅ Full-text search index ready');
};

module.exports.initSchema = initSchema;
