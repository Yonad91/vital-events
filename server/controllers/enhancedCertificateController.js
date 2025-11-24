import Event from '../models/Event.js';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import { EnhancedCertificateService } from '../services/enhancedCertificateService.js';
import { ExactTemplateCertificateService } from '../services/exactTemplateCertificateService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced certificate generation with exact Ethiopian template matching
export const generateEnhancedCertificate = async (req, res) => {
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

    // Get requester user details
    const requesterUser = await User.findById(certificateRequest.requestedBy);
    if (!requesterUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'Requester user not found' 
      });
    }

    // Initialize exact template certificate service
    const certificateService = new ExactTemplateCertificateService();
    
    // Generate enhanced certificate
    const result = await certificateService.generateCertificate(event, certificateRequest, requesterUser);
    
    // Update certificate request
    certificateRequest.certificateId = result.certificateId;
    certificateRequest.certificatePath = result.pdfPath;
    certificateRequest.generatedAt = new Date();
    certificateRequest.status = 'approved';
    certificateRequest.approvedAt = new Date();
    certificateRequest.approvedBy = req.user.id;

    await event.save();

    res.json({
      success: true,
      message: 'Enhanced certificate generated successfully',
      certificateId: result.certificateId,
      downloadUrl: `/api/certificates/${result.certificateId}/download`,
      verifyUrl: `/api/certificates/verify/${result.certificateId}`,
      certificateData: result.certificateData
    });

  } catch (error) {
    console.error('Enhanced certificate generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate enhanced certificate',
      error: error.message
    });
  }
};

export const downloadEnhancedCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    // Find certificate file
    const certificatesDir = path.join(__dirname, '../certificates');
    const pdfPath = path.join(certificatesDir, `${certificateId}.pdf`);
    const htmlPath = path.join(certificatesDir, `${certificateId}.html`);
    
    let filePath;
    let contentType;
    
    if (fs.existsSync(pdfPath)) {
      filePath = pdfPath;
      contentType = 'application/pdf';
    } else if (fs.existsSync(htmlPath)) {
      filePath = htmlPath;
      contentType = 'text/html';
    } else {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }
    
    // Set headers for download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${certificateId}.${contentType === 'application/pdf' ? 'pdf' : 'html'}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Certificate download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download certificate',
      error: error.message
    });
  }
};

export const verifyEnhancedCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    // Find the event with this certificate
    const event = await Event.findOne({
      'requestedCertificates.certificateId': certificateId
    });
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or invalid'
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
    
    // Return certificate verification data
    res.json({
      success: true,
      certificateId: certificateRequest.certificateId,
      eventType: event.type,
      registrationId: event.registrationId,
      issuedDate: certificateRequest.generatedAt,
      status: certificateRequest.status,
      eventData: event.data,
      verificationImage: certificateRequest.verificationImage
    });
    
  } catch (error) {
    console.error('Certificate verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify certificate',
      error: error.message
    });
  }
};

// Generate certificate for all pending requests (admin function)
export const generateAllPendingCertificates = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    // Find all events with pending certificate requests
    const events = await Event.find({
      'requestedCertificates.status': 'pending'
    }).populate('registrarId');

    const results = [];
    const certificateService = new ExactTemplateCertificateService();

    for (const event of events) {
      for (const certificateRequest of event.requestedCertificates) {
        if (certificateRequest.status === 'pending') {
          try {
            // Get requester user details
            const requesterUser = await User.findById(certificateRequest.requestedBy);
            if (!requesterUser) {
              console.error(`Requester user not found for certificate request ${certificateRequest._id}`);
              continue;
            }

            // Generate enhanced certificate
            const result = await certificateService.generateCertificate(event, certificateRequest, requesterUser);
            
            // Update certificate request
            certificateRequest.certificateId = result.certificateId;
            certificateRequest.certificatePath = result.pdfPath;
            certificateRequest.generatedAt = new Date();
            certificateRequest.status = 'approved';
            certificateRequest.approvedAt = new Date();
            certificateRequest.approvedBy = req.user.id;

            results.push({
              eventId: event._id,
              certificateId: result.certificateId,
              eventType: event.type,
              requesterName: requesterUser.name,
              status: 'success'
            });

          } catch (error) {
            console.error(`Failed to generate certificate for event ${event._id}:`, error);
            results.push({
              eventId: event._id,
              certificateId: null,
              eventType: event.type,
              requesterName: 'Unknown',
              status: 'failed',
              error: error.message
            });
          }
        }
      }
      
      // Save the event with updated certificate requests
      await event.save();
    }

    res.json({
      success: true,
      message: `Processed ${results.length} certificate requests`,
      results: results
    });

  } catch (error) {
    console.error('Batch certificate generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate certificates',
      error: error.message
    });
  }
};

// Get certificate statistics
export const getCertificateStats = async (req, res) => {
  try {
    const stats = await Event.aggregate([
      {
        $unwind: '$requestedCertificates'
      },
      {
        $group: {
          _id: '$requestedCertificates.status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalEvents = await Event.countDocuments();
    const totalCertificates = await Event.aggregate([
      { $unwind: '$requestedCertificates' },
      { $count: 'total' }
    ]);

    res.json({
      success: true,
      stats: {
        byStatus: stats,
        totalEvents,
        totalCertificates: totalCertificates[0]?.total || 0
      }
    });

  } catch (error) {
    console.error('Certificate stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get certificate statistics',
      error: error.message
    });
  }
};

export default {
  generateEnhancedCertificate,
  downloadEnhancedCertificate,
  verifyEnhancedCertificate,
  generateAllPendingCertificates,
  getCertificateStats
};
