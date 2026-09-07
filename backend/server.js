// =============================================================
// E-COMMERCE BACKEND - MAIN SERVER
// =============================================================
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================
// MIDDLEWARE
// =============================================================
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:4200', 'http://localhost:4201'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general limiter to all API routes
app.use('/api', apiLimiter);

// Static uploads - resolve relative UPLOAD_DIR relative to backend dir (not CWD)
let UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
if (!path.isAbsolute(UPLOAD_DIR)) {
  UPLOAD_DIR = path.resolve(__dirname, UPLOAD_DIR);
}
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

// =============================================================
// HEALTH CHECK
// =============================================================
app.get('/api/health', (req, res) => {
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  const geminiConfigured = !!(key && key !== 'your_gemini_api_key_here');
  res.json({
    status: 'OK',
    service: 'Tech Store API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    ai: { geminiConfigured, model: process.env.GEMINI_MODEL || 'gemini-3.6-flash' },
  });
});

// =============================================================
// AUTO-SEED: If DB is empty, seed it
// =============================================================
const db = require('./db/database');
const seed = require('./db/seed');
try {
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
  if (userCount.cnt === 0) {
    console.log('   🌱 Empty database detected, seeding...');
    seed();
  }
} catch (err) {
  console.error('   ⚠️ Auto-seed failed:', err.message);
}

// Manual seed endpoint (before 404 handler)
app.post('/api/seed', (req, res) => {
  try {
    seed();
    res.json({ message: 'Database seeded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// API DOCUMENTATION
// =============================================================
const { setupSwagger } = require('./swagger');
setupSwagger(app);
console.log(`   Docs:   http://localhost:${PORT}/api/docs`);

// =============================================================
// ROUTES
// =============================================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin-auth', require('./routes/admin-auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/tax', require('./routes/tax'));
app.use('/api/shipping', require('./routes/shipping'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/variants', require('./routes/variants'));
app.use('/api/users', require('./routes/users'));
app.use('/api/ai', require('./routes/ai'));

// =============================================================
// ERROR HANDLER
// =============================================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message || 'File upload error.' });
  }
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    error: isProduction ? 'Internal server error' : (err.message || 'Internal server error'),
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// =============================================================
// START
// =============================================================
const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
const geminiModel = (process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim();
if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
  console.warn('\n⚠️  GEMINI_API_KEY is not set - AI product extraction will return 503.');
  console.warn('   Get a free key at https://aistudio.google.com/apikey');
  console.warn('   Then set: GEMINI_API_KEY=your_key_here  in backend/.env and restart.\n');
} else {
  console.log(`   AI: Gemini configured ✓ (model: ${geminiModel})`);
}

app.listen(PORT, () => {
  console.log(`\n🚀 Tech Store API running on http://localhost:${PORT}`);
  console.log(`   Health:  http://localhost:${PORT}/api/health`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`   Dev mode active\n`);
  }
});

module.exports = app;
