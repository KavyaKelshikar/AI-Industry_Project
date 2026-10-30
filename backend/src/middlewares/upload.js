const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { AppError } = require('../utils/errorHandler');
const { errorCodes } = require('../utils/responseHelper');

const DEFAULT_MAX_SIZE_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB, 10) || 50;
const DEFAULT_MAX_FILES = parseInt(process.env.MAX_UPLOAD_FILES_COUNT, 10) || 10;

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.docx',
  '.txt',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.tiff',
  '.bmp',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const companyId = req.tenantScope?.companyId || req.user?.companyId || 'common';
      const uploadDir = path.join(process.cwd(), 'storage', 'uploads', companyId.toString());
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(
      new AppError(
        400,
        `Unsupported file type '${ext}'. Allowed types: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`,
        true,
        errorCodes.UNSUPPORTED_FILE_TYPE || 'UNSUPPORTED_FILE_TYPE'
      )
    );
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: DEFAULT_MAX_SIZE_MB * 1024 * 1024,
    files: DEFAULT_MAX_FILES,
  },
  fileFilter,
});

/**
 * Middleware wrapper to handle Multer upload errors cleanly
 */
const handleUpload = (fieldName = 'files', maxCount = DEFAULT_MAX_FILES) => {
  const multerMiddleware = upload.array(fieldName, maxCount);

  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(
              new AppError(
                400,
                `File size exceeds maximum allowed limit of ${DEFAULT_MAX_SIZE_MB}MB`,
                true,
                'FILE_TOO_LARGE'
              )
            );
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return next(
              new AppError(
                400,
                `Upload batch limit exceeded. Maximum ${maxCount} files allowed per upload`,
                true,
                'TOO_MANY_FILES'
              )
            );
          }
          return next(new AppError(400, `Upload error: ${err.message}`, true, 'UPLOAD_ERROR'));
        }
        return next(err);
      }

      if (!req.files || req.files.length === 0) {
        // Also check if single file uploaded as 'file'
        if (req.file) {
          req.files = [req.file];
        } else {
          return next(
            new AppError(400, 'No files were provided for upload', true, 'NO_FILES_UPLOADED')
          );
        }
      }

      next();
    });
  };
};

module.exports = {
  upload,
  handleUpload,
  DEFAULT_MAX_SIZE_MB,
  DEFAULT_MAX_FILES,
  ALLOWED_EXTENSIONS,
};
