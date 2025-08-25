// multicom-backend/middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');

// ✅ IMPORTANT: These environment variables MUST be set in your .env file
// AWS_ACCESS_KEY_ID
// AWS_SECRET_ACCESS_KEY
// AWS_REGION (e.g., eu-north-1)
// AWS_BUCKET_NAME (Your bucket name: multicom-screenshots)

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);

  if (!ext || !mime) {
    return cb(new Error('Only JPEG, JPG, PNG, and WEBP images are allowed!'), false);
  }
  cb(null, true);
};

const storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_BUCKET_NAME,
  // ✅ REMOVED: acl: 'public-read', // This caused the "AccessControlListNotSupported" error
  key: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `screenshots/screenshot-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB limit
});

module.exports = upload;