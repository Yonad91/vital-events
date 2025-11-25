import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ETHIOPIAN_MONTHS_EN = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehasse', 'Pagumen'
];

const ETHIOPIAN_MONTHS_AM = [
  'መስከረም', 'ጥቅምት', 'ህዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሀምሌ', 'ነሐሴ', 'ጳጉሜን'
];

const GREGORIAN_MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const GREGORIAN_MONTHS_AM = [
  'ጃንዋሪ', 'ፌብሩወሪ', 'ማርች', 'ኤፕሪል', 'ሜይ', 'ጁን',
  'ጁላይ', 'ኦገስት', 'ሴፕቴምበር', 'ኦክቶበር', 'ኖቬምበር', 'ዲሴምበር'
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ExactTemplateCertificateService {
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
    
    console.log('📁 ExactTemplateCertificateService initialized:');
    console.log(`   Templates: ${this.templatesPath}`);
    console.log(`   Certificates: ${this.certificatesPath}`);
    console.log(`   Uploads: ${this.uploadsPath}`);
  }

  async generateCertificate(event, certificateRequest, requesterUser) {
    try {
      const certificateType = event.type;
      const certificateId = `CERT-${event._id}-${Date.now()}`;
      
      console.log('🎯 Starting exact template certificate generation...');
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
      console.log('📸 Photos in certificate data:', {
        primary: certificateData.photos?.primary ? '✅ Found' : '❌ Missing',
        secondary: certificateData.photos?.secondary ? '✅ Found' : '❌ Missing',
        primaryPath: certificateData.photos?.primary || 'N/A',
        secondaryPath: certificateData.photos?.secondary || 'N/A'
      });
      
      // Generate HTML template with exact Ethiopian format
      console.log('📄 Generating exact template HTML...');
      const externalTemplate = this.loadExternalTemplate(certificateType);
      const htmlTemplate = externalTemplate
        ? this.renderTemplate(externalTemplate, certificateData, qrCodeDataUrl, certificateType)
        : this.generateExactTemplateHTML(certificateType, certificateData, qrCodeDataUrl);
      console.log('✅ Exact template HTML generated');
      
      // Try to generate PDF
      let pdfPath;
      try {
        console.log('🔄 Attempting PDF generation...');
        pdfPath = await this.generatePDF(htmlTemplate, certificateId, certificateType);
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
      console.error('❌ Error generating exact template certificate:', error);
      throw error;
    }
  }
  loadExternalTemplate(certificateType) {
    try {
      const filename = `${certificateType}.html`;
      const templatePath = path.join(this.templatesPath, filename);
      if (fs.existsSync(templatePath)) {
        return fs.readFileSync(templatePath, 'utf-8');
      }
      return null;
    } catch (e) {
      console.warn('⚠️ Failed to load external template:', e.message);
      return null;
    }
  }

  renderTemplate(template, data, qrCodeDataUrl, certificateType) {
    // Support {{field}} placeholders and a few special tokens
    let html = template;

    // Inject QR image
    html = html.replace(/{{\s*qrCode\s*}}/g, `<img src="${qrCodeDataUrl}" alt="QR Code">`);

    // Inject optional background image base path and uploads base path
    const bgBase = `file://${path.join(this.templatesPath, 'assets')}`.replace(/\\/g, '/');
    const uploadsBase = `file://${this.uploadsPath}`.replace(/\\/g, '/');
    html = html.replace(/{{\s*assetsBase\s*}}/g, bgBase);
    html = html.replace(/{{\s*uploadsBase\s*}}/g, uploadsBase);
    html = html.replace(/{{\s*certificateType\s*}}/g, certificateType);

    // Replace image fields with base64 data URLs for PDF compatibility
    const photos = data.photos || {};
    console.log('🖼️ [renderTemplate] Processing photos:', {
      hasPrimary: !!photos.primary,
      hasSecondary: !!photos.secondary,
      primaryPath: photos.primary || 'N/A',
      secondaryPath: photos.secondary || 'N/A'
    });
    
    const toBase64 = (photoPath, label) => {
      if (!photoPath) {
        console.log(`  ⚠️ [renderTemplate] No ${label} photo path provided`);
        return '';
      }
      // If already a data URL or HTTP URL, return as-is
      if (this.looksLikeDataUrl(photoPath)) {
        console.log(`  ✅ [renderTemplate] ${label} photo is already a data URL`);
        return photoPath;
      }
      if (this.looksLikeHttpUrl(photoPath)) {
        console.log(`  ⚠️ [renderTemplate] ${label} photo is an HTTP URL: ${photoPath}`);
        return photoPath;
      }
      // Convert file path to base64
      console.log(`  🔄 [renderTemplate] Converting ${label} photo to base64: ${photoPath}`);
      const base64 = this.base64EncodeImage(photoPath);
      if (base64) {
        console.log(`  ✅ [renderTemplate] ${label} photo encoded successfully (${base64.length} chars, starts with: ${base64.substring(0, 50)}...)`);
      } else {
        console.error(`  ❌ [renderTemplate] Failed to encode ${label} photo: ${photoPath}`);
      }
      return base64 || '';
    };
    
    const photoPrimaryBase64 = toBase64(photos.primary, 'primary');
    const photoSecondaryBase64 = toBase64(photos.secondary, 'secondary');
    
    const resolved = {
      photoPrimary: photoPrimaryBase64,
      photoSecondary: photoSecondaryBase64,
      photoPrimaryDisplay: photos.primary ? 'block' : 'none',
      photoPlaceholderDisplay: photos.primary ? 'none' : 'block'
    };

    console.log('🖼️ [renderTemplate] Resolved photo values:', {
      photoPrimaryLength: resolved.photoPrimary.length,
      photoSecondaryLength: resolved.photoSecondary.length,
      photoPrimaryDisplay: resolved.photoPrimaryDisplay,
      photoPlaceholderDisplay: resolved.photoPlaceholderDisplay
    });

    // Flatten data for replacement
    const flat = { ...data, ...resolved };

    // Count how many photo placeholders are in the template
    const photoPlaceholderCount = (html.match(/{{\s*photo(?:Primary|Secondary|Display|Placeholder)\s*}}/g) || []).length;
    console.log(`🖼️ [renderTemplate] Found ${photoPlaceholderCount} photo placeholders in template`);

    html = html.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (m, key) => {
      const value = flat[key];
      if (key.includes('photo') || key.includes('Photo')) {
        console.log(`  🔄 [renderTemplate] Replacing {{${key}}} with value length: ${value ? value.length : 0}`);
      }
      return (value === undefined || value === null) ? '' : String(value);
    });

    // Verify photo was replaced
    const remainingPhotoPlaceholders = (html.match(/{{\s*photo(?:Primary|Secondary|Display|Placeholder)\s*}}/g) || []).length;
    if (remainingPhotoPlaceholders > 0) {
      console.error(`❌ [renderTemplate] Warning: ${remainingPhotoPlaceholders} photo placeholders were NOT replaced!`);
    } else {
      console.log(`✅ [renderTemplate] All photo placeholders replaced successfully`);
    }

    return html;
  }


  extractCertificateData(event, certificateRequest, requesterUser) {
    const data = event.data || {};
    const registrationDateRaw = event?.createdAt ? new Date(event.createdAt) : null;
    const issueDateRaw = new Date();
    const baseData = {
      certificateId: `CERT-${event._id}-${Date.now()}`,
      registrationNumber: event.registrationId || event._id,
      registrationDate: this.formatDate(registrationDateRaw),
      registrationDateRaw,
      issueDate: this.formatDate(issueDateRaw),
      issueDateRaw,
      registrarName: event.registrarId?.name || 'Civil Registrar',
      // Extract photos from event data and certificate request
      photos: this.extractPhotos(event, certificateRequest)
    };

    switch (event.type) {
      case 'birth': {
        // Get raw values
        const childNationalityRaw = data.childNationality || data.nationality || 'Ethiopian';
        const motherNationalityRaw = data.motherNationality || data.nationality || 'Ethiopian';
        const fatherNationalityRaw = data.fatherNationality || data.nationality || 'Ethiopian';
        const childSexRaw = data.childSex || data.sex || '';
        
        // Grandfather name - check all possible field names
        const grandfatherNameEn = data.grandfatherNameEn || data.childGrandfatherNameEn || data.fatherGrandfatherNameEn || 
                                 data.grandfatherName || data.childGrandfatherName || data.fatherGrandfatherName || '';
        const grandfatherNameAm = data.grandfatherNameAm || data.childGrandfatherNameAm || data.fatherGrandfatherNameAm || 
                                 data.grandfatherNameAmharic || data.childGrandfatherNameAmharic || '';
        
        // Birth place - check all possible field names
        const birthPlaceEn = data.placeOfBirthEn || data.childBirthPlace || data.birthPlace || data.birthPlaceCity || 
                          data.city || data.birthCity || data.placeOfBirth || data.countryOfBirth || '';
        const birthPlaceAm = data.placeOfBirthAm || data.childBirthPlaceAm || data.birthPlaceAm || 
                            data.birthPlaceCityAm || data.cityAm || data.birthCityAm || data.placeOfBirthAmharic || '';
        
        // Mother's full name - check all possible field names
        const motherNameEn = data.motherFullNameEn || data.motherNameEn || data.motherFullName || data.motherName || '';
        const motherNameAm = data.motherFullNameAm || data.motherNameAm || data.motherFullNameAmharic || data.motherNameAmharic || '';
        
        const registrationRegionEn = data.registrationRegion || data.region || data.birthRegion || '';
        const registrationRegionAm = data.registrationRegionAm || data.regionAm || data.birthRegionAm || '';
        const registrationZoneEn = data.registrationZone || data.zone || data.birthZone || '';
        const registrationZoneAm = data.registrationZoneAm || data.zoneAm || data.birthZoneAm || '';
        const registrationWoredaEn = data.registrationWoreda || data.woreda || data.birthWoreda || '';
        const registrationWoredaAm = data.registrationWoredaAm || data.woredaAm || data.birthWoredaAm || '';
        
        // Ensure bilingual fields using translation functions
        const childSexBilingual = this.ensureBilingual(
          this.toEnglishSex(childSexRaw),
          this.toAmharicSex(childSexRaw),
          (val) => this.toAmharicSex(val)
        );
        
        const childNationalityBilingual = this.ensureBilingual(
          this.toEnglishNationality(childNationalityRaw),
          this.toAmharicNationality(childNationalityRaw),
          (val) => this.toAmharicNationality(val)
        );
        
        const motherNationalityBilingual = this.ensureBilingual(
          this.toEnglishNationality(motherNationalityRaw),
          this.toAmharicNationality(motherNationalityRaw),
          (val) => this.toAmharicNationality(val)
        );
        
        const fatherNationalityBilingual = this.ensureBilingual(
          this.toEnglishNationality(fatherNationalityRaw),
          this.toAmharicNationality(fatherNationalityRaw),
          (val) => this.toAmharicNationality(val)
        );
        
        const birthPlaceBilingual = this.ensureBilingual(
          birthPlaceEn,
          birthPlaceAm,
          (val) => this.translatePlaceToAmharic(val)
        );
        
        const registrationRegionBilingual = this.ensureBilingual(
          registrationRegionEn,
          registrationRegionAm,
          (val) => this.translatePlaceToAmharic(val)
        );
        
        const registrationZoneBilingual = this.ensureBilingual(
          registrationZoneEn,
          registrationZoneAm,
          (val) => this.translatePlaceToAmharic(val)
        );
        
        const registrationWoredaBilingual = this.ensureBilingual(
          registrationWoredaEn,
          registrationWoredaAm,
          (val) => this.translatePlaceToAmharic(val)
        );
        
        // Get dates and convert to both calendars
        const birthDateInput = data.childBirthDate || data.birthDate || data.dateOfBirth;
        
        // Birth date: The original birth date is ALWAYS in Ethiopian calendar (E.C)
        // - E.C: Original Ethiopian date (placed before Amharic label)
        // - G.C: Converted Gregorian date (placed before English label)
        let birthDateEcOriginal = null;
        let birthDateGcConverted = null;
        
        if (birthDateInput) {
          try {
            const birthDateResult = this.computeDualDates(birthDateInput, true); // true = Ethiopian input
            birthDateEcOriginal = birthDateResult.ec; // Original E.C date
            birthDateGcConverted = birthDateResult.gc; // Converted G.C date
            console.log('📅 Birth date conversion:', {
              input: birthDateInput,
              ec: birthDateEcOriginal,
              gc: birthDateGcConverted
            });
          } catch (error) {
            console.error('❌ Error converting birth date:', error);
            console.error('Birth date input:', birthDateInput);
          }
        } else {
          console.warn('⚠️ No birth date input found');
        }
        
        // Registration date: The original registered date is ALWAYS in Ethiopian calendar (E.C)
        // Priority: explicit Ethiopian date > general registration date > convert event.createdAt from GC to EC
        let registrationDateEcOriginal = null;
        let registrationDateGcConverted = null;
        
        if (data.registrationDateEth || data.registrationDate) {
          // We have an explicit Ethiopian date - this is the original E.C date
          const registrationDateInput = data.registrationDateEth || data.registrationDate;
          const result = this.computeDualDates(registrationDateInput, true); // true = Ethiopian input
          registrationDateEcOriginal = result.ec; // Original E.C date
          registrationDateGcConverted = result.gc; // Converted G.C date
        } else if (event.createdAt) {
          // Fallback: convert event.createdAt (Gregorian) to get the E.C equivalent
          const result = this.computeDualDates(event.createdAt, false); // false = Gregorian input
          registrationDateEcOriginal = result.ec; // Converted E.C date (treated as "original")
          registrationDateGcConverted = result.gc; // Original G.C date
        }
        
        // Issue date: Current date is always in Gregorian calendar (G.C)
        const issueDateInput = data.issueDate || data.certificateDate || new Date();
        const issueDateResult = this.computeDualDates(issueDateInput, false); // false = Gregorian input
        const issueDateEcConverted = issueDateResult.ec; // Converted E.C date
        const issueDateGcOriginal = issueDateResult.gc; // Original G.C date
        
        // Format dates for display (DD/MM/YYYY format)
        const birthDateDisplay = this.formatDateDual(birthDateInput, true);
        const registrationDateDisplay = registrationDateEcOriginal && registrationDateGcConverted 
          ? this.formatDateDual(data.registrationDateEth || data.registrationDate || event.createdAt, 
              !!(data.registrationDateEth || data.registrationDate))
          : '';
        const issueDateDisplay = this.formatDateDual(issueDateInput, false);
        
        // Format dates as DD/MM/YYYY for labels
        const formatDateNumeric = (dateStr) => {
          if (!dateStr) return '';
          const [year, month, day] = dateStr.split('-').map((part) => parseInt(part, 10));
          if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) return '';
          return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
        };
        
        // Birth date:
        // - E.C: Original Ethiopian date (placed before Amharic label)
        // - G.C: Converted Gregorian date (placed before English label)
        const birthDateEc = formatDateNumeric(birthDateEcOriginal);
        const birthDateGc = formatDateNumeric(birthDateGcConverted);
        
        // Registration date: 
        // - E.C: Original registered date in Ethiopian calendar (placed before Amharic label)
        // - G.C: Converted Gregorian date (placed before English label)
        const registrationDateEc = formatDateNumeric(registrationDateEcOriginal);
        const registrationDateGc = formatDateNumeric(registrationDateGcConverted);
        
        // Issue date:
        // - E.C: Converted Ethiopian date (placed before Amharic label)
        // - G.C: Original Gregorian date (placed before English label)
        const issueDateEc = formatDateNumeric(issueDateEcConverted);
        const issueDateGc = formatDateNumeric(issueDateGcOriginal);
        
        const registrarTripleNameAm = [
          data.registrarNameAm, data.registrarFatherNameAm, data.registrarGrandNameAm
        ].filter(Boolean).join(" ");
        
        return {
          ...baseData,
          type: 'Birth Certificate',
          typeAmharic: 'የልደት ምስክር ወረቀት',
          // Child information
          childName: data.childFullNameEn || data.childNameEn || data.childFullNameAm || data.childNameAm || '',
          childNameAmharic: data.childFullNameAm || data.childNameAm || data.childFullNameEn || data.childNameEn || '',
          childFatherName: data.fatherFullNameEn || data.fatherNameEn || data.childFatherNameEn || data.fatherFullNameAm || data.fatherNameAm || data.childFatherNameAm || '',
          childFatherNameAmharic: data.fatherFullNameAm || data.fatherNameAm || data.childFatherNameAm || data.fatherFullNameEn || data.fatherNameEn || data.childFatherNameEn || '',
          childGrandfatherName: grandfatherNameEn,
          childGrandfatherNameAmharic: grandfatherNameAm || grandfatherNameEn,
          // Sex - always bilingual
          childSex: childSexBilingual.en,
          childSexAmharic: childSexBilingual.am,
          childBirthDate: birthDateDisplay,
          childBirthDateEc: birthDateEc, // Original E.C date (before Amharic label)
          childBirthDateGc: birthDateGc, // Converted G.C date (before English label)
          // Birth place - always bilingual
          childBirthPlace: birthPlaceBilingual.en,
          childBirthPlaceAmharic: birthPlaceBilingual.am,
          // Nationality - always bilingual
          childNationality: childNationalityBilingual.en,
          childNationalityAmharic: childNationalityBilingual.am,
          // Mother information
          motherName: motherNameEn,
          motherNameAmharic: motherNameAm || motherNameEn,
          motherFatherName: data.motherFatherNameEn || data.motherFatherNameAm || data.motherFatherFullNameEn || data.motherFatherFullNameAm || '',
          motherFatherNameAmharic: data.motherFatherNameAm || data.motherFatherNameEn || data.motherFatherFullNameAm || data.motherFatherFullNameEn || '',
          motherGrandfatherName: data.motherGrandfatherNameEn || data.motherGrandfatherNameAm || '',
          motherGrandfatherNameAmharic: data.motherGrandfatherNameAm || data.motherGrandfatherNameEn || '',
          // Mother nationality - always bilingual
          motherNationality: motherNationalityBilingual.en,
          motherNationalityAmharic: motherNationalityBilingual.am,
          // Father information
          fatherName: data.fatherFullNameEn || data.fatherNameEn || data.childFatherNameEn || data.fatherFullNameAm || data.fatherNameAm || data.childFatherNameAm || '',
          fatherNameAmharic: data.fatherFullNameAm || data.fatherNameAm || data.childFatherNameAm || data.fatherFullNameEn || data.fatherNameEn || data.childFatherNameEn || '',
          // Father nationality - always bilingual
          fatherNationality: fatherNationalityBilingual.en,
          fatherNationalityAmharic: fatherNationalityBilingual.am,
          // Registration details - always bilingual
          registrationRegion: registrationRegionBilingual.en,
          registrationRegionAmharic: registrationRegionBilingual.am,
          registrationZone: registrationZoneBilingual.en,
          registrationZoneAmharic: registrationZoneBilingual.am,
          registrationCity: data.registrationCity || data.city || data.birthCity || data.birthPlaceCity || '',
          registrationCityAmharic: data.registrationCityAm || data.cityAm || data.birthCityAm || this.translatePlaceToAmharic(data.registrationCity || data.city || data.birthCity || data.birthPlaceCity || '') || '',
          registrationSubCity: data.registrationSubCity || data.subCity || data.birthSubCity || data.birthPlaceSubCity || '',
          registrationSubCityAmharic: data.registrationSubCityAm || data.subCityAm || data.birthSubCityAm || this.translatePlaceToAmharic(data.registrationSubCity || data.subCity || data.birthSubCity || data.birthPlaceSubCity || '') || '',
          registrationWoreda: registrationWoredaBilingual.en,
          registrationWoredaAmharic: registrationWoredaBilingual.am,
          registrationKebele: data.registrationKebele || data.kebele || data.birthKebele || data.birthPlaceKebele || '',
          registrationKebeleAmharic: data.registrationKebeleAm || data.kebeleAm || data.birthKebeleAm || '',
          // Dates with dual calendar support
          registrationDate: registrationDateDisplay,
          registrationDateEc: registrationDateEc, // Original E.C date (before Amharic label)
          registrationDateGc: registrationDateGc, // Converted G.C date (before English label)
          issueDate: issueDateDisplay,
          issueDateEc: issueDateEc, // Converted E.C date (before Amharic label)
          issueDateGc: issueDateGc, // Original G.C date (before English label)
          registrarName: registrarTripleNameAm
        };
      }

      case 'marriage': {
        const toPlacePair = (enValue, amValue) =>
          this.ensureBilingual(
            enValue,
            amValue,
            (val) => this.translatePlaceToAmharic(val)
          );

        const regRegionPair = toPlacePair(
          data.registrationRegion || data.region || data.marriageRegion || '',
          data.registrationRegionAm || data.regionAm || data.marriageRegionAm || ''
        );
        const regZonePair = toPlacePair(
          data.registrationZone || data.zone || data.marriageZone || '',
          data.registrationZoneAm || data.zoneAm || data.marriageZoneAm || ''
        );
        const regCityPair = toPlacePair(
          data.registrationCity || data.city || data.marriageCity || '',
          data.registrationCityAm || data.cityAm || data.marriageCityAm || ''
        );
        const regSubCityPair = toPlacePair(
          data.registrationSubCity || data.subCity || data.marriageSubCity || '',
          data.registrationSubCityAm || data.subCityAm || data.marriageSubCityAm || ''
        );
        const regWoredaPair = toPlacePair(
          data.registrationWoreda || data.woreda || data.marriageWoreda || '',
          data.registrationWoredaAm || data.woredaAm || data.marriageWoredaAm || ''
        );
        const regKebelePair = toPlacePair(
          data.registrationKebele || data.kebele || data.marriageKebele || '',
          data.registrationKebeleAm || data.kebeleAm || data.marriageKebeleAm || ''
        );

        const wifeBirthDisplay = this.formatDualDateForDisplay(
          data.wifeBirthDate || data.birthDate || data.wifeBirthDateGc || data.wifeBirthDateEc
        );
        const husbandBirthDisplay = this.formatDualDateForDisplay(
          data.husbandBirthDate || data.birthDate || data.husbandBirthDateGc || data.husbandBirthDateEc
        );
        const marriageDateDisplay = this.formatDualDateForDisplay(data.marriageDate);
        const marriageRegDisplay = this.formatDualDateForDisplay(
          data.marriageRegistrationDate || data.registrationDate || baseData.registrationDateRaw
        );
        const issueDateDisplay = this.formatDualDateForDisplay(baseData.issueDateRaw);
        
        // Format dates as DD/MM/YYYY E.C / G.C for labels
        const formatDateNumeric = (dateInput, isEthiopianInput = null) => {
          if (!dateInput) return { ec: '', gc: '' };
          try {
            let result = null;
            if (isEthiopianInput === null) {
              try {
                result = this.computeDualDates(dateInput, false);
              } catch (e1) {
                try {
                  result = this.computeDualDates(dateInput, true);
                } catch (e2) {
                  return { ec: '', gc: '' };
                }
              }
            } else {
              result = this.computeDualDates(dateInput, isEthiopianInput);
            }
            
            if (!result || (!result.ec && !result.gc)) {
              return { ec: '', gc: '' };
            }
            
            const formatNumeric = (dateStr) => {
              if (!dateStr) return '';
              const [year, month, day] = dateStr.split('-').map((part) => parseInt(part, 10));
              if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) return '';
              return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
            };
            return {
              ec: formatNumeric(result.ec) || '',
              gc: formatNumeric(result.gc) || ''
            };
          } catch (e) {
            return { ec: '', gc: '' };
          }
        };
        
        const marriageRegistrationDateNumeric = formatDateNumeric(
          data.marriageRegistrationDate || data.registrationDate || baseData.registrationDateRaw,
          true
        );
        const issueDateNumeric = formatDateNumeric(baseData.issueDateRaw, false);

        const wifeNationalityEn = data.wifeNationality || data.nationality || 'Ethiopian';
        const husbandNationalityEn = data.husbandNationality || data.nationality || 'Ethiopian';

        const makeNamePair = (en, am) => this.ensureBilingual(en, am, (val) => val);
        const wifeNamePair = makeNamePair(
          data.wifeFullNameEn || data.wifeNameEn || data.wifeName || '',
          data.wifeFullNameAm || data.wifeNameAm || ''
        );
        const wifeFatherPair = makeNamePair(
          data.wifeFatherNameEn || data.wifeFatherEn || data.wifeFatherName || '',
          data.wifeFatherNameAm || data.wifeFatherAm || ''
        );
        const wifeGrandPair = makeNamePair(
          data.wifeGrandfatherNameEn || data.wifeGrandfatherEn || '',
          data.wifeGrandfatherNameAm || data.wifeGrandfatherAm || ''
        );

        const husbandNamePair = makeNamePair(
          data.husbandFullNameEn || data.husbandNameEn || data.husbandName || '',
          data.husbandFullNameAm || data.husbandNameAm || ''
        );
        const husbandFatherPair = makeNamePair(
          data.husbandFatherNameEn || data.husbandFatherEn || data.husbandFatherName || '',
          data.husbandFatherNameAm || data.husbandFatherAm || ''
        );
        const husbandGrandPair = makeNamePair(
          data.husbandGrandfatherNameEn || data.husbandGrandfatherEn || '',
          data.husbandGrandfatherNameAm || data.husbandGrandfatherAm || ''
        );

        const wifeNationalityPair = this.ensureBilingual(
          wifeNationalityEn,
          data.wifeNationalityAm || '',
          (val) => this.toAmharicNationality(val)
        );
        const husbandNationalityPair = this.ensureBilingual(
          husbandNationalityEn,
          data.husbandNationalityAm || '',
          (val) => this.toAmharicNationality(val)
        );

        const registrarFirstEn = data.registrarNameEn || data.registrarName || baseData.registrarName || '';
        const registrarFirstAm = data.registrarNameAm || data.registrar_name_am || registrarFirstEn;
        const registrarFatherEn = data.registrarFatherNameEn || data.registrarFatherName || '';
        const registrarFatherAm = data.registrarFatherNameAm || data.registrarFatherName || registrarFatherEn;
        const registrarGrandEn = data.registrarGrandNameEn || data.registrarGrandName || '';
        const registrarGrandAm = data.registrarGrandNameAm || data.registrarGrandName || registrarGrandEn;

        const registrarFullNameEn = [registrarFirstEn, registrarFatherEn, registrarGrandEn].filter(Boolean).join(' ');
        const registrarFullNameAm = [registrarFirstAm, registrarFatherAm, registrarGrandAm].filter(Boolean).join(' ');

        return {
          ...baseData,
          type: 'Marriage Certificate',
          typeAmharic: 'የጋብቻ ምስክር ወረቀት',
          marriageRegisterFormNumber:
            data.marriageRegisterFormNumber ||
            data.registrationRecordFormNumber ||
            data.registrationFormNumber ||
            baseData.registrationNumber,
          wifeBirthRegistrationId:
            data.wifeBirthRegistrationId || data.wifeBirthRegId || data.wifeIdNumberAm || data.wifeIdNumber || '',
          husbandBirthRegistrationId:
            data.husbandBirthRegistrationId || data.husbandBirthRegId || data.husbandIdNumberAm || data.husbandIdNumber || '',
          // Wife information
          wifeName: wifeNamePair.en,
          wifeNameAmharic: wifeNamePair.am,
          wifeFatherName: wifeFatherPair.en,
          wifeFatherNameAmharic: wifeFatherPair.am,
          wifeGrandfatherName: wifeGrandPair.en,
          wifeGrandfatherNameAmharic: wifeGrandPair.am,
          wifeNationality: wifeNationalityPair.en,
          wifeNationalityAmharic: wifeNationalityPair.am,
          wifeBirthDateEcDisplay: wifeBirthDisplay.am,
          wifeBirthDateGcDisplay: wifeBirthDisplay.en,
          // Husband information
          husbandName: husbandNamePair.en,
          husbandNameAmharic: husbandNamePair.am,
          husbandFatherName: husbandFatherPair.en,
          husbandFatherNameAmharic: husbandFatherPair.am,
          husbandGrandfatherName: husbandGrandPair.en,
          husbandGrandfatherNameAmharic: husbandGrandPair.am,
          husbandNationality: husbandNationalityPair.en,
          husbandNationalityAmharic: husbandNationalityPair.am,
          husbandBirthDateEcDisplay: husbandBirthDisplay.am,
          husbandBirthDateGcDisplay: husbandBirthDisplay.en,
          // Date sections
          marriageDateEcDisplay: marriageDateDisplay.am,
          marriageDateGcDisplay: marriageDateDisplay.en,
          marriageRegistrationDateEcDisplay: marriageRegDisplay.am,
          marriageRegistrationDateGcDisplay: marriageRegDisplay.en,
          marriageRegistrationDateEc: marriageRegistrationDateNumeric.ec,
          marriageRegistrationDateGc: marriageRegistrationDateNumeric.gc,
          issueDateEcDisplay: issueDateDisplay.am,
          issueDateGcDisplay: issueDateDisplay.en,
          issueDateEc: issueDateNumeric.ec,
          issueDateGc: issueDateNumeric.gc,
          // Location
          registrationRegion: regRegionPair.en,
          registrationRegionAmharic: regRegionPair.am,
          registrationZone: regZonePair.en,
          registrationZoneAmharic: regZonePair.am,
          registrationCity: regCityPair.en,
          registrationCityAmharic: regCityPair.am,
          registrationSubCity: regSubCityPair.en,
          registrationSubCityAmharic: regSubCityPair.am,
          registrationWoreda: regWoredaPair.en,
          registrationWoredaAmharic: regWoredaPair.am,
          registrationKebele: regKebelePair.en,
          registrationKebeleAmharic: regKebelePair.am,
          marriagePlace: data.marriagePlace || regCityPair.en,
          // Registrar details
          registrarName: registrarFullNameEn || baseData.registrarName,
          registrarNameAmharic: registrarFullNameAm || registrarFirstAm,
          registrarFatherName: registrarFatherEn,
          registrarFatherNameAmharic: registrarFatherAm,
          registrarGrandName: registrarGrandEn,
          registrarGrandNameAmharic: registrarGrandAm,
          registrarFullNameEn,
          registrarFullNameAmharic: registrarFullNameAm,
          registrarIdNumber: data.registrarIdNumber || data.registrarID || '',
          // Preserve legacy fields for downstream consumers
          marriageDate: this.formatDate(data.marriageDate),
          marriageRegistrationDate: this.formatDate(data.marriageRegistrationDate || event.createdAt),
          marriageType: data.marriageType || 'Civil'
        };
      }

      case 'death': {
        const registrarFirst = data.registrarNameEn || data.registrarName || data.registrar_first_name || '';
        const registrarFather = data.registrarFatherNameEn || data.registrarFatherName || data.registrar_father_name || '';
        const registrarGrand = data.registrarGrandNameEn || data.registrarGrandName || data.registrar_grand_name || '';
        const registrarComposed = [registrarFirst, registrarFather, registrarGrand].filter(Boolean).join(' ');
        const registrarNameResolved = registrarComposed || baseData.registrarName || '';

        const registrarNamePair = this.ensureBilingual(
          registrarNameResolved,
          data.registrarNameAm || data.registrar_name_am || ''
        );
        const registrarFatherPair = this.ensureBilingual(
          registrarFather,
          data.registrarFatherNameAm || data.registrar_father_name_am || ''
        );
        const registrarGrandPair = this.ensureBilingual(
          registrarGrand,
          data.registrarGrandNameAm || data.registrar_grand_name_am || ''
        );

        const deceasedNamePair = this.ensureBilingual(
          data.deceasedFullNameEn || data.deceasedNameEn || data.deceasedName || '',
          data.deceasedFullNameAm || data.deceasedNameAm || ''
        );
        const deceasedFatherPair = this.ensureBilingual(
          data.deceasedFatherEn || data.deceasedFatherNameEn || data.deceasedFather || '',
          data.deceasedFatherAm || ''
        );
        const deceasedGrandPair = this.ensureBilingual(
          data.deceasedGrandfatherEn || data.deceasedGrandfatherNameEn || '',
          data.deceasedGrandfatherAm || ''
        );
        const deceasedTitlePair = this.ensureBilingual(
          data.deceasedTitleEn || data.deceasedTitle || '',
          data.deceasedTitleAm || ''
        );

        const birthPlacePair = this.ensureBilingual(
          data.deceasedBirthPlace || data.birthPlace || '',
          data.deceasedBirthPlaceAm || data.birthPlaceAm || '',
          (val) => this.translatePlaceToAmharic(val)
        );
        const deathCauseEnglishValues = [
          data.deathCauseEn,
          data.deathCause,
          data.causeOfDeath1En,
          data.causeOfDeath2En,
          data.causeOfDeath3En
        ].filter(Boolean);
        const deathCauseAmharicValues = [
          data.deathCauseAm,
          data.causeOfDeath1Am,
          data.causeOfDeath2Am,
          data.causeOfDeath3Am
        ].filter(Boolean);
        const deathCausePair = this.ensureBilingual(
          deathCauseEnglishValues.join(' / ') || deathCauseAmharicValues.join(' / '),
          deathCauseAmharicValues.join(' / '),
          (val) => val
        );
        const occupationPair = this.ensureBilingual(
          data.deceasedOccupationEn || data.deceasedOccupation || data.deceasedJob || data.occupation || '',
          data.deceasedOccupationAm || data.deceasedJobAm || ''
        );
        // Get registration location first (will be used as fallback for death location)
        const registrationRegionPair = this.ensureBilingual(
          data.registrationRegion || data.region || data.deathRegion || '',
          data.registrationRegionAm || data.regionAm || data.deathRegionAm || '',
          (val) => this.translatePlaceToAmharic(val)
        );
        const registrationZonePair = this.ensureBilingual(
          data.registrationZone || data.zone || data.deathZone || '',
          data.registrationZoneAm || data.zoneAm || data.deathZoneAm || '',
          (val) => this.translatePlaceToAmharic(val)
        );
        const registrationCityPair = this.ensureBilingual(
          data.registrationCity || data.city || data.deathCity || '',
          data.registrationCityAm || data.cityAm || data.deathCityAm || '',
          (val) => this.translatePlaceToAmharic(val)
        );
        const registrationSubCityPair = this.ensureBilingual(
          data.registrationSubCity || data.subCity || data.deathSubCity || '',
          data.registrationSubCityAm || data.subCityAm || data.deathSubCityAm || '',
          (val) => this.translatePlaceToAmharic(val)
        );
        const registrationWoredaPair = this.ensureBilingual(
          data.registrationWoreda || data.woreda || data.deathWoreda || '',
          data.registrationWoredaAm || data.woredaAm || data.deathWoredaAm || '',
          (val) => this.translatePlaceToAmharic(val)
        );
        const registrationKebelePair = this.ensureBilingual(
          data.registrationKebele || data.kebele || data.deathKebele || '',
          data.registrationKebeleAm || data.kebeleAm || data.deathKebeleAm || '',
          (val) => this.translatePlaceToAmharic(val)
        );
        
        // Death location - prioritize registration location (registered data) for death place fields
        // Use death location data if explicitly provided, otherwise use registration location
        const deathRegionPair = this.ensureBilingual(
          data.deathPlaceRegion || data.deathRegion || registrationRegionPair.en || '',
          data.deathPlaceRegionAm || data.deathRegionAm || registrationRegionPair.am || '',
          (val) => this.translatePlaceToAmharic(val)
        );
        const deathZonePair = this.ensureBilingual(
          data.deathPlaceZone || data.deathZone || registrationZonePair.en || '',
          data.deathPlaceZoneAm || data.deathZoneAm || registrationZonePair.am || '',
          (val) => this.translatePlaceToAmharic(val)
        );
        const deathCityPair = this.ensureBilingual(
          data.deathPlaceCity || data.deathCity || registrationCityPair.en || '',
          data.deathPlaceCityAm || data.deathCityAm || registrationCityPair.am || '',
          (val) => this.translatePlaceToAmharic(val)
        );
        const deathSubCityPair = this.ensureBilingual(
          data.deathPlaceSubCity || data.deathSubCity || registrationSubCityPair.en || '',
          data.deathPlaceSubCityAm || data.deathSubCityAm || registrationSubCityPair.am || '',
          (val) => this.translatePlaceToAmharic(val)
        );
        const deathWoredaPair = this.ensureBilingual(
          data.deathPlaceWoreda || data.deathWoreda || registrationWoredaPair.en || '',
          data.deathPlaceWoredaAm || data.deathWoredaAm || registrationWoredaPair.am || '',
          (val) => this.translatePlaceToAmharic(val)
        );
        const deathKebelePair = this.ensureBilingual(
          data.deathPlaceKebele || data.deathKebele || registrationKebelePair.en || '',
          data.deathPlaceKebeleAm || data.deathKebeleAm || registrationKebelePair.am || '',
          (val) => this.translatePlaceToAmharic(val)
        );
        
        // Ensure both languages are always available (use registration data if death location is missing)
        const finalDeathRegionPair = {
          en: deathRegionPair.en || registrationRegionPair.en || '',
          am: deathRegionPair.am || registrationRegionPair.am || ''
        };
        const finalDeathZonePair = {
          en: deathZonePair.en || registrationZonePair.en || '',
          am: deathZonePair.am || registrationZonePair.am || ''
        };
        const finalDeathCityPair = {
          en: deathCityPair.en || registrationCityPair.en || '',
          am: deathCityPair.am || registrationCityPair.am || ''
        };
        const finalDeathSubCityPair = {
          en: deathSubCityPair.en || registrationSubCityPair.en || '',
          am: deathSubCityPair.am || registrationSubCityPair.am || ''
        };
        const finalDeathWoredaPair = {
          en: deathWoredaPair.en || registrationWoredaPair.en || '',
          am: deathWoredaPair.am || registrationWoredaPair.am || ''
        };
        const finalDeathKebelePair = {
          en: deathKebelePair.en || registrationKebelePair.en || '',
          am: deathKebelePair.am || registrationKebelePair.am || ''
        };
        const deathPlacePair = this.ensureBilingual(
          [
            data.deathPlace || '',
            deathRegionPair.en,
            deathZonePair.en,
            deathCityPair.en,
            deathSubCityPair.en,
            deathWoredaPair.en,
            deathKebelePair.en
          ].filter(Boolean).join(', '),
          [
            data.deathPlaceAm || '',
            deathRegionPair.am,
            deathZonePair.am,
            deathCityPair.am,
            deathSubCityPair.am,
            deathWoredaPair.am,
            deathKebelePair.am
          ].filter(Boolean).join(' ')
        );
        const residencePair = this.ensureBilingual(
          data.deceasedResidence || data.residence || '',
          data.deceasedResidenceAm || data.residenceAm || ''
        );
        const maritalPair = this.ensureBilingual(
          data.deceasedMaritalStatusEn || data.deceasedMaritalStatus || data.maritalStatus || '',
          data.deceasedMaritalStatusAm || data.maritalStatusAm || ''
        );

        const certificatePlacePair = this.ensureBilingual(
          data.certificateIssuedPlace || data.issuePlace || registrationCityPair.en || '',
          data.certificateIssuedPlaceAm || data.issuePlaceAm || registrationCityPair.am || '',
          (val) => this.translatePlaceToAmharic(val)
        );

        const birthDate = data.deceasedBirthDate || data.birthDate;
        const deathDate = data.deathDate;
        const registrationDate = event.createdAt || new Date();
        const issueDate = new Date();
        const deceasedAgeValue = data.deceasedAge || data.age || data.deceasedAgeAm || '';
        const deathTimeValue = data.deathTime || data.deathTimeAm || '';
        const deathTimeAmharic = data.deathTimeAm || deathTimeValue;
        const deceasedNationalityRaw = data.deceasedNationality || data.nationality || data.deceasedNationalityAm || 'Ethiopian';
        const deceasedNationalityEnglish = this.toEnglishNationality(deceasedNationalityRaw);
        const deceasedNationalityAmharic = this.toAmharicNationality(data.deceasedNationalityAm || deceasedNationalityRaw);

        const birthDateBilingual = this.formatDualDateBilingual(birthDate, null);
        const deathDateBilingual = this.formatDualDateBilingual(deathDate, null);
        const registrationDateBilingual = this.formatDualDateBilingual(registrationDate, false);
        const issueDateBilingual = this.formatDualDateBilingual(issueDate, false);
        
        // Format dates as DD/MM/YYYY E.C / G.C
        const formatDateNumeric = (dateInput, isEthiopianInput = null) => {
          if (!dateInput) return { ec: '', gc: '' };
          try {
            // Try both Ethiopian and Gregorian if isEthiopianInput is null
            let result = null;
            if (isEthiopianInput === null) {
              // Try as Gregorian first (most common)
              try {
                result = this.computeDualDates(dateInput, false);
              } catch (e1) {
                // Try as Ethiopian
                try {
                  result = this.computeDualDates(dateInput, true);
                } catch (e2) {
                  console.error('Error computing dual dates:', e2);
                  return { ec: '', gc: '' };
                }
              }
            } else {
              result = this.computeDualDates(dateInput, isEthiopianInput);
            }
            
            if (!result || (!result.ec && !result.gc)) {
              return { ec: '', gc: '' };
            }
            
            const formatNumeric = (dateStr) => {
              if (!dateStr) return '';
              const [year, month, day] = dateStr.split('-').map((part) => parseInt(part, 10));
              if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) return '';
              return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
            };
            return {
              ec: formatNumeric(result.ec) || '',
              gc: formatNumeric(result.gc) || ''
            };
          } catch (e) {
            console.error('Error formatting date:', e, dateInput);
            return { ec: '', gc: '' };
          }
        };
        
        const birthDateNumeric = formatDateNumeric(birthDate, null);
        const deathDateNumeric = formatDateNumeric(deathDate, null);
        const registrationDateNumeric = formatDateNumeric(registrationDate, false);
        const issueDateNumeric = formatDateNumeric(issueDate, false);

        return {
          ...baseData,
          type: 'Death Certificate',
          typeAmharic: 'የሞት ምስክር ወረቀት',
          deceasedBirthRegistrationId: data.deceasedBirthRegistrationId || data.birthRegistrationId || '',
          // Deceased information
          deceasedName: deceasedNamePair.en,
          deceasedNameAmharic: deceasedNamePair.am,
          deceasedFatherName: deceasedFatherPair.en,
          deceasedFatherNameAmharic: deceasedFatherPair.am,
          deceasedGrandfatherName: deceasedGrandPair.en,
          deceasedGrandfatherNameAmharic: deceasedGrandPair.am,
          deceasedTitle: deceasedTitlePair.en,
          deceasedTitleAmharic: deceasedTitlePair.am,
          deceasedSex: data.deceasedSex || data.sex || '',
          deceasedSexAmharic: this.toAmharicSex(data.deceasedSex || data.sex || ''),
          deceasedBirthDate: this.formatDate(birthDate),
          deceasedBirthDateDisplay: birthDateBilingual.en,
          deceasedBirthDateDisplayAmharic: birthDateBilingual.am,
          deceasedBirthDateEc: birthDateNumeric.ec,
          deceasedBirthDateGc: birthDateNumeric.gc,
          deceasedAge: deceasedAgeValue,
          deceasedAgeAmharic: deceasedAgeValue ? `${this.formatNumberAmharic(deceasedAgeValue)} ዓመት` : '',
          deceasedBirthPlace: birthPlacePair.en,
          deceasedBirthPlaceAmharic: birthPlacePair.am,
          deceasedNationality: deceasedNationalityEnglish,
          deceasedNationalityAmharic: deceasedNationalityAmharic,
          deceasedOccupation: occupationPair.en,
          deceasedOccupationAmharic: occupationPair.am,
          deceasedMaritalStatus: maritalPair.en,
          deceasedMaritalStatusAmharic: maritalPair.am,
          deceasedResidence: residencePair.en,
          deceasedResidenceAmharic: residencePair.am,
          // Death information
          deathDate: this.formatDate(deathDate),
          deathDateDisplay: deathDateBilingual.en,
          deathDateDisplayAmharic: deathDateBilingual.am,
          deathDateEc: deathDateNumeric.ec,
          deathDateGc: deathDateNumeric.gc,
          deathTime: deathTimeValue,
          deathTimeAmharic: deathTimeAmharic,
          deathPlace: deathPlacePair.en,
          deathPlaceAmharic: deathPlacePair.am,
          // Individual death location components
          deathPlaceRegion: finalDeathRegionPair.en,
          deathPlaceRegionAmharic: finalDeathRegionPair.am,
          deathPlaceZone: finalDeathZonePair.en,
          deathPlaceZoneAmharic: finalDeathZonePair.am,
          deathPlaceCity: finalDeathCityPair.en,
          deathPlaceCityAmharic: finalDeathCityPair.am,
          deathPlaceSubCity: finalDeathSubCityPair.en,
          deathPlaceSubCityAmharic: finalDeathSubCityPair.am,
          deathPlaceWoreda: finalDeathWoredaPair.en,
          deathPlaceWoredaAmharic: finalDeathWoredaPair.am,
          deathPlaceKebele: finalDeathKebelePair.en,
          deathPlaceKebeleAmharic: finalDeathKebelePair.am,
          deathCause: deathCausePair.en,
          deathCauseAmharic: deathCausePair.am,
          deathType: data.deathType || 'Natural',
          // Registration details
          registrationRegion: registrationRegionPair.en,
          registrationRegionAmharic: registrationRegionPair.am,
          registrationZone: registrationZonePair.en,
          registrationZoneAmharic: registrationZonePair.am,
          registrationCity: registrationCityPair.en,
          registrationCityAmharic: registrationCityPair.am,
          registrationSubCity: registrationSubCityPair.en,
          registrationSubCityAmharic: registrationSubCityPair.am,
          registrationWoreda: registrationWoredaPair.en,
          registrationWoredaAmharic: registrationWoredaPair.am,
          registrationKebele: registrationKebelePair.en,
          registrationKebeleAmharic: registrationKebelePair.am,
          registrationDateDisplay: registrationDateBilingual.en,
          registrationDateDisplayAmharic: registrationDateBilingual.am,
          registrationDateEc: registrationDateNumeric.ec,
          registrationDateGc: registrationDateNumeric.gc,
          // Issuance details
          issueDate: baseData.issueDate,
          issueDateDisplay: issueDateBilingual.en,
          issueDateDisplayAmharic: issueDateBilingual.am,
          issueDateEc: issueDateNumeric.ec,
          issueDateGc: issueDateNumeric.gc,
          certificateIssuedPlace: certificatePlacePair.en || registrationCityPair.en || '',
          certificateIssuedPlaceAmharic: certificatePlacePair.am || registrationCityPair.am || '',
          // Registration record metadata (fill from event.data with safe fallbacks)
          registrationRecordPageNumber: data.registrationRecordPageNumber || data.recordPageNumber || data.deathRecordPageNumber || 'N/A',
          registrationRecordLineNumber: data.registrationRecordLineNumber || data.recordLineNumber || data.deathRecordLineNumber || 'N/A',
          registrationRecordFormNumber: data.registrationRecordFormNumber || data.recordFormNumber || data.deathRecordFormNumber || 'N/A',
          registrationRecordFormPageNumber: data.registrationRecordFormPageNumber || data.recordFormPageNumber || data.deathRecordFormPageNumber || 'N/A',
          registrationRecordFormLineNumber: data.registrationRecordFormLineNumber || data.recordFormLineNumber || data.deathRecordFormLineNumber || 'N/A',
          // Registrar metadata
          registrarName: registrarNamePair.en,
          registrarNameAmharic: registrarNamePair.am,
          registrarFatherName: registrarFatherPair.en,
          registrarFatherNameAmharic: registrarFatherPair.am,
          registrarGrandName: registrarGrandPair.en,
          registrarGrandNameAmharic: registrarGrandPair.am,
          registrarIdNumber: data.registrarIdNumber || data.registrarID || data.registrarIdentifier || 'N/A',
          registrarSignature: data.registrarSignature || 'N/A',
          registrarSeal: data.registrarSeal || 'N/A'
        };
      }

      case 'divorce': {
        const pickText = (...keys) => {
          for (const key of keys) {
            if (!key) continue;
            const value = data[key];
            if (value === null || value === undefined) continue;
            if (typeof value === 'string') {
              const trimmed = value.trim();
              if (trimmed.length) return trimmed;
            } else if (typeof value === 'number') {
              return String(value);
            }
          }
          return '';
        };
        const spouse1BirthDateSource =
          data.divorceSpouse1BirthDate || data.spouse1BirthDate || data.birthDate;
        const spouse2BirthDateSource =
          data.divorceSpouse2BirthDate || data.spouse2BirthDate || data.birthDate;
        // Format dates as DD/MM/YYYY E.C / G.C for labels
        const formatDateNumeric = (dateInput, isEthiopianInput = null) => {
          if (!dateInput) return { ec: '', gc: '' };
          try {
            let result = null;
            if (isEthiopianInput === null) {
              try {
                result = this.computeDualDates(dateInput, false);
              } catch (e1) {
                try {
                  result = this.computeDualDates(dateInput, true);
                } catch (e2) {
                  return { ec: '', gc: '' };
                }
              }
            } else {
              result = this.computeDualDates(dateInput, isEthiopianInput);
            }
            
            if (!result || (!result.ec && !result.gc)) {
              return { ec: '', gc: '' };
            }
            
            const formatNumeric = (dateStr) => {
              if (!dateStr) return '';
              const [year, month, day] = dateStr.split('-').map((part) => parseInt(part, 10));
              if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) return '';
              return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
            };
            return {
              ec: formatNumeric(result.ec) || '',
              gc: formatNumeric(result.gc) || ''
            };
          } catch (e) {
            return { ec: '', gc: '' };
          }
        };
        
        const divorceRegistrationDateNumeric = formatDateNumeric(
          data.divorceRegistrationDate || event.createdAt,
          true
        );
        const issueDateNumeric = formatDateNumeric(baseData.issueDateRaw, false);
        
        return {
          ...baseData,
          type: 'Divorce Certificate',
          typeAmharic: 'የፍቺ ምስክር ወረቀት',
          // Spouse 1 information
          spouse1Name: pickText(
            'divorceSpouse1NameEn',
            'spouse1NameEn',
            'divorceHusbandNameEn',
            'divorceWifeNameEn'
          ),
          spouse1NameAmharic: pickText(
            'divorceSpouse1NameAm',
            'spouse1NameAm',
            'divorceHusbandNameAm',
            'divorceWifeNameAm'
          ),
          spouse1FatherName: pickText(
            'divorceSpouse1FatherNameEn',
            'spouse1FatherEn',
            'divorceHusbandFatherNameEn',
            'divorceWifeFatherNameEn'
          ),
          spouse1FatherNameAmharic: pickText(
            'divorceSpouse1FatherNameAm',
            'spouse1FatherAm',
            'divorceHusbandFatherNameAm',
            'divorceWifeFatherNameAm'
          ),
          spouse1MotherName: pickText(
            'divorceSpouse1MotherNameEn',
            'spouse1MotherEn',
            'divorceSpouse1GrandfatherNameEn'
          ),
          spouse1MotherNameAmharic: pickText(
            'divorceSpouse1MotherNameAm',
            'spouse1MotherAm',
            'divorceSpouse1GrandfatherNameAm'
          ),
          spouse1BirthDate: this.formatDate(spouse1BirthDateSource),
          spouse1Sex: pickText('divorceSpouse1Sex', 'spouse1Sex', 'sex'),
          spouse1Nationality:
            pickText('divorceSpouse1NationalityAm', 'spouse1Nationality', 'nationality') ||
            'Ethiopian',
          spouse1CountryOfBirth: pickText(
            'divorceSpouse1BirthPlaceEn',
            'divorceSpouse1BirthPlaceAm',
            'spouse1CountryOfBirth'
          ),
          spouse1CurrentAddress: pickText(
            'divorceSpouse1ResidenceEn',
            'divorceSpouse1ResidenceAm',
            'spouse1CurrentAddress'
          ),
          // Spouse 2 information
          spouse2Name: pickText(
            'divorceSpouse2NameEn',
            'spouse2NameEn',
            'divorceHusbandNameEn',
            'divorceWifeNameEn'
          ),
          spouse2NameAmharic: pickText(
            'divorceSpouse2NameAm',
            'spouse2NameAm',
            'divorceHusbandNameAm',
            'divorceWifeNameAm'
          ),
          spouse2FatherName: pickText(
            'divorceSpouse2FatherNameEn',
            'spouse2FatherEn',
            'divorceHusbandFatherNameEn',
            'divorceWifeFatherNameEn'
          ),
          spouse2FatherNameAmharic: pickText(
            'divorceSpouse2FatherNameAm',
            'spouse2FatherAm',
            'divorceHusbandFatherNameAm',
            'divorceWifeFatherNameAm'
          ),
          spouse2MotherName: pickText(
            'divorceSpouse2MotherNameEn',
            'spouse2MotherEn',
            'divorceSpouse2GrandfatherNameEn'
          ),
          spouse2MotherNameAmharic: pickText(
            'divorceSpouse2MotherNameAm',
            'spouse2MotherAm',
            'divorceSpouse2GrandfatherNameAm'
          ),
          spouse2BirthDate: this.formatDate(spouse2BirthDateSource),
          spouse2Sex: pickText('divorceSpouse2Sex', 'spouse2Sex', 'sex'),
          spouse2Nationality:
            pickText('divorceSpouse2NationalityAm', 'spouse2Nationality', 'nationality') ||
            'Ethiopian',
          spouse2CountryOfBirth: pickText(
            'divorceSpouse2BirthPlaceEn',
            'divorceSpouse2BirthPlaceAm',
            'spouse2CountryOfBirth'
          ),
          spouse2CurrentAddress: pickText(
            'divorceSpouse2ResidenceEn',
            'divorceSpouse2ResidenceAm',
            'spouse2CurrentAddress'
          ),
          // Divorce details
          divorceDate: this.formatDate(data.divorceDate),
          divorceRegistrationDate: this.formatDate(data.divorceRegistrationDate || event.createdAt),
          divorceRegistrationDateEc: divorceRegistrationDateNumeric.ec,
          divorceRegistrationDateGc: divorceRegistrationDateNumeric.gc,
          issueDateEc: issueDateNumeric.ec,
          issueDateGc: issueDateNumeric.gc,
          divorceRegistrationNumber: data.divorceRegistrationNumber || '',
          divorceType: data.divorceType || '',
          divorceReason: data.divorceReason || '',
          // Registration details
          registrationRegion: data.region || data.divorceRegion || '',
          registrationZone: data.zone || data.divorceZone || '',
          registrationCity: data.city || data.divorceCity || '',
          registrationSubCity: data.subCity || data.divorceSubCity || '',
          registrationWoreda: data.woreda || data.divorceWoreda || '',
          registrationKebele: data.kebele || data.divorceKebele || '',
          marriagePlace: pickText(
            'divorceMarriagePlace',
            'marriagePlace',
            'marriagePlaceName',
            'marriageCity'
          ),
          qrCode: ''
        };
      }

      default:
        return baseData;
    }
  }

  toAmharicSex(value) {
    const v = String(value || '').toLowerCase().trim();
    if (v === 'male' || v === 'm' || v === 'ወንድ') return 'ወንድ';
    if (v === 'female' || v === 'f' || v === 'ሴት') return 'ሴት';
    // If it's already in Amharic, return as is
    if (this.isAmharic(value)) return value;
    // Otherwise return empty or value
    return value || '';
  }

  toEnglishSex(value) {
    const v = String(value || '').toLowerCase().trim();
    if (v === 'ወንድ' || v === 'male' || v === 'm') return 'Male';
    if (v === 'ሴት' || v === 'female' || v === 'f') return 'Female';
    // If it's already in English, return capitalized
    if (!this.isAmharic(value)) return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    return value || '';
  }

  toAmharicNationality(value) {
    if (!value) return 'ኢትዮጵያዊ';
    const v = String(value).toLowerCase().trim();
    if (v.includes('ethiop') || v === 'ኢትዮጵያዊ' || v === 'ኢትዮጵያዊት') return 'ኢትዮጵያዊ';
    // If it's already in Amharic, return as is
    if (this.isAmharic(value)) return value;
    // Otherwise return default
    return 'ኢትዮጵያዊ';
  }

  toEnglishNationality(value) {
    if (!value) return 'Ethiopian';
    const v = String(value).toLowerCase().trim();
    if (v === 'ኢትዮጵያዊ' || v === 'ኢትዮጵያዊት' || v.includes('ethiop')) return 'Ethiopian';
    // If it's already in English, return capitalized
    if (!this.isAmharic(value)) return value.charAt(0).toUpperCase() + value.slice(1);
    return 'Ethiopian';
  }

  // Check if text contains Amharic characters
  isAmharic(text) {
    if (!text) return false;
    // Amharic Unicode range: U+1200 to U+137F
    return /[\u1200-\u137F]/.test(text);
  }

  // Translate common place names to Amharic
  translatePlaceToAmharic(text) {
    if (!text) return '';
    if (this.isAmharic(text)) return text; // Already in Amharic
    
    const translations = {
      'Addis Ababa': 'አዲስ አበባ',
      'Ethiopian': 'ኢትዮጵያዊ',
      'Ethiopia': 'ኢትዮጵያ',
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
      'Yeka': 'የካ',
      'Amhara': 'አማራ',
      'Oromia': 'ኦሮሚያ',
      'Tigray': 'ትግራይ',
      'Somali': 'ሶማሌ',
      'Afar': 'አፋር',
      'SNNPR': 'ደቡብ ክልል',
      'Southern Nations': 'ደቡብ ክልል',
      'Gambela': 'ጋምቤላ',
      'Harari': 'ሐረሪ',
      'Dire Dawa': 'ድሬ ዳዋ',
      'North Shewa': 'ሰሜን ሸዋ',
      'South Shewa': 'ደቡብ ሸዋ',
      'East Shewa': 'ምሥራቅ ሸዋ',
      'West Shewa': 'ምዕራብ ሸዋ',
      'Basona Werana': 'ባሶና ወረና'
    };
    
    // Try exact match first
    if (translations[text]) return translations[text];
    
    // Try case-insensitive match
    const lowerText = text.toLowerCase();
    for (const [key, value] of Object.entries(translations)) {
      if (key.toLowerCase() === lowerText) return value;
    }
    
    // If no translation found, return original text
    return text;
  }

  // Ensure both languages are present for a field
  ensureBilingual(valueEn, valueAm, translateFn = null) {
    // Determine what we actually have
    const hasEn = valueEn && !this.isAmharic(valueEn) && valueEn.trim() !== '';
    const hasAm = valueAm && this.isAmharic(valueAm) && valueAm.trim() !== '';
    
    // Get the raw values
    const rawEn = (valueEn || '').trim();
    const rawAm = (valueAm || '').trim();
    
    let finalEn = '';
    let finalAm = '';
    
    // Case 1: We have both languages - use them
    if (hasEn && hasAm) {
      finalEn = rawEn;
      finalAm = rawAm;
    }
    // Case 2: We have only English - translate to Amharic
    else if (hasEn && !hasAm) {
      finalEn = rawEn;
      finalAm = translateFn ? translateFn(rawEn) : rawEn;
    }
    // Case 3: We have only Amharic - try to keep it, and use same for English if no translation available
    else if (hasAm && !hasEn) {
      finalAm = rawAm;
      // For place names and some fields, we can't reverse-translate, so use Amharic for both
      // This ensures the field always has content in both languages
      finalEn = rawAm; // Use Amharic as fallback - better than empty
    }
    // Case 4: We have a value but can't determine language - check and handle
    else if (rawEn || rawAm) {
      const value = rawEn || rawAm;
      if (this.isAmharic(value)) {
        // It's Amharic
        finalAm = value;
        finalEn = value; // Use as fallback
      } else {
        // It's likely English
        finalEn = value;
        finalAm = translateFn ? translateFn(value) : value;
      }
    }
    // Case 5: No value at all - return defaults if translateFn can provide them
    else {
      // Return empty or let caller handle defaults
      finalEn = '';
      finalAm = '';
    }
    
    // Ensure we always have both languages filled (at minimum, use the same value for both)
    if (!finalEn && finalAm) {
      finalEn = finalAm;
    }
    if (!finalAm && finalEn) {
      finalAm = translateFn ? translateFn(finalEn) : finalEn;
    }
    
    return { en: finalEn, am: finalAm };
  }

  dualDateFields(input, isEthiopianInput, baseKey) {
    // input can be Date | string (YYYY-MM-DD) in EC or GC
    const { ec, gc } = this.computeDualDates(input, isEthiopianInput);
    const result = {};
    result[`${baseKey}EC`] = ec; // formatted YYYY-MM-DD
    result[`${baseKey}GC`] = gc; // formatted YYYY-MM-DD
    return result;
  }

  // Ethiopian to Gregorian calendar conversion
  toGregorian(ey, em, ed) {
    // Ethiopian calendar is approximately 7-8 years behind Gregorian
    // Month 1 (Meskerem) starts around September 11
    const ethiopianEpoch = 1724220.5; // JD of 1 Meskerem 1 EC
    const gregorianEpoch = 1721425.5; // JD of 1 January 1 AD
    
    // Calculate days since Ethiopian epoch
    const daysInYear = 365;
    const daysInLeapYear = 366;
    let days = (ey - 1) * daysInYear + Math.floor((ey - 1) / 4);
    
    // Ethiopian months: 30 days each, except Pagumen (13th month) which has 5 or 6 days
    const ethiopianMonthDays = [0, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 5];
    for (let i = 1; i < em; i++) {
      days += ethiopianMonthDays[i] || 30;
    }
    days += ed - 1;
    
    // Convert to Gregorian
    const totalDays = ethiopianEpoch + days - gregorianEpoch;
    const date = new Date((totalDays - 2440587.5) * 86400000); // Convert JD to milliseconds
    
    return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
  }

  // Gregorian to Ethiopian calendar conversion
  toEthiopian(gy, gm, gd) {
    // Create Gregorian date
    const gregorianDate = new Date(gy, gm - 1, gd);
    const gregorianEpoch = new Date(1721425.5 * 86400000 - 2440587.5 * 86400000); // 1 January 1 AD in milliseconds
    const ethiopianEpoch = new Date(1724220.5 * 86400000 - 2440587.5 * 86400000); // 1 Meskerem 1 EC
    
    // Calculate days difference
    const daysDiff = Math.floor((gregorianDate - ethiopianEpoch) / 86400000);
    
    // Calculate Ethiopian year (approximately 7-8 years behind)
    let ey = Math.floor(daysDiff / 365.25) + 1;
    
    // Calculate remaining days
    let remainingDays = daysDiff - Math.floor((ey - 1) * 365.25) - Math.floor((ey - 1) / 4);
    
    // Ethiopian months
    const ethiopianMonthDays = [0, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 5];
    let em = 1;
    for (let i = 1; i <= 13; i++) {
      const monthDays = ethiopianMonthDays[i] || 30;
      if (remainingDays < monthDays) {
        em = i;
        break;
      }
      remainingDays -= monthDays;
    }
    
    const ed = remainingDays + 1;
    
    return [ey, em, ed];
  }

  computeDualDates(input, isEthiopianInput) {
    // Returns { ec: 'YYYY-MM-DD', gc: 'YYYY-MM-DD' }
    const toYmd = (y, m, d) => `${y.toString().padStart(4,'0')}-${m.toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
    try {
      if (isEthiopianInput) {
        const { y, m, d } = this.parseYmd(input);
        const [gy, gm, gd] = this.toGregorian(y, m, d);
        return { ec: toYmd(y, m, d), gc: toYmd(gy, gm, gd) };
      } else {
        const date = input instanceof Date ? input : new Date(input);
        const gy = date.getFullYear();
        const gm = date.getMonth() + 1;
        const gd = date.getDate();
        const [ey, em, ed] = this.toEthiopian(gy, gm, gd);
        return { ec: toYmd(ey, em, ed), gc: toYmd(gy, gm, gd) };
      }
    } catch (e) {
      // Fallback: try to parse as date
      try {
        const date = input instanceof Date ? input : new Date(input);
        const gy = date.getFullYear();
        const gm = date.getMonth() + 1;
        const gd = date.getDate();
        const [ey, em, ed] = this.toEthiopian(gy, gm, gd);
        return { ec: toYmd(ey, em, ed), gc: toYmd(gy, gm, gd) };
      } catch {
        return { ec: '', gc: '' };
      }
    }
  }

  parseYmd(val) {
    if (val instanceof Date) {
      return { y: val.getFullYear(), m: val.getMonth() + 1, d: val.getDate() };
    }
    // Handle Ethiopian date object format {year, month, day}
    if (val && typeof val === 'object' && 'year' in val && 'month' in val && 'day' in val) {
      return { 
        y: parseInt(val.year, 10), 
        m: parseInt(val.month, 10), 
        d: parseInt(val.day, 10) 
      };
    }
    const s = String(val || '');
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!m) throw new Error('Invalid Y-M-D');
    return { y: parseInt(m[1],10), m: parseInt(m[2],10), d: parseInt(m[3],10) };
  }

  extractPhotos(event, certificateRequest) {
    const photos = { primary: null, secondary: null };
    const data = event.data || {};
    
    console.log('📸 Extracting photos for event type:', event.type);
    console.log('📋 Full event data keys:', Object.keys(data));
    const photoFields = Object.keys(data).filter(k => 
      k.toLowerCase().includes('photo') || 
      k.toLowerCase().includes('image') ||
      k.toLowerCase().includes('picture')
    );
    console.log('📋 Photo/image fields found:', photoFields);
    photoFields.forEach(key => {
      console.log(`   ${key} = ${data[key]}`);
    });
    
    // Helper function to try multiple field names and return the first valid photo path
    const tryPhotoFields = (...fieldNames) => {
      for (const fieldName of fieldNames) {
        if (data[fieldName]) {
          const filename = data[fieldName];
          console.log(`  🔍 Trying field: ${fieldName} = ${filename}`);
          const photoPath = this.getPhotoPath(filename);
          if (photoPath) {
            console.log(`  ✅ Found photo via field ${fieldName}: ${photoPath}`);
            return photoPath;
          }
        }
      }
      return null;
    };
    
    // Find ANY field that contains 'photo' or 'image' in the name and has a value
    const findAnyPhotoField = () => {
      console.log('  🔍 Searching all fields for photo/image values...');
      for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === 'string' && value.trim() !== '' &&
            (key.toLowerCase().includes('photo') || key.toLowerCase().includes('image'))) {
          console.log(`  🔍 Trying any photo field: ${key} = ${value}`);
          const photoPath = this.getPhotoPath(value);
          if (photoPath) {
            console.log(`  ✅ Found photo via field ${key}: ${photoPath}`);
            return photoPath;
          }
        }
      }
      console.log('  ❌ No photo fields found in data');
      return null;
    };
    
    switch (event.type) {
      case 'birth':
        // Try the exact field name from formFields.js first
        photos.primary = tryPhotoFields('childPhoto') || findAnyPhotoField();
        // Fallback to verificationImage from certificate request
        if (!photos.primary && certificateRequest?.verificationImage) {
          console.log(`  🔍 Trying verificationImage: ${certificateRequest.verificationImage}`);
          photos.primary = this.getPhotoPath(certificateRequest.verificationImage);
        }
        break;
      case 'marriage':
        // Try exact field names from formFields.js
        photos.primary = tryPhotoFields('wifePhoto') || findAnyPhotoField();
        if (!photos.primary && certificateRequest?.verificationImage) {
          console.log(`  🔍 Trying verificationImage: ${certificateRequest.verificationImage}`);
          photos.primary = this.getPhotoPath(certificateRequest.verificationImage);
        }
        photos.secondary = tryPhotoFields('husbandPhoto');
        break;
      case 'death':
        // Try exact field name from formFields.js
        photos.primary = tryPhotoFields('deceasedPhoto') || findAnyPhotoField();
        if (!photos.primary && certificateRequest?.verificationImage) {
          console.log(`  🔍 Trying verificationImage: ${certificateRequest.verificationImage}`);
          photos.primary = this.getPhotoPath(certificateRequest.verificationImage);
        }
        break;
      case 'divorce':
        // Try exact field names from formFields.js
        photos.primary = tryPhotoFields('divorceSpouse1Photo') || findAnyPhotoField();
        if (!photos.primary && certificateRequest?.verificationImage) {
          console.log(`  🔍 Trying verificationImage: ${certificateRequest.verificationImage}`);
          photos.primary = this.getPhotoPath(certificateRequest.verificationImage);
        }
        photos.secondary = tryPhotoFields('divorceSpouse2Photo');
        break;
      default:
        photos.primary = findAnyPhotoField();
        if (!photos.primary && certificateRequest?.verificationImage) {
          console.log(`  🔍 Trying verificationImage: ${certificateRequest.verificationImage}`);
          photos.primary = this.getPhotoPath(certificateRequest.verificationImage);
        }
        break;
    }
    
    console.log(`📸 Photo extraction result: primary=${photos.primary ? '✅ ' + photos.primary : '❌'}, secondary=${photos.secondary ? '✅ ' + photos.secondary : '❌'}`);
    return photos;
  }

  getPhotoPath(photoFilename) {
    if (!photoFilename) {
      console.log('⚠️ getPhotoPath: No photo filename provided');
      return null;
    }
    
    // Normalize the uploads path to absolute path
    const uploadsPath = path.resolve(this.uploadsPath);
    console.log(`🔍 Resolving photo path for: "${photoFilename}"`);
    console.log(`📁 Uploads path: ${uploadsPath}`);
    
    // Clean the filename - remove any path prefixes
    let cleanFilename = String(photoFilename).trim();
    
    // Remove common path prefixes
    cleanFilename = cleanFilename.replace(/^[\/\\]uploads[\/\\]/i, '');
    cleanFilename = cleanFilename.replace(/^uploads[\/\\]/i, '');
    cleanFilename = cleanFilename.replace(/^[\/\\]/, '');
    
    // Remove the uploads path if it's already included
    if (cleanFilename.toLowerCase().includes(uploadsPath.toLowerCase())) {
      cleanFilename = cleanFilename.substring(cleanFilename.toLowerCase().indexOf(uploadsPath.toLowerCase()) + uploadsPath.length);
      cleanFilename = cleanFilename.replace(/^[\/\\]/, '');
    }
    
    console.log(`   Cleaned filename: "${cleanFilename}"`);
    
    // If it's already an absolute path and exists, use it
    if (path.isAbsolute(cleanFilename) && fs.existsSync(cleanFilename)) {
      console.log(`✅ Found photo at absolute path: ${cleanFilename}`);
      return cleanFilename;
    }
    
    // Try 1: Direct filename in uploads directory
    const directPath = path.join(uploadsPath, cleanFilename);
    console.log(`📂 Trying 1 - Direct path: ${directPath}`);
    if (fs.existsSync(directPath)) {
      console.log(`✅ Found photo at: ${directPath}`);
      return directPath;
    }
    
    // Try 2: Just the basename (filename without any directory)
    const basename = path.basename(cleanFilename);
    const basenamePath = path.join(uploadsPath, basename);
    console.log(`📂 Trying 2 - Basename path: ${basenamePath}`);
    if (fs.existsSync(basenamePath)) {
      console.log(`✅ Found photo at: ${basenamePath}`);
      return basenamePath;
    }
    
    // Try 3: Original filename as-is
    const originalPath = path.join(uploadsPath, photoFilename);
    console.log(`📂 Trying 3 - Original filename: ${originalPath}`);
    if (fs.existsSync(originalPath)) {
      console.log(`✅ Found photo at: ${originalPath}`);
      return originalPath;
    }
    
    // Try 4: List all files and find a match (case-insensitive)
    try {
      if (!fs.existsSync(uploadsPath)) {
        console.error(`❌ Uploads directory does not exist: ${uploadsPath}`);
        return null;
      }
      
      const files = fs.readdirSync(uploadsPath);
      console.log(`📋 Total files in uploads directory: ${files.length}`);
      console.log(`📋 Sample files (first 20): ${files.slice(0, 20).join(', ')}`);
      
      // Try exact match (case-insensitive)
      const exactMatch = files.find(f => f.toLowerCase() === cleanFilename.toLowerCase());
      if (exactMatch) {
        const matchPath = path.join(uploadsPath, exactMatch);
        console.log(`✅ Found exact match (case-insensitive): ${matchPath}`);
        return matchPath;
      }
      
      // Try partial match - filename contains the stored value or vice versa
      const partialMatch = files.find(f => 
        f.toLowerCase().includes(cleanFilename.toLowerCase()) || 
        cleanFilename.toLowerCase().includes(f.toLowerCase()) ||
        f.toLowerCase().includes(basename.toLowerCase()) ||
        basename.toLowerCase().includes(f.toLowerCase())
      );
      if (partialMatch) {
        const matchPath = path.join(uploadsPath, partialMatch);
        console.log(`✅ Found partial match: ${matchPath}`);
        return matchPath;
      }
      
      // Try matching by fieldname pattern (e.g., if looking for childPhoto, find childPhoto-*.jpg)
      const fieldPattern = cleanFilename.split('-')[0]; // Get fieldname part before timestamp
      if (fieldPattern && fieldPattern !== cleanFilename) {
        const patternMatch = files.find(f => f.toLowerCase().startsWith(fieldPattern.toLowerCase() + '-'));
        if (patternMatch) {
          const matchPath = path.join(uploadsPath, patternMatch);
          console.log(`✅ Found pattern match (${fieldPattern}): ${matchPath}`);
          return matchPath;
        }
      }
      
    } catch (err) {
      console.error(`❌ Error reading uploads directory: ${err.message}`);
      console.error(`   Path: ${uploadsPath}`);
    }
    
    console.log(`❌ Photo not found: ${photoFilename}`);
    console.log(`   Tried paths:`);
    console.log(`   1. ${directPath}`);
    console.log(`   2. ${basenamePath}`);
    console.log(`   3. ${originalPath}`);
    return null;
  }

  generateExactTemplateHTML(certificateType, data, qrCodeDataUrl) {
    // Match exact border colors from samples
    const borderColor = certificateType === 'birth' ? '#1E88E5' : // Blue for birth
                       certificateType === 'marriage' ? '#00AA44' : // Green for marriage
                       certificateType === 'death' ? '#8B4513' : // Brown for death
                       '#8B4513'; // Brown for divorce
    
    // Background color from birth certificate sample (light blue/grey)
    const bgColor = certificateType === 'birth' ? '#E8F0F8' : 'white';
    
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
            font-family: 'Arial', 'Helvetica', sans-serif;
            margin: 0;
            padding: 0;
            background-color: ${bgColor};
            color: #000;
            line-height: 1.3;
        }
        
        .certificate-container {
            background-color: ${bgColor};
            border: 12px solid ${borderColor};
            padding: 30px;
            position: relative;
            min-height: 100vh;
            background-image: 
                radial-gradient(circle at 2px 2px, rgba(0,0,0,0.02) 1px, transparent 0);
            background-size: 25px 25px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 20px;
            position: relative;
        }
        
        ${certificateType === 'birth' ? `
        /* Add more space between header and content for birth certificates */
        .header {
            margin-bottom: 30px;
        }
        ` : ''}
        
        ${certificateType === 'marriage' ? `
        /* Reduce space between header and content for marriage certificates */
        .header {
            margin-bottom: 8px;
        }
        ` : ''}
        
        .registration-numbers {
            position: absolute;
            top: 0;
            right: 0;
            font-size: 10px;
            text-align: right;
            line-height: 1.4;
            font-weight: bold;
        }
        
        .reg-number {
            margin-bottom: 5px;
        }
        
        .flag {
            width: 120px;
            height: 75px;
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
            font-size: 22px;
            font-weight: bold;
            margin: 10px 0;
            text-transform: uppercase;
        }
        
        .photo-section {
            display: flex;
            justify-content: ${certificateType === 'birth' ? 'flex-start' : 'center'};
            gap: 20px;
            margin: 20px 0;
            align-items: flex-start;
        }
        
        .photo-container {
            text-align: center;
            position: relative;
        }
        
        .photo-placeholder {
            width: 100px;
            height: 120px;
            border: 2px solid #000;
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
        
        .photo-seal {
            position: absolute;
            width: 30px;
            height: 30px;
            border: 2px solid #000;
            border-radius: 50%;
            background: white;
            bottom: -8px;
            right: -8px;
            z-index: 2;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 7px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .photo-seal-inner {
            font-size: 6px;
            line-height: 0.9;
            text-align: center;
            color: #000;
        }
        
        .content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
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
            min-width: 45%;
            margin-right: 10px;
            line-height: 1.2;
        }
        
        .field-value {
            border-bottom: 1px dotted #000;
            padding: 3px 0;
            min-height: 17px;
            font-size: 11px;
            flex: 1;
            line-height: 1.2;
            min-width: 50%;
        }
        
        .date-fields {
            display: flex;
            gap: 15px;
            align-items: center;
        }
        
        .date-field {
            border-bottom: 1px dotted #000;
            padding: 4px 0;
            min-height: 20px;
            font-size: 12px;
            text-align: center;
            min-width: 50px;
        }
        
        .official-seal {
            position: absolute;
            bottom: 30px;
            right: 30px;
            width: 95px;
            height: 95px;
            border: 3px solid #000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8.5px;
            font-weight: bold;
            text-align: center;
            line-height: 1.0;
            background: white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        
        .seal-content {
            padding: 2px;
            text-align: center;
        }
        
        .seal-number {
            font-size: 10px;
            font-weight: bold;
            margin-top: 2px;
            color: #000;
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
            margin-top: 30px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
        }
        
        .signature-box {
            text-align: center;
        }
        
        .signature-line {
            border-bottom: 1px solid #000;
            margin: 20px 0 10px;
            height: 30px;
        }
        
        .amharic-text {
            font-family: 'Times New Roman', serif;
            direction: ltr;
        }
        
        .witness-section {
            margin-top: 20px;
            margin-bottom: 20px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            border: 1px solid #000;
            padding: 15px;
        }
        
        .witness-box {
            border: 1px dotted #000;
            padding: 10px;
            min-height: 100px;
        }
        
        .witness-title {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 10px;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
        }
        
        .witness-field {
            margin-bottom: 8px;
            display: flex;
            align-items: baseline;
        }
        
        .witness-label {
            font-size: 10px;
            font-weight: bold;
            margin-right: 10px;
            min-width: 80px;
        }
        
        .witness-value {
            border-bottom: 1px dotted #000;
            flex: 1;
            min-height: 15px;
            font-size: 10px;
        }
        
        .single-column-layout {
            display: block;
        }
        
        .two-column-layout {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
        }
        
        ${certificateType === 'death' ? `
        /* Tighten layout specifically for death certificates to ensure single-page fit */
        body {
            line-height: 1.25;
        }
        .certificate-container {
            padding: 18px;
            border-width: 10px;
            box-sizing: border-box;
        }
        .registration-numbers {
            font-size: 9px;
            line-height: 1.3;
        }
        .title-main {
            font-size: 13px;
            margin: 4px 0;
        }
        .title-sub {
            font-size: 16px;
            margin: 6px 0;
        }
        .header {
            margin-bottom: 12px;
        }
        .flag {
            width: 100px;
            height: 60px;
            border-width: 1.5px;
        }
        .photo-section {
            gap: 12px;
            margin: 8px 0;
        }
        .photo-placeholder {
            width: 84px;
            height: 100px;
        }
        .content {
            gap: 18px;
            margin-bottom: 16px;
        }
        .field-group {
            margin-bottom: 5px;
            min-height: 16px;
        }
        .field-label {
            font-size: 9.5px;
            min-width: 40%;
            margin-right: 6px;
        }
        .field-value {
            font-size: 9.5px;
            padding: 2px 0 1px 0;
            min-height: 14px;
        }
        .date-fields {
            gap: 8px;
        }
        .date-field {
            font-size: 10.5px;
            padding: 2px 0;
            min-width: 40px;
            min-height: 16px;
        }
        .official-seal {
            width: 80px;
            height: 80px;
            bottom: 12px; /* place at bottom-most inside border */
            right: 12px;
        }
        .qr-code {
            width: 56px;
            height: 56px;
            bottom: 12px;
            left: 12px;
        }
        .signature-section {
            margin-top: 16px;
            gap: 16px;
        }
        .signature-line {
            height: 22px;
            margin: 12px 0 6px;
        }
        ` : ''}
    </style>
</head>
<body>
    <div class="certificate-container">
        <!-- Registration Numbers -->
        <div class="registration-numbers">
            ${certificateType === 'marriage' ? `
            <div class="reg-number">
                <strong>SAM No.:</strong><br>
                ${data.registrationNumber || data.certificateId}
            </div>
            ` : `
            <div class="reg-number">
                <strong>${this.getRegistrationLabel(certificateType)} Form Number:</strong><br>
                ${data.registrationNumber}
            </div>
            <div class="reg-number">
                <strong>${this.getRegistrationLabel(certificateType)} Unique Identification Number:</strong><br>
                ${data.certificateId}
            </div>
            `}
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
            ${this.generateExactContentFields(certificateType, data)}
        </div>
        
        <!-- Witness Section (for Marriage and Divorce) -->
        ${(certificateType === 'marriage' || certificateType === 'divorce') ? this.generateWitnessSection(data) : ''}
        
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
            <div class="seal-content">
                <div>የኢትዮጵያ</div>
                <div>ፌዴራላዊ</div>
                <div>ዴሞክራሲያዊ</div>
                <div>ሪፐብሊክ</div>
                <div>የወሳኝ ኩነት</div>
                <div>ምዝገባ</div>
                <div class="seal-number">${data.certificateId.slice(-6)}</div>
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
    console.log(`🖼️ Generating photo section for ${certificateType}:`, {
      hasPrimary: !!photos.primary,
      hasSecondary: !!photos.secondary,
      primaryPath: photos.primary || 'N/A',
      secondaryPath: photos.secondary || 'N/A'
    });
    
    // ALWAYS embed local files as base64. Never use file:// URLs.
    const toSrc = (p, label) => {
      if (!p) {
        console.log(`  ⚠️ No ${label} photo path provided`);
        return null;
      }
      if (this.looksLikeDataUrl(p)) {
        console.log(`  ✅ ${label} photo is already a data URL`);
        return p;
      }
      if (this.looksLikeHttpUrl(p)) {
        console.log(`  ⚠️ ${label} photo is an HTTP URL: ${p}`);
        return p; // Return as-is, Puppeteer might handle it
      }
      // Always try to base64 encode ANY path or filename string
      console.log(`  🔄 Encoding ${label} photo to base64: ${p}`);
      const embedded = this.base64EncodeImage(p);
      if (embedded) {
        console.log(`  ✅ ${label} photo encoded successfully (${embedded.substring(0, 50)}...)`);
      } else {
        console.log(`  ❌ Failed to encode ${label} photo`);
      }
      return embedded || '';
    };
    const primarySrc = photos.primary ? toSrc(photos.primary, 'primary') : null;
    const secondarySrc = photos.secondary ? toSrc(photos.secondary, 'secondary') : null;
    
    switch (certificateType) {
      case 'birth':
        return `
          <div class="photo-container">
            <div class="photo-placeholder">
              ${primarySrc ? `<img src="${primarySrc}" alt="Photo">` : '<div>Photo</div>'}
              <div class="photo-seal">
                <div class="photo-seal-inner">የኢትዮጵያ<br>የወሳኝ<br>ኩነት<br>ምዝገባ</div>
              </div>
            </div>
          </div>
        `;
        
      case 'marriage':
        return `
          <div class="photo-container">
            <div class="photo-placeholder">
              ${primarySrc ? `<img src="${primarySrc}" alt="Bride Photo">` : '<div>Bride</div>'}
            </div>
          </div>
          <div class="photo-container">
            <div class="photo-placeholder">
              ${secondarySrc ? `<img src="${secondarySrc}" alt="Groom Photo">` : '<div>Groom</div>'}
            </div>
          </div>
        `;
        
      case 'death':
        return `
          <div class="photo-container">
            <div class="photo-placeholder">
              ${primarySrc ? `<img src="${primarySrc}" alt="Photo">` : '<div>Photo</div>'}
              <div class="photo-seal">
                <div class="photo-seal-inner">የኢትዮጵያ<br>የወሳኝ<br>ኩነት<br>ምዝገባ</div>
              </div>
            </div>
          </div>
        `;
        
      case 'divorce':
        return `
          <div class="photo-container">
            <div class="photo-placeholder">
              ${primarySrc ? `<img src="${primarySrc}" alt="Spouse 1 Photo">` : '<div>Spouse 1</div>'}
            </div>
          </div>
          <div class="photo-container">
            <div class="photo-placeholder">
              ${secondarySrc ? `<img src="${secondarySrc}" alt="Spouse 2 Photo">` : '<div>Spouse 2</div>'}
            </div>
          </div>
        `;
        
      default:
        return '';
    }
  }

  generateWitnessSection(data) {
    return `
      <div class="witness-section">
        <div class="witness-box">
          <div class="witness-title">Witness 1 (መስከረም 1)</div>
          <div class="witness-field">
            <div class="witness-label">Name:</div>
            <div class="witness-value">${data.witness1Name || ''}</div>
          </div>
          <div class="witness-field">
            <div class="witness-label">Address:</div>
            <div class="witness-value">${data.witness1Address || ''}</div>
          </div>
          <div class="witness-field">
            <div class="witness-label">Signature:</div>
            <div class="witness-value"></div>
          </div>
        </div>
        <div class="witness-box">
          <div class="witness-title">Witness 2 (መስከረም 2)</div>
          <div class="witness-field">
            <div class="witness-label">Name:</div>
            <div class="witness-value">${data.witness2Name || ''}</div>
          </div>
          <div class="witness-field">
            <div class="witness-label">Address:</div>
            <div class="witness-value">${data.witness2Address || ''}</div>
          </div>
          <div class="witness-field">
            <div class="witness-label">Signature:</div>
            <div class="witness-value"></div>
          </div>
        </div>
      </div>
    `;
  }

  generateExactContentFields(certificateType, data) {
    switch (certificateType) {
      case 'birth':
        return this.generateBirthCertificateExactFields(data);
      case 'marriage':
        return this.generateMarriageCertificateExactFields(data);
      case 'death':
        return this.generateDeathCertificateExactFields(data);
      case 'divorce':
        return this.generateDivorceCertificateExactFields(data);
      default:
        return '<div>Certificate content not available</div>';
    }
  }

  generateBirthCertificateExactFields(data) {
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
          <div class="field-label">Mother's Father's Full Name (የእናት አባት ሙሉ ስም):</div>
          <div class="field-value">${data.motherFatherName}</div>
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
          <div class="field-value">${data.certificateIssuedPlace || data.registrationCity}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Certificate Number (የምስክር ወረቀት ቁጥር):</div>
          <div class="field-value">${data.certificateId}</div>
        </div>
      </div>
    `;
  }

  generateMarriageCertificateExactFields(data) {
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

  generateDeathCertificateExactFields(data) {
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
          <div class="field-value">${data.registrationRecordPageNumber}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Registration Record Line Number (የምዝገባ መዝገብ መስመር ቁጥር):</div>
          <div class="field-value">${data.registrationRecordLineNumber}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Registration Record Form Number (የምዝገባ መዝገብ ቅጽ ቁጥር):</div>
          <div class="field-value">${data.registrationRecordFormNumber}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Registration Record Form Page Number (የምዝገባ መዝገብ ቅጽ ገጽ ቁጥር):</div>
          <div class="field-value">${data.registrationRecordFormPageNumber}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Registration Record Form Line Number (የምዝገባ መዝገብ ቅጽ መስመር ቁጥር):</div>
          <div class="field-value">${data.registrationRecordFormLineNumber}</div>
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
          <div class="field-label">Registrar's ID No. (የምዝጋቢ መለያ ቁጥር):</div>
          <div class="field-value">${data.registrarIdNumber}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Registrar's Signature (የምዝጋቢ ፊርማ):</div>
          <div class="field-value">${data.registrarSignature}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Registrar's Seal (የምዝጋቢ ማህተም):</div>
          <div class="field-value">${data.registrarSeal}</div>
        </div>
      </div>
    `;
  }

  generateDivorceCertificateExactFields(data) {
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

  async generatePDF(htmlTemplate, certificateId, certificateType) {
    console.log('🔧 Starting PDF generation...');
    console.log('Certificate ID:', certificateId);
    console.log('Certificate Type:', certificateType);
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
      
      // Use landscape for birth certificates to match official format
      const pdfOptions = {
        path: pdfPath,
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: '0.2in',
          right: '0.2in',
          bottom: '0.2in',
          left: '0.2in'
        }
      };
      
      if (certificateType === 'birth') {
        pdfOptions.format = 'A4';
        pdfOptions.landscape = true;
      } else if (certificateType === 'death') {
        // Force portrait A4 and respect CSS single-page sizing for death certificates
        pdfOptions.format = 'A4';
        pdfOptions.landscape = false;
        pdfOptions.preferCSSPageSize = true;
        // Slight downscale to ensure content fits one page without spilling
        pdfOptions.scale = 0.92;
      } else {
        pdfOptions.format = 'A4';
      }
      
      await page.pdf(pdfOptions);
      
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

  // Format date showing both Ethiopian and Gregorian calendars (DD/MM/YYYY format)
  formatDateDual(dateInput, isEthiopianInput = false) {
    if (!dateInput) return '';
    
    try {
      const { ec, gc } = this.computeDualDates(dateInput, isEthiopianInput);
      if (!ec || !gc) {
        // Fallback to simple format
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
      
      // Format as DD/MM/YYYY for both calendars
      const formatEC = this.formatDateString(ec); // Ethiopian Calendar
      const formatGC = this.formatDateString(gc); // Gregorian Calendar
      
      // Return in format suitable for certificate: "DD/MM/YYYY (EC) / DD/MM/YYYY (GC)"
      return `${formatEC} (EC) / ${formatGC} (GC)`;
    } catch (e) {
      // Fallback to simple format on error
      try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch {
        return '';
      }
    }
  }

  formatDualDateBilingual(dateInput, isEthiopianInput = null) {
    if (!dateInput) {
      return { en: '', am: '' };
    }

    const tryFormat = (input, treatAsEthiopian) => {
      const { ec, gc } = this.computeDualDates(input, treatAsEthiopian);
      if (!ec && !gc) {
        return null;
      }
      const enEc = this.formatEthiopianDateEnglish(ec);
      const enGc = this.formatGregorianDateEnglish(gc);
      const amEc = this.formatEthiopianDateAmharic(ec);
      const amGc = this.formatGregorianDateAmharic(gc);

      return {
        en: [enEc, enGc].filter(Boolean).join(' / '),
        am: [amEc, amGc].filter(Boolean).join(' / ')
      };
    };

    if (isEthiopianInput === true || isEthiopianInput === false) {
      return (
        tryFormat(dateInput, isEthiopianInput) || {
          en: this.formatDate(dateInput) || '',
          am: this.formatNumberAmharic(this.formatDate(dateInput) || '')
        }
      );
    }

    return (
      tryFormat(dateInput, true) ||
      tryFormat(dateInput, false) || {
        en: this.formatDate(dateInput) || '',
        am: this.formatNumberAmharic(this.formatDate(dateInput) || '')
      }
    );
  }

  formatEthiopianDateEnglish(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map((part) => parseInt(part, 10));
    if (!year || !month || !day) return '';
    const monthName = ETHIOPIAN_MONTHS_EN[month - 1] || '';
    return `${monthName} ${day}, ${year} (EC)`;
  }

  formatEthiopianDateAmharic(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map((part) => parseInt(part, 10));
    if (!year || !month || !day) return '';
    const monthName = ETHIOPIAN_MONTHS_AM[month - 1] || '';
    return `${monthName} ${this.formatNumberAmharic(day)} ${this.formatNumberAmharic(year)} ዓ.ም`;
  }

  formatGregorianDateEnglish(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map((part) => parseInt(part, 10));
    if (!year || !month || !day) return '';
    const monthName = GREGORIAN_MONTHS_EN[month - 1] || '';
    return `${monthName} ${day}, ${year} (GC)`;
  }

  formatGregorianDateAmharic(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map((part) => parseInt(part, 10));
    if (!year || !month || !day) return '';
    const monthName = GREGORIAN_MONTHS_AM[month - 1] || '';
    return `${monthName} ${this.formatNumberAmharic(day)} ${this.formatNumberAmharic(year)} ግ.አ.`;
  }

  splitDateParts(input) {
    if (!input) {
      return { month: '', day: '', year: '' };
    }

    const normalizeToDate = (val) => {
      if (!val) return null;
      if (val instanceof Date && !isNaN(val)) return val;
      if (typeof val === 'number') {
        const d = new Date(val);
        return isNaN(d) ? null : d;
      }

      const str = String(val).trim();
      if (!str) return null;

      const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (isoMatch) {
        const year = Number(isoMatch[1]);
        const month = Number(isoMatch[2]);
        const day = Number(isoMatch[3]);
        return new Date(year, month - 1, day);
      }

      const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
      if (dmyMatch) {
        const day = Number(dmyMatch[1]);
        const month = Number(dmyMatch[2]);
        let year = Number(dmyMatch[3]);
        if (year < 100) year += 2000;
        return new Date(year, month - 1, day);
      }

      const parsed = new Date(str);
      return isNaN(parsed) ? null : parsed;
    };

    const date = normalizeToDate(input);
    if (!date) {
      return { month: '', day: '', year: '' };
    }

    return {
      month: GREGORIAN_MONTHS_EN[date.getMonth()],
      day: date.getDate().toString().padStart(2, '0'),
      year: date.getFullYear().toString()
    };
  }

  formatDualDateForDisplay(inputValue) {
    const dual = this.computeDualDates(inputValue);
    if (!dual || (!dual.ec && !dual.gc)) {
      return { am: '', en: '' };
    }
    const am = dual.ec ? this.formatEthiopianDateAmharic(dual.ec) : '';
    const en = dual.gc ? this.formatGregorianDateEnglish(dual.gc) : '';
    return { am, en };
  }

  formatNumberAmharic(value) {
    if (value === undefined || value === null) return '';
    const map = {
      '0': '0',
      '1': '፩',
      '2': '፪',
      '3': '፫',
      '4': '፬',
      '5': '፭',
      '6': '፮',
      '7': '፯',
      '8': '፰',
      '9': '፱'
    };
    return String(value)
      .split('')
      .map((char) => (map[char] ? map[char] : char))
      .join('');
  }

  // Format YYYY-MM-DD to DD/MM/YYYY
  formatDateString(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    return dateStr;
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

  // Add this util near the top of the class
  base64EncodeImage(photoPath) {
    if (!photoPath) {
      console.log('⚠️ base64EncodeImage: No photo path provided');
      return null;
    }
    
    // Check if it's already a data URL
    if (this.looksLikeDataUrl(photoPath)) {
      console.log('✅ Photo is already a data URL');
      return photoPath;
    }
    
    // Check if it's an HTTP URL
    if (this.looksLikeHttpUrl(photoPath)) {
      console.log('⚠️ Photo is an HTTP URL, cannot encode to base64');
      return photoPath; // Return as-is, Puppeteer might handle it
    }
    
    // Resolve the path if it's not absolute
    let resolvedPath = photoPath;
    if (!path.isAbsolute(photoPath)) {
      resolvedPath = path.join(this.uploadsPath, photoPath);
    }
    
    console.log(`🖼️ Encoding photo to base64: ${resolvedPath}`);
    
    if (!fs.existsSync(resolvedPath)) {
      console.error(`❌ Photo file does not exist: ${resolvedPath}`);
      // Try alternative paths
      const altPath = path.join(this.uploadsPath, path.basename(photoPath));
      if (fs.existsSync(altPath)) {
        console.log(`✅ Found photo at alternative path: ${altPath}`);
        resolvedPath = altPath;
      } else {
        return null;
      }
    }
    
    try {
      const ext = path.extname(resolvedPath).toLowerCase();
      let mime = 'image/jpeg'; // default
      if (ext === '.png') {
        mime = 'image/png';
      } else if (ext === '.jpg' || ext === '.jpeg') {
        mime = 'image/jpeg';
      } else if (ext === '.gif') {
        mime = 'image/gif';
      } else if (ext === '.webp') {
        mime = 'image/webp';
      }
      
      const file = fs.readFileSync(resolvedPath);
      const base64 = file.toString('base64');
      const dataUrl = `data:${mime};base64,${base64}`;
      console.log(`✅ Successfully encoded photo to base64 (size: ${base64.length} chars)`);
      return dataUrl;
    } catch (e) {
      console.error('❌ Failed to base64-encode photo:', e.message);
      console.error('   Path:', resolvedPath);
      return null;
    }
  }

  // Heuristics to detect stored image formats in the database
  looksLikeDataUrl(value) {
    return typeof value === 'string' && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(value);
  }
  looksLikeHttpUrl(value) {
    return typeof value === 'string' && /^https?:\/\//i.test(value);
  }
  looksLikeBase64Blob(value) {
    // Long base64 without data: header
    return typeof value === 'string'
      && /^[A-Za-z0-9+/=\s]+$/.test(value)
      && value.replace(/\s+/g, '').length > 200; // arbitrary length check
  }
}

export default ExactTemplateCertificateService;

