// =============================================================
// DATABASE SETUP & SCHEMA
// =============================================================
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'ecommerce.db');
// Resolve relative DB_PATH relative to backend dir (not CWD) - fixes `node backend/server.js` from root
if (!path.isAbsolute(DB_PATH)) {
  DB_PATH = path.resolve(__dirname, '..', DB_PATH);
}

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');
db.pragma('mmap_size = 268435456');
db.pragma('temp_store = MEMORY');
db.pragma('busy_timeout = 5000');

// Create all tables
const initSchema = () => {
  db.exec(`
    -- USERS
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- CATEGORIES
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      image TEXT,
      icon TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- PRODUCTS
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      old_price REAL,
      stock INTEGER DEFAULT 0,
      image TEXT,
      images TEXT,
      category_id INTEGER,
      brand TEXT,
      rating REAL DEFAULT 0,
      reviews_count INTEGER DEFAULT 0,
      featured INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    -- CART
    CREATE TABLE IF NOT EXISTS cart (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- WISHLIST
    CREATE TABLE IF NOT EXISTS wishlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- ORDERS
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total REAL NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','shipped','delivered','cancelled')),
      payment_method TEXT,
      shipping_name TEXT,
      shipping_address TEXT,
      shipping_city TEXT,
      shipping_zip TEXT,
      shipping_country TEXT,
      shipping_phone TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ORDER ITEMS
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      product_image TEXT,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    -- ORDER NOTES
    CREATE TABLE IF NOT EXISTS order_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      note TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    -- REVIEWS
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- COUPONS
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      discount_percent INTEGER NOT NULL,
      max_uses INTEGER DEFAULT 100,
      used_count INTEGER DEFAULT 0,
      expires_at DATETIME,
      active INTEGER DEFAULT 1
    );

    -- CONTACT MESSAGES
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- PASSWORD RESET TOKENS
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- SETTINGS
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- PRODUCT VARIANTS
    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sku TEXT UNIQUE,
      price REAL,
      stock INTEGER DEFAULT 0,
      image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- AUDIT LOG
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- TAX RATES
    CREATE TABLE IF NOT EXISTS tax_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rate REAL NOT NULL,
      country TEXT,
      state TEXT,
      city TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- SHIPPING ZONES
    CREATE TABLE IF NOT EXISTS shipping_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      countries TEXT,
      rate REAL NOT NULL,
      free_above REAL,
      estimated_days TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- NOTIFICATIONS
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      read INTEGER DEFAULT 0,
      link TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- INVENTORY HISTORY
    CREATE TABLE IF NOT EXISTS inventory_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      change INTEGER NOT NULL,
      reason TEXT,
      reference_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- REFRESH TOKENS
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- INDEXES
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

  // Ensure guest user exists for guest orders
  try {
    const guest = db.prepare("SELECT id FROM users WHERE email = 'guest@system.local'").get();
    if (!guest) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('guest_' + Date.now(), 10);
      db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run('Guest', 'guest@system.local', hash, 'customer');
      console.log('  ✅ Created guest user');
    }
  } catch (err) {
    // Ignore if already exists
  }
};

initSchema();

// =============================================================
// MIGRATIONS - Add missing columns to existing tables
// =============================================================
const migrateTable = (tableName, columnName, columnDef) => {
  try {
    const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
    if (!cols.some(c => c.name === columnName)) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
      console.log(`  ✅ Added ${columnName} to ${tableName}`);
    }
  } catch (err) {
    // Column might already exist or table doesn't exist yet
  }
};

migrateTable('users', 'active', 'INTEGER DEFAULT 1');
migrateTable('products', 'active', 'INTEGER DEFAULT 1');
migrateTable('contacts', 'read', 'INTEGER DEFAULT 0');
migrateTable('inventory_history', 'user_id', 'INTEGER');
migrateTable('reviews', 'user_name', 'TEXT');
migrateTable('orders', 'shipping_nom', 'TEXT');
migrateTable('orders', 'shipping_prenom', 'TEXT');
migrateTable('categories', 'sort_order', 'INTEGER');

// Migrate reviews table to allow anonymous reviews (user_id nullable, add user_name)
try {
  const reviewCols = db.prepare("PRAGMA table_info(reviews)").all();
  const hasUserName = reviewCols.some(c => c.name === 'user_name');
  const userIdCol = reviewCols.find(c => c.name === 'user_id');

  if (userIdCol && userIdCol.notnull === 1) {
    // Recreate reviews table with nullable user_id
    db.exec(`
      CREATE TABLE IF NOT EXISTS reviews_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        product_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        comment TEXT,
        verified INTEGER DEFAULT 0,
        user_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
      INSERT INTO reviews_new (id, user_id, product_id, rating, comment, verified, created_at)
        SELECT id, user_id, product_id, rating, comment, verified, created_at FROM reviews;
      DROP TABLE reviews;
      ALTER TABLE reviews_new RENAME TO reviews;
    `);
    console.log('  ✅ Migrated reviews table for anonymous reviews');
  }
} catch (err) {
  // Migration may have already run
}

// =============================================================
// FTS5 FULL-TEXT SEARCH
// =============================================================
try {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
      name, description, brand,
      content=products,
      content_rowid=id
    );

    -- Triggers to keep FTS in sync
    CREATE TRIGGER IF NOT EXISTS products_ai AFTER INSERT ON products BEGIN
      INSERT INTO products_fts(rowid, name, description, brand) VALUES (new.id, new.name, new.description, new.brand);
    END;

    CREATE TRIGGER IF NOT EXISTS products_ad AFTER DELETE ON products BEGIN
      INSERT INTO products_fts(products_fts, rowid, name, description, brand) VALUES('delete', old.id, old.name, old.description, old.brand);
    END;

    CREATE TRIGGER IF NOT EXISTS products_au AFTER UPDATE ON products BEGIN
      INSERT INTO products_fts(products_fts, rowid, name, description, brand) VALUES('delete', old.id, old.name, old.description, old.brand);
      INSERT INTO products_fts(rowid, name, description, brand) VALUES (new.id, new.name, new.description, new.brand);
    END;
  `);
  // Rebuild FTS index with existing data
  db.exec("INSERT INTO products_fts(products_fts) VALUES('rebuild')");
  console.log('  ✅ FTS5 index ready');
} catch (err) {
  console.log('  ℹ️  FTS5 may already be set up');
}

module.exports = db;

// Sync all product review counts and ratings from actual reviews
try {
  db.prepare(`
    UPDATE products SET
      rating = COALESCE((SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.product_id = products.id), 0),
      reviews_count = COALESCE((SELECT COUNT(*) FROM reviews r WHERE r.product_id = products.id), 0)
  `).run();
  console.log('  ✅ Synced product review counts');
} catch (err) {
  // Ignore if reviews table doesn't exist yet
}
