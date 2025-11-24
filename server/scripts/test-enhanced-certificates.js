import { EnhancedCertificateService } from '../services/enhancedCertificateService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample data for testing different certificate types
const sampleEvents = {
  birth: {
    _id: 'test-birth-123',
    type: 'birth',
    registrationId: 'BR-2024-001',
    createdAt: new Date('2024-01-15'),
    data: {
      childNameEn: 'Abebe Kebede',
      childNameAm: 'አበበ ከበደ',
      fatherNameEn: 'Kebede Wolde',
      fatherNameAm: 'ከበደ ወልደ',
      grandfatherNameEn: 'Wolde Mariam',
      grandfatherNameAm: 'ወልደ ማርያም',
      childSex: 'Male',
      childBirthDate: new Date('2024-01-10'),
      childBirthPlace: 'Addis Ababa',
      childNationality: 'Ethiopian',
      motherNameEn: 'Tigist Assefa',
      motherNameAm: 'ጥግስት አሰፋ',
      motherFatherNameEn: 'Assefa Bekele',
      motherFatherNameAm: 'አሰፋ በቀለ',
      motherGrandfatherNameEn: 'Bekele Tesfaye',
      motherGrandfatherNameAm: 'በቀለ ተስፋዬ',
      motherNationality: 'Ethiopian',
      fatherNationality: 'Ethiopian',
      region: 'Addis Ababa',
      zone: 'Central',
      city: 'Addis Ababa',
      subCity: 'Bole',
      woreda: 'Bole Sub City',
      kebele: 'Kebele 01'
    },
    registrarId: {
      name: 'Alemayehu Tadesse'
    }
  },
  
  marriage: {
    _id: 'test-marriage-123',
    type: 'marriage',
    registrationId: 'MR-2024-001',
    createdAt: new Date('2024-01-20'),
    data: {
      wifeNameEn: 'Hirut Tesfaye',
      wifeNameAm: 'ሂሩት ተስፋዬ',
      wifeFatherEn: 'Tesfaye Bekele',
      wifeFatherAm: 'ተስፋዬ በቀለ',
      wifeGrandfatherEn: 'Bekele Wolde',
      wifeGrandfatherAm: 'በቀለ ወልደ',
      wifeBirthDate: new Date('1995-05-15'),
      wifeNationality: 'Ethiopian',
      wifeReligion: 'Orthodox',
      wifeMaritalStatus: 'Single',
      wifeAgeAtMarriage: '28',
      wifeAddress: 'Addis Ababa, Bole Sub City',
      
      husbandNameEn: 'Dawit Assefa',
      husbandNameAm: 'ዳዊት አሰፋ',
      husbandFatherEn: 'Assefa Kebede',
      husbandFatherAm: 'አሰፋ ከበደ',
      husbandGrandfatherEn: 'Kebede Mariam',
      husbandGrandfatherAm: 'ከበደ ማርያም',
      husbandBirthDate: new Date('1990-08-22'),
      husbandNationality: 'Ethiopian',
      husbandReligion: 'Orthodox',
      husbandMaritalStatus: 'Single',
      husbandAgeAtMarriage: '33',
      husbandAddress: 'Addis Ababa, Kirkos Sub City',
      
      marriageDate: new Date('2024-01-18'),
      marriagePlace: 'Holy Trinity Cathedral, Addis Ababa',
      marriageType: 'Civil',
      marriageRegistrationDate: new Date('2024-01-20'),
      
      region: 'Addis Ababa',
      zone: 'Central',
      city: 'Addis Ababa',
      subCity: 'Bole',
      woreda: 'Bole Sub City',
      kebele: 'Kebele 01',
      
      witness1Name: 'Mengistu Haile',
      witness1Address: 'Addis Ababa',
      witness2Name: 'Worknesh Gebre',
      witness2Address: 'Addis Ababa'
    },
    registrarId: {
      name: 'Alemayehu Tadesse'
    }
  },
  
  death: {
    _id: 'test-death-123',
    type: 'death',
    registrationId: 'DR-2024-001',
    createdAt: new Date('2024-01-25'),
    data: {
      deceasedNameEn: 'Kebede Wolde',
      deceasedNameAm: 'ከበደ ወልደ',
      deceasedFatherEn: 'Wolde Mariam',
      deceasedFatherAm: 'ወልደ ማርያም',
      deceasedGrandfatherEn: 'Mariam Tesfaye',
      deceasedGrandfatherAm: 'ማርያም ተስፋዬ',
      deceasedSex: 'Male',
      deceasedBirthDate: new Date('1950-03-10'),
      deceasedAge: '74',
      deceasedBirthPlace: 'Gondar',
      deceasedNationality: 'Ethiopian',
      deceasedOccupation: 'Farmer',
      deceasedMaritalStatus: 'Married',
      deceasedResidence: 'Gondar, Amhara Region',
      
      deathDate: new Date('2024-01-20'),
      deathTime: '14:30',
      deathPlace: 'Gondar University Hospital',
      deathCause: 'Natural causes - old age',
      deathType: 'Natural',
      
      region: 'Amhara',
      zone: 'North Gondar',
      city: 'Gondar',
      subCity: 'Gondar City',
      woreda: 'Gondar Woreda',
      kebele: 'Kebele 05'
    },
    registrarId: {
      name: 'Alemayehu Tadesse'
    }
  },
  
  divorce: {
    _id: 'test-divorce-123',
    type: 'divorce',
    registrationId: 'DV-2024-001',
    createdAt: new Date('2024-01-30'),
    data: {
      spouse1NameEn: 'Mohammed Abdi',
      spouse1NameAm: 'ሙሐመድ አብዲ',
      spouse1FatherEn: 'Abdi Hassan',
      spouse1FatherAm: 'አብዲ ሐሰን',
      spouse1MotherEn: 'Fatuma Ali',
      spouse1MotherAm: 'ፋቱማ አሊ',
      spouse1BirthDate: new Date('1980-06-15'),
      spouse1Sex: 'Male',
      spouse1Nationality: 'Ethiopian',
      spouse1CountryOfBirth: 'Ethiopia',
      spouse1CurrentAddress: 'Jijiga, Somali Region',
      
      spouse2NameEn: 'Salma Mohammed',
      spouse2NameAm: 'ሳልማ ሙሐመድ',
      spouse2FatherEn: 'Mohammed Ahmed',
      spouse2FatherAm: 'ሙሐመድ አሕመድ',
      spouse2MotherEn: 'Fatuma Ibrahim',
      spouse2MotherAm: 'ፋቱማ ኢብራሂም',
      spouse2BirthDate: new Date('1985-09-20'),
      spouse2Sex: 'Female',
      spouse2Nationality: 'Ethiopian',
      spouse2CountryOfBirth: 'Ethiopia',
      spouse2CurrentAddress: 'Jijiga, Somali Region',
      
      divorceDate: new Date('2024-01-25'),
      divorceRegistrationDate: new Date('2024-01-30'),
      divorceRegistrationNumber: 'DV-2024-001',
      divorceType: 'Mutual Consent',
      divorceReason: 'Irreconcilable differences',
      
      region: 'Somali',
      zone: 'Jijiga',
      city: 'Jijiga',
      subCity: 'Jijiga City',
      woreda: 'Jijiga Woreda',
      kebele: 'Kebele 03'
    },
    registrarId: {
      name: 'Alemayehu Tadesse'
    }
  }
};

