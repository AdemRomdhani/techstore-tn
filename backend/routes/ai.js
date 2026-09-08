// =============================================================
// AI ROUTES - Extract product data from images using Gemini Flash
// =============================================================
const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { auth, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { extractProductsFromSingleImage, isApiKeyConfigured } = require('../services/ai');

const router = express.Router();

// GET /api/ai/status - check if AI is configured (admin only)
router.get('/status', auth, adminOnly, (req, res) => {
  res.json({ configured: isApiKeyConfigured() });
});

// POST /api/ai/extract-product - upload image(s) and extract product data
router.post('/extract-product', auth, adminOnly, upload.array('images', 10), async (req, res) => {
  try {
    // Fail fast if API key is not configured - do not waste time processing images
    if (!isApiKeyConfigured()) {
      return res.status(503).json({
        error: 'AI service not configured. GEMINI_API_KEY is missing.',
        details: 'Get a free key at https://aistudio.google.com/apikey then set GEMINI_API_KEY in backend/.env and restart the backend. See backend/.env.example.',
        code: 'GEMINI_API_KEY_MISSING'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    const categories = await db.prepare('SELECT id, name, slug FROM categories').all();

    const allProducts = [];
    const errors = [];

    // Process all images in parallel for maximum speed
    const isCloudinary = upload.isCloudinary;
    const results = await Promise.allSettled(
      req.files.map(async (file) => {
        // Determine image URL and local path for Gemini processing
        let imageUrl;
        let imagePath;

        if (isCloudinary) {
          // Cloudinary: file.path is the full Cloudinary URL
          imageUrl = file.path;
          // Download from Cloudinary to temp file for Gemini
          imagePath = path.join(__dirname, '..', 'uploads', 'tmp-' + file.filename);
          const https = require('https');
          const { pipeline } = require('stream/promises');
          const response = await new Promise((resolve, reject) => {
            https.get(imageUrl, (res) => {
              if (res.statusCode !== 200) return reject(new Error(`Failed to download: ${res.statusCode}`));
              resolve(res);
            }).on('error', reject);
          });
          await pipeline(response, fs.createWriteStream(imagePath));
        } else {
          // Local disk
          imagePath = path.join(__dirname, '..', 'uploads', file.filename);
          imageUrl = `/uploads/${file.filename}`;
        }

        try {
          const result = await extractProductsFromSingleImage(imagePath);
          const products = [];

          for (const product of (result.products || [])) {
            if (product.category_suggestion) {
              const suggestion = product.category_suggestion.toLowerCase();
              const matched = categories.find(c =>
                c.name.toLowerCase().includes(suggestion) ||
                suggestion.includes(c.name.toLowerCase())
              );
              if (matched) {
                product.category_id = matched.id;
                product.category_name = matched.name;
              }
            }

            product.image = imageUrl;
            product.images = [imageUrl];
            products.push(product);
          }

          return { file, products };
        } finally {
          // Clean up temp file if it was downloaded from Cloudinary
          if (isCloudinary && fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        }
      })
    );

    // Collect products and per-image errors from parallel results
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        for (const product of result.value.products) {
          allProducts.push(product);
        }
      } else {
        const file = req.files[i];
        const reason = result.reason?.message || 'Unknown error';
        console.error(`AI extraction failed for ${file.filename}:`, reason);

        // Config error -> fail fast
        if (reason.includes('GEMINI_API_KEY') || reason.includes('API key')) {
          return res.status(503).json({
            error: 'AI service not configured. GEMINI_API_KEY is missing.',
            details: 'Get a free key at https://aistudio.google.com/apikey then set GEMINI_API_KEY in backend/.env and restart the backend.',
            code: 'GEMINI_API_KEY_MISSING'
          });
        }

        const isModelError = reason.includes('is no longer available') || reason.includes('NOT_FOUND') || reason.includes('404');
        errors.push({ filename: file.filename, reason, isModelError, index: i });
      }
    });

    if (allProducts.length === 0) {
      const allModelErrors = errors.length > 0 && errors.every(e => e.isModelError);
      if (allModelErrors) {
        return res.status(502).json({
          error: 'AI model is outdated and needs an update.',
          details: `The configured Gemini model is no longer available. Backend now defaults to gemini-3.6-flash with auto-fallback. If you set GEMINI_MODEL in .env, update it to gemini-3.6-flash and restart. Original: ${errors[0].reason}`,
          code: 'MODEL_NOT_FOUND'
        });
      }
      return res.status(422).json({
        error: errors.length > 0
          ? `AI failed to analyze ${errors.length} image(s). Please try with clearer photos.`
          : 'Could not extract product data from the uploaded images.',
        details: errors.length > 0 ? errors.map(e => `${e.filename}: ${e.reason}`).join('; ') : undefined
      });
    }

    // Always include error details so frontend can show which images failed
    res.json({
      products: allProducts,
      categories,
      ...(errors.length > 0 ? { errors: errors.map(e => ({ filename: e.filename, reason: e.reason })) } : {})
    });
  } catch (err) {
    console.error('AI extract error:', err);
    if (err.message.includes('AI returned invalid data')) {
      return res.status(422).json({ error: err.message });
    }
    if (err.message.includes('API key') || err.message.includes('GEMINI_API_KEY')) {
      return res.status(503).json({
        error: 'AI service not configured. GEMINI_API_KEY is missing.',
        details: 'Get a free key at https://aistudio.google.com/apikey then set GEMINI_API_KEY in backend/.env and restart the backend.',
        code: 'GEMINI_API_KEY_MISSING'
      });
    }
    if (err.message.includes('is no longer available') || err.message.includes('NOT_FOUND') || (err.message.includes('404') && err.message.includes('model'))) {
      return res.status(502).json({
        error: 'AI model is outdated.',
        details: 'The Gemini model is no longer available. Update backend/services/ai.js to use gemini-3.6-flash or set GEMINI_MODEL=gemini-3.6-flash in backend/.env and restart.',
        code: 'MODEL_NOT_FOUND'
      });
    }
    res.status(500).json({ error: 'Failed to extract product data. Please try again.' });
  }
});

module.exports = router;
