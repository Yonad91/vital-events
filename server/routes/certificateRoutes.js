import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { generateCertificate, downloadCertificate, verifyCertificate, debugGenerateBirthCertificate } from '../controllers/certificateController.js';

const router = express.Router();

// Public certificate verification (no auth required)
router.get('/verify/:certificateId', verifyCertificate);

// Debug: generate sample Birth certificate using exact template (no auth required)
router.post('/debug/birth', debugGenerateBirthCertificate);

// Protected routes (require authentication)
router.use(authMiddleware());

// Generate certificate
router.post('/generate', generateCertificate);

// Download certificate
router.get('/:certificateId/download', downloadCertificate);

export default router;
