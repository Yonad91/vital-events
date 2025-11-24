import express from 'express';
import { 
  generateEnhancedCertificate, 
  downloadEnhancedCertificate, 
  verifyEnhancedCertificate,
  generateAllPendingCertificates,
  getCertificateStats
} from '../controllers/enhancedCertificateController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Generate enhanced certificate (requires authentication)
router.post('/generate', authMiddleware(), generateEnhancedCertificate);

// Download enhanced certificate (requires authentication)
router.get('/:certificateId/download', authMiddleware(), downloadEnhancedCertificate);

// Verify enhanced certificate (public endpoint)
router.get('/verify/:certificateId', verifyEnhancedCertificate);

// Generate all pending certificates (admin only)
router.post('/generate-all', authMiddleware(), generateAllPendingCertificates);

// Get certificate statistics (admin only)
router.get('/stats', authMiddleware(), getCertificateStats);

export default router;
