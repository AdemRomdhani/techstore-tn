// =============================================================
// UPLOAD ROUTE - handles image file uploads via multer
// =============================================================
const express = require('express');
const upload = require('../middleware/upload');
const { auth } = require('../middleware/auth');

const router = express.Router();

// POST /api/upload - upload a single image
// Admin: can upload anything (product images, category images, etc.)
// Regular users: can also upload (for profile avatars)
router.post('/', auth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

module.exports = router;
