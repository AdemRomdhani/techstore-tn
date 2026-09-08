// =============================================================
// UPLOAD ROUTE - save locally, then optionally push to Cloudinary
// =============================================================
const express = require('express');
const path = require('path');
const fs = require('fs');
const upload = require('../middleware/upload');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err.message || err);
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const localPath = req.file.path;
  const localUrl = `/uploads/${req.file.filename}`;

  // Try Cloudinary upload if configured
  if (upload.cloudinary) {
    try {
      const result = await upload.cloudinary.uploader.upload(localPath, {
        folder: 'tech-store',
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
      });
      // Delete local file after successful Cloudinary upload
      fs.unlink(localPath, () => {});
      return res.json({ url: result.secure_url, filename: req.file.filename });
    } catch (err) {
      console.error('Cloudinary upload failed, using local file:', err.message);
      // Fall through to local URL
    }
  }

  // Local file (development or Cloudinary fallback)
  res.json({ url: localUrl, filename: req.file.filename });
});

module.exports = router;
