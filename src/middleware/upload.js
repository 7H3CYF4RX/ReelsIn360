const multer = require('multer');
const path = require('path');
const fs = require('fs');

function createStorage(subfolder) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '../../uploads', subfolder);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e5);
      cb(null, unique + path.extname(file.originalname));
    },
  });
}

const uploadQuotation = multer({
  storage: createStorage('quotations'),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed for quotations'));
  },
});

const uploadFootage = multer({
  storage: createStorage('footage'),
  limits: { fileSize: 2048 * 1024 * 1024 }, // 2GB
});

const uploadVideo = multer({
  storage: createStorage('videos'),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only video files are allowed'));
  },
});

const uploadImage = multer({
  storage: createStorage('images'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const uploadAny = multer({
  storage: createStorage('misc'),
  limits: { fileSize: 2048 * 1024 * 1024 },
});

module.exports = { uploadQuotation, uploadFootage, uploadVideo, uploadImage, uploadAny };
