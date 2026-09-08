// =============================================================
// UPLOAD ROUTE - handles image file uploads via multer
// Supports Cloudinary (production) or local disk (development)
// =============================================================
const express = require('express');
const upload = require('../middleware/upload');
const { auth } = require('../middleware/auth');

const router = express.Router();

// POST /api/upload - upload a single image
// Admin: can upload anything (product images, category images, etc.)
// Regular users: can also upload (for profile avatars)
router.post('/', auth, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err.message || err);
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    next();
  });
}, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  if (upload.isCloudinary) {
    res.json({ url: req.file.path, filename: req.file.filename });
  } else {
    const url = `/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  }
});

module.exports = router;
