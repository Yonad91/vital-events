import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class EnhancedCertificateService {
  constructor() {
    this.templatesPath = path.join(__dirname, '../templates');
    this.certificatesPath = path.join(__dirname, '../certificates');
    // Use absolute path for uploads directory
    this.uploadsPath = path.resolve(__dirname, '../uploads');
    
    // Ensure directories exist
    if (!fs.existsSync(this.certificatesPath)) {
      fs.mkdirSync(this.certificatesPath, { recursive: true });
    }
    if (!fs.existsSync(this.uploadsPath)) {
      fs.mkdirSync(this.uploadsPath, { recursive: true });
    }
    
    console.log('📁 EnhancedCertificateService initialized:');
    console.log(`   Uploads: ${this.uploadsPath}`);
  }

  async generateCertificate(event, certificateRequest, requesterUser) {
    try {
      const certificateType = event.type;
      const certificateId = `CERT-${event._id}-${Date.now()}`;
      
      console.log('🎯 Starting enhanced certificate generation...');
      console.log('Event type:', certificateType);
      console.log('Certificate ID:', certificateId);
      
      // Generate QR code data
      const qrData = {
        certificateId,
        eventId: event._id,
        eventType: event.type,
        issuedDate: new Date().toISOString(),
        verificationUrl: `${process.env.CLIENT_URL || 'http://localhost:5174'}/verify/${certificateId}`
      };
      
      console.log('📱 Generating QR code...');
      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData));
      console.log('✅ QR code generated');
      
      // Extract data based on event type
      const certificateData = this.extractCertificateData(event, certificateRequest, requesterUser);
      console.log('📊 Certificate data extracted:', Object.keys(certificateData));
      
      // Generate HTML template with exact Ethiopian format
      console.log('📄 Generating enhanced HTML template...');
      const htmlTemplate = this.generateEnhancedHTMLTemplate(certificateType, certificateData, qrCodeDataUrl);
      console.log('✅ Enhanced HTML template generated');
      
      // Try to generate PDF
      let pdfPath;
      try {
        console.log('🔄 Attempting PDF generation...');
        pdfPath = await this.generatePDF(htmlTemplate, certificateId);
        console.log('✅ PDF generated successfully at:', pdfPath);
      } catch (pdfError) {
        console.error('❌ PDF generation failed:', pdfError.message);
        console.log('🔄 Falling back to HTML certificate...');
        
        // Fallback: Save as HTML file
        const htmlPath = path.join(this.certificatesPath, `${certificateId}.html`);
        fs.writeFileSync(htmlPath, htmlTemplate);
        console.log('✅ HTML certificate saved at:', htmlPath);
        
        // Return HTML path as fallback
        pdfPath = htmlPath;
      }
      
      return {
        certificateId,
        pdfPath,
        qrCodeDataUrl,
        certificateData
      };
      
    } catch (error) {
      console.error('❌ Error generating enhanced certificate:', error);
      throw error;
    }
  }

  extractCertificateData(event, certificateRequest, requesterUser) {
    const data = event.data || {};
    const baseData = {
      certificateId: `CERT-${event._id}-${Date.now()}`,
      registrationNumber: event.registrationId || event._id,
      registrationDate: this.formatDate(event.createdAt),
      issueDate: this.formatDate(new Date()),
      registrarName: event.registrarId?.name || 'Civil Registrar',
      requesterName: requesterUser.name,
      requesterEmail: requesterUser.email,
      verificationImage: certificateRequest.verificationImage,
      // Extract photos from event data
      photos: this.extractPhotos(event, certificateRequest)
    };

    switch (event.type) {
      case 'birth':
        return {
          ...baseData,
          type: 'Birth Certificate',
          typeAmharic: 'የልደት ምስክር ወረቀት',
          // Child information
          childName: data.childNameEn || data.childNameAm || '',
          childNameAmharic: data.childNameAm || data.childNameEn || '',
          childFatherName: data.fatherNameEn || data.fatherNameAm || '',
          childFatherNameAmharic: data.fatherNameAm || data.fatherNameEn || '',
          childGrandfatherName: data.grandfatherNameEn || data.grandfatherNameAm || '',
          childGrandfatherNameAmharic: data.grandfatherNameAm || data.grandfatherNameEn || '',
          childSex: data.childSex || data.sex || '',
          childBirthDate: this.formatDate(data.childBirthDate || data.birthDate),
          childBirthPlace: data.childBirthPlace || data.birthPlace || '',
          childNationality: data.childNationality || data.nationality || 'Ethiopian',
          // Mother information
          motherName: data.motherNameEn || data.motherNameAm || '',
          motherNameAmharic: data.motherNameAm || data.motherNameEn || '',
          motherFatherName: data.motherFatherNameEn || data.motherFatherNameAm || '',
          motherFatherNameAmharic: data.motherFatherNameAm || data.motherFatherNameEn || '',
          motherGrandfatherName: data.motherGrandfatherNameEn || data.motherGrandfatherNameAm || '',
          motherGrandfatherNameAmharic: data.motherGrandfatherNameAm || data.motherGrandfatherNameEn || '',
          motherNationality: data.motherNationality || data.nationality || 'Ethiopian',
          // Father information
          fatherName: data.fatherNameEn || data.fatherNameAm || '',
          fatherNameAmharic: data.fatherNameAm || data.fatherNameEn || '',
          fatherNationality: data.fatherNationality || data.nationality || 'Ethiopian',
          // Registration details
          registrationRegion: data.region || data.birthRegion || '',
          registrationZone: data.zone || data.birthZone || '',
          registrationCity: data.city || data.birthCity || '',
          registrationSubCity: data.subCity || data.birthSubCity || '',
          registrationWoreda: data.woreda || data.birthWoreda || '',
          registrationKebele: data.kebele || data.birthKebele || ''
        };

      case 'marriage':
        return {
          ...baseData,
          type: 'Marriage Certificate',
          typeAmharic: 'የጋብቻ ምስክር ወረቀት',
          // Wife information
          wifeName: data.wifeNameEn || data.wifeNameAm || '',
          wifeNameAmharic: data.wifeNameAm || data.wifeNameEn || '',
          wifeFatherName: data.wifeFatherEn || data.wifeFatherAm || '',
          wifeFatherNameAmharic: data.wifeFatherAm || data.wifeFatherEn || '',
          wifeGrandfatherName: data.wifeGrandfatherEn || data.wifeGrandfatherAm || '',
          wifeGrandfatherNameAmharic: data.wifeGrandfatherAm || data.wifeGrandfatherEn || '',
          wifeBirthDate: this.formatDate(data.wifeBirthDate || data.birthDate),
          wifeNationality: data.wifeNationality || data.nationality || 'Ethiopian',
          wifeReligion: data.wifeReligion || '',
          wifeMaritalStatus: data.wifeMaritalStatus || 'Single',
          wifeAgeAtMarriage: data.wifeAgeAtMarriage || '',
          wifeAddress: data.wifeAddress || '',
          // Husband information
          husbandName: data.husbandNameEn || data.husbandNameAm || '',
          husbandNameAmharic: data.husbandNameAm || data.husbandNameEn || '',
          husbandFatherName: data.husbandFatherEn || data.husbandFatherAm || '',
          husbandFatherNameAmharic: data.husbandFatherAm || data.husbandFatherEn || '',
          husbandGrandfatherName: data.husbandGrandfatherEn || data.husbandGrandfatherAm || '',
          husbandGrandfatherNameAmharic: data.husbandGrandfatherAm || data.husbandGrandfatherEn || '',
          husbandBirthDate: this.formatDate(data.husbandBirthDate || data.birthDate),
          husbandNationality: data.husbandNationality || data.nationality || 'Ethiopian',
          husbandReligion: data.husbandReligion || '',
          husbandMaritalStatus: data.husbandMaritalStatus || 'Single',
          husbandAgeAtMarriage: data.husbandAgeAtMarriage || '',
          husbandAddress: data.husbandAddress || '',
          // Marriage details
          marriageDate: this.formatDate(data.marriageDate),
          marriagePlace: data.marriagePlace || '',
          marriageRegistrationDate: this.formatDate(data.marriageRegistrationDate || event.createdAt),
          marriageType: data.marriageType || 'Civil',
          // Witnesses
          witness1Name: data.witness1Name || '',
          witness1Address: data.witness1Address || '',
          witness2Name: data.witness2Name || '',
          witness2Address: data.witness2Address || '',
          // Registration details
          registrationRegion: data.region || data.marriageRegion || '',
          registrationZone: data.zone || data.marriageZone || '',
          registrationCity: data.city || data.marriageCity || '',
          registrationSubCity: data.subCity || data.marriageSubCity || '',
          registrationWoreda: data.woreda || data.marriageWoreda || '',
          registrationKebele: data.kebele || data.marriageKebele || ''
        };

      case 'death':
        return {
          ...baseData,
          type: 'Death Certificate',
          typeAmharic: 'የሞት ምስክር ወረቀት',
          // Deceased information
          deceasedName: data.deceasedNameEn || data.deceasedNameAm || '',
          deceasedNameAmharic: data.deceasedNameAm || data.deceasedNameEn || '',
          deceasedFatherName: data.deceasedFatherEn || data.deceasedFatherAm || '',
          deceasedFatherNameAmharic: data.deceasedFatherAm || data.deceasedFatherEn || '',
          deceasedGrandfatherName: data.deceasedGrandfatherEn || data.deceasedGrandfatherAm || '',
          deceasedGrandfatherNameAmharic: data.deceasedGrandfatherAm || data.deceasedGrandfatherEn || '',
          deceasedSex: data.deceasedSex || data.sex || '',
          deceasedBirthDate: this.formatDate(data.deceasedBirthDate || data.birthDate),
          deceasedAge: data.deceasedAge || data.age || '',
          deceasedBirthPlace: data.deceasedBirthPlace || data.birthPlace || '',
          deceasedNationality: data.deceasedNationality || data.nationality || 'Ethiopian',
          deceasedOccupation: data.deceasedOccupation || data.occupation || '',
          deceasedMaritalStatus: data.deceasedMaritalStatus || data.maritalStatus || '',
          deceasedResidence: data.deceasedResidence || data.residence || '',
          // Death information
          deathDate: this.formatDate(data.deathDate),
          deathTime: data.deathTime || '',
          deathPlace: data.deathPlace || '',
          deathCause: data.deathCause || '',
          deathType: data.deathType || 'Natural',
          // Registration details
          registrationRegion: data.region || data.deathRegion || '',
          registrationZone: data.zone || data.deathZone || '',
          registrationCity: data.city || data.deathCity || '',
          registrationSubCity: data.subCity || data.deathSubCity || '',
          registrationWoreda: data.woreda || data.deathWoreda || '',
          registrationKebele: data.kebele || data.deathKebele || ''
        };

      case 'divorce':
        return {
          ...baseData,
          type: 'Divorce Certificate',
          typeAmharic: 'የፍቺ ምስክር ወረቀት',
          // Spouse 1 information
          spouse1Name: data.spouse1NameEn || data.spouse1NameAm || '',
          spouse1NameAmharic: data.spouse1NameAm || data.spouse1NameEn || '',
          spouse1FatherName: data.spouse1FatherEn || data.spouse1FatherAm || '',
          spouse1FatherNameAmharic: data.spouse1FatherAm || data.spouse1FatherEn || '',
          spouse1MotherName: data.spouse1MotherEn || data.spouse1MotherAm || '',
          spouse1MotherNameAmharic: data.spouse1MotherAm || data.spouse1MotherEn || '',
          spouse1BirthDate: this.formatDate(data.spouse1BirthDate || data.birthDate),
          spouse1Sex: data.spouse1Sex || data.sex || '',
          spouse1Nationality: data.spouse1Nationality || data.nationality || 'Ethiopian',
          spouse1CountryOfBirth: data.spouse1CountryOfBirth || '',
          spouse1CurrentAddress: data.spouse1CurrentAddress || '',
          // Spouse 2 information
          spouse2Name: data.spouse2NameEn || data.spouse2NameAm || '',
          spouse2NameAmharic: data.spouse2NameAm || data.spouse2NameEn || '',
          spouse2FatherName: data.spouse2FatherEn || data.spouse2FatherAm || '',
          spouse2FatherNameAmharic: data.spouse2FatherAm || data.spouse2FatherEn || '',
          spouse2MotherName: data.spouse2MotherEn || data.spouse2MotherAm || '',
          spouse2MotherNameAmharic: data.spouse2MotherAm || data.spouse2MotherEn || '',
          spouse2BirthDate: this.formatDate(data.spouse2BirthDate || data.birthDate),
          spouse2Sex: data.spouse2Sex || data.sex || '',
          spouse2Nationality: data.spouse2Nationality || data.nationality || 'Ethiopian',
          spouse2CountryOfBirth: data.spouse2CountryOfBirth || '',
          spouse2CurrentAddress: data.spouse2CurrentAddress || '',
          // Divorce details
          divorceDate: this.formatDate(data.divorceDate),
          divorceRegistrationDate: this.formatDate(data.divorceRegistrationDate || event.createdAt),
          divorceRegistrationNumber: data.divorceRegistrationNumber || '',
          divorceType: data.divorceType || '',
          divorceReason: data.divorceReason || '',
          // Registration details
          registrationRegion: data.region || data.divorceRegion || '',
          registrationZone: data.zone || data.divorceZone || '',
          registrationCity: data.city || data.divorceCity || '',
          registrationSubCity: data.subCity || data.divorceSubCity || '',
          registrationWoreda: data.woreda || data.divorceWoreda || '',
          registrationKebele: data.kebele || data.divorceKebele || ''
        };

      default:
        return baseData;
    }
  }

  extractPhotos(event, certificateRequest) {
    const photos = { primary: null, secondary: null };
    const data = event.data || {};
    
    console.log('📸 [Enhanced] Extracting photos for event type:', event.type);
    const photoFields = Object.keys(data).filter(k => 
      k.toLowerCase().includes('photo') || 
      k.toLowerCase().includes('image')
    );
    console.log('📋 [Enhanced] Photo/image fields:', photoFields);
    
    const tryPhotoFields = (...fieldNames) => {
      for (const fieldName of fieldNames) {
        if (data[fieldName]) {
          const photoPath = this.getPhotoPath(data[fieldName]);
          if (photoPath) return photoPath;
        }
      }
      return null;
    };
    
    const findAnyPhotoField = () => {
      for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === 'string' && value.trim() !== '' &&
            (key.toLowerCase().includes('photo') || key.toLowerCase().includes('image'))) {
          const photoPath = this.getPhotoPath(value);
          if (photoPath) return photoPath;
        }
      }
      return null;
    };
    
    switch (event.type) {
      case 'birth':
        photos.primary = tryPhotoFields('childPhoto') || findAnyPhotoField();
        if (!photos.primary && certificateRequest?.verificationImage) {
          photos.primary = this.getPhotoPath(certificateRequest.verificationImage);
        }
        break;
      case 'marriage':
        photos.primary = tryPhotoFields('wifePhoto') || findAnyPhotoField();
        if (!photos.primary && certificateRequest?.verificationImage) {
          photos.primary = this.getPhotoPath(certificateRequest.verificationImage);
        }
        photos.secondary = tryPhotoFields('husbandPhoto');
        break;
      case 'death':
        photos.primary = tryPhotoFields('deceasedPhoto') || findAnyPhotoField();
        if (!photos.primary && certificateRequest?.verificationImage) {
          photos.primary = this.getPhotoPath(certificateRequest.verificationImage);
        }
        break;
      case 'divorce':
        photos.primary = tryPhotoFields('divorceSpouse1Photo') || findAnyPhotoField();
        if (!photos.primary && certificateRequest?.verificationImage) {
          photos.primary = this.getPhotoPath(certificateRequest.verificationImage);
        }
        photos.secondary = tryPhotoFields('divorceSpouse2Photo');
        break;
      default:
        photos.primary = findAnyPhotoField();
        if (!photos.primary && certificateRequest?.verificationImage) {
          photos.primary = this.getPhotoPath(certificateRequest.verificationImage);
        }
        break;
    }
    
    console.log(`📸 [Enhanced] Result: primary=${photos.primary ? '✅' : '❌'}, secondary=${photos.secondary ? '✅' : '❌'}`);
    return photos;
  }

  getPhotoPath(photoFilename) {
    if (!photoFilename) return null;
    
    const uploadsPath = path.resolve(this.uploadsPath);
    let cleanFilename = String(photoFilename).trim();
    
    // Remove path prefixes
    cleanFilename = cleanFilename.replace(/^[\/\\]uploads[\/\\]/i, '');
    cleanFilename = cleanFilename.replace(/^uploads[\/\\]/i, '');
    cleanFilename = cleanFilename.replace(/^[\/\\]/, '');
    
    if (cleanFilename.toLowerCase().includes(uploadsPath.toLowerCase())) {
      cleanFilename = cleanFilename.substring(cleanFilename.toLowerCase().indexOf(uploadsPath.toLowerCase()) + uploadsPath.length);
      cleanFilename = cleanFilename.replace(/^[\/\\]/, '');
    }
    
    // Try direct path
    const directPath = path.join(uploadsPath, cleanFilename);
    if (fs.existsSync(directPath)) return directPath;
    
    // Try basename
    const basename = path.basename(cleanFilename);
    const basenamePath = path.join(uploadsPath, basename);
    if (fs.existsSync(basenamePath)) return basenamePath;
    
    // Try original
    const originalPath = path.join(uploadsPath, photoFilename);
    if (fs.existsSync(originalPath)) return originalPath;
    
    // Try file matching
    try {
      if (!fs.existsSync(uploadsPath)) return null;
      const files = fs.readdirSync(uploadsPath);
      
      // Exact match (case-insensitive)
      const exactMatch = files.find(f => f.toLowerCase() === cleanFilename.toLowerCase());
      if (exactMatch) return path.join(uploadsPath, exactMatch);
      
      // Partial match
      const partialMatch = files.find(f => 
        f.toLowerCase().includes(cleanFilename.toLowerCase()) || 
        cleanFilename.toLowerCase().includes(f.toLowerCase())
      );
      if (partialMatch) return path.join(uploadsPath, partialMatch);
      
      // Pattern match (fieldname-*.ext)
      const fieldPattern = cleanFilename.split('-')[0];
      if (fieldPattern && fieldPattern !== cleanFilename) {
        const patternMatch = files.find(f => f.toLowerCase().startsWith(fieldPattern.toLowerCase() + '-'));
        if (patternMatch) return path.join(uploadsPath, patternMatch);
      }
    } catch (err) {
      console.error(`Error reading uploads: ${err.message}`);
    }
    
    return null;
  }

  generateEnhancedHTMLTemplate(certificateType, data, qrCodeDataUrl) {
    const borderColor = certificateType === 'birth' ? '#0066CC' : 
                       certificateType === 'marriage' ? '#00AA44' : 
                       certificateType === 'death' ? '#8B4513' : '#8B4513';
    
    const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.type}</title>
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        
        body {
            font-family: 'Times New Roman', serif;
            margin: 0;
            padding: 0;
            background-color: white;
            color: #000;
            line-height: 1.2;
        }
        
        .certificate-container {
            background-color: white;
            border: 12px solid ${borderColor};
            padding: 20px;
            position: relative;
            min-height: 100vh;
            background-image: 
                radial-gradient(circle at 2px 2px, rgba(0,0,0,0.05) 1px, transparent 0);
            background-size: 25px 25px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 25px;
            position: relative;
        }
        
        .registration-numbers {
            position: absolute;
            top: 0;
            right: 0;
            font-size: 10px;
            text-align: right;
            line-height: 1.3;
        }
        
        .reg-number {
            margin-bottom: 3px;
        }
        
        .flag {
            width: 120px;
            height: 70px;
            margin: 0 auto 15px;
            background: linear-gradient(to bottom, #00AA44 0%, #00AA44 33%, #FCDD09 33%, #FCDD09 66%, #EF3340 66%, #EF3340 100%);
            border: 2px solid #000;
            position: relative;
        }
        
        .flag::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 35px;
            height: 35px;
            background: #0066CC;
            border-radius: 50%;
        }
        
        .flag::before {
            content: '★';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #FCDD09;
            font-size: 18px;
            z-index: 1;
        }
        
        .title-main {
            font-size: 16px;
            font-weight: bold;
            margin: 8px 0;
            text-transform: uppercase;
        }
        
        .title-sub {
            font-size: 20px;
            font-weight: bold;
            margin: 10px 0;
            text-transform: uppercase;
        }
        
        .photo-section {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin: 20px 0;
        }
        
        .photo-container {
            text-align: center;
        }
        
        .photo-placeholder {
            width: 100px;
            height: 120px;
            border: 3px solid #000;
            margin: 5px auto;
            background-color: #f9f9f9;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #666;
            position: relative;
            overflow: hidden;
        }
        
        .photo-placeholder img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .photo-label {
            font-size: 9px;
            font-weight: bold;
            margin-top: 5px;
        }
        
        .content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
            margin-bottom: 25px;
        }
        
        .field-group {
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            min-height: 20px;
        }
        
        .field-label {
            font-weight: bold;
            font-size: 11px;
            min-width: 140px;
            margin-right: 8px;
            line-height: 1.2;
        }
        
        .field-value {
            border-bottom: 1px dotted #000;
            padding: 3px 0;
            min-height: 18px;
            font-size: 11px;
            flex: 1;
            line-height: 1.2;
        }
        
        .date-fields {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        .date-field {
            border-bottom: 1px dotted #000;
            padding: 3px 0;
            min-height: 18px;
            font-size: 11px;
            text-align: center;
            min-width: 40px;
        }
        
        .official-seal {
            position: absolute;
            bottom: 30px;
            right: 30px;
            width: 80px;
            height: 80px;
            border: 3px solid #000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            font-weight: bold;
            text-align: center;
            line-height: 1.1;
            background: linear-gradient(45deg, #f0f0f0, #e0e0e0);
        }
        
        .qr-code {
            position: absolute;
            bottom: 30px;
            left: 30px;
            width: 70px;
            height: 70px;
        }
        
        .qr-code img {
            width: 100%;
            height: 100%;
        }
        
        .signature-section {
            margin-top: 25px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
        }
        
        .signature-box {
            text-align: center;
        }
        
        .signature-line {
            border-bottom: 1px solid #000;
            margin: 15px 0 8px;
            height: 25px;
        }
        
        .amharic-text {
            font-family: 'Times New Roman', serif;
            direction: ltr;
        }
        
        .two-column-layout {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .single-column-layout {
            display: block;
        }
        
        .witness-section {
            margin-top: 20px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .witness-box {
            border: 1px solid #000;
            padding: 10px;
            text-align: center;
        }
        
        .witness-title {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="certificate-container">
        <!-- Registration Numbers -->
        <div class="registration-numbers">
            <div class="reg-number">
                <strong>${this.getRegistrationLabel(certificateType)} Form Number:</strong><br>
                ${data.registrationNumber}
            </div>
            <div class="reg-number">
                <strong>${this.getRegistrationLabel(certificateType)} Unique Identification Number:</strong><br>
                ${data.certificateId}
            </div>
        </div>
        
        <!-- Header -->
        <div class="header">
            <div class="flag"></div>
            <div class="title-main amharic-text">በኢትዮጵያ ፌዴራላዊ ዴሞክራሲያዊ ሪፐብሊክ የወሳኝ ኩነት ምዝገባ</div>
            <div class="title-main">FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA VITAL EVENT REGISTRATION</div>
            <div class="title-sub amharic-text">${data.typeAmharic}</div>
            <div class="title-sub">${data.type}</div>
        </div>
        
        <!-- Photos Section -->
        <div class="photo-section">
            ${this.generatePhotoSection(certificateType, data)}
        </div>
        
        <!-- Content -->
        <div class="content">
            ${this.generateEnhancedContentFields(certificateType, data)}
        </div>
        
        <!-- Signature Section -->
        <div class="signature-section">
            <div class="signature-box">
                <div class="field-label">Name of Civil Registrar (የክብር መዝገብ ሹም ስም):</div>
                <div class="field-value">${data.registrarName}</div>
                <div class="signature-line"></div>
                <div class="field-label">Signature (ፊርማ)</div>
            </div>
            <div class="signature-box">
                <div class="field-label">Date of Certificate Issued (የምስክር ወረቀት የተሰጠበት ቀን):</div>
                <div class="field-value">${data.issueDate}</div>
                <div class="signature-line"></div>
                <div class="field-label">Official Seal (ማሕተም)</div>
            </div>
        </div>
        
        <!-- Official Seal -->
        <div class="official-seal">
            <div style="font-size: 8px; line-height: 1.1;">
                <div>የኢትዮጵያ</div>
                <div>ፌዴራላዊ</div>
                <div>ዴሞክራሲያዊ</div>
                <div>ሪፐብሊክ</div>
                <div>የወሳኝ ኩነት</div>
                <div>ምዝገባ</div>
            </div>
        </div>
        
        <!-- QR Code -->
        <div class="qr-code">
            <img src="${qrCodeDataUrl}" alt="QR Code">
        </div>
    </div>
</body>
</html>`;
    
    return template;
  }

  getRegistrationLabel(certificateType) {
    switch (certificateType) {
      case 'birth': return 'Birth Registration';
      case 'marriage': return 'Marriage Registration';
      case 'death': return 'Death Registration';
      case 'divorce': return 'Divorce Registration';
      default: return 'Registration';
    }
  }

  generatePhotoSection(certificateType, data) {
    const photos = data.photos || {};
    
    switch (certificateType) {
      case 'birth':
        return `
          <div class="photo-container">
            <div class="photo-placeholder">
              ${photos.primary ? `<img src="file://${photos.primary}" alt="Photo">` : 'Photo'}
            </div>
            <div class="photo-label">Registered Photo</div>
          </div>
        `;
        
      case 'marriage':
        return `
          <div class="photo-container">
            <div class="photo-placeholder">
              ${photos.primary ? `<img src="file://${photos.primary}" alt="Bride Photo">` : 'Bride Photo'}
            </div>
            <div class="photo-label">Bride Photo</div>
          </div>
          <div class="photo-container">
            <div class="photo-placeholder">
              ${photos.secondary ? `<img src="file://${photos.secondary}" alt="Groom Photo">` : 'Groom Photo'}
            </div>
            <div class="photo-label">Groom Photo</div>
          </div>
        `;
        
      case 'death':
        return `
          <div class="photo-container">
            <div class="photo-placeholder">
              ${photos.primary ? `<img src="file://${photos.primary}" alt="Photo">` : 'Photo'}
            </div>
            <div class="photo-label">Registered Photo</div>
          </div>
        `;
        
      case 'divorce':
        return `
          <div class="photo-container">
            <div class="photo-placeholder">
              ${photos.primary ? `<img src="file://${photos.primary}" alt="Spouse 1 Photo">` : 'Spouse 1 Photo'}
            </div>
            <div class="photo-label">Spouse 1 Photo</div>
          </div>
          <div class="photo-container">
            <div class="photo-placeholder">
              ${photos.secondary ? `<img src="file://${photos.secondary}" alt="Spouse 2 Photo">` : 'Spouse 2 Photo'}
            </div>
            <div class="photo-label">Spouse 2 Photo</div>
          </div>
        `;
        
      default:
        return '';
    }
  }

  generateEnhancedContentFields(certificateType, data) {
    switch (certificateType) {
      case 'birth':
        return this.generateBirthCertificateFields(data);
      case 'marriage':
        return this.generateMarriageCertificateFields(data);
      case 'death':
        return this.generateDeathCertificateFields(data);
      case 'divorce':
        return this.generateDivorceCertificateFields(data);
      default:
        return '<div>Certificate content not available</div>';
    }
  }

  generateBirthCertificateFields(data) {
    return `
      <div>
        <div class="field-group">
          <div class="field-label">Name (ስም):</div>
          <div class="field-value">${data.childName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Father's Name (የአባት ስም):</div>
          <div class="field-value">${data.childFatherName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Grand Father's Name (የአያት ስም):</div>
          <div class="field-value">${data.childGrandfatherName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Sex (ፆታ):</div>
          <div class="field-value">${data.childSex}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Date of Birth (የልደት ቀን):</div>
          <div class="date-fields">
            <div class="date-field">${this.getDay(data.childBirthDate)}</div>
            <div class="date-field">${this.getMonth(data.childBirthDate)}</div>
            <div class="date-field">${this.getYear(data.childBirthDate)}</div>
          </div>
        </div>
        <div class="field-group">
          <div class="field-label">Place/Country of Birth (የልደት ቦታ/ሀገር):</div>
          <div class="field-value">${data.childBirthPlace}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Region/City Administration (ክልል/ከተማ አስተዳደር):</div>
          <div class="field-value">${data.registrationRegion}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Zone/City Administration (ዞን/ከተማ አስተዳደር):</div>
          <div class="field-value">${data.registrationZone}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Woreda/Special Woreda (ወረዳ/ልዩ ወረዳ):</div>
          <div class="field-value">${data.registrationWoreda}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Nationality (ዜግነት):</div>
          <div class="field-value">${data.childNationality}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Date of Birth Registration (የልደት ምዝገባ ቀን):</div>
          <div class="date-fields">
            <div class="date-field">${this.getDay(data.registrationDate)}</div>
            <div class="date-field">${this.getMonth(data.registrationDate)}</div>
            <div class="date-field">${this.getYear(data.registrationDate)}</div>
          </div>
        </div>
        <div class="field-group">
          <div class="field-label">Name of Civil Registrar (የክብር መዝገብ ሹም ስም):</div>
          <div class="field-value">${data.registrarName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Signature (ፊርማ):</div>
          <div class="field-value"></div>
        </div>
      </div>
      <div>
        <div class="field-group">
          <div class="field-label">Mother's Full Name (የእናት ሙሉ ስም):</div>
          <div class="field-value">${data.motherName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Mother's Father's Name (የእናት አባት ስም):</div>
          <div class="field-value">${data.motherFatherName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Mother's Grandfather's Name (የእናት አያት ስም):</div>
          <div class="field-value">${data.motherGrandfatherName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Mother's Nationality (የእናት ዜግነት):</div>
          <div class="field-value">${data.motherNationality}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Father's Full Name (የአባት ሙሉ ስም):</div>
          <div class="field-value">${data.fatherName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Father's Nationality (የአባት ዜግነት):</div>
          <div class="field-value">${data.fatherNationality}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Date of Certificate Issued (የምስክር ወረቀት የተሰጠበት ቀን):</div>
          <div class="date-fields">
            <div class="date-field">${this.getDay(data.issueDate)}</div>
            <div class="date-field">${this.getMonth(data.issueDate)}</div>
            <div class="date-field">${this.getYear(data.issueDate)}</div>
          </div>
        </div>
        <div class="field-group">
          <div class="field-label">Place of Certificate Issued (የምስክር ወረቀት የተሰጠበት ቦታ):</div>
          <div class="field-value">${data.registrationCity}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Certificate Number (የምስክር ወረቀት ቁጥር):</div>
          <div class="field-value">${data.certificateId}</div>
        </div>
      </div>
    `;
  }

  generateMarriageCertificateFields(data) {
    return `
      <div>
        <div class="field-group">
          <div class="field-label">Wife's Name (የሚስት ስም):</div>
          <div class="field-value">${data.wifeName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Wife's Father's Name (የአባት ስም):</div>
          <div class="field-value">${data.wifeFatherName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Wife's Grandfather's Name (የአያት ስም):</div>
          <div class="field-value">${data.wifeGrandfatherName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Wife's Date of Birth (የትውልድ ቀን):</div>
          <div class="date-fields">
            <div class="date-field">${this.getDay(data.wifeBirthDate)}</div>
            <div class="date-field">${this.getMonth(data.wifeBirthDate)}</div>
            <div class="date-field">${this.getYear(data.wifeBirthDate)}</div>
          </div>
        </div>
        <div class="field-group">
          <div class="field-label">Wife's Nationality (ዜግነት):</div>
          <div class="field-value">${data.wifeNationality}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Wife's Religion (ሃይማኖት):</div>
          <div class="field-value">${data.wifeReligion}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Wife's Marital Status (የጋብቻ ሁኔታ):</div>
          <div class="field-value">${data.wifeMaritalStatus}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Wife's Age at Marriage (የጋብቻ ዕድሜ):</div>
          <div class="field-value">${data.wifeAgeAtMarriage}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Wife's Address (የሚስት አድራሻ):</div>
          <div class="field-value">${data.wifeAddress}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Date of Marriage (ጋብቻው የተፈጸመበት ቀን):</div>
          <div class="date-fields">
            <div class="date-field">${this.getDay(data.marriageDate)}</div>
            <div class="date-field">${this.getMonth(data.marriageDate)}</div>
            <div class="date-field">${this.getYear(data.marriageDate)}</div>
          </div>
        </div>
        <div class="field-group">
          <div class="field-label">Place of Marriage (ጋብቻው የተፈጸመበት ቦታ):</div>
          <div class="field-value">${data.marriagePlace}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Type of Marriage (የጋብቻ አይነት):</div>
          <div class="field-value">${data.marriageType}</div>
        </div>
      </div>
      <div>
        <div class="field-group">
          <div class="field-label">Husband's Name (የባል ስም):</div>
          <div class="field-value">${data.husbandName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Husband's Father's Name (የአባት ስም):</div>
          <div class="field-value">${data.husbandFatherName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Husband's Grandfather's Name (የአያት ስም):</div>
          <div class="field-value">${data.husbandGrandfatherName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Husband's Date of Birth (የትውልድ ቀን):</div>
          <div class="date-fields">
            <div class="date-field">${this.getDay(data.husbandBirthDate)}</div>
            <div class="date-field">${this.getMonth(data.husbandBirthDate)}</div>
            <div class="date-field">${this.getYear(data.husbandBirthDate)}</div>
          </div>
        </div>
        <div class="field-group">
          <div class="field-label">Husband's Nationality (ዜግነት):</div>
          <div class="field-value">${data.husbandNationality}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Husband's Religion (ሃይማኖት):</div>
          <div class="field-value">${data.husbandReligion}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Husband's Marital Status (የጋብቻ ሁኔታ):</div>
          <div class="field-value">${data.husbandMaritalStatus}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Husband's Age at Marriage (የጋብቻ ዕድሜ):</div>
          <div class="field-value">${data.husbandAgeAtMarriage}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Husband's Address (የባል አድራሻ):</div>
          <div class="field-value">${data.husbandAddress}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Marriage Registration Date (ጋብቻዉ የተመዘገበበት ቀን):</div>
          <div class="date-fields">
            <div class="date-field">${this.getDay(data.marriageRegistrationDate)}</div>
            <div class="date-field">${this.getMonth(data.marriageRegistrationDate)}</div>
            <div class="date-field">${this.getYear(data.marriageRegistrationDate)}</div>
          </div>
        </div>
        <div class="field-group">
          <div class="field-label">Place of Marriage Registration (ጋብቻው የተመዘገበበት ቦታ):</div>
          <div class="field-value">${data.registrationCity}</div>
        </div>
      </div>
    `;
  }

  generateDeathCertificateFields(data) {
    return `
      <div>
        <div class="field-group">
          <div class="field-label">Deceased Name (የሟች ስም):</div>
          <div class="field-value">${data.deceasedName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Father's Name (የአባት ስም):</div>
          <div class="field-value">${data.deceasedFatherName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Grandfather's Name (የአያት ስም):</div>
          <div class="field-value">${data.deceasedGrandfatherName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Sex (ጾታ):</div>
          <div class="field-value">${data.deceasedSex}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Nationality (ዜግነት):</div>
          <div class="field-value">${data.deceasedNationality}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Age (ዕድሜ):</div>
          <div class="field-value">${data.deceasedAge}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Date of Birth (የትውልድ ቀን):</div>
          <div class="date-fields">
            <div class="date-field">${this.getDay(data.deceasedBirthDate)}</div>
            <div class="date-field">${this.getMonth(data.deceasedBirthDate)}</div>
            <div class="date-field">${this.getYear(data.deceasedBirthDate)}</div>
          </div>
        </div>
        <div class="field-group">
          <div class="field-label">Place of Birth (የትውልድ ቦታ):</div>
          <div class="field-value">${data.deceasedBirthPlace}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Date of Death (የሞተበት ቀን):</div>
          <div class="date-fields">
            <div class="date-field">${this.getDay(data.deathDate)}</div>
            <div class="date-field">${this.getMonth(data.deathDate)}</div>
            <div class="date-field">${this.getYear(data.deathDate)}</div>
          </div>
        </div>
        <div class="field-group">
          <div class="field-label">Time of Death (የሞተበት ሰዓት):</div>
          <div class="field-value">${data.deathTime}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Place of Death (የሞተበት ቦታ):</div>
          <div class="field-value">${data.deathPlace}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Cause of Death (የሞት መንስኤ):</div>
          <div class="field-value">${data.deathCause}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Death Certificate Number (የሞት የምስክር ወረቀት ቁጥር):</div>
          <div class="field-value">${data.certificateId}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Date of Certificate Issued (የምስክር ወረቀት የተሰጠበት ቀን):</div>
          <div class="date-fields">
            <div class="date-field">${this.getDay(data.issueDate)}</div>
            <div class="date-field">${this.getMonth(data.issueDate)}</div>
            <div class="date-field">${this.getYear(data.issueDate)}</div>
          </div>
        </div>
        <div class="field-group">
          <div class="field-label">Place of Certificate Issued (የምስክር ወረቀት የተሰጠበት ቦታ):</div>
          <div class="field-value">${data.registrationCity}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Deceased Address (የሟች አድራሻ):</div>
          <div class="field-value">${data.deceasedResidence}</div>
        </div>
      </div>
      <div>
        <div class="field-group">
          <div class="field-label">Date of Registration (የምዝገባ ቀን):</div>
          <div class="date-fields">
            <div class="date-field">${this.getDay(data.registrationDate)}</div>
            <div class="date-field">${this.getMonth(data.registrationDate)}</div>
            <div class="date-field">${this.getYear(data.registrationDate)}</div>
          </div>
        </div>
        <div class="field-group">
          <div class="field-label">Registration Number (የምዝገባ ቁጥር):</div>
          <div class="field-value">${data.registrationNumber}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Place of Registration (የምዝገባ ቦታ):</div>
          <div class="field-value">${data.registrationCity}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Type of Registration (የምዝገባ አይነት):</div>
          <div class="field-value">Death Registration</div>
        </div>
        <div class="field-group">
          <div class="field-label">Registration Record Number (የምዝገባ መዝገብ ቁጥር):</div>
          <div class="field-value">${data.registrationNumber}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Registration Record Page Number (የምዝገባ መዝገብ ገጽ ቁጥር):</div>
          <div class="field-value"></div>
        </div>
        <div class="field-group">
          <div class="field-label">Registration Record Line Number (የምዝገባ መዝገብ መስመር ቁጥር):</div>
          <div class="field-value"></div>
        </div>
        <div class="field-group">
          <div class="field-label">Registration Record Form Number (የምዝገባ መዝገብ ቅጽ ቁጥር):</div>
          <div class="field-value"></div>
        </div>
        <div class="field-group">
          <div class="field-label">Registration Record Form Page Number (የምዝገባ መዝገብ ቅጽ ገጽ ቁጥር):</div>
          <div class="field-value"></div>
        </div>
        <div class="field-group">
          <div class="field-label">Registration Record Form Line Number (የምዝገባ መዝገብ ቅጽ መስመር ቁጥር):</div>
          <div class="field-value"></div>
        </div>
        <div class="field-group">
          <div class="field-label">Registration Record Form Type (የምዝገባ መዝገብ ቅጽ አይነት):</div>
          <div class="field-value">Death Registration Form</div>
        </div>
        <div class="field-group">
          <div class="field-label">Registrar's Name (የምዝጋቢ ስም):</div>
          <div class="field-value">${data.registrarName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Registrar's Signature (የምዝጋቢ ፊርማ):</div>
          <div class="field-value"></div>
        </div>
        <div class="field-group">
          <div class="field-label">Registrar's Seal (የምዝጋቢ ማህተም):</div>
          <div class="field-value"></div>
        </div>
      </div>
    `;
  }

  generateDivorceCertificateFields(data) {
    return `
      <div>
        <div class="field-group">
          <div class="field-label">Spouse 1 Name (Full Name):</div>
          <div class="field-value">${data.spouse1Name}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Father's Name:</div>
          <div class="field-value">${data.spouse1FatherName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Mother's Name:</div>
          <div class="field-value">${data.spouse1MotherName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Date of Birth:</div>
          <div class="date-fields">
            <div class="date-field">${this.getDay(data.spouse1BirthDate)}</div>
            <div class="date-field">${this.getMonth(data.spouse1BirthDate)}</div>
            <div class="date-field">${this.getYear(data.spouse1BirthDate)}</div>
          </div>
        </div>
        <div class="field-group">
          <div class="field-label">Sex:</div>
          <div class="field-value">${data.spouse1Sex}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Nationality:</div>
          <div class="field-value">${data.spouse1Nationality}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Country of Birth:</div>
          <div class="field-value">${data.spouse1CountryOfBirth}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Current Address:</div>
          <div class="field-value">${data.spouse1CurrentAddress}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Date of Divorce:</div>
          <div class="date-fields">
            <div class="date-field">${this.getDay(data.divorceDate)}</div>
            <div class="date-field">${this.getMonth(data.divorceDate)}</div>
            <div class="date-field">${this.getYear(data.divorceDate)}</div>
          </div>
        </div>
        <div class="field-group">
          <div class="field-label">Date of Divorce Registration:</div>
          <div class="date-fields">
            <div class="date-field">${this.getDay(data.divorceRegistrationDate)}</div>
            <div class="date-field">${this.getMonth(data.divorceRegistrationDate)}</div>
            <div class="date-field">${this.getYear(data.divorceRegistrationDate)}</div>
          </div>
        </div>
        <div class="field-group">
          <div class="field-label">Divorce Registration Number:</div>
          <div class="field-value">${data.divorceRegistrationNumber}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Divorce Type:</div>
          <div class="field-value">${data.divorceType}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Reason for Divorce:</div>
          <div class="field-value">${data.divorceReason}</div>
        </div>
      </div>
      <div>
        <div class="field-group">
          <div class="field-label">Spouse 2 Name (Full Name):</div>
          <div class="field-value">${data.spouse2Name}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Father's Name:</div>
          <div class="field-value">${data.spouse2FatherName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Mother's Name:</div>
          <div class="field-value">${data.spouse2MotherName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Date of Birth:</div>
          <div class="date-fields">
            <div class="date-field">${this.getDay(data.spouse2BirthDate)}</div>
            <div class="date-field">${this.getMonth(data.spouse2BirthDate)}</div>
            <div class="date-field">${this.getYear(data.spouse2BirthDate)}</div>
          </div>
        </div>
        <div class="field-group">
          <div class="field-label">Sex:</div>
          <div class="field-value">${data.spouse2Sex}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Nationality:</div>
          <div class="field-value">${data.spouse2Nationality}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Country of Birth:</div>
          <div class="field-value">${data.spouse2CountryOfBirth}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Current Address:</div>
          <div class="field-value">${data.spouse2CurrentAddress}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Registrar's Name:</div>
          <div class="field-value">${data.registrarName}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Registrar's Signature:</div>
          <div class="field-value"></div>
        </div>
        <div class="field-group">
          <div class="field-label">Date of Registration:</div>
          <div class="date-fields">
            <div class="date-field">${this.getDay(data.registrationDate)}</div>
            <div class="date-field">${this.getMonth(data.registrationDate)}</div>
            <div class="date-field">${this.getYear(data.registrationDate)}</div>
          </div>
        </div>
        <div class="field-group">
          <div class="field-label">Registrar's Seal:</div>
          <div class="field-value"></div>
        </div>
        <div class="field-group">
          <div class="field-label">Registrar's ID No.:</div>
          <div class="field-value"></div>
        </div>
      </div>
    `;
  }

  async generatePDF(htmlTemplate, certificateId) {
    console.log('🔧 Starting PDF generation...');
    console.log('Certificate ID:', certificateId);
    console.log('Certificates path:', this.certificatesPath);
    
    // Ensure certificates directory exists and is writable
    try {
      if (!fs.existsSync(this.certificatesPath)) {
        console.log('📁 Creating certificates directory...');
        fs.mkdirSync(this.certificatesPath, { recursive: true });
      }
      
      // Test write permissions
      const testFile = path.join(this.certificatesPath, 'test-write.tmp');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log('✅ Write permissions verified');
    } catch (permError) {
      console.error('❌ Permission error:', permError.message);
      throw new Error(`Cannot write to certificates directory: ${permError.message}`);
    }

    // Try multiple Chrome executable paths
    const possiblePaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ].filter(Boolean);

    let browser = null;
    let lastError = null;

    for (const executablePath of possiblePaths) {
      try {
        console.log(`🔍 Trying Chrome/Edge at: ${executablePath}`);
        
        // Check if executable exists
        if (!fs.existsSync(executablePath)) {
          console.log(`⚠️ Executable not found: ${executablePath}`);
          continue;
        }

        const launchOpts = {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ],
          executablePath: executablePath,
          timeout: 30000
        };

        console.log('🚀 Launching browser...');
        browser = await puppeteer.launch(launchOpts);
        console.log('✅ Browser launched successfully');
        break;

      } catch (error) {
        console.log(`❌ Failed with ${executablePath}:`, error.message);
        lastError = error;
        if (browser) {
          try { await browser.close(); } catch {}
          browser = null;
        }
        continue;
      }
    }

    if (!browser) {
      console.error('❌ Could not launch any browser');
      console.error('Last error:', lastError?.message);
      throw new Error(`Could not launch Chrome/Edge. Tried paths: ${possiblePaths.join(', ')}. Last error: ${lastError?.message}`);
    }
    
    try {
      console.log('📄 Creating new page...');
      const page = await browser.newPage();
      
      console.log('📝 Setting page content...');
      await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });
      
      const pdfPath = path.join(this.certificatesPath, `${certificateId}.pdf`);
      console.log('💾 Saving PDF to:', pdfPath);
      
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.3in',
          right: '0.3in',
          bottom: '0.3in',
          left: '0.3in'
        }
      });
      
      // Verify file was created
      if (!fs.existsSync(pdfPath)) {
        throw new Error('PDF file was not created');
      }
      
      const stats = fs.statSync(pdfPath);
      console.log('✅ PDF generated successfully');
      console.log('📊 File size:', stats.size, 'bytes');
      
      return pdfPath;
    } finally {
      if (browser) {
        console.log('🔒 Closing browser...');
        await browser.close();
      }
    }
  }

  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getDay(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('/');
    return parts[0] || '';
  }

  getMonth(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('/');
    return parts[1] || '';
  }

  getYear(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('/');
    return parts[2] || '';
  }
}

export default EnhancedCertificateService;
