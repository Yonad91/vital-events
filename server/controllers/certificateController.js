import Event from '../models/Event.js';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import { generateCertificateHTML } from '../utils/certificateUtils.js';
import { ExactTemplateCertificateService } from '../services/exactTemplateCertificateService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple, reliable certificate generation
export const generateCertificate = async (req, res) => {
  try {
    const { eventId, requestId } = req.body;
    
    if (!eventId || !requestId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Event ID and Request ID are required' 
      });
    }

    // Find the event and certificate request
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    const certificateRequest = event.requestedCertificates.id(requestId);
    if (!certificateRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate request not found' 
      });
    }

    // Check if user has permission
    const isOwner = String(certificateRequest.requestedBy) === String(req.user.id);
    const isManager = ['manager', 'admin'].includes(req.user.role);
    
    if (!isOwner && !isManager) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Prefer the exact government-like templates for output
    // Falls back to simple HTML if service fails
    let certificateId;
    let certificatePath;
    try {
      const service = new ExactTemplateCertificateService();
      const result = await service.generateCertificate(event, certificateRequest, req.user);
      certificateId = result.certificateId;
      certificatePath = result.pdfPath; // can be HTML fallback
    } catch (e) {
      // Fallback path: use simple HTML generator
      certificateId = `CERT-${event._id}-${Date.now()}`;
      const certDir = path.join(__dirname, '../certificates');
      if (!fs.existsSync(certDir)) {
        fs.mkdirSync(certDir, { recursive: true });
      }
      const qrData = {
        certificateId,
        eventId: event._id,
        eventType: event.type,
        registrationId: event.registrationId,
        issuedDate: new Date().toISOString(),
        verificationUrl: `${process.env.CLIENT_URL || 'http://localhost:5174'}/verify/${certificateId}`
      };
      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData));
      const certificateHtml = generateCertificateHTML(event, certificateId, qrCodeDataUrl);
      certificatePath = path.join(certDir, `${certificateId}.html`);
      fs.writeFileSync(certificatePath, certificateHtml);
    }

    // Update certificate request
    certificateRequest.certificateId = certificateId;
    certificateRequest.certificatePath = certificatePath;
    certificateRequest.generatedAt = new Date();
    certificateRequest.status = 'approved';
    certificateRequest.approvedAt = new Date();
    certificateRequest.approvedBy = req.user.id;

    await event.save();

    res.json({
      success: true,
      message: 'Certificate generated successfully',
      certificateId,
      downloadUrl: `/api/certificates/${certificateId}/download`,
      verifyUrl: `/api/certificates/verify/${certificateId}`
    });

  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate certificate',
      error: error.message
    });
  }
};

export const downloadCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    // Find the event with this certificate
    const event = await Event.findOne({
      'requestedCertificates.certificateId': certificateId
    });
    
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate not found' 
      });
    }
    
    const certificateRequest = event.requestedCertificates.find(
      req => req.certificateId === certificateId
    );
    
    if (!certificateRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate request not found' 
      });
    }
    
    // Check permissions
    const isOwner = String(certificateRequest.requestedBy) === String(req.user.id);
    const isManager = ['manager', 'admin'].includes(req.user.role);
    
    if (!isOwner && !isManager) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    if (!certificateRequest.certificatePath) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate file not found' 
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(certificateRequest.certificatePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate file not found on disk' 
      });
    }
    
    // Send the certificate file
    const fileExtension = certificateRequest.certificatePath.endsWith('.pdf') ? 'pdf' : 'html';
    const contentType = fileExtension === 'pdf' ? 'application/pdf' : 'text/html';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${certificateId}.${fileExtension}"`);
    res.sendFile(path.resolve(certificateRequest.certificatePath));
    
  } catch (error) {
    console.error('Certificate download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download certificate',
      error: error.message
    });
  }
};

export const verifyCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    // Find the event with this certificate
    const event = await Event.findOne({
      'requestedCertificates.certificateId': certificateId
    }).populate('registrarId', 'name role');
    
    if (!event) {
      return res.status(404).json({ 
        valid: false, 
        message: 'Certificate not found' 
      });
    }
    
    const certificateRequest = event.requestedCertificates.find(
      req => req.certificateId === certificateId
    );
    
    if (!certificateRequest) {
      return res.status(404).json({ 
        valid: false, 
        message: 'Certificate request not found' 
      });
    }
    
    if (certificateRequest.status !== 'approved') {
      return res.status(400).json({ 
        valid: false, 
        message: 'Certificate not approved' 
      });
    }
    
    // Return certificate verification data
    res.json({
      valid: true,
      certificateId: certificateId,
      eventType: event.type,
      registrationNumber: event.registrationId,
      issuedDate: certificateRequest.generatedAt,
      registrar: event.registrarId?.name,
      eventData: {
        type: event.type,
        status: event.status,
        createdAt: event.createdAt,
        approvedAt: event.approvedAt
      }
    });
    
  } catch (error) {
    console.error('Certificate verification error:', error);
    res.status(500).json({ 
      valid: false, 
      message: 'Error verifying certificate', 
      error: error.message 
    });
  }
};

// Debug: generate a sample Birth certificate using exact template (no DB writes)
export const debugGenerateBirthCertificate = async (_req, res) => {
  try {
    const now = new Date();
    const mockEvent = {
      _id: 'debug-event-id',
      type: 'birth',
      registrationId: 'BR-DEBUG-0001',
      createdAt: now,
      data: {
        childNameAmharic: 'ሰላም አበበ',
        childName: 'Selam Abebe',
        childFatherNameAmharic: 'አበበ',
        childFatherName: 'Abebe',
        childGrandfatherNameAmharic: 'ተፈራ',
        childGrandfatherName: 'Tefera',
        childSexAmharic: 'ሴት',
        childSex: 'Female',
        childBirthDate: '2014-04-12',
        childBirthPlaceAmharic: 'አዲስ አበባ',
        childBirthPlace: 'Addis Ababa',
        registrationRegionAmharic: 'አዲስ አበባ',
        registrationRegion: 'Addis Ababa',
        registrationZoneAmharic: 'ቦሌ',
        registrationZone: 'Bole',
        registrationWoredaAmharic: '01',
        registrationWoreda: '01',
        childNationalityAmharic: 'ኢትዮጵያዊ',
        childNationality: 'Ethiopian',
        motherNameAmharic: 'ሀና መኮንን',
        motherName: 'Hanna Mekonnen',
        motherNationalityAmharic: 'ኢትዮጵያዊ',
        motherNationality: 'Ethiopian',
        fatherNameAmharic: 'አበበ ተፈራ',
        fatherName: 'Abebe Tefera',
        fatherNationalityAmharic: 'ኢትዮጵያዊ',
        fatherNationality: 'Ethiopian',
        registrationDate: '2014-04-20',
        issueDate: '2014-04-21',
        registrarName: 'Civil Registrar'
      }
    };

    const mockRequest = { _id: 'debug-req' };

    const service = new ExactTemplateCertificateService();
    const { certificateId, pdfPath } = await service.generateCertificate(
      mockEvent,
      mockRequest,
      { id: 'debug-user', role: 'manager' }
    );

    return res.json({
      success: true,
      certificateId,
      path: pdfPath,
      downloadHint: `Open this file from your workspace: ${pdfPath}`
    });
  } catch (error) {
    console.error('Debug birth certificate error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

