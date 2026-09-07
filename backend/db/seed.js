// =============================================================
// SEED DATA - Sample categories, products, admin user, coupons
// =============================================================
const bcrypt = require('bcryptjs');
const db = require('./database');

console.log('🌱 Seeding database...');

// Clear existing data (order matters due to FK constraints)
db.exec(`
  DELETE FROM order_items;
  DELETE FROM orders;
  DELETE FROM cart;
  DELETE FROM wishlist;
  DELETE FROM reviews;
  DELETE FROM products;
  DELETE FROM categories;
  DELETE FROM coupons;
  DELETE FROM settings;
  DELETE FROM users;
`);
try { db.exec('DELETE FROM sqlite_sequence'); } catch { }

// Users
const adminHash = bcrypt.hashSync('admin123', 10);
const userHash = bcrypt.hashSync('user123', 10);

const insertUser = db.prepare(`
  INSERT INTO users (name, email, password, role, phone, address, city, country)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

insertUser.run('Admin', 'admin@shop.com', adminHash, 'admin', '+1234567890', '1 Admin St', 'Paris', 'France');
insertUser.run('John Doe', 'john@shop.com', userHash, 'customer', '+1234567891', '12 Main St', 'Lyon', 'France');
insertUser.run('Jane Smith', 'jane@shop.com', userHash, 'customer', '+1234567892', '34 Oak Ave', 'Marseille', 'France');

console.log('✅ Users created (admin@shop.com / admin123)');

// Categories
const insertCategory = db.prepare(`
  INSERT INTO categories (name, slug, description, image, icon)
  VALUES (?, ?, ?, ?, ?)
`);

const categories = [
  ['Electronics', 'electronics', 'Phones, laptops, gadgets and more', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600', 'bi-laptop'],
  ['Fashion', 'fashion', 'Clothing, shoes and accessories', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600', 'bi-bag-heart'],
  ['Home & Living', 'home-living', 'Furniture, decor, kitchen', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600', 'bi-house-heart'],
  ['Sports', 'sports', 'Fitness, outdoor and gear', 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600', 'bi-bicycle'],
  ['Books', 'books', 'Fiction, non-fiction, learning', 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600', 'bi-book'],
  ['Beauty', 'beauty', 'Skincare, makeup, wellness', 'https://images.unsplash.com/photo-1522335789203-aaa2f6e87a91?w=600', 'bi-droplet-half'],
  ['Toys & Games', 'toys-games', 'Fun for all ages', 'https://images.unsplash.com/photo-1558060370-d4c8a0d3beb1?w=600', 'bi-controller'],
  ['Grocery', 'grocery', 'Fresh food and essentials', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600', 'bi-basket3'],
];

categories.forEach(c => insertCategory.run(...c));
console.log('✅ Categories created');

// Products
const insertProduct = db.prepare(`
  INSERT INTO products (name, slug, description, price, old_price, stock, image, category_id, brand, featured, rating, reviews_count)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const products = [
  // Electronics
  ['Wireless Headphones Pro', 'wireless-headphones-pro', 'Premium noise-cancelling over-ear headphones with 40h battery life and crystal-clear sound.', 199.99, 249.99, 50, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600', 1, 'AudioPro', 1, 4.7, 128],
  ['Smartphone X12', 'smartphone-x12', 'Latest 5G smartphone with 6.7" OLED display, 128GB storage and triple camera system.', 899.00, 1099.00, 25, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600', 1, 'TechMax', 1, 4.8, 342],
  ['Laptop Ultra 15', 'laptop-ultra-15', 'Powerful laptop for creators with 16GB RAM, 512GB SSD and 15.6" 4K display.', 1499.00, null, 15, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600', 1, 'TechMax', 1, 4.6, 89],
  ['Smart Watch Series 8', 'smart-watch-series-8', 'Track your health, fitness, and stay connected. Always-on display, water resistant.', 349.00, 399.00, 40, 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600', 1, 'TechMax', 0, 4.5, 201],
  ['Bluetooth Speaker', 'bluetooth-speaker', 'Portable waterproof speaker with 360° sound and 24h battery.', 79.99, null, 80, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600', 1, 'AudioPro', 0, 4.4, 156],

  // Fashion
  ['Classic Leather Jacket', 'classic-leather-jacket', 'Premium genuine leather jacket, timeless design, perfect fit.', 299.00, 399.00, 20, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600', 2, 'UrbanStyle', 1, 4.7, 87],
  ['Sneakers Air Sport', 'sneakers-air-sport', 'Lightweight running shoes with air cushion technology.', 129.00, null, 60, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', 2, 'SportMax', 1, 4.6, 234],
  ['Designer Sunglasses', 'designer-sunglasses', 'UV protection polarized lenses with premium metal frame.', 159.00, 199.00, 35, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600', 2, 'LuxWear', 0, 4.5, 92],
  ['Cotton T-Shirt Pack', 'cotton-tshirt-pack', '3-pack of premium 100% organic cotton t-shirts, multiple colors.', 49.99, 69.99, 100, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600', 2, 'UrbanStyle', 0, 4.3, 178],
  ['Elegant Handbag', 'elegant-handbag', 'Stylish leather handbag perfect for any occasion.', 189.00, null, 25, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600', 2, 'LuxWear', 1, 4.8, 67],

  // Home
  ['Modern Sofa 3-Seater', 'modern-sofa-3-seater', 'Comfortable and stylish 3-seater sofa with premium fabric upholstery.', 1299.00, 1599.00, 8, 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600', 3, 'HomeComfort', 1, 4.7, 45],
  ['Aromatic Candle Set', 'aromatic-candle-set', 'Set of 3 scented candles (vanilla, lavender, sandalwood).', 39.99, null, 120, 'https://images.unsplash.com/photo-1602874801006-e26c4dac2c8d?w=600', 3, 'HomeComfort', 0, 4.4, 213],
  ['Coffee Maker Deluxe', 'coffee-maker-deluxe', 'Automatic espresso machine with milk frother, 15-bar pressure.', 449.00, 549.00, 22, 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600', 3, 'KitchenPro', 1, 4.6, 156],
  ['Decorative Plant Pot', 'decorative-plant-pot', 'Beautiful ceramic plant pot, perfect for indoor decoration.', 24.99, null, 200, 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600', 3, 'HomeComfort', 0, 4.2, 87],

  // Sports
  ['Yoga Mat Premium', 'yoga-mat-premium', 'Eco-friendly non-slip yoga mat, 6mm thick, with carry strap.', 39.99, 49.99, 150, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600', 4, 'SportMax', 0, 4.6, 234],
  ['Adjustable Dumbbells', 'adjustable-dumbbells', 'Set of 2 adjustable dumbbells 5-50 lbs, space saving design.', 299.00, null, 30, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600', 4, 'SportMax', 1, 4.7, 78],
  ['Mountain Bike X1', 'mountain-bike-x1', 'Professional mountain bike with 21 speeds and aluminum frame.', 799.00, 999.00, 12, 'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=600', 4, 'SportMax', 1, 4.8, 45],

  // Books
  ['The Art of Programming', 'art-of-programming', 'Bestselling guide to software development and clean code.', 34.99, null, 80, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600', 5, 'BookHouse', 0, 4.8, 412],
  ['Cooking Masterclass', 'cooking-masterclass', '200+ recipes from world-class chefs, hardcover edition.', 49.99, 59.99, 45, 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=600', 5, 'BookHouse', 0, 4.7, 198],

  // Beauty
  ['Anti-Aging Serum', 'anti-aging-serum', 'Vitamin C + Hyaluronic Acid serum for radiant, youthful skin.', 59.99, 79.99, 90, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600', 6, 'GlowSkin', 1, 4.6, 287],
  ['Makeup Brush Set', 'makeup-brush-set', 'Professional 12-piece makeup brush set with travel case.', 39.99, null, 70, 'https://images.unsplash.com/photo-1583241800698-9c2e3a26e835?w=600', 6, 'GlowSkin', 0, 4.5, 156],

  // Toys
  ['Building Blocks 1000pc', 'building-blocks-1000', 'Creative building blocks set, compatible with major brands, ages 6+.', 49.99, 69.99, 60, 'https://images.unsplash.com/photo-1558060370-d644b1ba2d50?w=600', 7, 'FunPlay', 0, 4.7, 234],
  ['Board Game Collection', 'board-game-collection', 'Family board game bundle with 5 classic games.', 79.99, null, 40, 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=600', 7, 'FunPlay', 0, 4.5, 98],

  // Grocery
  ['Organic Honey 500g', 'organic-honey-500g', 'Pure organic wildflower honey from local beekeepers.', 14.99, null, 200, 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600', 8, 'NatureFresh', 0, 4.8, 312],
  ['Premium Coffee Beans', 'premium-coffee-beans', 'Single origin Arabica coffee beans, medium roast, 1kg.', 24.99, 29.99, 150, 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600', 8, 'NatureFresh', 1, 4.7, 245],
];

products.forEach(p => insertProduct.run(...p));
console.log(`✅ ${products.length} products created`);

// Coupons
const insertCoupon = db.prepare(`INSERT INTO coupons (code, discount_percent, max_uses, expires_at) VALUES (?, ?, ?, ?)`);
insertCoupon.run('WELCOME10', 10, 1000, '2026-12-31');
insertCoupon.run('SAVE20', 20, 500, '2026-12-31');
insertCoupon.run('VIP30', 30, 100, '2026-12-31');
console.log('✅ Coupons created (try: WELCOME10, SAVE20, VIP30)');

// Settings
const insertSetting = db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)`);
insertSetting.run('site_name', 'Tech Store');
insertSetting.run('site_tagline', 'La technologie a portee de main');
insertSetting.run('currency', 'TND');
insertSetting.run('free_shipping_threshold', '50');
insertSetting.run('standard_shipping', '5.99');
console.log('✅ Settings created');

console.log('🎉 Database seeded successfully!');
console.log('\n📝 Login credentials:');
console.log('   Admin: admin@shop.com / admin123');
console.log('   User:  john@shop.com / user123');

process.exit(0);
