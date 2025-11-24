import { EnhancedCertificateService } from '../services/enhancedCertificateService.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Example function to generate certificate for existing event
export const generateCertificateForEvent = async (eventId, requestId) => {
  try {
    // Connect to database
    await connectDB();
    
    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Find the certificate request
    const certificateRequest = event.requestedCertificates.id(requestId);
    if (!certificateRequest) {
      throw new Error('Certificate request not found');
    }
    
    // Get requester user
    const requesterUser = await User.findById(certificateRequest.requestedBy);
    if (!requesterUser) {
      throw new Error('Requester user not found');
    }
    
    // Initialize enhanced certificate service
    const certificateService = new EnhancedCertificateService();
    
    // Generate enhanced certificate
    console.log(`🎯 Generating enhanced certificate for ${event.type} event...`);
    const result = await certificateService.generateCertificate(event, certificateRequest, requesterUser);
    
    console.log('✅ Enhanced certificate generated successfully!');
    console.log(`Certificate ID: ${result.certificateId}`);
    console.log(`File Path: ${result.pdfPath}`);
    
    // Update certificate request status
    certificateRequest.certificateId = result.certificateId;
    certificateRequest.certificatePath = result.pdfPath;
    certificateRequest.generatedAt = new Date();
    certificateRequest.status = 'approved';
    
    await event.save();
    
    return result;
    
  } catch (error) {
    console.error('❌ Error generating certificate:', error);
    throw error;
  } finally {
    // Close database connection
    await mongoose.connection.close();
  }
};

// Example function to generate certificates for all pending requests
export const generateAllPendingCertificates = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Find all events with pending certificate requests
    const events = await Event.find({
      'requestedCertificates.status': 'pending'
    }).populate('registrarId');
    
    console.log(`📋 Found ${events.length} events with pending certificate requests`);
    
    const certificateService = new EnhancedCertificateService();
    const results = [];
    
    for (const event of events) {
      for (const certificateRequest of event.requestedCertificates) {
        if (certificateRequest.status === 'pending') {
          try {
            // Get requester user
            const requesterUser = await User.findById(certificateRequest.requestedBy);
            if (!requesterUser) {
              console.error(`❌ Requester user not found for certificate request ${certificateRequest._id}`);
              continue;
            }
            
            console.log(`🎯 Generating certificate for ${event.type} event ${event._id}...`);
            
            // Generate enhanced certificate
            const result = await certificateService.generateCertificate(event, certificateRequest, requesterUser);
            
            // Update certificate request
            certificateRequest.certificateId = result.certificateId;
            certificateRequest.certificatePath = result.pdfPath;
            certificateRequest.generatedAt = new Date();
            certificateRequest.status = 'approved';
            
            results.push({
              eventId: event._id,
              certificateId: result.certificateId,
              eventType: event.type,
              requesterName: requesterUser.name,
              status: 'success'
            });
            
            console.log(`✅ Certificate generated: ${result.certificateId}`);
            
          } catch (error) {
            console.error(`❌ Failed to generate certificate for event ${event._id}:`, error.message);
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
    
    console.log(`\n🎉 Batch certificate generation completed!`);
    console.log(`✅ Successful: ${results.filter(r => r.status === 'success').length}`);
    console.log(`❌ Failed: ${results.filter(r => r.status === 'failed').length}`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Error in batch certificate generation:', error);
    throw error;
  } finally {
    // Close database connection
    await mongoose.connection.close();
  }
};

// Example function to get certificate statistics
export const getCertificateStatistics = async () => {
  try {
    // Connect to database
    await connectDB();
    
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
    
    console.log('📊 Certificate Statistics:');
    console.log('=' .repeat(40));
    console.log(`Total Events: ${totalEvents}`);
    console.log(`Total Certificates: ${totalCertificates[0]?.total || 0}`);
    console.log('\nBy Status:');
    stats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count}`);
    });
    
    return {
      totalEvents,
      totalCertificates: totalCertificates[0]?.total || 0,
      byStatus: stats
    };
    
  } catch (error) {
    console.error('❌ Error getting certificate statistics:', error);
    throw error;
  } finally {
    // Close database connection
    await mongoose.connection.close();
  }
};

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'generate':
      const eventId = process.argv[3];
      const requestId = process.argv[4];
      if (!eventId || !requestId) {
        console.error('Usage: node integrate-enhanced-certificates.js generate <eventId> <requestId>');
        process.exit(1);
      }
      generateCertificateForEvent(eventId, requestId)
        .then(() => process.exit(0))
        .catch(error => {
          console.error(error);
          process.exit(1);
        });
      break;
      
    case 'generate-all':
      generateAllPendingCertificates()
        .then(() => process.exit(0))
        .catch(error => {
          console.error(error);
          process.exit(1);
        });
      break;
      
    case 'stats':
      getCertificateStatistics()
        .then(() => process.exit(0))
        .catch(error => {
          console.error(error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Enhanced Certificate Integration Script');
      console.log('Usage:');
      console.log('  node integrate-enhanced-certificates.js generate <eventId> <requestId>');
      console.log('  node integrate-enhanced-certificates.js generate-all');
      console.log('  node integrate-enhanced-certificates.js stats');
      process.exit(1);
  }
}