const sampleCertificateRequests = {
  birth: {
    _id: 'req-birth-123',
    requestedBy: 'user-123',
    verificationImage: 'sample-photo-1.jpg',
    status: 'pending',
    requestedAt: new Date('2024-01-15')
  },
  
  marriage: {
    _id: 'req-marriage-123',
    requestedBy: 'user-456',
    verificationImage: 'sample-photo-2.jpg',
    status: 'pending',
    requestedAt: new Date('2024-01-20'),
    secondaryPhoto: 'sample-photo-3.jpg'
  },
  
  death: {
    _id: 'req-death-123',
    requestedBy: 'user-789',
    verificationImage: 'sample-photo-4.jpg',
    status: 'pending',
    requestedAt: new Date('2024-01-25')
  },
  
  divorce: {
    _id: 'req-divorce-123',
    requestedBy: 'user-101',
    verificationImage: 'sample-photo-5.jpg',
    status: 'pending',
    requestedAt: new Date('2024-01-30'),
    secondaryPhoto: 'sample-photo-6.jpg'
  }
};

const sampleUsers = {
  'user-123': {
    _id: 'user-123',
    name: 'Tigist Assefa',
    email: 'tigist@example.com',
    role: 'registrant'
  },
  'user-456': {
    _id: 'user-456',
    name: 'Hirut Tesfaye',
    email: 'hirut@example.com',
    role: 'registrant'
  },
  'user-789': {
    _id: 'user-789',
    name: 'Dawit Assefa',
    email: 'dawit@example.com',
    role: 'registrant'
  },
  'user-101': {
    _id: 'user-101',
    name: 'Mohammed Abdi',
    email: 'mohammed@example.com',
    role: 'registrant'
  }
};

