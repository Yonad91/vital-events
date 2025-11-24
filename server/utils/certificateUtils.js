// Shared certificate utility functions

export function generateCertificateHTML(event, certificateId, qrCodeDataUrl) {
  const data = event.data || {};
  const eventType = event.type.toLowerCase();
  
  // --- Photo Path Resolver ---
  function resolvePhotoPath(val) {
    if (!val) return '';
    // If val already looks like an absolute path (rooted or has a slash/colon), use as-is
    if (/^(\/|[a-zA-Z]:|\\|file:)/.test(val)) return val;
    // Use updated server uploads path
    return 'C:/Users/Jonah/Desktop/vital-events/server/uploads/' + val;
  }

  // Pick whichever exists
  const rawPhoto = data.photo || data.childPhoto;
  const resolvedPhoto = resolvePhotoPath(rawPhoto);
  
  // Pre-calculate date values
  const birthDate = formatDate(data.birthDate || data.childBirthDate);
  const registrationDate = formatDate(event.createdAt);
  const issueDate = formatDate(new Date());
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Certificate</title>
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
            line-height: 1.0;
        }
        
        .certificate-container {
            background-color: white;
            border: 12px solid #0066CC;
            padding: 10px;
            position: relative;
            min-height: 100vh;
            width: 100%;
            display: flex;
            flex-direction: column;
        }
        
        /* Top Registration Numbers - positioned exactly like official template */
        .top-registration {
            position: absolute;
            top: 10px;
            right: 10px;
            font-size: 8px;
            text-align: right;
            line-height: 1.1;
            z-index: 10;
        }
        
        .reg-number {
            margin-bottom: 1px;
        }
        
        /* Small seal overlapping photo area */
        .small-seal {
            position: absolute;
            top: 10px;
            left: 10px;
            width: 30px;
            height: 30px;
            border: 2px solid #000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 4px;
            font-weight: bold;
            text-align: center;
            line-height: 0.9;
            background: linear-gradient(45deg, #f0f0f0, #e0e0e0);
            z-index: 10;
        }
        
        /* Header section with flag and titles */
        .header {
            text-align: center;
            margin: 15px 0 10px 0;
            position: relative;
        }
        
        .flag {
            width: 80px;
            height: 50px;
            margin: 0 auto 8px;
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
            width: 25px;
            height: 25px;
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
            font-size: 12px;
            z-index: 1;
        }
        
        .title-main {
            font-size: 12px;
            font-weight: bold;
            margin: 3px 0;
            text-transform: uppercase;
        }
        
        .title-sub {
            font-size: 16px;
            font-weight: bold;
            margin: 5px 0;
            text-transform: uppercase;
        }
        
        /* Main content area with two columns - exact layout like official template */
        .main-content {
            display: flex;
            gap: 10px;
            flex: 1;
            margin-top: 5px;
        }
        
        .left-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            position: relative;
        }
        
        .right-section {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        
        /* Photo section - positioned exactly like official template */
        .photo-section {
            position: absolute;
            top: 0;
            left: 0;
            width: 70px;
            height: 90px;
            border: 2px solid #000;
            background-color: #f9f9f9;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 7px;
            color: #666;
            overflow: hidden;
            z-index: 5;
        }
        
        .photo-section img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        /* Field styling to match official template exactly */
        .field-group {
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            min-height: 14px;
            margin-left: 80px; /* Space for photo */
        }
        
        .field-group.no-photo {
            margin-left: 0;
        }
        
        .field-label {
            font-weight: bold;
            font-size: 9px;
            min-width: 140px;
            margin-right: 4px;
            line-height: 1.0;
        }
        
        .field-value {
            border-bottom: 1px dotted #000;
            padding: 0;
            min-height: 12px;
            font-size: 9px;
            flex: 1;
            line-height: 1.0;
        }
        
        .date-fields {
            display: flex;
            gap: 6px;
            align-items: center;
        }
        
        .date-field {
            border-bottom: 1px dotted #000;
            padding: 0;
            min-height: 12px;
            font-size: 9px;
            text-align: center;
            min-width: 30px;
        }
        
        /* Signature section at bottom */
        .signature-section {
            margin-top: 10px;
            display: flex;
            gap: 10px;
        }
        
        .signature-box {
            flex: 1;
            text-align: center;
        }
        
        .signature-line {
            border-bottom: 1px solid #000;
            margin: 8px 0 3px;
            height: 15px;
        }
        
        .amharic-text {
            font-family: 'Times New Roman', serif;
            direction: ltr;
        }
        
        /* Official seal positioned exactly like template */
        .official-seal {
            position: absolute;
            bottom: 15px;
            right: 15px;
            width: 60px;
            height: 60px;
            border: 3px solid #000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 6px;
            font-weight: bold;
            text-align: center;
            line-height: 0.9;
            background: linear-gradient(45deg, #f0f0f0, #e0e0e0);
        }
        
        /* QR Code positioned at bottom left */
        .qr-code {
            position: absolute;
            bottom: 15px;
            left: 15px;
            width: 50px;
            height: 50px;
        }
        
        .qr-code img {
            width: 100%;
            height: 100%;
        }
    </style>
</head>
<body>
    <div class="certificate-container">
        <!-- Small Seal overlapping photo area -->
        <div class="small-seal">
            <div style="font-size: 3px; line-height: 0.9;">
                <div>የኢትዮጵያ</div>
                <div>ፌዴራላዊ</div>
                <div>ዴሞክራሲያዊ</div>
                <div>ሪፐብሊክ</div>
            </div>
        </div>
        
        <!-- Top Registration Numbers -->
        <div class="top-registration">
            <div class="reg-number">
                <strong>Birth Registration Form Number:</strong><br>
                ${event.registrationId || 'N/A'}
            </div>
            <div class="reg-number">
                <strong>Birth Registration Unique Identification Number:</strong><br>
                ${certificateId}
            </div>
        </div>
        
        <!-- Header with Flag and Titles -->
        <div class="header">
            <div class="flag"></div>
            <div class="title-main amharic-text">በኢትዮጵያ ፌዴራላዊ ዴሞክራሲያዊ ሪፐብሊክ የወሳኝ ኩነት ምዝገባ</div>
            <div class="title-main">FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA VITAL EVENT REGISTRATION</div>
            <div class="title-sub amharic-text">የልደት ምስክር ወረቀት</div>
            <div class="title-sub">BIRTH CERTIFICATE</div>
        </div>
        
        <!-- Main Content with Two Columns -->
        <div class="main-content">
            <!-- Left Section -->
            <div class="left-section">
                <!-- Photo Section -->
                <div class="photo-section">
                    ${rawPhoto ? `<div style="width:100%">\n<img src=\"file://${resolvedPhoto}\" alt=\"Photo\" onerror=\"this.style.display='none';document.getElementById('photo-debug-path').style.display='block';\">\n</div>\n<small id='photo-debug-path' style='display:none;font-size:8px;color:#d00;'>Photo path: file://${resolvedPhoto}</small>` : `<span>No photo uploaded</span>`}
                    <div style="font-size:8px;color:#999;margin-top:2px;">[Photo src: file://${resolvedPhoto}]</div>
                </div>
                
                <!-- Child Information Fields - Left Column -->
                <div class="field-group">
                    <div class="field-label">Name (ስም):</div>
                    <div class="field-value">${data.childNameAm || data.childNameEn || ''}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Father's Name (የአባት ስም):</div>
                    <div class="field-value">${data.fatherNameAm || data.fatherNameEn || ''}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Grand Father's Name (የአያት ስም):</div>
                    <div class="field-value">${data.grandfatherNameAm || data.grandfatherNameEn || ''}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Sex (ፆታ):</div>
                    <div class="field-value">${getSexAmharic(data.sex || data.childSex || '')}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Date of Birth (የልደት ቀን ወር ዓመት):</div>
                    <div class="date-fields">
                        <div class="date-field">${birthDate.day}</div>
                        <div class="date-field">${getMonthAmharic(birthDate.month)}</div>
                        <div class="date-field">${birthDate.year}</div>
                    </div>
                </div>
                <div class="field-group">
                    <div class="field-label">Place/Country of Birth (የልደት ቦታ/ሀገር):</div>
                    <div class="field-value">${data.birthPlaceAm || data.birthPlace || ''}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Region/City Administration (ክልል/ከተማ አስተዳደር):</div>
                    <div class="field-value">${data.regionAm || data.region || ''}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Zone/City Administration (ዞን/ከተማ አስተዳደር):</div>
                    <div class="field-value">${data.zoneAm || data.zone || ''}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Woreda/Special Woreda (ወረዳ/ልዩ ወረዳ):</div>
                    <div class="field-value">${data.woredaAm || data.woreda || ''}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Nationality (ዜግነት):</div>
                    <div class="field-value">ኢትዮጵያዊ</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Mother's Full Name (የእናት ሙሉ ስም):</div>
                    <div class="field-value">${data.motherNameAm || data.motherNameEn || ''}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Mother's Father's Name (የእናት አባት ስም):</div>
                    <div class="field-value">${data.motherFatherNameAm || data.motherFatherNameEn || ''}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Mother's Grandfather's Name (የእናት አያት ስም):</div>
                    <div class="field-value">${data.motherGrandfatherNameAm || data.motherGrandfatherNameEn || ''}</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Mother's Nationality (የእናት ዜግነት):</div>
                    <div class="field-value">ኢትዮጵያዊ</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Date of Birth Registration (የልደት ምዝገባ ቀን ወር ዓመት):</div>
                    <div class="date-fields">
                        <div class="date-field">${registrationDate.day}</div>
                        <div class="date-field">${getMonthAmharic(registrationDate.month)}</div>
                        <div class="date-field">${registrationDate.year}</div>
                    </div>
                </div>
                <div class="field-group">
                    <div class="field-label">Name of Civil Registrar (የክብር መዝገብ ሹም ስም):</div>
                    <div class="field-value">Civil Registrar</div>
                </div>
                <div class="field-group">
                    <div class="field-label">Signature (ፊርማ):</div>
                    <div class="field-value"></div>
                </div>
            </div>
            
            <!-- Right Section -->
            <div class="right-section">
                <div class="field-group no-photo">
                    <div class="field-label">Father's Full Name (የአባት ሙሉ ስም):</div>
                    <div class="field-value">${data.fatherNameAm || data.fatherNameEn || ''}</div>
                </div>
                <div class="field-group no-photo">
                    <div class="field-label">Father's Grandfather's Name (የአባት አያት ስም):</div>
                    <div class="field-value">${data.grandfatherNameAm || data.grandfatherNameEn || ''}</div>
                </div>
                <div class="field-group no-photo">
                    <div class="field-label">Father's Nationality (የአባት ዜግነት):</div>
                    <div class="field-value">ኢትዮጵያዊ</div>
                </div>
                <div class="field-group no-photo">
                    <div class="field-label">Mother's Relationship (የእናት ግንኙነት):</div>
                    <div class="field-value">Mother</div>
                </div>
                <div class="field-group no-photo">
                    <div class="field-label">Date of Certificate Issued (የምስክር ወረቀት የተሰጠበት ወር ቀን ዓመት):</div>
                    <div class="date-fields">
                        <div class="date-field">${issueDate.day}</div>
                        <div class="date-field">${getMonthAmharic(issueDate.month)}</div>
                        <div class="date-field">${issueDate.year}</div>
                    </div>
                </div>
                <div class="field-group no-photo">
                    <div class="field-label">Signature (ፊርማ):</div>
                    <div class="field-value"></div>
                </div>
                <div class="field-group no-photo">
                    <div class="field-label">Grand Father's Name (የአያት ስም):</div>
                    <div class="field-value">${data.grandfatherNameAm || data.grandfatherNameEn || ''}</div>
                </div>
            </div>
        </div>
        
        <!-- Signature Section at Bottom -->
        <div class="signature-section">
            <div class="signature-box">
                <div class="field-label">Name of Civil Registrar (የክብር መዝገብ ሹም ስም):</div>
                <div class="field-value">Civil Registrar</div>
                <div class="signature-line"></div>
                <div class="field-label">Signature (ፊርማ)</div>
            </div>
            <div class="signature-box">
                <div class="field-label">Date of Certificate Issued (የምስክር ወረቀት የተሰጠበት ቀን):</div>
                <div class="field-value">${issueDate.day}/${issueDate.month}/${issueDate.year}</div>
                <div class="signature-line"></div>
                <div class="field-label">Official Seal (ማሕተም)</div>
            </div>
        </div>
        
        <!-- Official Seal -->
        <div class="official-seal">
            <div style="font-size: 5px; line-height: 0.9;">
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
}

// Helper functions for certificate types
function getCertificateTypeAmharic(eventType) {
  switch (eventType) {
    case 'birth': return 'የልደት ምስክር ወረቀት';
    case 'marriage': return 'የጋብቻ ምስክር ወረቀት';
    case 'death': return 'የሞት ምስክር ወረቀት';
    case 'divorce': return 'የፍቺ ምስክር ወረቀት';
    default: return 'ምስክር ወረቀት';
  }
}

function getCertificateTypeEnglish(eventType) {
  switch (eventType) {
    case 'birth': return 'Birth Certificate';
    case 'marriage': return 'Marriage Certificate';
    case 'death': return 'Death Certificate';
    case 'divorce': return 'Divorce Certificate';
    default: return 'Certificate';
  }
}

function formatDate(dateString) {
  if (!dateString) return { day: '', month: '', year: '' };
  const date = new Date(dateString);
  return {
    day: date.getDate().toString().padStart(2, '0'),
    month: (date.getMonth() + 1).toString().padStart(2, '0'),
    year: date.getFullYear()
  };
}

function getSexAmharic(sex) {
  switch (sex.toLowerCase()) {
    case 'male': return 'ወንድ';
    case 'female': return 'ሴት';
    default: return sex;
  }
}

function getMonthAmharic(monthNumber) {
  const month = parseInt(monthNumber) || 1;
  const amharicMonths = [
    'መስከረም', 'ጥቅምት', 'ሕዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
    'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ'
  ];
  return amharicMonths[month - 1] || '';
}

function generateEventSpecificContent(event, data) {
  switch (event.type) {
    case 'birth':
      const birthDate = formatDate(data.birthDate);
      return `
        <div class="two-column">
          <div class="column">
            <div class="field-row">
              <div class="field-label">Child's Name / የልጅ ስም:</div>
              <div class="field-value">${data.childNameEn || data.childNameAm || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Father's Name / የአባት ስም:</div>
              <div class="field-value">${data.fatherNameEn || data.fatherNameAm || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Mother's Name / የእናት ስም:</div>
              <div class="field-value">${data.motherNameEn || data.motherNameAm || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Sex / ጾታ:</div>
              <div class="field-value">${data.sex || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Date of Birth / የትውልድ ቀን:</div>
              <div class="date-fields">
                <div class="date-field">${birthDate.day}</div>
                <div class="date-field">${birthDate.month}</div>
                <div class="date-field">${birthDate.year}</div>
              </div>
            </div>
            <div class="field-row">
              <div class="field-label">Place of Birth / የትውልድ ቦታ:</div>
              <div class="field-value">${data.birthPlace || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Nationality / ዜግነት:</div>
              <div class="field-value">${data.nationality || 'Ethiopian'}</div>
            </div>
          </div>
          <div class="column">
            <div class="field-row">
              <div class="field-label">Religion / ሃይማኖት:</div>
              <div class="field-value">${data.religion || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Type of Birth / የትውልድ አይነት:</div>
              <div class="field-value">${data.birthType || 'Single'}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Weight / ክብደት:</div>
              <div class="field-value">${data.weight || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Length / ርዝመት:</div>
              <div class="field-value">${data.length || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Blood Group / የደም ምድብ:</div>
              <div class="field-value">${data.bloodGroup || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Special Marks / ልዩ ምልክቶች:</div>
              <div class="field-value">${data.specialMarks || ''}</div>
            </div>
          </div>
        </div>
      `;
          
    case 'marriage':
      const marriageDate = formatDate(data.marriageDate);
      return `
        <div class="two-column">
          <div class="column">
            <div class="field-row">
              <div class="field-label">Wife's Name / የሚስት ስም:</div>
              <div class="field-value">${data.wifeNameEn || data.wifeNameAm || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Wife's Father's Name / የሚስት አባት ስም:</div>
              <div class="field-value">${data.wifeFatherName || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Wife's Grandfather's Name / የሚስት አያት ስም:</div>
              <div class="field-value">${data.wifeGrandfatherName || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Wife's Date of Birth / የሚስት የትውልድ ቀን:</div>
              <div class="date-fields">
                <div class="date-field">${formatDate(data.wifeBirthDate).day}</div>
                <div class="date-field">${formatDate(data.wifeBirthDate).month}</div>
                <div class="date-field">${formatDate(data.wifeBirthDate).year}</div>
              </div>
            </div>
            <div class="field-row">
              <div class="field-label">Wife's Nationality / የሚስት ዜግነት:</div>
              <div class="field-value">${data.wifeNationality || 'Ethiopian'}</div>
            </div>
          </div>
          <div class="column">
            <div class="field-row">
              <div class="field-label">Husband's Name / የባል ስም:</div>
              <div class="field-value">${data.husbandNameEn || data.husbandNameAm || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Husband's Father's Name / የባል አባት ስም:</div>
              <div class="field-value">${data.husbandFatherName || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Husband's Grandfather's Name / የባል አያት ስም:</div>
              <div class="field-value">${data.husbandGrandfatherName || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Husband's Date of Birth / የባል የትውልድ ቀን:</div>
              <div class="date-fields">
                <div class="date-field">${formatDate(data.husbandBirthDate).day}</div>
                <div class="date-field">${formatDate(data.husbandBirthDate).month}</div>
                <div class="date-field">${formatDate(data.husbandBirthDate).year}</div>
              </div>
            </div>
            <div class="field-row">
              <div class="field-label">Husband's Nationality / የባል ዜግነት:</div>
              <div class="field-value">${data.husbandNationality || 'Ethiopian'}</div>
            </div>
          </div>
        </div>
        <div class="field-row">
          <div class="field-label">Date of Marriage / የጋብቻ ቀን:</div>
          <div class="date-fields">
            <div class="date-field">${marriageDate.day}</div>
            <div class="date-field">${marriageDate.month}</div>
            <div class="date-field">${marriageDate.year}</div>
          </div>
        </div>
        <div class="field-row">
          <div class="field-label">Place of Marriage / የጋብቻ ቦታ:</div>
          <div class="field-value">${data.marriagePlace || ''}</div>
        </div>
      `;
          
    case 'death':
      const deathDate = formatDate(data.deathDate);
      return `
        <div class="field-row">
          <div class="field-label">Deceased Name / የሞተው ስም:</div>
          <div class="field-value">${data.deceasedNameEn || data.deceasedNameAm || ''}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Sex / ጾታ:</div>
          <div class="field-value">${data.sex || ''}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Date of Birth / የትውልድ ቀን:</div>
          <div class="date-fields">
            <div class="date-field">${formatDate(data.birthDate).day}</div>
            <div class="date-field">${formatDate(data.birthDate).month}</div>
            <div class="date-field">${formatDate(data.birthDate).year}</div>
          </div>
        </div>
        <div class="field-row">
          <div class="field-label">Place of Birth / የትውልድ ቦታ:</div>
          <div class="field-value">${data.birthPlace || ''}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Nationality / ዜግነት:</div>
          <div class="field-value">${data.nationality || 'Ethiopian'}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Religion / ሃይማኖት:</div>
          <div class="field-value">${data.religion || ''}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Occupation / ሙያ:</div>
          <div class="field-value">${data.occupation || ''}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Marital Status / የጋብቻ ሁኔታ:</div>
          <div class="field-value">${data.maritalStatus || ''}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Father's Name / የአባት ስም:</div>
          <div class="field-value">${data.fatherNameEn || data.fatherNameAm || ''}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Mother's Name / የእናት ስም:</div>
          <div class="field-value">${data.motherNameEn || data.motherNameAm || ''}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Date of Death / የሞት ቀን:</div>
          <div class="date-fields">
            <div class="date-field">${deathDate.day}</div>
            <div class="date-field">${deathDate.month}</div>
            <div class="date-field">${deathDate.year}</div>
          </div>
        </div>
        <div class="field-row">
          <div class="field-label">Place of Death / የሞት ቦታ:</div>
          <div class="field-value">${data.deathPlace || ''}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Cause of Death / የሞት ምክንያት:</div>
          <div class="field-value">${data.causeOfDeath || ''}</div>
        </div>
      `;
          
    case 'divorce':
      const divorceDate = formatDate(data.divorceDate);
      return `
        <div class="two-column">
          <div class="column">
            <div class="field-row">
              <div class="field-label">Spouse 1 Name / የመጀመሪያ ሚስት/ባል ስም:</div>
              <div class="field-value">${data.divorceSpouse1NameEn || data.divorceSpouse1NameAm || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Spouse 1 Date of Birth / የመጀመሪያ ሚስት/ባል የትውልድ ቀን:</div>
              <div class="date-fields">
                <div class="date-field">${formatDate(data.spouse1BirthDate).day}</div>
                <div class="date-field">${formatDate(data.spouse1BirthDate).month}</div>
                <div class="date-field">${formatDate(data.spouse1BirthDate).year}</div>
              </div>
            </div>
            <div class="field-row">
              <div class="field-label">Spouse 1 Place of Birth / የመጀመሪያ ሚስት/ባል የትውልድ ቦታ:</div>
              <div class="field-value">${data.spouse1BirthPlace || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Spouse 1 Nationality / የመጀመሪያ ሚስት/ባል ዜግነት:</div>
              <div class="field-value">${data.spouse1Nationality || 'Ethiopian'}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Spouse 1 Religion / የመጀመሪያ ሚስት/ባል ሃይማኖት:</div>
              <div class="field-value">${data.spouse1Religion || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Spouse 1 Occupation / የመጀመሪያ ሚስት/ባል ሙያ:</div>
              <div class="field-value">${data.spouse1Occupation || ''}</div>
            </div>
          </div>
          <div class="column">
            <div class="field-row">
              <div class="field-label">Spouse 2 Name / የሁለተኛ ሚስት/ባል ስም:</div>
              <div class="field-value">${data.divorceSpouse2NameEn || data.divorceSpouse2NameAm || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Spouse 2 Date of Birth / የሁለተኛ ሚስት/ባል የትውልድ ቀን:</div>
              <div class="date-fields">
                <div class="date-field">${formatDate(data.spouse2BirthDate).day}</div>
                <div class="date-field">${formatDate(data.spouse2BirthDate).month}</div>
                <div class="date-field">${formatDate(data.spouse2BirthDate).year}</div>
              </div>
            </div>
            <div class="field-row">
              <div class="field-label">Spouse 2 Place of Birth / የሁለተኛ ሚስት/ባል የትውልድ ቦታ:</div>
              <div class="field-value">${data.spouse2BirthPlace || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Spouse 2 Nationality / የሁለተኛ ሚስት/ባል ዜግነት:</div>
              <div class="field-value">${data.spouse2Nationality || 'Ethiopian'}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Spouse 2 Religion / የሁለተኛ ሚስት/ባል ሃይማኖት:</div>
              <div class="field-value">${data.spouse2Religion || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Spouse 2 Occupation / የሁለተኛ ሚስት/ባል ሙያ:</div>
              <div class="field-value">${data.spouse2Occupation || ''}</div>
            </div>
          </div>
        </div>
        <div class="field-row">
          <div class="field-label">Date of Marriage / የጋብቻ ቀን:</div>
          <div class="date-fields">
            <div class="date-field">${formatDate(data.marriageDate).day}</div>
            <div class="date-field">${formatDate(data.marriageDate).month}</div>
            <div class="date-field">${formatDate(data.marriageDate).year}</div>
          </div>
        </div>
        <div class="field-row">
          <div class="field-label">Place of Marriage / የጋብቻ ቦታ:</div>
          <div class="field-value">${data.marriagePlace || ''}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Date of Divorce / የፍቺ ቀን:</div>
          <div class="date-fields">
            <div class="date-field">${divorceDate.day}</div>
            <div class="date-field">${divorceDate.month}</div>
            <div class="date-field">${divorceDate.year}</div>
          </div>
        </div>
        <div class="field-row">
          <div class="field-label">Place of Divorce / የፍቺ ቦታ:</div>
          <div class="field-value">${data.divorcePlace || ''}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Reason for Divorce / የፍቺ ምክንያት:</div>
          <div class="field-value">${data.divorceReason || ''}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Number of Children / የልጆች ብዛት:</div>
          <div class="field-value">${data.numberOfChildren || ''}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Children's Names / የልጆች ስሞች:</div>
          <div class="field-value">${data.childrenNames || ''}</div>
        </div>
      `;
          
    default:
      return `
        <div class="field-row">
          <div class="field-label">Event Type / የክስተት አይነት:</div>
          <div class="field-value">${event.type}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Registration Number / የምዝገባ ቁጥር:</div>
          <div class="field-value">${event.registrationId}</div>
        </div>
      `;
  }
}
