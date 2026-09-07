// =============================================================
// MULTER FILE UPLOAD CONFIG
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
  const allowed = /jpeg|jpg|jfif|jpe|jfi|png|gif|webp|bmp|tiff|tif|svg|ico|heic|heif|avif/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = file.mimetype.startsWith('image/');
  if (extOk && mimeOk) cb(null, true);
  else cb(new Error('Only image files are allowed (jpg, png, gif, webp, bmp, tiff, svg, heic, avif, etc.)'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;
