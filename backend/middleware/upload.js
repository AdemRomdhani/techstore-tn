// =============================================================
// MULTER FILE UPLOAD CONFIG
// Supports Cloudinary (production) or local disk (development)
// =============================================================
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- Cloudinary setup (production) ---
const isCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (isCloudinary) {
  const cloudinary = require('cloudinary').v2;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'tech-store',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif', 'heic'],
      transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
    },
  });

  const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  };

  module.exports = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
  module.exports.isCloudinary = true;

} else {
  // --- Local disk fallback (development) ---
  let UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
  if (!path.isAbsolute(UPLOAD_DIR)) {
    UPLOAD_DIR = path.resolve(__dirname, '..', UPLOAD_DIR);
  }
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    },
  });

  const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|jfif|jpe|jfi|png|gif|webp|bmp|tiff|tif|svg|ico|heic|heif|avif/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = file.mimetype.startsWith('image/');
    if (extOk && mimeOk) cb(null, true);
    else cb(new Error('Only image files are allowed (jpg, png, gif, webp, bmp, tiff, svg, heic, avif, etc.)'));
  };

  module.exports = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
  module.exports.isCloudinary = false;
}