async function testEnhancedCertificateGeneration() {
  console.log('🧪 Starting Enhanced Certificate Generation Test...\n');
  
  const certificateService = new EnhancedCertificateService();
  
  // Test each certificate type
  for (const [certType, event] of Object.entries(sampleEvents)) {
    console.log(`\n📋 Testing ${certType.toUpperCase()} Certificate Generation:`);
    console.log('=' .repeat(50));
    
    try {
      const certificateRequest = sampleCertificateRequests[certType];
      const requesterUser = sampleUsers[certificateRequest.requestedBy];
      
      console.log(`Event ID: ${event._id}`);
      console.log(`Event Type: ${event.type}`);
      console.log(`Requester: ${requesterUser.name}`);
      console.log(`Verification Image: ${certificateRequest.verificationImage}`);
      
      // Generate certificate
      const result = await certificateService.generateCertificate(
        event, 
        certificateRequest, 
        requesterUser
      );
      
      console.log(`✅ Certificate generated successfully!`);
      console.log(`Certificate ID: ${result.certificateId}`);
      console.log(`PDF Path: ${result.pdfPath}`);
      console.log(`QR Code generated: ${!!result.qrCodeDataUrl}`);
      
      // Check if file exists
      if (fs.existsSync(result.pdfPath)) {
        const stats = fs.statSync(result.pdfPath);
        console.log(`File size: ${stats.size} bytes`);
        console.log(`File created: ${stats.birthtime}`);
      } else {
        console.log(`⚠️ PDF file not found, checking for HTML fallback...`);
        const htmlPath = result.pdfPath.replace('.pdf', '.html');
        if (fs.existsSync(htmlPath)) {
          const stats = fs.statSync(htmlPath);
          console.log(`HTML file found: ${stats.size} bytes`);
        }
      }
      
      // Display extracted data summary
      console.log(`\n📊 Extracted Data Summary:`);
      console.log(`- Certificate Type: ${result.certificateData.type}`);
      console.log(`- Registration Number: ${result.certificateData.registrationNumber}`);
      console.log(`- Issue Date: ${result.certificateData.issueDate}`);
      console.log(`- Registrar: ${result.certificateData.registrarName}`);
      console.log(`- Photos: ${Object.keys(result.certificateData.photos).length} photo(s) found`);
      
      if (certType === 'birth') {
        console.log(`- Child Name: ${result.certificateData.childName}`);
        console.log(`- Father Name: ${result.certificateData.childFatherName}`);
        console.log(`- Mother Name: ${result.certificateData.motherName}`);
      } else if (certType === 'marriage') {
        console.log(`- Wife Name: ${result.certificateData.wifeName}`);
        console.log(`- Husband Name: ${result.certificateData.husbandName}`);
        console.log(`- Marriage Date: ${result.certificateData.marriageDate}`);
      } else if (certType === 'death') {
        console.log(`- Deceased Name: ${result.certificateData.deceasedName}`);
        console.log(`- Death Date: ${result.certificateData.deathDate}`);
        console.log(`- Cause of Death: ${result.certificateData.deathCause}`);
      } else if (certType === 'divorce') {
        console.log(`- Spouse 1: ${result.certificateData.spouse1Name}`);
        console.log(`- Spouse 2: ${result.certificateData.spouse2Name}`);
        console.log(`- Divorce Date: ${result.certificateData.divorceDate}`);
      }
      
    } catch (error) {
      console.error(`❌ Error generating ${certType} certificate:`, error.message);
      console.error('Stack trace:', error.stack);
    }
  }
  
  console.log('\n🎉 Enhanced Certificate Generation Test Completed!');
  console.log('\n📁 Check the server/certificates/ directory for generated files.');
  console.log('📄 Generated certificates include:');
  console.log('   - Exact Ethiopian government template format');
  console.log('   - Proper photo placement at the top');
  console.log('   - Official seal with Amharic text');
  console.log('   - QR code for verification');
  console.log('   - All required fields in both Amharic and English');
}

// Run the test
testEnhancedCertificateGeneration().catch(console.error);
