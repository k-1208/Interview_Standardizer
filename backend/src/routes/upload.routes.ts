import { Router } from 'express';
import multer from 'multer';
import { uploadPdf } from '../controllers/upload.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      cb(new Error('Only PDF files are allowed'));
      return;
    }

    cb(null, true);
  },
});

router.post('/pdf', requireAuth, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      res.status(400).json({ success: false, message: err.message || 'Upload failed' });
      return;
    }
    next();
  });
}, uploadPdf);

export default router;
