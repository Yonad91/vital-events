import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class OfficialBirthCertificateService {
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
    
    console.log('📁 OfficialBirthCertificateService initialized:');
    console.log(`   Uploads: ${this.uploadsPath}`);
  }

  async generateBirthCertificate(event, certificateRequest, requesterUser) {
    try {
      const certificateId = `CERT-${event._id}-${Date.now()}`;
      
      console.log('🎯 Starting official birth certificate generation...');
      console.log('Event type:', event.type);
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
      console.log('📄 Generating official HTML template...');
      const htmlTemplate = this.generateOfficialHTMLTemplate(certificateData, qrCodeDataUrl);
      console.log('✅ Official HTML template generated');
      
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
      console.error('❌ Error generating official birth certificate:', error);
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
      childSexAmharic: this.getSexAmharic(data.childSex || data.sex || ''),
      childBirthDate: this.formatDate(data.childBirthDate || data.birthDate),
      childBirthPlace: data.childBirthPlace || data.birthPlace || '',
      childBirthPlaceAmharic: this.translateToAmharic(data.childBirthPlace || data.birthPlace || ''),
      childNationality: data.childNationality || data.nationality || 'Ethiopian',
      childNationalityAmharic: 'ኢትዮጵያዊ',
      // Mother information
      motherName: data.motherNameEn || data.motherNameAm || '',
      motherNameAmharic: data.motherNameAm || data.motherNameEn || '',
      motherFatherName: data.motherFatherNameEn || data.motherFatherNameAm || '',
      motherFatherNameAmharic: data.motherFatherNameAm || data.motherFatherNameEn || '',
      motherGrandfatherName: data.motherGrandfatherNameEn || data.motherGrandfatherNameAm || '',
      motherGrandfatherNameAmharic: data.motherGrandfatherNameAm || data.motherGrandfatherNameEn || '',
      motherNationality: data.motherNationality || data.nationality || 'Ethiopian',
      motherNationalityAmharic: 'ኢትዮጵያዊ',
      // Father information
      fatherName: data.fatherNameEn || data.fatherNameAm || '',
      fatherNameAmharic: data.fatherNameAm || data.fatherNameEn || '',
      fatherNationality: data.fatherNationality || data.nationality || 'Ethiopian',
      fatherNationalityAmharic: 'ኢትዮጵያዊ',
      // Registration details
      registrationRegion: data.region || data.birthRegion || '',
      registrationRegionAmharic: this.translateToAmharic(data.region || data.birthRegion || ''),
      registrationZone: data.zone || data.birthZone || '',
      registrationZoneAmharic: this.translateToAmharic(data.zone || data.birthZone || ''),
      registrationCity: data.city || data.birthCity || '',
      registrationCityAmharic: this.translateToAmharic(data.city || data.birthCity || ''),
      registrationSubCity: data.subCity || data.birthSubCity || '',
      registrationSubCityAmharic: this.translateToAmharic(data.subCity || data.birthSubCity || ''),
      registrationWoreda: data.woreda || data.birthWoreda || '',
      registrationWoredaAmharic: this.translateToAmharic(data.woreda || data.birthWoreda || ''),
      registrationKebele: data.kebele || data.birthKebele || '',
      registrationKebeleAmharic: this.translateToAmharic(data.kebele || data.birthKebele || '')
    };
  }

  extractPhotos(event, certificateRequest) {
    const photos = { primary: null };
    const data = event.data || {};
    
    console.log('📸 [Official] Extracting photos for birth certificate');
    const photoFields = Object.keys(data).filter(k => 
      k.toLowerCase().includes('photo') || 
      k.toLowerCase().includes('image')
    );
    console.log('📋 [Official] Photo/image fields:', photoFields);
    
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
    
    photos.primary = tryPhotoFields('childPhoto') || findAnyPhotoField();
    if (!photos.primary && certificateRequest?.verificationImage) {
      photos.primary = this.getPhotoPath(certificateRequest.verificationImage);
    }
    
    console.log(`📸 [Official] Result: primary=${photos.primary ? '✅ ' + photos.primary : '❌'}`);
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

  generateOfficialHTMLTemplate(data, qrCodeDataUrl) {
    // Pre-calculate date values to avoid template context issues
    const childBirthDay = this.getDay(data.childBirthDate);
    const childBirthMonth = this.getMonthAmharic(data.childBirthDate);
    const childBirthYear = this.getYear(data.childBirthDate);
    const registrationDay = this.getDay(data.registrationDate);
    const registrationMonth = this.getMonthAmharic(data.registrationDate);
    const registrationYear = this.getYear(data.registrationDate);
    const issueDay = this.getDay(data.issueDate);
    const issueMonth = this.getMonthAmharic(data.issueDate);
    const issueYear = this.getYear(data.issueDate);
    
    // Convert photo to base64 for PDF compatibility
    const getPhotoBase64 = (photoPath) => {
      if (!photoPath) return '';
      // Check if already a data URL or HTTP URL
      if (/^data:image\//.test(photoPath) || /^https?:\/\//.test(photoPath)) {
        return photoPath;
      }
      // Try to base64 encode
      try {
        const ext = path.extname(photoPath).toLowerCase();
        const mime = (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' : 'image/png';
        if (fs.existsSync(photoPath)) {
          const file = fs.readFileSync(photoPath);
          return `data:${mime};base64,${file.toString('base64')}`;
        }
      } catch (e) {
        console.warn('Failed to encode photo:', e.message);
      }
      return '';
    };
    
    const photoSrc = data.photos?.primary ? getPhotoBase64(data.photos.primary) : '';

    const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.type}</title>
    <style>
        @page {
            size: A4 landscape;
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
            border: 12px solid #0066CC;
            padding: 20px;
            position: relative;
            min-height: 100vh;
            width: 100%;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            text-align: center;
            margin-bottom: 20px;
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
        
        .main-content {
            display: flex;
            gap: 20px;
            flex: 1;
        }
        
        .left-section {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        
        .right-section {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        
        .photo-section {
            display: flex;
            align-items: flex-start;
            margin-bottom: 20px;
        }
        
        .photo-container {
            margin-right: 20px;
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
            text-align: center;
        }
        
        .field-group {
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            min-height: 18px;
        }
        
        .field-label {
            font-weight: bold;
            font-size: 11px;
            min-width: 180px;
            margin-right: 8px;
            line-height: 1.2;
        }
        
        .field-value {
            border-bottom: 1px dotted #000;
            padding: 2px 0;
            min-height: 16px;
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
            padding: 2px 0;
            min-height: 16px;
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
            font-size: 8px;
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
            margin-top: 20px;
            display: flex;
            gap: 20px;
        }
        
        .signature-box {
            flex: 1;
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
        
        .small-seal {
            position: absolute;
            top: 20px;
            left: 20px;
            width: 40px;
            height: 40px;
            border: 2px solid #000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 6px;
            font-weight: bold;
            text-align: center;
            line-height: 1.1;
            background: linear-gradient(45deg, #f0f0f0, #e0e0e0);
        }
    </style>
</head>
<body>
    <div class="certificate-container">
        <!-- Small Seal (overlapping photo) -->
        <div class="small-seal">
            <div style="font-size: 5px; line-height: 1.1;">
                <div>የኢትዮጵያ</div>
                <div>ፌዴራላዊ</div>
                <div>ዴሞክራሲያዊ</div>
                <div>ሪፐብሊክ</div>
            </div>
        </div>
        
        <!-- Registration Numbers -->
        <div class="registration-numbers">
            <div class="reg-number">
                <strong>Birth Registration Form Number:</strong><br>
                ${data.registrationNumber}
            </div>
            <div class="reg-number">
                <strong>Birth Registration Unique Identification Number:</strong><br>
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
        
        <!-- Main Content -->
        <div class="main-content">
            <!-- Left Section -->
            <div class="left-section">
                <!-- Photo Section -->
                <div class="photo-section">
                    <div class="photo-container">
                        <div class="photo-placeholder">
                            ${photoSrc ? `<img src="${photoSrc}" alt="Photo">` : 'Photo'}
                        </div>
                        <div class="photo-label">Registered Photo</div>
                    </div>
                </div>
                
                <!-- Child Information Fields -->
                <div class="field-group">
                    <div class="field-label">Name (ስም):</div>
                    <div class="field-value">${data.childNameAmharic}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Father's Name (የአባት ስም):</div>
                    <div class="field-value">${data.childFatherNameAmharic}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Grand Father's Name (የአያት ስም):</div>
                    <div class="field-value">${data.childGrandfatherNameAmharic}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Sex (ፆታ):</div>
                    <div class="field-value">${data.childSexAmharic}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Date of Birth (የልደት ቀን ወር ዓመት):</div>
                    <div class="date-fields">
                        <div class="date-field">${childBirthDay}</div>
                        <div class="date-field">${childBirthMonth}</div>
                        <div class="date-field">${childBirthYear}</div>
                    </div>
                </div>
                <div class="field-group">
                    <div class="field-label">Place/Country of Birth (የልደት ቦታ/ሀገር):</div>
                    <div class="field-value">${data.childBirthPlaceAmharic}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Region/City Administration (ክልል/ከተማ አስተዳደር):</div>
                    <div class="field-value">${data.registrationRegionAmharic}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Zone/City Administration (ዞን/ከተማ አስተዳደር):</div>
                    <div class="field-value">${data.registrationZoneAmharic}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Woreda/Special Woreda (ወረዳ/ልዩ ወረዳ):</div>
                    <div class="field-value">${data.registrationWoredaAmharic}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Nationality (ዜግነት):</div>
                    <div class="field-value">${data.childNationalityAmharic}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Mother's Full Name (የእናት ሙሉ ስም):</div>
                    <div class="field-value">${data.motherNameAmharic}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Mother's Father's Name (የእናት አባት ስም):</div>
                    <div class="field-value">${data.motherFatherNameAmharic}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Mother's Grandfather's Name (የእናት አያት ስም):</div>
                    <div class="field-value">${data.motherGrandfatherNameAmharic}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Mother's Nationality (የእናት ዜግነት):</div>
                    <div class="field-value">${data.motherNationalityAmharic}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Date of Birth Registration (የልደት ምዝገባ ቀን ወር ዓመት):</div>
                    <div class="date-fields">
                        <div class="date-field">${registrationDay}</div>
                        <div class="date-field">${registrationMonth}</div>
                        <div class="date-field">${registrationYear}</div>
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
            
            <!-- Right Section -->
            <div class="right-section">
                <div class="field-group">
                    <div class="field-label">Father's Full Name (የአባት ሙሉ ስም):</div>
                    <div class="field-value">${data.fatherNameAmharic}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Father's Grandfather's Name (የአባት አያት ስም):</div>
                    <div class="field-value">${data.childGrandfatherNameAmharic}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Father's Nationality (የአባት ዜግነት):</div>
                    <div class="field-value">${data.fatherNationalityAmharic}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Mother's Relationship (የእናት ግንኙነት):</div>
                    <div class="field-value">Mother</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Date of Certificate Issued (የምስክር ወረቀት የተሰጠበት ወር ቀን ዓመት):</div>
                    <div class="date-fields">
                        <div class="date-field">${issueDay}</div>
                        <div class="date-field">${issueMonth}</div>
                        <div class="date-field">${issueYear}</div>
                    </div>
                </div>
                <div class="field-group">
                    <div class="field-label">Signature (ፊርማ):</div>
                    <div class="field-value"></div>
                </div>
                <div class="field-group">
                    <div class="field-label">Grand Father's Name (የአያት ስም):</div>
                    <div class="field-value">${data.childGrandfatherNameAmharic}</div>
                </div>
            </div>
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
            <div style="font-size: 7px; line-height: 1.1;">
                <div>የኢትዮጵያ</div>
                <div>ፌዴራላዊ</div>
                <div>ዴሞክራሲያዊ</div>
                <div>ሪፐብሊክ</div>
                <div>የወሳኝ ኩነት</div>
                <div>ምዝገባ</div>
                <div>አዲስ አበባ</div>
                <div>ምዝገባ ቢሮ</div>
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
        landscape: true,
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

  getMonthAmharic(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('/');
    const month = parseInt(parts[1]) || 1;
    const amharicMonths = [
      'መስከረም', 'ጥቅምት', 'ሕዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
      'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ'
    ];
    return amharicMonths[month - 1] || '';
  }

  getSexAmharic(sex) {
    switch (sex.toLowerCase()) {
      case 'male': return 'ወንድ';
      case 'female': return 'ሴት';
      default: return sex;
    }
  }

  translateToAmharic(text) {
    // Basic translation mapping for common Ethiopian place names
    const translations = {
      'Addis Ababa': 'አዲስ አበባ',
      'Ethiopian': 'ኢትዮጵያዊ',
      'West': 'ምዕራብ',
      'East': 'ምሥራቅ',
      'North': 'ሰሜን',
      'South': 'ደቡብ',
      'Central': 'መካከለኛ',
      'Addis Ketema': 'አዲስ ከተማ',
      'Arada': 'አራዳ',
      'Bole': 'ቦሌ',
      'Gullele': 'ጉለሌ',
      'Kirkos': 'ኪርኮስ',
      'Kolfe Keranio': 'ኮልፌ ከራኒዮ',
      'Lideta': 'ሊደታ',
      'Nifas Silk-Lafto': 'ንፋስ ስልክ-ላፍቶ',
      'Yeka': 'የካ'
    };
    
    return translations[text] || text;
  }
}

export default OfficialBirthCertificateService;
