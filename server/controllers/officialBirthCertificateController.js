import OfficialBirthCertificateService from '../services/officialBirthCertificateService.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const officialBirthCertificateService = new OfficialBirthCertificateService();

export const generateOfficialBirthCertificate = async (req, res) => {
  try {
    console.log('🎯 Official Birth Certificate Generation Request');
    console.log('Request body:', req.body);
    
    const { eventId, verificationImage } = req.body;
    
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required'
      });
    }
    
    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Get the requester user
    const requesterUser = await User.findById(req.user.id);
    if (!requesterUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Create certificate request object
    const certificateRequest = {
      verificationImage: verificationImage || null
    };
    
    console.log('📋 Event details:', {
      id: event._id,
      type: event.type,
      registrationId: event.registrationId
    });
    
    console.log('👤 Requester details:', {
      id: requesterUser._id,
      name: requesterUser.name,
      email: requesterUser.email
    });
    
    // Generate the official birth certificate
    const result = await officialBirthCertificateService.generateBirthCertificate(
      event,
      certificateRequest,
      requesterUser
    );
    
    console.log('✅ Official birth certificate generated successfully');
    console.log('Certificate ID:', result.certificateId);
    console.log('PDF Path:', result.pdfPath);
    
    // Return success response with certificate details
    res.json({
      success: true,
      message: 'Official birth certificate generated successfully',
      data: {
        certificateId: result.certificateId,
        pdfPath: result.pdfPath,
        qrCodeDataUrl: result.qrCodeDataUrl,
        certificateData: result.certificateData,
        downloadUrl: `/api/certificates/download/${result.certificateId}`
      }
    });
    
  } catch (error) {
    console.error('❌ Error generating official birth certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate official birth certificate',
      error: error.message
    });
  }
};

export const downloadOfficialBirthCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    console.log('📥 Download request for certificate:', certificateId);
    
    // Construct the file path
    const filePath = path.join(__dirname, '../certificates', `${certificateId}.pdf`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Certificate file not found'
      });
    }
    
    // Set appropriate headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="birth-certificate-${certificateId}.pdf"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('❌ Error streaming certificate file:', error);
      res.status(500).json({
        success: false,
        message: 'Error downloading certificate file'
      });
    });
    
  } catch (error) {
    console.error('❌ Error downloading official birth certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download official birth certificate',
      error: error.message
    });
  }
};

export const previewOfficialBirthCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    console.log('👁️ Preview request for certificate:', certificateId);
    
    // Construct the file path
    const filePath = path.join(__dirname, '../certificates', `${certificateId}.pdf`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Certificate file not found'
      });
    }
    
    // Set appropriate headers for PDF preview
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="birth-certificate-preview.pdf"');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('❌ Error streaming certificate file:', error);
      res.status(500).json({
        success: false,
        message: 'Error previewing certificate file'
      });
    });
    
  } catch (error) {
    console.error('❌ Error previewing official birth certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview official birth certificate',
      error: error.message
    });
  }
};

export const getOfficialBirthCertificateInfo = async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    console.log('ℹ️ Certificate info request for:', certificateId);
    
    // Construct the file path
    const filePath = path.join(__dirname, '../certificates', `${certificateId}.pdf`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Certificate file not found'
      });
    }
    
    // Get file stats
    const stats = fs.statSync(filePath);
    
    res.json({
      success: true,
      data: {
        certificateId,
        fileName: `${certificateId}.pdf`,
        fileSize: stats.size,
        createdDate: stats.birthtime,
        modifiedDate: stats.mtime,
        downloadUrl: `/api/certificates/download/${certificateId}`,
        previewUrl: `/api/certificates/preview/${certificateId}`
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting certificate info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get certificate information',
      error: error.message
    });
  }
};
