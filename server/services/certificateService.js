import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CertificateService {
  constructor() {
    this.templatesPath = path.join(__dirname, '../templates');
    this.certificatesPath = path.join(__dirname, '../certificates');
    
    // Ensure directories exist
    if (!fs.existsSync(this.certificatesPath)) {
      fs.mkdirSync(this.certificatesPath, { recursive: true });
    }
  }

  async generateCertificate(event, certificateRequest, requesterUser) {
    try {
      const certificateType = event.type;
      const certificateId = `CERT-${event._id}-${Date.now()}`;
      
      console.log('🎯 Starting certificate generation...');
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
      
      // Generate HTML template
      console.log('📄 Generating HTML template...');
      const htmlTemplate = this.generateHTMLTemplate(certificateType, certificateData, qrCodeDataUrl);
      console.log('✅ HTML template generated');
      
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
      console.error('❌ Error generating certificate:', error);
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
      verificationImage: certificateRequest.verificationImage
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
          // Husband information
          husbandName: data.husbandNameEn || data.husbandNameAm || '',
          husbandNameAmharic: data.husbandNameAm || data.husbandNameEn || '',
          husbandFatherName: data.husbandFatherEn || data.husbandFatherAm || '',
          husbandFatherNameAmharic: data.husbandFatherAm || data.husbandFatherEn || '',
          husbandGrandfatherName: data.husbandGrandfatherEn || data.husbandGrandfatherAm || '',
          husbandGrandfatherNameAmharic: data.husbandGrandfatherAm || data.husbandGrandfatherEn || '',
          husbandBirthDate: this.formatDate(data.husbandBirthDate || data.birthDate),
          husbandNationality: data.husbandNationality || data.nationality || 'Ethiopian',
          // Marriage details
          marriageDate: this.formatDate(data.marriageDate),
          marriagePlace: data.marriagePlace || '',
          marriageRegistrationDate: this.formatDate(data.marriageRegistrationDate || event.createdAt),
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

      default:
        return baseData;
    }
  }

  generateHTMLTemplate(certificateType, data, qrCodeDataUrl) {
    const borderColor = certificateType === 'birth' ? '#0066CC' : certificateType === 'marriage' ? '#00AA44' : '#8B4513';
    
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
            border: 8px solid ${borderColor};
            padding: 15px;
            position: relative;
            min-height: 100vh;
            background-image: 
                radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 0);
            background-size: 20px 20px;
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
        }
        
        .reg-number {
            margin-bottom: 2px;
        }
        
        .flag {
            width: 100px;
            height: 60px;
            margin: 0 auto 10px;
            background: linear-gradient(to bottom, #00AA44 0%, #00AA44 33%, #FCDD09 33%, #FCDD09 66%, #EF3340 66%, #EF3340 100%);
            border: 1px solid #000;
            position: relative;
        }
        
        .flag::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 30px;
            height: 30px;
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
            font-size: 16px;
            z-index: 1;
        }
        
        .title-main {
            font-size: 14px;
            font-weight: bold;
            margin: 5px 0;
            text-transform: uppercase;
        }
        
        .title-sub {
            font-size: 18px;
            font-weight: bold;
            margin: 8px 0;
            text-transform: uppercase;
        }
        
        .content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .field-group {
            margin-bottom: 8px;
            display: flex;
            align-items: center;
        }
        
        .field-label {
            font-weight: bold;
            font-size: 11px;
            min-width: 120px;
            margin-right: 5px;
        }
        
        .field-value {
            border-bottom: 1px dotted #000;
            padding: 2px 0;
            min-height: 15px;
            font-size: 11px;
            flex: 1;
        }
        
        .photo-section {
            text-align: center;
            margin-bottom: 15px;
        }
        
        .photo-placeholder {
            width: 80px;
            height: 100px;
            border: 2px solid #000;
            margin: 5px auto;
            background-color: #f9f9f9;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #666;
        }
        
        .official-seal {
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            border: 2px solid #000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            font-weight: bold;
            text-align: center;
            line-height: 1.1;
        }
        
        .qr-code {
            position: absolute;
            bottom: 20px;
            left: 20px;
            width: 60px;
            height: 60px;
        }
        
        .qr-code img {
            width: 100%;
            height: 100%;
        }
        
        .signature-section {
            margin-top: 20px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .signature-box {
            text-align: center;
        }
        
        .signature-line {
            border-bottom: 1px solid #000;
            margin: 10px 0 5px;
            height: 20px;
        }
        
        .amharic-text {
            font-family: 'Times New Roman', serif;
            direction: ltr;
        }
        
        .two-column-layout {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .single-column-layout {
            display: block;
        }
    </style>
</head>
<body>
    <div class="certificate-container">
        <!-- Registration Numbers -->
        <div class="registration-numbers">
            <div class="reg-number">
                <strong>Birth Register Form Number:</strong> ${data.registrationNumber}
            </div>
            <div class="reg-number">
                <strong>Birth Registration Unique Identification Number:</strong> ${data.certificateId}
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
        
        <!-- Content -->
        <div class="content">
            ${this.generateOfficialContentFields(certificateType, data)}
        </div>
        
        <!-- Signature Section -->
        <div class="signature-section">
            <div class="signature-box">
                <div class="field-label">Name of Civil Registrar:</div>
                <div class="field-value">${data.registrarName}</div>
                <div class="signature-line"></div>
                <div class="field-label">Signature</div>
            </div>
            <div class="signature-box">
                <div class="field-label">Date of Certificate Issued:</div>
                <div class="field-value">${data.issueDate}</div>
                <div class="signature-line"></div>
                <div class="field-label">Official Seal</div>
            </div>
        </div>
        
        <!-- Official Seal -->
        <div class="official-seal">
            OFFICIAL<br>SEAL
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

  generateOfficialContentFields(certificateType, data) {
    switch (certificateType) {
      case 'birth':
        return `
          <div class="photo-section">
            <div class="photo-placeholder">
              ${data.verificationImage ? `<img src="file://${data.verificationImage}" style="width:100%;height:100%;object-fit:cover;">` : 'Photo'}
            </div>
          </div>
          <div>
            <div class="field-group">
              <div class="field-label">Name (ስም):</div>
              <div class="field-value">${data.childName}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Sex (ፆታ):</div>
              <div class="field-value">${data.childSex}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Place/Country of Birth (የተወለደበት ቦታ/ሀገር):</div>
              <div class="field-value">${data.childBirthPlace}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Woreda/Special Woreda (ወረዳ/ልዩ ወረዳ):</div>
              <div class="field-value">${data.registrationWoreda}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Mother's Full Name (የእናት ሙሉ ስም):</div>
              <div class="field-value">${data.motherName}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Father's Full Name (የአባት ሙሉ ስም):</div>
              <div class="field-value">${data.childFatherName}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Date of Birth Registration (የልደት ምዝገባ ቀን):</div>
              <div class="field-value">${data.registrationDate}</div>
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
              <div class="field-label">Father's Name (የአባት ስም):</div>
              <div class="field-value">${data.childFatherName}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Grand Father's Name (የአያት ስም):</div>
              <div class="field-value">${data.childGrandfatherName}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Date of Birth (የልደት ቀን):</div>
              <div class="field-value">${data.childBirthDate}</div>
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
              <div class="field-label">Nationality (ዜግነት):</div>
              <div class="field-value">${data.childNationality}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Mother's Nationality (የእናት ዜግነት):</div>
              <div class="field-value">${data.motherNationality}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Father's Nationality (የአባት ዜግነት):</div>
              <div class="field-value">${data.fatherNationality}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Date of Certificate Issued (የምስክር ወረቀት የተሰጠበት):</div>
              <div class="field-value">${data.issueDate}</div>
            </div>
          </div>
        `;
        
      case 'marriage':
        return `
          <div class="photo-section">
            <div style="display: flex; gap: 10px; justify-content: center;">
              <div>
                <div class="photo-placeholder" style="width: 60px; height: 80px;">
                  ${data.verificationImage ? `<img src="file://${data.verificationImage}" style="width:100%;height:100%;object-fit:cover;">` : 'Bride'}
                </div>
                <div style="font-size: 9px; text-align: center;">Bride</div>
              </div>
              <div>
                <div class="photo-placeholder" style="width: 60px; height: 80px;">
                  Husband Photo
                </div>
                <div style="font-size: 9px; text-align: center;">Groom</div>
              </div>
            </div>
          </div>
          <div>
            <div class="field-group">
              <div class="field-label">Wife's Name:</div>
              <div class="field-value">${data.wifeName}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Wife's Father's Name:</div>
              <div class="field-value">${data.wifeFatherName}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Wife's Grandfather's Name:</div>
              <div class="field-value">${data.wifeGrandfatherName}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Wife's Date of Birth:</div>
              <div class="field-value">${data.wifeBirthDate}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Wife's Nationality:</div>
              <div class="field-value">${data.wifeNationality}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Date of Marriage:</div>
              <div class="field-value">${data.marriageDate}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Place of Marriage:</div>
              <div class="field-value">${data.marriagePlace}</div>
            </div>
          </div>
          <div>
            <div class="field-group">
              <div class="field-label">Husband's Name:</div>
              <div class="field-value">${data.husbandName}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Husband's Father's Name:</div>
              <div class="field-value">${data.husbandFatherName}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Husband's Grandfather's Name:</div>
              <div class="field-value">${data.husbandGrandfatherName}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Husband's Date of Birth:</div>
              <div class="field-value">${data.husbandBirthDate}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Husband's Nationality:</div>
              <div class="field-value">${data.husbandNationality}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Marriage Registration Date:</div>
              <div class="field-value">${data.marriageRegistrationDate}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Witness 1 Name:</div>
              <div class="field-value"></div>
            </div>
            <div class="field-group">
              <div class="field-label">Witness 2 Name:</div>
              <div class="field-value"></div>
            </div>
          </div>
        `;
        
      case 'death':
        return `
          <div class="photo-section">
            <div class="photo-placeholder">
              ${data.verificationImage ? `<img src="file://${data.verificationImage}" style="width:100%;height:100%;object-fit:cover;">` : 'Photo'}
            </div>
          </div>
          <div>
            <div class="field-group">
              <div class="field-label">Deceased Name:</div>
              <div class="field-value">${data.deceasedName}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Father's Name:</div>
              <div class="field-value">${data.deceasedFatherName}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Grandfather's Name:</div>
              <div class="field-value">${data.deceasedGrandfatherName}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Sex:</div>
              <div class="field-value">${data.deceasedSex}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Date of Birth:</div>
              <div class="field-value">${data.deceasedBirthDate}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Age:</div>
              <div class="field-value">${data.deceasedAge}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Place of Birth:</div>
              <div class="field-value">${data.deceasedBirthPlace}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Nationality:</div>
              <div class="field-value">${data.deceasedNationality}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Occupation:</div>
              <div class="field-value">${data.deceasedOccupation}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Marital Status:</div>
              <div class="field-value">${data.deceasedMaritalStatus}</div>
            </div>
          </div>
          <div>
            <div class="field-group">
              <div class="field-label">Date of Death:</div>
              <div class="field-value">${data.deathDate}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Time of Death:</div>
              <div class="field-value">${data.deathTime}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Place of Death:</div>
              <div class="field-value">${data.deathPlace}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Cause of Death:</div>
              <div class="field-value">${data.deathCause}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Type of Death:</div>
              <div class="field-value">${data.deathType}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Residence:</div>
              <div class="field-value">${data.deceasedResidence}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Date of Registration:</div>
              <div class="field-value">${data.registrationDate}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Registrar Name:</div>
              <div class="field-value">${data.registrarName}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Signature:</div>
              <div class="field-value"></div>
            </div>
          </div>
        `;
        
      default:
        return '<div>Certificate content not available</div>';
    }
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
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
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

export default CertificateService;
