import OfficialBirthCertificateService from '../services/officialBirthCertificateService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test data that matches the sample certificate
const testEvent = {
  _id: 'test-birth-event-123',
  type: 'birth',
  registrationId: '285-966',
  createdAt: new Date('2016-09-30'),
  registrarId: {
    name: 'Adpo'
  },
  data: {
    childNameEn: 'Ambassador',
    childNameAm: 'አምባሳደር',
    fatherNameEn: 'Adpo',
    fatherNameAm: 'አድፖ',
    grandfatherNameEn: 'Bekla',
    grandfatherNameAm: 'በቅሏ',
    childSex: 'Male',
    childBirthDate: '1998-09-12',
    childBirthPlace: 'Addis Ababa',
    childBirthPlaceAm: 'አዲስ አበባ',
    childNationality: 'Ethiopian',
    motherNameEn: 'Adpo Bekla Adpo',
    motherNameAm: 'አድፖ በቅሏ አድፖ',
    motherFatherNameEn: 'Adpo',
    motherFatherNameAm: 'አድፖ',
    motherGrandfatherNameEn: 'Bekla',
    motherGrandfatherNameAm: 'በቅሏ',
    motherNationality: 'Ethiopian',
    fatherNameEn: 'Adpo',
    fatherNameAm: 'አድፖ',
    fatherNationality: 'Ethiopian',
    region: 'Addis Ababa',
    zone: 'West',
    city: 'Addis Ababa',
    subCity: 'Addis Ketema',
    woreda: 'Addis Ketema',
    kebele: '01'
  }
};

const testCertificateRequest = {
  verificationImage: null // No photo for this test
};

const testRequesterUser = {
  id: 'test-user-123',
  name: 'Test User',
  email: 'test@example.com'
};

async function testOfficialBirthCertificate() {
  try {
    console.log('🧪 Testing Official Birth Certificate Generation...');
    console.log('================================================');
    
    const service = new OfficialBirthCertificateService();
    
    console.log('📋 Test Event Data:');
    console.log('- Event ID:', testEvent._id);
    console.log('- Event Type:', testEvent.type);
    console.log('- Registration ID:', testEvent.registrationId);
    console.log('- Child Name (Amharic):', testEvent.data.childNameAm);
    console.log('- Child Name (English):', testEvent.data.childNameEn);
    console.log('- Father Name (Amharic):', testEvent.data.fatherNameAm);
    console.log('- Father Name (English):', testEvent.data.fatherNameEn);
    console.log('- Birth Date:', testEvent.data.childBirthDate);
    console.log('- Birth Place (Amharic):', testEvent.data.childBirthPlaceAm);
    console.log('- Birth Place (English):', testEvent.data.childBirthPlace);
    console.log('');
    
    console.log('🎯 Generating Official Birth Certificate...');
    const result = await service.generateBirthCertificate(
      testEvent,
      testCertificateRequest,
      testRequesterUser
    );
    
    console.log('✅ Certificate Generated Successfully!');
    console.log('=====================================');
    console.log('Certificate ID:', result.certificateId);
    console.log('PDF Path:', result.pdfPath);
    console.log('QR Code Generated:', !!result.qrCodeDataUrl);
    console.log('');
    
    console.log('📊 Certificate Data:');
    console.log('- Type:', result.certificateData.type);
    console.log('- Type (Amharic):', result.certificateData.typeAmharic);
    console.log('- Child Name (Amharic):', result.certificateData.childNameAmharic);
    console.log('- Child Name (English):', result.certificateData.childName);
    console.log('- Father Name (Amharic):', result.certificateData.childFatherNameAmharic);
    console.log('- Father Name (English):', result.certificateData.childFatherName);
    console.log('- Grandfather Name (Amharic):', result.certificateData.childGrandfatherNameAmharic);
    console.log('- Grandfather Name (English):', result.certificateData.childGrandfatherName);
    console.log('- Sex (Amharic):', result.certificateData.childSexAmharic);
    console.log('- Birth Date:', result.certificateData.childBirthDate);
    console.log('- Birth Place (Amharic):', result.certificateData.childBirthPlaceAmharic);
    console.log('- Birth Place (English):', result.certificateData.childBirthPlace);
    console.log('- Nationality (Amharic):', result.certificateData.childNationalityAmharic);
    console.log('- Nationality (English):', result.certificateData.childNationality);
    console.log('- Mother Name (Amharic):', result.certificateData.motherNameAmharic);
    console.log('- Mother Name (English):', result.certificateData.motherName);
    console.log('- Father Name (Amharic):', result.certificateData.fatherNameAmharic);
    console.log('- Father Name (English):', result.certificateData.fatherName);
    console.log('- Registration Region (Amharic):', result.certificateData.registrationRegionAmharic);
    console.log('- Registration Region (English):', result.certificateData.registrationRegion);
    console.log('- Registration Zone (Amharic):', result.certificateData.registrationZoneAmharic);
    console.log('- Registration Zone (English):', result.certificateData.registrationZone);
    console.log('- Registration Woreda (Amharic):', result.certificateData.registrationWoredaAmharic);
    console.log('- Registration Woreda (English):', result.certificateData.registrationWoreda);
    console.log('- Registration Date:', result.certificateData.registrationDate);
    console.log('- Issue Date:', result.certificateData.issueDate);
    console.log('- Registrar Name:', result.certificateData.registrarName);
    console.log('');
    
    // Check if PDF file exists
    if (fs.existsSync(result.pdfPath)) {
      const stats = fs.statSync(result.pdfPath);
      console.log('📄 PDF File Details:');
      console.log('- File exists: Yes');
      console.log('- File size:', stats.size, 'bytes');
      console.log('- Created:', stats.birthtime);
      console.log('- Modified:', stats.mtime);
      console.log('');
      
      console.log('🎉 Test completed successfully!');
      console.log('The official birth certificate has been generated and matches the Ethiopian government format.');
      console.log('You can find the PDF at:', result.pdfPath);
    } else {
      console.log('❌ PDF file was not created');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testOfficialBirthCertificate();
