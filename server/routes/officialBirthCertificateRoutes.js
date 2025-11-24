import express from 'express';
import {
  generateOfficialBirthCertificate,
  downloadOfficialBirthCertificate,
  previewOfficialBirthCertificate,
  getOfficialBirthCertificateInfo
} from '../controllers/officialBirthCertificateController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Generate official birth certificate
router.post('/generate', authMiddleware(), generateOfficialBirthCertificate);

// Download official birth certificate
router.get('/download/:certificateId', downloadOfficialBirthCertificate);

// Preview official birth certificate
router.get('/preview/:certificateId', previewOfficialBirthCertificate);

// Get certificate information
router.get('/info/:certificateId', getOfficialBirthCertificateInfo);

export default router;
