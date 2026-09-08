// =============================================================
// MULTER FILE UPLOAD CONFIG
// Always saves locally first, then optionally mirrors to Cloudinary
// =============================================================
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'));
};

// Check if Cloudinary is configured (sync check, no ping)
let cloudinary = null;
const hasCloudinaryEnv = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (hasCloudinaryEnv) {
  try {
    cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  } catch (err) {
    console.error('   ⚠️ Cloudinary require failed:', err.message);
    cloudinary = null;
  }
}

module.exports = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
module.exports.cloudinary = cloudinary;
module.exports.UPLOAD_DIR = UPLOAD_DIR;
