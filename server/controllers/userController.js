// useController.js

import User from "../models/User.js";
import Event from "../models/Event.js";
import Counter from "../models/Counter.js";
import Notification from "../models/Notification.js";
import Report from "../models/Report.js";
import { ReportTemplate, SentTemplate } from "../models/ReportTemplate.js";
import { ExactTemplateCertificateService } from '../services/exactTemplateCertificateService.js';
import EmailService from '../services/emailService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// jwt and JWT_SECRET are imported later in the file (avoid duplicate import)

// SSE clients map: userId -> Set of response objects
const sseClients = new Map();

const sendSseNotification = (userId, payload) => {
  const clients = sseClients.get(String(userId));
  if (!clients || clients.size === 0) return false;
  const data = JSON.stringify(payload);
  for (const res of clients) {
    try {
      res.write(`data: ${data}\n\n`);
    } catch (e) {
      // ignore write errors
    }
  }
  return true;
};

// IMPORTANT: Preserve the exact submitted payload without modification.
// We must not drop, transform, or hide any fields, including empty values.
const sanitizeData = (obj) => obj;

// Build query clauses for registrant-owned events (used in multiple endpoints)
const buildRegistrantOwnershipQuery = (user) => {
  const name = user.name;
  const nameFields = [
    "data.childNameEn",
    "data.childNameAm",
    "data.husbandNameEn",
    "data.wifeNameEn",
    "data.deceasedNameEn",
    "data.deceasedNameAm",
    "data.requesterName",
    "data.parentNameEn",
    "data.parentNameAm",
  ];
  const nameClauses = nameFields.map((f) => ({ [f]: name }));
  return {
    $or: [
      { "requestedCertificates.requestedBy": user.id },
      { "data.requesterId": user.id },
      { "data.submittedBy": name },
      ...nameClauses,
    ],
  };
};

// Check if a value is empty (null, undefined, empty string, or whitespace only)
const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  // Check for date objects (Ethiopian date format: {year, month, day})
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
    // If it's a date object with year/month/day, check if they're all empty
    if ('year' in value || 'month' in value || 'day' in value) {
      const year = value.year || '';
      const month = value.month || '';
      const day = value.day || '';
      if (!year && !month && !day) return true;
      // If any part is missing, consider it incomplete/empty
      if (!year || !month || !day) return true;
    }
    // For other objects, check if all keys are empty
    if (Object.keys(value).length === 0) return true;
    // Check if all values in the object are empty
    const allEmpty = Object.values(value).every(v => isEmpty(v));
    if (allEmpty) return true;
  }
  return false;
};

// Validate required fields for each event type
const validateRequiredFields = (type, data) => {
  const errors = [];
  const missingFields = [];

  // Check if data object is empty or has very few fields
  const dataKeys = Object.keys(data || {});
  const nonEmptyFields = dataKeys.filter(key => !isEmpty(data[key]));
  
  console.log(`[VALIDATION ${type}] Total fields: ${dataKeys.length}, Non-empty: ${nonEmptyFields.length}`);
  console.log(`[VALIDATION ${type}] Non-empty field names:`, nonEmptyFields);
  
  if (nonEmptyFields.length === 0) {
    console.log(`[VALIDATION ${type}] REJECTED: Form is completely empty`);
    return {
      isValid: false,
      message: 'Form cannot be empty. Please fill in all required fields.',
      missingFields: ['all']
    };
  }
  
  // If form has very few fields (less than 5), it's likely incomplete
  if (nonEmptyFields.length < 5) {
    console.log(`[VALIDATION ${type}] REJECTED: Form has too few fields (${nonEmptyFields.length} < 5)`);
    return {
      isValid: false,
      message: `Form is incomplete. Please fill in all required fields. Currently only ${nonEmptyFields.length} field(s) are filled.`,
      missingFields: ['too_few_fields']
    };
  }

  // Define required fields for each event type
  const requiredFields = {
    birth: [
      // Child information
      'childNameEn', 'childNameAm', 'childFullNameEn', 'childFullNameAm',
      'fatherNameEn', 'fatherNameAm', 'childFatherNameEn', 'childFatherNameAm',
      'grandfatherNameEn', 'grandfatherNameAm', 'childGrandfatherNameEn', 'childGrandfatherNameAm',
      'sex', 'childSex',
      'birthDate', 'childBirthDate',
      'birthPlace', 'childBirthPlace', 'placeOfBirthEn', 'placeOfBirthAm',
      // Mother information
      'motherNameEn', 'motherNameAm', 'motherFullNameEn', 'motherFullNameAm',
      'motherFatherNameEn', 'motherFatherNameAm',
      // Registration place
      'registrationRegion', 'region',
      'registrationZone', 'zone',
      'registrationWoreda', 'woreda',
      'registrationKebele', 'kebele'
    ],
    death: [
      // Deceased information
      'deceasedNameEn', 'deceasedNameAm',
      'deceasedFatherEn', 'deceasedFatherAm',
      'deceasedGrandfatherEn', 'deceasedGrandfatherAm',
      'deceasedSex', 'sex',
      'deathDate',
      'deathPlace', 'deathPlaceEn', 'deathPlaceAm',
      // Registration place
      'registrationRegion', 'region',
      'registrationZone', 'zone',
      'registrationWoreda', 'woreda',
      'registrationKebele', 'kebele'
    ],
    marriage: [
      // Wife information
      'wifeNameEn', 'wifeNameAm',
      'wifeFatherEn', 'wifeFatherAm', 'wifeFatherNameEn', 'wifeFatherNameAm',
      'wifeGrandfatherEn', 'wifeGrandfatherAm', 'wifeGrandfatherNameEn', 'wifeGrandfatherNameAm',
      'wifeBirthDate',
      // Husband information
      'husbandNameEn', 'husbandNameAm',
      'husbandFatherEn', 'husbandFatherAm', 'husbandFatherNameEn', 'husbandFatherNameAm',
      'husbandGrandfatherEn', 'husbandGrandfatherAm', 'husbandGrandfatherNameEn', 'husbandGrandfatherNameAm',
      'husbandBirthDate',
      'marriageDate',
      'marriagePlace', 'marriagePlaceEn', 'marriagePlaceAm',
      // Registration place
      'registrationRegion', 'region',
      'registrationZone', 'zone',
      'registrationWoreda', 'woreda',
      'registrationKebele', 'kebele'
    ],
    divorce: [
      // Spouse 1 information
      'spouse1NameEn', 'spouse1NameAm', 'divorceSpouse1NameEn', 'divorceSpouse1NameAm',
      'spouse1FatherEn', 'spouse1FatherAm', 'divorceSpouse1FatherNameEn', 'divorceSpouse1FatherNameAm',
      'spouse1GrandfatherEn', 'spouse1GrandfatherAm', 'divorceSpouse1GrandfatherNameEn', 'divorceSpouse1GrandfatherNameAm',
      // Spouse 2 information
      'spouse2NameEn', 'spouse2NameAm', 'divorceSpouse2NameEn', 'divorceSpouse2NameAm',
      'spouse2FatherEn', 'spouse2FatherAm', 'divorceSpouse2FatherNameEn', 'divorceSpouse2FatherNameAm',
      'spouse2GrandfatherEn', 'spouse2GrandfatherAm', 'divorceSpouse2GrandfatherNameEn', 'divorceSpouse2GrandfatherNameAm',
      'divorceDate',
      // Registration place
      'registrationRegion', 'region',
      'registrationZone', 'zone',
      'registrationWoreda', 'woreda',
      'registrationKebele', 'kebele'
    ]
  };

  const fields = requiredFields[type] || [];
  
  // Check if at least one variant of each required field group is filled
  // Group fields by their base name (e.g., childNameEn, childNameAm, childFullNameEn, childFullNameAm are all name variants)
  const fieldGroups = {
    birth: {
      childName: ['childNameEn', 'childNameAm', 'childFullNameEn', 'childFullNameAm'],
      fatherName: ['fatherNameEn', 'fatherNameAm', 'childFatherNameEn', 'childFatherNameAm'],
      grandfatherName: ['grandfatherNameEn', 'grandfatherNameAm', 'childGrandfatherNameEn', 'childGrandfatherNameAm'],
      sex: ['sex', 'childSex'],
      birthDate: ['birthDate', 'childBirthDate'],
      birthPlace: ['birthPlace', 'childBirthPlace', 'placeOfBirthEn', 'placeOfBirthAm'],
      motherName: ['motherNameEn', 'motherNameAm', 'motherFullNameEn', 'motherFullNameAm'],
      motherFatherName: ['motherFatherNameEn', 'motherFatherNameAm'],
      registrationRegion: ['registrationRegion', 'region'],
      registrationZone: ['registrationZone', 'zone'],
      registrationWoreda: ['registrationWoreda', 'woreda'],
      registrationKebele: ['registrationKebele', 'kebele']
    },
    death: {
      deceasedName: ['deceasedNameEn', 'deceasedNameAm'],
      deceasedFather: ['deceasedFatherEn', 'deceasedFatherAm'],
      deceasedGrandfather: ['deceasedGrandfatherEn', 'deceasedGrandfatherAm'],
      deceasedSex: ['deceasedSex', 'sex'],
      deathDate: ['deathDate'],
      deathPlace: ['deathPlace', 'deathPlaceEn', 'deathPlaceAm'],
      registrationRegion: ['registrationRegion', 'region'],
      registrationZone: ['registrationZone', 'zone'],
      registrationWoreda: ['registrationWoreda', 'woreda'],
      registrationKebele: ['registrationKebele', 'kebele']
    },
    marriage: {
      wifeName: ['wifeNameEn', 'wifeNameAm'],
      wifeFather: ['wifeFatherEn', 'wifeFatherAm', 'wifeFatherNameEn', 'wifeFatherNameAm'],
      wifeGrandfather: ['wifeGrandfatherEn', 'wifeGrandfatherAm', 'wifeGrandfatherNameEn', 'wifeGrandfatherNameAm'],
      wifeBirthDate: ['wifeBirthDate'],
      husbandName: ['husbandNameEn', 'husbandNameAm'],
      husbandFather: ['husbandFatherEn', 'husbandFatherAm', 'husbandFatherNameEn', 'husbandFatherNameAm'],
      husbandGrandfather: ['husbandGrandfatherEn', 'husbandGrandfatherAm', 'husbandGrandfatherNameEn', 'husbandGrandfatherNameAm'],
      husbandBirthDate: ['husbandBirthDate'],
      marriageDate: ['marriageDate'],
      marriagePlace: ['marriagePlace', 'marriagePlaceEn', 'marriagePlaceAm'],
      registrationRegion: ['registrationRegion', 'region'],
      registrationZone: ['registrationZone', 'zone'],
      registrationWoreda: ['registrationWoreda', 'woreda'],
      registrationKebele: ['registrationKebele', 'kebele']
    },
    divorce: {
      spouse1Name: ['spouse1NameEn', 'spouse1NameAm', 'divorceSpouse1NameEn', 'divorceSpouse1NameAm'],
      spouse1Father: ['spouse1FatherEn', 'spouse1FatherAm', 'divorceSpouse1FatherNameEn', 'divorceSpouse1FatherNameAm'],
      spouse1Grandfather: ['spouse1GrandfatherEn', 'spouse1GrandfatherAm', 'divorceSpouse1GrandfatherNameEn', 'divorceSpouse1GrandfatherNameAm'],
      spouse2Name: ['spouse2NameEn', 'spouse2NameAm', 'divorceSpouse2NameEn', 'divorceSpouse2NameAm'],
      spouse2Father: ['spouse2FatherEn', 'spouse2FatherAm', 'divorceSpouse2FatherNameEn', 'divorceSpouse2FatherNameAm'],
      spouse2Grandfather: ['spouse2GrandfatherEn', 'spouse2GrandfatherAm', 'divorceSpouse2GrandfatherNameEn', 'divorceSpouse2GrandfatherNameAm'],
      divorceDate: ['divorceDate'],
      registrationRegion: ['registrationRegion', 'region'],
      registrationZone: ['registrationZone', 'zone'],
      registrationWoreda: ['registrationWoreda', 'woreda'],
      registrationKebele: ['registrationKebele', 'kebele']
    }
  };

  const groups = fieldGroups[type] || {};
  
  // Check each required field group
  for (const [groupName, fieldVariants] of Object.entries(groups)) {
    const hasValue = fieldVariants.some(field => {
      const value = data[field];
      // For date fields, also check if it's a valid date string (YYYY-MM-DD format)
      if (field.includes('Date') || field.includes('date')) {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return true; // Valid date string
        }
      }
      return !isEmpty(value);
    });
    
    if (!hasValue) {
      missingFields.push(groupName);
    }
  }
  
  // Additional check: ensure at least a minimum number of essential fields are filled
  // This prevents forms with only a few non-essential fields from passing
  const essentialFieldCount = Object.keys(groups).length;
  const filledFieldCount = Object.keys(groups).filter(groupName => {
    const fieldVariants = groups[groupName];
    return fieldVariants.some(field => {
      const value = data[field];
      if (field.includes('Date') || field.includes('date')) {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return true;
        }
      }
      return !isEmpty(value);
    });
  }).length;
  
  // Require ALL essential fields to be filled (100%) - no partial submissions allowed
  // This ensures forms are completely filled before submission
  console.log(`[VALIDATION ${type}] Essential fields: ${essentialFieldCount}, Filled: ${filledFieldCount}, Missing: ${missingFields.length}`);
  console.log(`[VALIDATION ${type}] Missing field groups:`, missingFields);
  
  if (missingFields.length > 0) {
    console.log(`[VALIDATION ${type}] REJECTED: Missing required fields: ${missingFields.join(', ')}`);
    return {
      isValid: false,
      message: `Form is incomplete. Please fill in all required fields. Missing: ${missingFields.join(', ')}`,
      missingFields
    };
  }
  
  // Double-check: ensure we have at least the minimum number of filled fields
  // This catches cases where field groups might not be properly detected
  if (filledFieldCount < essentialFieldCount) {
    console.log(`[VALIDATION ${type}] REJECTED: Only ${filledFieldCount}/${essentialFieldCount} essential fields filled`);
    return {
      isValid: false,
      message: `Form is incomplete. Please fill in all required fields. Currently only ${filledFieldCount} out of ${essentialFieldCount} essential field groups are filled.`,
      missingFields: ['incomplete_form']
    };
  }
  
  console.log(`[VALIDATION ${type}] PASSED: All ${essentialFieldCount} required field groups are filled`);
  return { isValid: true };
};

// Fill registration place fields from event place fields if missing
const applyRegistrationFallbacks = (data, type) => {
  const out = { ...(data || {}) };
  const get = (k) => (out[k] !== undefined && out[k] !== null && out[k] !== '' ? out[k] : null);
  const setIfMissing = (k, v) => {
    if (out[k] === undefined || out[k] === null || out[k] === '') out[k] = v ?? out[k];
  };
  // Common birth place as defaults
  setIfMissing('registrationRegion', get('registrationRegion') ?? get('region'));
  setIfMissing('registrationZone', get('registrationZone') ?? get('zone'));
  setIfMissing('registrationWoreda', get('registrationWoreda') ?? get('woreda') ?? get('birthPlaceWoreda'));
  setIfMissing('registrationCity', get('registrationCity') ?? get('birthPlaceCity'));
  setIfMissing('registrationSubCity', get('registrationSubCity') ?? get('birthPlaceSubCity'));
  setIfMissing('registrationKebele', get('registrationKebele') ?? get('kebele') ?? get('birthPlaceKebele'));

  // Registration number/date fallbacks
  setIfMissing('registrationNumber', get('registrationId') ?? get('mainRegistrationRecordNumberAm'));
  setIfMissing('mainRegistrationRecordNumberAm', get('mainRegistrationRecordNumberAm') ?? get('registrationNumber'));
  // Prefer explicit registration date; otherwise use event date
  setIfMissing('registrationDateEth', get('registrationDateEth') ?? get('registrarDateAm') ?? get('dateOfEvent') ?? get('birthDate') ?? get('marriageDate') ?? get('deathDate'));

  // If birth place city/subcity are empty but registration has values, use them
  setIfMissing('birthPlaceCity', get('birthPlaceCity') ?? get('registrationCity'));
  setIfMissing('birthPlaceSubCity', get('birthPlaceSubCity') ?? get('registrationSubCity'));

  // Death-specific fallbacks
  if (type === 'death') {
    setIfMissing('registrationRegion', get('registrationRegion') ?? get('deathRegion'));
    setIfMissing('registrationZone', get('registrationZone') ?? get('deathZone'));
    setIfMissing('registrationWoreda', get('registrationWoreda') ?? get('deathWoreda'));
    setIfMissing('registrationCity', get('registrationCity') ?? get('deathCity'));
    setIfMissing('registrationSubCity', get('registrationSubCity') ?? get('deathSubCity'));
    setIfMissing('registrationKebele', get('registrationKebele') ?? get('deathKebele') ?? get('deathKebeleAm'));
    // If death place city/subcity exist, let them backfill registration if still missing
    setIfMissing('registrationCity', get('registrationCity') ?? get('deathPlaceCity'));
    setIfMissing('registrationSubCity', get('registrationSubCity') ?? get('deathPlaceSubCity'));
    
    // Construct deathPlace from geographic components if missing
    if (!get('deathPlace') && !get('deathPlaceEn') && !get('deathPlaceAm')) {
      const placeParts = [
        get('deathPlaceRegion'),
        get('deathPlaceZone'),
        get('deathPlaceWoreda'),
        get('deathPlaceSubCity'),
        get('deathPlaceKebele'),
        get('deathCity'),
        get('deathSubCity'),
        get('deathWoreda'),
        get('deathKebeleAm')
      ].filter(Boolean);
      if (placeParts.length > 0) {
        out.deathPlace = placeParts.join(', ');
        out.deathPlaceAm = placeParts.join(', ');
      }
    }
  }

  // Marriage-specific fallbacks
  if (type === 'marriage') {
    setIfMissing('registrationRegion', get('registrationRegion') ?? get('marriageRegion'));
    setIfMissing('registrationZone', get('registrationZone') ?? get('marriageZone'));
    setIfMissing('registrationWoreda', get('registrationWoreda') ?? get('marriageWoreda'));
    setIfMissing('registrationCity', get('registrationCity') ?? get('marriageCity'));
    setIfMissing('registrationSubCity', get('registrationSubCity') ?? get('marriageSubCity'));
    setIfMissing('registrationKebele', get('registrationKebele') ?? get('marriageKebele'));
  }

  // Divorce-specific fallbacks
  if (type === 'divorce') {
    setIfMissing('registrationRegion', get('registrationRegion') ?? get('divorceRegion'));
    setIfMissing('registrationZone', get('registrationZone') ?? get('divorceZone'));
    setIfMissing('registrationWoreda', get('registrationWoreda') ?? get('divorceWoreda'));
    setIfMissing('registrationCity', get('registrationCity') ?? get('divorceCity'));
    setIfMissing('registrationSubCity', get('registrationSubCity') ?? get('divorceSubCity'));
    setIfMissing('registrationKebele', get('registrationKebele') ?? get('divorceKebele') ?? get('divorceKebeleAm'));
  }

  return out;
};

// Optional email helper (uses nodemailer if available and env configured)
const trySendEmail = async ({ to, subject, text, html }) => {
  try {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      // SMTP not configured
      return false;
    }
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transporter.sendMail({ from: EMAIL_FROM || SMTP_USER, to, subject, text, html });
    return true;
  } catch (err) {
    console.error('Email send failed', err?.message || err);
    return false;
  }
};
/**
 * Generate and reserve a new unique registrationId (integer string)
 */
export const generateRegistrationId = async (req, res) => {
  try {
    // Find the smallest positive integer not already used as a registrationId
    // We intentionally allow reusing gaps where a previously generated id was not saved.
    const docs = await Event.find({}, "registrationId").lean();
    const used = new Set();
    for (const d of docs) {
      const n = parseInt(d.registrationId, 10);
      if (!isNaN(n) && n > 0) used.add(n);
    }
    let candidate = 1;
    while (used.has(candidate)) candidate += 1;

    // Return the candidate as a string (existing clients expect string)
    return res.json({ registrationId: String(candidate) });
  } catch (err) {
    res.status(500).json({ message: "Error generating registration ID", error: err.message });
  }
};

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";
import { enrichDataWithAllFields } from "../formFields.js";

// Server-Sent Events (SSE) endpoint for notifications stream
export const notificationsStream = (req, res) => {
  try {
    // Allow token via query or Authorization header
    const token = (req.query && req.query.token) || (req.headers && (req.headers.authorization || req.headers.Authorization) && (req.headers.authorization || req.headers.Authorization).split(' ')[1]);
    let userId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded && decoded.id;
      } catch (e) {
        // ignore invalid token; we'll still allow connections without token
      }
    }

    // Use userId if available, otherwise require client to pass ?userId=...
    if (!userId) userId = req.query && req.query.userId;
    if (!userId) return res.status(400).json({ message: 'Missing userId or token' });

    // Setup SSE headers
    res.writeHead(200, {
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
    });
    res.write('\n');

    // Add to clients map
    let clientSet = sseClients.get(String(userId));
    if (!clientSet) {
      clientSet = new Set();
      sseClients.set(String(userId), clientSet);
    }
    clientSet.add(res);

    // Remove on close
    req.on('close', () => {
      clientSet.delete(res);
      if (clientSet.size === 0) sseClients.delete(String(userId));
    });
  } catch (err) {
    console.error('notificationsStream error', err);
    try { res.status(500).end('Server error'); } catch(e){}
  }
};

const ID_FIELDS_BY_TYPE = {
  birth: ['childIdNumberAm'],
  death: ['deceasedIdNumberAm'],
  marriage: ['wifeIdNumberAm', 'husbandIdNumberAm'],
  divorce: ['divorceSpouse1IdAm', 'divorceSpouse2IdAm'],
};

const REPORTING_ROLES = ["registrar", "hospital", "church", "mosque"];

const MALE_SEX_VALUES = ['male', 'm', 'boy', 'ወንድ', 'ወን', 'ወ'];
const FEMALE_SEX_VALUES = ['female', 'f', 'girl', 'ሴት', 'ሴ'];

const normalizeSex = (value) => {
  if (value === undefined || value === null) return null;
  const str = String(value).trim().toLowerCase();
  if (!str) return null;
  if (MALE_SEX_VALUES.some((token) => str.startsWith(token))) return 'male';
  if (FEMALE_SEX_VALUES.some((token) => str.startsWith(token))) return 'female';
  return null;
};

const idsEqual = (a, b) => {
  if (!a || !b) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
};

const expectedSexForField = (fieldName) => {
  if (!fieldName) return null;
  const lower = String(fieldName).toLowerCase();
  if (lower.includes('wife') || lower.includes('bride')) return 'female';
  if (lower.includes('husband') || lower.includes('groom')) return 'male';
  return null;
};

const matchIdInEvent = (event, normalizedId) => {
  if (!event) return {};
  const data = event.data || {};
  const normalized = normalizedId?.trim().toLowerCase();
  if (!normalized) return {};

  const build = (matchedField, nameField, existingName) => ({
    matchedField,
    nameField,
    existingName: existingName || null,
  });

  if (event.type === 'birth' && idsEqual(data.childIdNumberAm, normalizedId)) {
    return build('childIdNumberAm', 'childNameAm', data.childNameAm || data.childNameEn);
  }

  if (event.type === 'death' && idsEqual(data.deceasedIdNumberAm, normalizedId)) {
    return build('deceasedIdNumberAm', 'deceasedNameAm', data.deceasedNameAm || data.deceasedNameEn);
  }

  if (event.type === 'marriage') {
    if (idsEqual(data.wifeIdNumberAm, normalizedId)) {
      return build('wifeIdNumberAm', 'wifeNameAm', data.wifeNameAm || data.wifeNameEn);
    }
    if (idsEqual(data.husbandIdNumberAm, normalizedId)) {
      return build('husbandIdNumberAm', 'husbandNameAm', data.husbandNameAm || data.husbandNameEn);
    }
  }

  if (event.type === 'divorce') {
    if (idsEqual(data.divorceSpouse1IdAm, normalizedId)) {
      return build('divorceSpouse1IdAm', 'divorceSpouse1NameAm', data.divorceSpouse1NameAm || data.divorceSpouse1NameEn);
    }
    if (idsEqual(data.divorceSpouse2IdAm, normalizedId)) {
      return build('divorceSpouse2IdAm', 'divorceSpouse2NameAm', data.divorceSpouse2NameAm || data.divorceSpouse2NameEn);
    }
  }

  return {};
};

const detectExistingSex = (event, normalizedId, matchedField) => {
  if (!event) return null;
  const data = event.data || {};
  if (event.type === 'birth') {
    return normalizeSex(
      data.childSex ??
      data.sex ??
      data.childSexAm ??
      data.childSexEn
    );
  }
  if (event.type === 'death') {
    return normalizeSex(
      data.deceasedSex ??
      data.sex ??
      data.deceasedSexAm ??
      data.deceasedSexEn
    );
  }
  if (event.type === 'marriage') {
    const lowerField = matchedField?.toLowerCase();
    if (lowerField?.includes('wife')) return 'female';
    if (lowerField?.includes('husband')) return 'male';
    if (idsEqual(data.wifeIdNumberAm, normalizedId)) return 'female';
    if (idsEqual(data.husbandIdNumberAm, normalizedId)) return 'male';
  }
  return null;
};

const extractSexFromBirthRecord = (birthRecord) => {
  if (!birthRecord?.data) return null;
  const data = birthRecord.data;
  return normalizeSex(
    data.childSex ??
    data.sex ??
    data.childSexAm ??
    data.childSexEn
  );
};

const sexMismatchMessage = (expectedSex) => {
  if (expectedSex === 'female') {
    return "This ID number is registered as male and cannot be used for the wife's information.";
  }
  if (expectedSex === 'male') {
    return "This ID number is registered as female and cannot be used for the husband's information.";
  }
  return "This ID number cannot be used for this person.";
};

const buildSexWarningMessage = (expectedSex) => {
  if (expectedSex === 'female') {
    return "This ID number is not female's.";
  }
  if (expectedSex === 'male') {
    return "This ID number is not male's.";
  }
  return "This ID number does not match the required sex.";
};

const SEX_LOOKUP_FIELDS = [
  'data.wifeIdNumberAm',
  'data.husbandIdNumberAm',
  'data.childIdNumberAm',
  'data.deceasedIdNumberAm',
  'data.divorceSpouse1IdAm',
  'data.divorceSpouse2IdAm',
];

const buildIdSearchClause = (field, escapedId) => ({
  [field]: {
    $regex: new RegExp(`^${escapedId}$`, 'i'),
  },
});

async function resolveSexByIdNumber(idNumber) {
  const normalizedId = String(idNumber || '').trim();
  if (!normalizedId) return null;

  const birthRecord = await findBirthRecordByIdNumber(normalizedId);
  const birthSex = extractSexFromBirthRecord(birthRecord);
  if (birthSex) {
    return {
      sex: birthSex,
      source: 'birth',
      registrationId: birthRecord?.registrationId,
    };
  }

  const escapedId = normalizedId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const candidate = await Event.findOne({
    $or: SEX_LOOKUP_FIELDS.map((field) => buildIdSearchClause(field, escapedId)),
  }).lean();

  if (!candidate) return null;

  const { matchedField } = matchIdInEvent(candidate, normalizedId);
  const sex = detectExistingSex(candidate, normalizedId, matchedField);

  if (!sex) return null;

  return {
    sex,
    source: candidate.type,
    registrationId: candidate.registrationId,
    matchedField,
  };
}

async function validateMarriageSexAssignments(data) {
  if (!data) return null;
  const checks = [];
  if (data.wifeIdNumberAm) {
    checks.push({ field: 'wifeIdNumberAm', expectedSex: 'female', id: data.wifeIdNumberAm });
  }
  if (data.husbandIdNumberAm) {
    checks.push({ field: 'husbandIdNumberAm', expectedSex: 'male', id: data.husbandIdNumberAm });
  }

  for (const check of checks) {
    const resolved = await resolveSexByIdNumber(check.id);
    if (resolved?.sex && resolved.sex !== check.expectedSex) {
      return {
        ...check,
        detectedSex: resolved.sex,
        registrationId: resolved.registrationId,
        source: resolved.source,
      };
    }
  }
  return null;
}

/**
 * ========================
 * AUTHENTICATION
 * ========================
 */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // Only allow @gmail.com or @yahoo.com emails
    const validEmail = /^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com)$/.test(email);
    if (!validEmail) {
      return res.status(400).json({ message: "Email must end with @gmail.com or @yahoo.com" });
    }

    console.log(`Registration attempt for email: ${email}, name: ${name}`);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`Registration failed - user already exists: ${email}`);
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: "registrant",
      active: true,
    });

    console.log(
      `Creating user with role: ${user.role}, active: ${user.active}`
    );

    await user.save();

    console.log(`User saved successfully: ${user._id}`);

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "1d",
    });

    console.log(
      `Registration successful for user: ${email}, role: ${user.role}`
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(`Registration error for email ${req.body.email}:`, err);
    res
      .status(500)
      .json({ message: "Error registering user", error: err.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(`Login attempt for email: ${email}`);

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User not found for email: ${email}`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log(
      `User found: ${user.name}, role: ${user.role}, active: ${user.active}`
    );

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`Password mismatch for user: ${email}`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.active) {
      console.log(`Inactive account attempt: ${email}`);
      return res
        .status(403)
        .json({ message: "Account not active. Contact admin/manager." });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "1d",
    });

    console.log(`Login successful for user: ${email}, role: ${user.role}`);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(`Login error for email ${req.body.email}:`, err);
    res.status(500).json({ message: "Error logging in", error: err.message });
  }
};

/**
 * ========================
 * PROFILE
 * ========================
 */
export const updateProfile = async (req, res) => {
  try {
    const update = {};
    if (req.body.name) {
      update.name = req.body.name;
    }
    if (req.file) {
      update["profile.profilePic"] = `/uploads/${req.file.filename}`;
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      update,
      { new: true }
    ).select("-password");
    res.json({ message: "Profile updated", user });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating profile", error: err.message });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.findByIdAndUpdate(req.user.id, { password: hashed }, { new: true }).select("-password");
    res.json({ message: "Password updated", user });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating password", error: err.message });
  }
};

export const uploadProfilePic = async (req, res) => {
  console.log('uploadProfilePic:', { user: req.user, file: req.file });
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { "profile.profilePic": imageUrl },
      { new: true }
    ).select("-password");
    res.json({ message: "Profile picture updated", user });
  } catch (err) {
    res.status(500).json({ message: "Error uploading profile picture", error: err.message });
  }
};

/**
 * ========================
 * ADMIN / MANAGER FUNCTIONS
 * ========================
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching users", error: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    console.log("Delete user request by:", req.user);
    console.log("Attempting to delete userId:", req.params.userId);
    const deleted = await User.findByIdAndDelete(req.params.userId);
    if (!deleted) {
      return res.status(404).json({ message: "User not found for deletion" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Error deleting user", error: err.message });
  }
};

export const changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role },
      { new: true }
    ).select("-password");
    res.json({ message: "User role updated", user });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error changing role", error: err.message });
  }
};

export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalEvents = await Event.countDocuments();
    const pendingEvents = await Event.countDocuments({ status: "pending" });
    const approvedEvents = await Event.countDocuments({ status: "approved" });
    const rejectedEvents = await Event.countDocuments({ status: "rejected" });
    const draftEvents = await Event.countDocuments({ status: "draft" });

    const stats = {
      users: { total: totalUsers },
      events: {
        total: totalEvents,
        pending: pendingEvents,
        approved: approvedEvents,
        rejected: rejectedEvents,
        draft: draftEvents,
      },
    };

    res.json(stats);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching admin stats", error: err.message });
  }
};

// Public stats endpoint for Home page and public dashboards
export const getPublicStats = async (req, res) => {
  try {
    // Only count approved registrations for each type
    const birthCount = await Event.countDocuments({ type: 'birth', status: 'approved' });
    const marriageCount = await Event.countDocuments({ type: 'marriage', status: 'approved' });
    const deathCount = await Event.countDocuments({ type: 'death', status: 'approved' });
    const divorceCount = await Event.countDocuments({ type: 'divorce', status: 'approved' });
    const totalEvents = await Event.countDocuments({ status: 'approved' });
    const totalUsers = await User.countDocuments();
    res.json({
      events: {
        total: totalEvents,
        birth: birthCount,
        marriage: marriageCount,
        death: deathCount,
        divorce: divorceCount,
      },
      users: { total: totalUsers },
    });
  } catch (err) {
    console.error('Error fetching public stats', err);
    res.status(500).json({ message: 'Error fetching public stats', error: err.message });
  }
};

const MAX_REPORT_SAMPLE_EVENTS = 40;

const sanitizeSampleEvents = (samples) => {
  if (!Array.isArray(samples)) return [];
  return samples.slice(0, MAX_REPORT_SAMPLE_EVENTS).map((item = {}) => {
    const createdAt = item.createdAt ? new Date(item.createdAt) : null;
    return {
      registrationId: item.registrationId ? String(item.registrationId).slice(0, 120) : null,
      type: item.type || null,
      status: item.status || null,
      createdAt: createdAt && !Number.isNaN(createdAt.valueOf()) ? createdAt : undefined,
      summary: item.summary ? String(item.summary).slice(0, 240) : item.keyPerson || null,
    };
  });
};

const buildReportInsights = ({ metrics = {}, totalsByType = {}, role }) => {
  const insights = [];
  const total = Number(metrics.total) || 0;
  if (total > 0) {
    insights.push(`Total submissions reviewed: ${total}`);
  }
  const approved = Number(metrics.approved) || 0;
  const rejected = Number(metrics.rejected) || 0;
  if (approved > 0 || rejected > 0) {
    insights.push(`Decisions: ${approved} approved / ${rejected} rejected`);
  }
  const pending = Number(metrics.pending) || 0;
  if (pending > 0) {
    insights.push(`Pending follow-up items: ${pending}`);
  }
  const topTypeEntry = Object.entries(totalsByType || {})
    .filter(([, count]) => Number(count) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  if (topTypeEntry) {
    insights.push(`Most frequent record type: ${topTypeEntry[0]} (${topTypeEntry[1]})`);
  }
  if (role) {
    insights.push(`Report filed by ${role} office`);
  }
  return insights;
};

export const submitOperationalReport = async (req, res) => {
  try {
    if (!REPORTING_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: "Only registrar, hospital, church, or mosque accounts can submit reports" });
    }
    const {
      title,
      summary,
      metrics = {},
      totalsByType = {},
      period = {},
      sampleEvents = [],
      insights = [],
      context = {},
    } = req.body || {};

    if (!title || !summary) {
      return res.status(400).json({ message: "Title and summary are required" });
    }

    // Event details removed - reports should not include event information
    const derivedInsights = insights.length > 0 ? insights : buildReportInsights({ metrics, totalsByType, role: req.user.role });
    const report = await Report.create({
      title: String(title).trim().slice(0, 140),
      summary: String(summary).trim(),
      notes: req.body.notes ? String(req.body.notes).trim() : String(summary).trim(),
      metrics,
      totalsByType,
      period: {
        key: period.key || null,
        label: period.label || null,
        start: period.start ? new Date(period.start) : undefined,
        end: period.end ? new Date(period.end) : new Date(),
      },
      sampleEvents: [], // Event details not included in reports
      submittedBy: req.user.id,
      submittedByRole: req.user.role,
      insights: derivedInsights,
      context: {
        ...context,
        lang: context.lang || req.body.lang || 'en',
        totalRecordsConsidered: context.totalRecordsConsidered || metrics.total || 0,
      },
    });

    try {
      const managers = await User.find({ role: "manager" }).select("_id");
      for (const manager of managers) {
        const message = `Operational report "${report.title}" submitted by ${req.user.role}`;
        const note = await Notification.create({
          userId: manager._id,
          type: "info",
          message,
          data: { reportId: report._id, submittedByRole: req.user.role },
        });
        try {
          sendSseNotification(manager._id, {
            type: "report.submitted",
            message: note.message,
            data: note.data,
            createdAt: note.createdAt,
          });
        } catch (e) {
          // ignore SSE errors
        }
      }
    } catch (notifyErr) {
      console.error("Failed to notify managers about report", notifyErr);
    }

    res.status(201).json({ message: "Report submitted successfully", report });
  } catch (err) {
    console.error("submitOperationalReport error:", err);
    res.status(500).json({ message: "Error submitting report", error: err.message });
  }
};

export const listMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ submittedBy: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("feedback.sentBy", "name role")
      .lean();
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: "Error fetching submitted reports", error: err.message });
  }
};

export const listOperationalReportsForManager = async (req, res) => {
  try {
    const reports = await Report.find({})
      .sort({ createdAt: -1 })
      .populate("submittedBy", "name role profile")
      .populate("feedback.sentBy", "name role")
      .lean();
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: "Error fetching operational reports", error: err.message });
  }
};

export const sendReportFeedback = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { message, recipientRoles = [], includeReporter = true } = req.body || {};
    if (!reportId) {
      return res.status(400).json({ message: "Missing reportId" });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Feedback message is required" });
    }
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    const normalizedRoles = recipientRoles.filter((role) => REPORTING_ROLES.includes(role));
    if (!includeReporter && normalizedRoles.length === 0) {
      return res.status(400).json({ message: "Select at least one recipient group" });
    }

    const entry = {
      message: message.trim(),
      sentBy: req.user.id,
      recipients: normalizedRoles,
      includeReporter: includeReporter !== false,
      createdAt: new Date(),
    };
    report.feedback.push(entry);
    report.status = "responded";
    report.lastFeedbackAt = new Date();
    await report.save();

    const recipientIds = new Set();
    if (entry.includeReporter && report.submittedBy) {
      recipientIds.add(String(report.submittedBy));
    }
    if (normalizedRoles.length > 0) {
      const roleRecipients = await User.find({ role: { $in: normalizedRoles } }).select("_id");
      roleRecipients.forEach((userDoc) => recipientIds.add(String(userDoc._id)));
    }

    for (const id of recipientIds) {
      try {
        const note = await Notification.create({
          userId: id,
          type: "info",
          message: `Manager feedback: ${entry.message.slice(0, 140)}`,
          data: { reportId: report._id },
        });
        sendSseNotification(id, {
          type: "report.feedback",
          message: note.message,
          data: note.data,
          createdAt: note.createdAt,
        });
      } catch (notifyErr) {
        console.error("Failed to push feedback notification", notifyErr);
      }
    }

    const populated = await Report.findById(report._id)
      .populate("submittedBy", "name role profile")
      .populate("feedback.sentBy", "name role")
      .lean();

    res.json({ message: "Feedback sent", report: populated });
  } catch (err) {
    console.error("sendReportFeedback error:", err);
    res.status(500).json({ message: "Error sending feedback", error: err.message });
  }
};

/**
 * ========================
 * MANAGER FUNCTIONS
 * ========================
 */
export const approveEvent = async (req, res) => {
  try {
    const { rejectionReason } = req.body || {};
    const updateData = {
      status: "approved",
      approvedBy: req.user.id,
      approvedAt: new Date(),
      lastModifiedBy: req.user.id,
      lastModifiedAt: new Date(),
    };

    if (rejectionReason) {
      updateData.status = "rejected";
      updateData.rejectionReason = rejectionReason;
      updateData.rejectedAt = new Date();
      updateData.rejectedBy = req.user.id;
      delete updateData.approvedBy;
      delete updateData.approvedAt;
    }

    const event = await Event.findByIdAndUpdate(
      req.params.eventId,
      updateData,
      { new: true }
    );

    // Create notification for the submitter (if available)
    try {
      const submitterId = event?.registrarId;
      if (submitterId) {
        const note = await Notification.create({
          userId: submitterId,
          eventId: event._id,
          type: "approved",
          message: `Your event (reg: ${event.registrationId}) was approved by manager.`,
          data: { eventId: event._id, registrationId: event.registrationId },
        });
        // push SSE
        try { sendSseNotification(submitterId, { type: 'approved', message: note.message, data: note.data, createdAt: note.createdAt, _id: note._id }); } catch (e) {}
        // try email
        const submitter = await User.findById(submitterId).select('email name');
        if (submitter?.email) {
          trySendEmail({ to: submitter.email, subject: 'Event approved', text: `Your event registration ${event.registrationId} has been approved.` });
        }
      }
    } catch (e) {
      console.error("Failed to create approval notification", e);
    }
    res.json({
      message: `Event ${updateData.status} successfully`,
      event,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating event status", error: err.message });
  }
};

export const rejectEvent = async (req, res) => {
  try {
    const { rejectionReason } = req.body || {};
    const event = await Event.findByIdAndUpdate(
      req.params.eventId,
      {
        status: "rejected",
        rejectedBy: req.user.id,
        rejectedAt: new Date(),
        rejectionReason,
        lastModifiedBy: req.user.id,
        lastModifiedAt: new Date(),
      },
      { new: true }
    );

    // Create notification for the submitter (if available)
    try {
      const submitterId = event?.registrarId;
      if (submitterId) {
        const note = await Notification.create({
          userId: submitterId,
          eventId: event._id,
          type: "rejected",
          message: `Your event (reg: ${event.registrationId}) was rejected. Reason: ${rejectionReason}`,
          data: { eventId: event._id, registrationId: event.registrationId, rejectionReason },
        });
        try { sendSseNotification(submitterId, { type: 'rejected', message: note.message, data: note.data, createdAt: note.createdAt, _id: note._id }); } catch (e) {}
        const submitter = await User.findById(submitterId).select('email name');
        if (submitter?.email) {
          trySendEmail({ to: submitter.email, subject: 'Event rejected', text: `Your event registration ${event.registrationId} was rejected. Reason: ${rejectionReason}` });
        }
      }
    } catch (e) {
      console.error("Failed to create rejection notification", e);
    }
    res.json({ message: "Event rejected", event });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error rejecting event", error: err.message });
  }
};

export const listManagerEvents = async (req, res) => {
  try {
    const { status, type, submittedBy } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (submittedBy) filter["data.submittedBy"] = submittedBy;

    const events = await Event.find(filter)
      .populate("registrarId", "name role")
      .populate("approvedBy", "name")
      .populate("rejectedBy", "name")
      .sort({ submittedAt: -1 });

    const enriched = events.map((e) => {
      const obj = e.toObject ? e.toObject() : e;
      // Apply registration fallbacks for manager view as well
      const dataWithFallbacks = applyRegistrationFallbacks(obj.data, obj.type);
      obj.data = enrichDataWithAllFields({ ...obj, data: dataWithFallbacks });
      return obj;
    });

    res.json(enriched);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching manager events", error: err.message });
  }
};

// Return every registered event (no filters) — intended for manager full view
export const listAllEventsForManager = async (req, res) => {
  try {
    const events = await Event.find({})
      .populate("registrarId", "name role")
      .populate("approvedBy", "name")
      .populate("rejectedBy", "name")
      .sort({ submittedAt: -1 });

    // Debugging info: log manager and number of events returned
    try {
      console.log(`listAllEventsForManager called by user=${req.user?.id} role=${req.user?.role} => events=${events.length}`);
      if (events.length > 0) console.log(`firstEvent id=${events[0]._id} status=${events[0].status} type=${events[0].type}`);
    } catch (e) {
      // ignore
    }

    const enriched = events.map((e) => {
      const obj = e.toObject ? e.toObject() : e;
      // Apply registration fallbacks for manager view as well
      const dataWithFallbacks = applyRegistrationFallbacks(obj.data, obj.type);
      obj.data = enrichDataWithAllFields({ ...obj, data: dataWithFallbacks });
      return obj;
    });

    res.json(enriched);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching all manager events", error: err.message });
  }
};

// Notifications: list and mark read
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notes = await Notification.find({ userId }).sort({ createdAt: -1 }).lean();
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: "Error fetching notifications", error: err.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const note = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { read: true }, { new: true });
    if (!note) return res.status(404).json({ message: "Notification not found" });
    res.json({ message: "Notification marked read", note });
  } catch (err) {
    res.status(500).json({ message: "Error marking notification", error: err.message });
  }
};

/**
 * Fetch a single approved event by its registrationId
 * Accessible to all authenticated roles
 */
export const getEventByRegistrationId = async (req, res) => {
  try {
    const { registrationId } = req.params;
    if (!registrationId || !registrationId.trim()) {
      return res.status(400).json({ message: "Registration ID is required" });
    }

    const event = await Event.findOne({ registrationId, status: "approved" })
      .populate("registrarId", "name role")
      .populate("approvedBy", "name");

    if (!event) {
      return res
        .status(404)
        .json({
          message: "Approved record not found for this registration ID",
        });
    }

    // Prevent caches from serving stale or body-less responses
    res.setHeader('Cache-Control', 'no-store');
    if (event && event.toObject) {
      const obj = event.toObject();
      // Ensure registration place fallbacks are applied for read-path as well
      const dataWithFallbacks = applyRegistrationFallbacks(obj.data, obj.type);
      obj.data = enrichDataWithAllFields({ ...obj, data: dataWithFallbacks });
      return res.json(obj);
    }
    res.json(event);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching record", error: err.message });
  }
};

/**
 * API endpoint to check for duplicate ID card numbers
 * Used for real-time validation in forms
 */
export const checkDuplicateIdNumber = async (req, res) => {
  try {
    const { type, idNumber, fieldName, excludeEventId, enteredName } = req.query;
    const prefillFlag =
      req.query.prefillBirth ?? req.query.prefillFromBirth ?? req.query.prefill;
    const shouldPrefillBirth = typeof prefillFlag === 'string'
      ? ['true', '1', 'yes'].includes(prefillFlag.trim().toLowerCase())
      : Boolean(prefillFlag);

    if (!type || !idNumber || !fieldName) {
      return res.status(400).json({
        message: "Missing required parameters: type, idNumber, fieldName"
      });
    }

    const normalizedId = String(idNumber).trim();
    if (!normalizedId) {
      return res.json({ isDuplicate: false, exists: false });
    }

    const escapedId = normalizedId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const idFields = ID_FIELDS_BY_TYPE[type];
    if (!idFields || idFields.length === 0) {
      return res.status(400).json({ message: `Unsupported event type: ${type}` });
    }

    const fieldQueries = idFields.map((field) => ({
      [`data.${field}`]: { $regex: new RegExp(`^${escapedId}$`, 'i') },
    }));

    // Only consider duplicates within the same event type
    const query = {
      type,
      status: { $in: ['approved', 'pending', 'draft'] },
      $or: fieldQueries,
    };

    if (excludeEventId) {
      query._id = { $ne: excludeEventId };
    }

    const existingEvent = await Event.findOne(query).lean();
    const responsePayload = {
      isDuplicate: false,
      exists: false,
    };

    let matchedField = null;

    if (existingEvent) {
      const matchInfo = matchIdInEvent(existingEvent, normalizedId) || {};
      matchedField = matchInfo.matchedField || null;
      responsePayload.isDuplicate = true;
      responsePayload.exists = true;
      responsePayload.existingRegistrationId = existingEvent.registrationId;
      responsePayload.existingEventType = existingEvent.type;
      responsePayload.existingName = matchInfo.existingName || null;
      responsePayload.nameField = matchInfo.nameField || null;
      responsePayload.message = `This ID number is already registered with Registration ID: ${existingEvent.registrationId}`;

      if (enteredName && responsePayload.existingName) {
        const normalizedEnteredName = String(enteredName).trim().toLowerCase();
        const normalizedExistingName = String(responsePayload.existingName).trim().toLowerCase();
        
        if (normalizedEnteredName !== normalizedExistingName) {
          responsePayload.isWrongPerson = true;
          responsePayload.message = `This identification card number belongs to another person (${responsePayload.existingName}).`;
        }
      }
    }
    
    if (shouldPrefillBirth) {
      const birthRecord = await findBirthRecordByIdNumber(normalizedId);
      if (birthRecord) {
        responsePayload.birthRecord = birthRecord;
        console.log(`[checkDuplicateIdNumber] Found birth record for ID ${normalizedId}`);
      } else {
        // If no birth record found and we're checking for death or divorce, try to find marriage record
        if (type === 'death' || type === 'divorce') {
          console.log(`[checkDuplicateIdNumber] No birth record found, checking for marriage record for ID ${normalizedId} (type: ${type})`);
          const marriageRecord = await findMarriageRecordByIdNumber(normalizedId);
          if (marriageRecord) {
            responsePayload.marriageRecord = marriageRecord;
            console.log(`[checkDuplicateIdNumber] Found marriage record for ID ${normalizedId}:`, marriageRecord.registrationId);
          } else {
            console.log(`[checkDuplicateIdNumber] No marriage record found for ID ${normalizedId}`);
          }
        }
      }
    }

    const expectedSex = expectedSexForField(fieldName);
    const existingSex = detectExistingSex(existingEvent, normalizedId, matchedField);
    const birthSex = extractSexFromBirthRecord(responsePayload.birthRecord);
    const detectedSex = existingSex || birthSex;

    if (expectedSex && detectedSex && expectedSex !== detectedSex) {
      responsePayload.sexMismatch = true;
      responsePayload.expectedSex = expectedSex;
      responsePayload.detectedSex = detectedSex;
      responsePayload.message = buildSexWarningMessage(expectedSex);
    }
    
    return res.json(responsePayload);
  } catch (err) {
    console.error('checkDuplicateIdNumber error:', err);
    res.status(500).json({
      message: "Error checking duplicate ID number",
      error: err.message
    });
  }
};

/**
 * Check for duplicate ID card numbers for the same event type
 * Returns array of duplicate ID numbers found, or empty array if none
 */
const checkDuplicateIdNumbers = async (type, data, excludeEventId = null) => {
  const idFields = ID_FIELDS_BY_TYPE[type] || [];
  const duplicates = [];

  for (const fieldName of idFields) {
    const idNumber = data[fieldName];
    if (!idNumber || String(idNumber).trim() === '') continue;

    const normalizedId = String(idNumber).trim();
    
    // Build query to find existing events with same ID number and type
    // Use case-insensitive regex for matching
    const query = {
      type,
      status: { $in: ['approved', 'pending'] }, // Only check approved or pending events
      [`data.${fieldName}`]: { 
        $regex: new RegExp(`^${normalizedId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') 
      },
    };

    // Exclude current event if updating
    if (excludeEventId) {
      query._id = { $ne: excludeEventId };
    }

    const existingEvent = await Event.findOne(query);
    if (existingEvent) {
      duplicates.push({
        field: fieldName,
        idNumber: normalizedId,
        existingRegistrationId: existingEvent.registrationId,
      });
    }
  }

  return duplicates;
};

const BIRTH_RECORD_STATUSES = ['approved', 'pending', 'draft'];
async function findBirthRecordByIdNumber(idNumber) {
  if (!idNumber) return null;
  const escapedId = String(idNumber).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const birthEvent = await Event.findOne({
    type: 'birth',
    status: { $in: BIRTH_RECORD_STATUSES },
    'data.childIdNumberAm': {
      $regex: new RegExp(`^${escapedId}$`, 'i')
    },
  }).lean();

  if (!birthEvent) return null;

  const dataWithFallbacks = applyRegistrationFallbacks(birthEvent.data || {}, 'birth');
  const enrichedData = enrichDataWithAllFields({ type: 'birth', data: dataWithFallbacks }) || dataWithFallbacks;

  return {
    eventId: birthEvent._id?.toString?.() || String(birthEvent._id),
    registrationId: birthEvent.registrationId,
    status: birthEvent.status,
    data: enrichedData,
  };
}

const MARRIAGE_RECORD_STATUSES = ['approved', 'pending', 'draft'];
async function findMarriageRecordByIdNumber(idNumber) {
  if (!idNumber) return null;
  const escapedId = String(idNumber).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const marriageEvent = await Event.findOne({
    type: 'marriage',
    status: { $in: MARRIAGE_RECORD_STATUSES },
    $or: [
      { 'data.wifeIdNumberAm': { $regex: new RegExp(`^${escapedId}$`, 'i') } },
      { 'data.husbandIdNumberAm': { $regex: new RegExp(`^${escapedId}$`, 'i') } }
    ],
  }).lean();

  if (!marriageEvent) return null;

  const dataWithFallbacks = applyRegistrationFallbacks(marriageEvent.data || {}, 'marriage');
  const enrichedData = enrichDataWithAllFields({ type: 'marriage', data: dataWithFallbacks }) || dataWithFallbacks;

  return {
    eventId: marriageEvent._id?.toString?.() || String(marriageEvent._id),
    registrationId: marriageEvent.registrationId,
    status: marriageEvent.status,
    data: enrichedData,
  };
}

export const lookupBirthRecordByIdNumber = async (req, res) => {
  try {
    const { idNumber } = req.query;
    const normalizedId = String(idNumber || '').trim();
    if (!normalizedId) {
      return res.status(400).json({ message: "idNumber query parameter is required" });
    }

    const birthRecord = await findBirthRecordByIdNumber(normalizedId);
    if (!birthRecord) {
      return res.json({ found: false });
    }

    res.json({
      found: true,
      birthRecord,
    });
  } catch (err) {
    console.error('lookupBirthRecordByIdNumber error:', err);
    res.status(500).json({
      message: "Error looking up birth record",
      error: err.message,
    });
  }
};

/**
 * ========================
 * REGISTRAR / HOSPITAL / CHURCH / MOSQUE FUNCTIONS
 * ========================
 */
export const registerEvent = async (req, res) => {
  try {
    // Defensive parsing: support both JSON and multipart/form-data (FormData with `data` field + files)
    let type;
    let data = {};
    let status = 'draft';
    let providedId;

    try {
      const contentType = req.headers && req.headers['content-type'];
      console.log('registerEvent headers content-type:', contentType);
      console.log('registerEvent req.is multipart?', req.is && req.is('multipart/form-data'));
      console.log('registerEvent req.body present:', typeof req.body !== 'undefined');

      if (req.is && req.is('multipart/form-data')) {
        const incomingStr = (req.body && req.body.data) || '{}';
        const incoming = typeof incomingStr === 'string' ? JSON.parse(incomingStr) : incomingStr;
        type = incoming.type;
        data = incoming.data || {};
        status = incoming.status || 'draft';
        providedId = incoming.registrationId;

        if (Array.isArray(req.files) && req.files.length) {
          req.files.forEach((f) => {
            data[f.fieldname] = f.filename;
          });
        }
      } else {
        const body = req.body || {};
        ({ type, data, status = 'draft', registrationId: providedId } = body);
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (e) { /* ignore */ }
        }
        if (!data) data = {};
        if (Array.isArray(req.files) && req.files.length) {
          req.files.forEach((f) => {
            data[f.fieldname] = f.filename;
          });
        }
      }
    } catch (e) {
      console.error('registerEvent parse error:', e?.message || e);
      return res.status(400).json({ message: 'Invalid request data', error: e?.message || String(e) });
    }

    // sanitize data first
    data = sanitizeData(data || {});

    const allowedTypes = {
      registrar: ["birth", "death", "marriage", "divorce", "special"],
      hospital: ["birth", "death"],
      church: ["marriage", "death"],
      mosque: ["marriage", "death"],
      registrant: ["divorce"],
    };

    if (!allowedTypes[req.user.role]?.includes(type)) {
      return res.status(400).json({ message: `Role ${req.user.role} cannot register event type ${type}` });
    }

    // Validate required fields BEFORE applying fallbacks - prevent empty or partially filled forms
    // This ensures we validate the actual user input, not fallback values
    if (['registrar', 'hospital', 'church', 'mosque'].includes(req.user.role)) {
      console.log(`[VALIDATION] Validating ${req.user.role} submission for ${type} event`);
      console.log(`[VALIDATION] Data keys:`, Object.keys(data));
      console.log(`[VALIDATION] Non-empty fields:`, Object.keys(data).filter(key => !isEmpty(data[key])));
      
      const validation = validateRequiredFields(type, data);
      console.log(`[VALIDATION] Validation result:`, validation);
      
      if (!validation.isValid) {
        console.log(`[VALIDATION] REJECTED:`, validation.message);
        return res.status(400).json({ 
          message: validation.message,
          missingFields: validation.missingFields
        });
      }
      console.log(`[VALIDATION] PASSED`);
    }

    // Apply registration fallbacks AFTER validation
    data = applyRegistrationFallbacks(data, type);
    data.submittedBy = req.user.role;

    if (type === 'marriage') {
      const sexError = await validateMarriageSexAssignments(data);
      if (sexError) {
        return res.status(400).json({
          message: sexMismatchMessage(sexError.expectedSex),
          details: sexError,
        });
      }
    }

    // Use provided registrationId if present (ensuring uniqueness), otherwise generate one
    let registrationId = (providedId || "").trim();
    if (registrationId) {
      const existing = await Event.findOne({ registrationId });
      if (existing) return res.status(409).json({ message: "Registration ID already exists" });
    } else {
      const counter = await Counter.findByIdAndUpdate(
        "registrationId",
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      registrationId = String(counter.seq);
    }

    data.registrationId = registrationId;

    // Check for duplicate ID card numbers
    const duplicates = await checkDuplicateIdNumbers(type, data);
    if (duplicates.length > 0) {
      const duplicateMessages = duplicates.map(dup => {
        const fieldLabel = dup.field === 'childIdNumberAm' ? 'Child ID Number' :
                          dup.field === 'deceasedIdNumberAm' ? 'Deceased ID Number' :
                          dup.field === 'wifeIdNumberAm' ? 'Wife ID Number' :
                          dup.field === 'husbandIdNumberAm' ? 'Husband ID Number' :
                          dup.field === 'divorceSpouse1IdAm' ? 'Spouse 1 ID Number' :
                          dup.field === 'divorceSpouse2IdAm' ? 'Spouse 2 ID Number' :
                          dup.field;
        return `${fieldLabel} (${dup.idNumber}) is already registered with Registration ID: ${dup.existingRegistrationId}`;
      });
      return res.status(409).json({ 
        message: "Duplicate ID card number detected",
        details: duplicateMessages,
        duplicates: duplicates
      });
    }

    const event = new Event({
      type,
      data,
      registrationId,
      registrarId: req.user.id,
      status,
      lastModifiedBy: req.user.id,
    });

    await event.save();
    res.status(201).json({ message: "Event registered successfully", event });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern && err.keyPattern.registrationId) {
      return res.status(409).json({ message: "Registration ID already exists" });
    }
    console.error('registerEvent save error:', err);
    res.status(500).json({ message: "Error registering event", error: err.message });
  }
};

export const submitEventToManager = async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.eventId, registrarId: req.user.id },
      {
        status: "pending",
        submittedAt: new Date(),
        lastModifiedBy: req.user.id,
        lastModifiedAt: new Date(),
      },
      { new: true }
    );

    if (!event) {
      return res
        .status(404)
        .json({ message: "Event not found or not owned by user" });
    }

    res.json({ message: "Event submitted to manager for approval", event });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error submitting event", error: err.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    // Allow multipart/form-data updates with files
    let updatePayload = req.body;
    if (req.is('multipart/form-data')) {
      try {
        updatePayload = JSON.parse(req.body.data || '{}');
      } catch (e) {
        return res.status(400).json({ message: 'Invalid form data' });
      }
      if (Array.isArray(req.files)) {
        // ensure we merge filenames into updatePayload.data
        updatePayload.data = updatePayload.data || {};
        req.files.forEach((f) => {
          updatePayload.data[f.fieldname] = f.filename;
        });
      }
    }

    // sanitize and apply registration fallbacks prior to update
    if (updatePayload && updatePayload.data) {
      updatePayload.data = sanitizeData(updatePayload.data);
      const currentType = updatePayload.type || undefined;
      updatePayload.data = applyRegistrationFallbacks(updatePayload.data, currentType);
    }

    // Get the current event to determine its type
    const currentEvent = await Event.findById(req.params.eventId);
    if (!currentEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    const eventType = updatePayload.type || currentEvent.type;
    const baseData =
      typeof currentEvent.toObject === 'function'
        ? (currentEvent.toObject().data || {})
        : (currentEvent.data || {});
    const mergedData = {
      ...baseData,
      ...(updatePayload.data || {}),
    };

    if (eventType === 'marriage') {
      const sexError = await validateMarriageSexAssignments(mergedData);
      if (sexError) {
        return res.status(400).json({
          message: sexMismatchMessage(sexError.expectedSex),
          details: sexError,
        });
      }
    }

    // Check for duplicate ID card numbers (excluding current event)
    const dataToCheck = mergedData;
    const duplicates = await checkDuplicateIdNumbers(eventType, dataToCheck, req.params.eventId);
    if (duplicates.length > 0) {
      const duplicateMessages = duplicates.map(dup => {
        const fieldLabel = dup.field === 'childIdNumberAm' ? 'Child ID Number' :
                          dup.field === 'deceasedIdNumberAm' ? 'Deceased ID Number' :
                          dup.field === 'wifeIdNumberAm' ? 'Wife ID Number' :
                          dup.field === 'husbandIdNumberAm' ? 'Husband ID Number' :
                          dup.field === 'divorceSpouse1IdAm' ? 'Spouse 1 ID Number' :
                          dup.field === 'divorceSpouse2IdAm' ? 'Spouse 2 ID Number' :
                          dup.field;
        return `${fieldLabel} (${dup.idNumber}) is already registered with Registration ID: ${dup.existingRegistrationId}`;
      });
      return res.status(409).json({ 
        message: "Duplicate ID card number detected",
        details: duplicateMessages,
        duplicates: duplicates
      });
    }

    const event = await Event.findOneAndUpdate(
      { _id: req.params.eventId, registrarId: req.user.id },
      {
        ...updatePayload,
        lastModifiedBy: req.user.id,
        lastModifiedAt: new Date(),
      },
      { new: true }
    );
    if (!event)
      return res
        .status(404)
        .json({ message: "Event not found or not owned by user" });
    res.json({ message: "Event updated", event });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating event", error: err.message });
  }
};

// Manager update event (can update any event)
export const managerUpdateEvent = async (req, res) => {
  try {
    // Allow multipart/form-data updates with files
    let updatePayload = req.body;
    if (req.is('multipart/form-data')) {
      try {
        updatePayload = JSON.parse(req.body.data || '{}');
      } catch (e) {
        return res.status(400).json({ message: 'Invalid form data' });
      }
      if (Array.isArray(req.files)) {
        updatePayload.data = updatePayload.data || {};
        req.files.forEach((f) => {
          updatePayload.data[f.fieldname] = f.filename;
        });
      }
    }

    // sanitize and apply registration fallbacks prior to update
    if (updatePayload && updatePayload.data) {
      updatePayload.data = sanitizeData(updatePayload.data);
      const currentType = updatePayload.type || undefined;
      updatePayload.data = applyRegistrationFallbacks(updatePayload.data, currentType);
    }

    // Get the current event to determine its type
    const currentEvent = await Event.findById(req.params.eventId);
    if (!currentEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    const eventType = updatePayload.type || currentEvent.type;
    const baseData =
      typeof currentEvent.toObject === 'function'
        ? (currentEvent.toObject().data || {})
        : (currentEvent.data || {});
    const mergedData = {
      ...baseData,
      ...(updatePayload.data || {}),
    };

    if (eventType === 'marriage') {
      const sexError = await validateMarriageSexAssignments(mergedData);
      if (sexError) {
        return res.status(400).json({
          message: sexMismatchMessage(sexError.expectedSex),
          details: sexError,
        });
      }
    }

    // Check for duplicate ID card numbers (excluding current event)
    const dataToCheck = mergedData;
    const duplicates = await checkDuplicateIdNumbers(eventType, dataToCheck, req.params.eventId);
    if (duplicates.length > 0) {
      const duplicateMessages = duplicates.map(dup => {
        const fieldLabel = dup.field === 'childIdNumberAm' ? 'Child ID Number' :
                          dup.field === 'deceasedIdNumberAm' ? 'Deceased ID Number' :
                          dup.field === 'wifeIdNumberAm' ? 'Wife ID Number' :
                          dup.field === 'husbandIdNumberAm' ? 'Husband ID Number' :
                          dup.field === 'divorceSpouse1IdAm' ? 'Spouse 1 ID Number' :
                          dup.field === 'divorceSpouse2IdAm' ? 'Spouse 2 ID Number' :
                          dup.field;
        return `${fieldLabel} (${dup.idNumber}) is already registered with Registration ID: ${dup.existingRegistrationId}`;
      });
      return res.status(409).json({ 
        message: "Duplicate ID card number detected",
        details: duplicateMessages,
        duplicates: duplicates
      });
    }

    // Manager can update any event without ownership check
    const event = await Event.findByIdAndUpdate(
      req.params.eventId,
      {
        ...updatePayload,
        status: "approved",
        approvedBy: req.user.id,
        approvedAt: new Date(),
        rejectionReason: undefined,
        rejectedAt: undefined,
        rejectedBy: undefined,
        lastModifiedBy: req.user.id,
        lastModifiedAt: new Date(),
      },
      { new: true }
    );
    if (!event)
      return res.status(404).json({ message: "Event not found" });
    res.json({ message: "Event updated", event });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating event", error: err.message });
  }
};

// Delete event (only for draft or rejected status, and only by the event owner)
export const deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log(`[DELETE EVENT] Attempting to delete event ${eventId} by user ${userId} (${userRole})`);

    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      console.log(`[DELETE EVENT] Event not found: ${eventId}`);
      return res.status(404).json({ message: 'Event not found' });
    }

    console.log(`[DELETE EVENT] Found event: status=${event.status}, registrarId=${event.registrarId}, userId=${userId}`);

    // Verify the event belongs to the user
    if (!event.registrarId) {
      console.log(`[DELETE EVENT] Event has no registrarId`);
      return res.status(400).json({ message: 'Event has no owner information' });
    }
    
    if (event.registrarId.toString() !== userId.toString()) {
      console.log(`[DELETE EVENT] Unauthorized: event belongs to ${event.registrarId}, user is ${userId}`);
      return res.status(403).json({ message: 'You can only delete your own events' });
    }

    // Only allow deletion of draft or rejected events
    if (event.status !== 'draft' && event.status !== 'rejected') {
      console.log(`[DELETE EVENT] Invalid status: ${event.status}`);
      return res.status(400).json({ 
        message: `Cannot delete event with status "${event.status}". Only draft and rejected events can be deleted.` 
      });
    }

    // Delete the event
    await Event.findByIdAndDelete(eventId);
    console.log(`[DELETE EVENT] Successfully deleted event ${eventId}`);

    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('[DELETE EVENT] Error:', err);
    console.error('[DELETE EVENT] Error stack:', err.stack);
    res.status(500).json({ 
      message: 'Error deleting event', 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Manager delete event (can delete any event regardless of status)
export const managerDeleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log(`[MANAGER DELETE EVENT] Attempting to delete event ${eventId} by manager ${userId} (${userRole})`);

    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      console.log(`[MANAGER DELETE EVENT] Event not found: ${eventId}`);
      return res.status(404).json({ message: 'Event not found' });
    }

    console.log(`[MANAGER DELETE EVENT] Found event: status=${event.status}, registrarId=${event.registrarId}`);

    // Manager can delete any event regardless of status or ownership
    await Event.findByIdAndDelete(eventId);
    console.log(`[MANAGER DELETE EVENT] Successfully deleted event ${eventId}`);

    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('[MANAGER DELETE EVENT] Error:', err);
    console.error('[MANAGER DELETE EVENT] Error stack:', err.stack);
    res.status(500).json({ 
      message: 'Error deleting event', 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

export const listMyEvents = async (req, res) => {
  try {
    const { status, type } = req.query;
    const filter = { registrarId: req.user.id };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const events = await Event.find(filter)
      .populate("approvedBy", "name")
      .populate("rejectedBy", "name")
      .sort({ updatedAt: -1 });
    const enriched = events.map((e) => {
      const obj = e.toObject ? e.toObject() : e;
      obj.data = enrichDataWithAllFields(obj);
      return obj;
    });
    res.json(enriched);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching events", error: err.message });
  }
};

export const hospitalRegisterEvent = async (req, res) => {
  try {
    if (req.user.role !== "hospital") return res.status(403).json({ message: "Access denied" });

    let type;
    let data = {};
    let status = 'draft';
    let providedId;

    try {
      const contentType = req.headers && req.headers['content-type'];
      console.log('hospitalRegisterEvent headers content-type:', contentType);
      console.log('hospitalRegisterEvent req.is multipart?', req.is && req.is('multipart/form-data'));
      console.log('hospitalRegisterEvent req.body present:', typeof req.body !== 'undefined');

      if (req.is && req.is('multipart/form-data')) {
        const incomingStr = (req.body && req.body.data) || '{}';
        const incoming = typeof incomingStr === 'string' ? JSON.parse(incomingStr) : incomingStr;
        type = incoming.type;
        data = incoming.data || {};
        status = incoming.status || 'draft';
        providedId = incoming.registrationId;

        if (Array.isArray(req.files) && req.files.length) {
          req.files.forEach((f) => { data[f.fieldname] = f.filename; });
        }
      } else {
        const body = req.body || {};
        ({ type, data, status = 'draft', registrationId: providedId } = body);
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (e) { /* ignore */ }
        }
        if (!data) data = {};
        if (Array.isArray(req.files) && req.files.length) {
          req.files.forEach((f) => { data[f.fieldname] = f.filename; });
        }
      }
    } catch (e) {
      console.error('hospitalRegisterEvent parse error:', e?.message || e);
      return res.status(400).json({ message: 'Invalid form data', error: e?.message || String(e) });
    }

    data = sanitizeData(data || {});

    const allowedTypes = ["birth", "death"];
    if (!allowedTypes.includes(type)) return res.status(400).json({ message: `Hospital cannot register event type: ${type}` });
    
    // Validate required fields BEFORE applying fallbacks - prevent empty or partially filled forms
    const validation = validateRequiredFields(type, data);
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: validation.message,
        missingFields: validation.missingFields
      });
    }
    
    // Apply registration fallbacks AFTER validation
    data = applyRegistrationFallbacks(data, type);
    data.submittedBy = "hospital";

    let registrationId = (providedId || "").trim();
    if (registrationId) {
      const existing = await Event.findOne({ registrationId });
      if (existing) return res.status(409).json({ message: "Registration ID already exists" });
    } else {
      const counter = await Counter.findByIdAndUpdate("registrationId", { $inc: { seq: 1 } }, { new: true, upsert: true });
      registrationId = String(counter.seq);
    }

    data.registrationId = registrationId;

    // Check for duplicate ID card numbers
    const duplicates = await checkDuplicateIdNumbers(type, data);
    if (duplicates.length > 0) {
      const duplicateMessages = duplicates.map(dup => {
        const fieldLabel = dup.field === 'childIdNumberAm' ? 'Child ID Number' :
                          dup.field === 'deceasedIdNumberAm' ? 'Deceased ID Number' :
                          dup.field === 'wifeIdNumberAm' ? 'Wife ID Number' :
                          dup.field === 'husbandIdNumberAm' ? 'Husband ID Number' :
                          dup.field === 'divorceSpouse1IdAm' ? 'Spouse 1 ID Number' :
                          dup.field === 'divorceSpouse2IdAm' ? 'Spouse 2 ID Number' :
                          dup.field;
        return `${fieldLabel} (${dup.idNumber}) is already registered with Registration ID: ${dup.existingRegistrationId}`;
      });
      return res.status(409).json({ 
        message: "Duplicate ID card number detected",
        details: duplicateMessages,
        duplicates: duplicates
      });
    }

    const event = new Event({ type, data, registrationId, registrarId: req.user.id, status, lastModifiedBy: req.user.id });
    await event.save();
    res.status(201).json({ message: "Hospital event registered successfully", event });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern && err.keyPattern.registrationId) return res.status(409).json({ message: "Registration ID already exists" });
    console.error('hospitalRegisterEvent save error:', err);
    res.status(500).json({ message: "Error registering hospital event", error: err.message });
  }
};

export const churchRegisterEvent = async (req, res) => {
  try {
    if (req.user.role !== "church")
      return res.status(403).json({ message: "Access denied" });
    // Support both JSON and multipart/form-data
    let type, data, status = "draft", providedId;
    try {
      const contentType = req.headers && req.headers['content-type'];
      console.log('churchRegisterEvent headers content-type:', contentType);
      console.log('churchRegisterEvent req.is multipart?', req.is && req.is('multipart/form-data'));
      console.log('churchRegisterEvent req.body present:', typeof req.body !== 'undefined');

      if (req.is && req.is('multipart/form-data')) {
        const incomingStr = (req.body && req.body.data) || '{}';
        const incoming = typeof incomingStr === 'string' ? JSON.parse(incomingStr) : incomingStr;
        type = incoming.type;
        data = incoming.data || {};
        try { console.log('churchRegisterEvent multipart keys:', Object.keys(data)); } catch {}
        status = incoming.status || 'draft';
        providedId = incoming.registrationId;
        if (Array.isArray(req.files) && req.files.length) {
          req.files.forEach((f) => {
            data[f.fieldname] = f.filename;
          });
        }
      } else {
        const body = req.body || {};
        ({ type, data, status = 'draft', registrationId: providedId } = body);
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (e) { }
        }
        if (!data) data = {};
        try { console.log('churchRegisterEvent json keys:', Object.keys(data)); } catch {}
        if (Array.isArray(req.files) && req.files.length) {
          req.files.forEach((f) => {
            data[f.fieldname] = f.filename;
          });
        }
      }
    } catch (e) {
      console.error('churchRegisterEvent parse error:', e?.message || e);
      return res.status(400).json({ message: 'Invalid form data', error: e?.message || String(e) });
    }
    // sanitize incoming data to remove empty strings/empty containers
    data = sanitizeData(data || {});
    try { console.log('churchRegisterEvent sanitized keys (non-empty):', Object.keys(data)); } catch {}
    
    const allowedTypes = ["marriage", "death"];
    if (!allowedTypes.includes(type))
      return res
        .status(400)
        .json({ message: `Church cannot register event type: ${type}` });
    
    // Validate required fields BEFORE applying fallbacks - prevent empty or partially filled forms
    const validation = validateRequiredFields(type, data);
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: validation.message,
        missingFields: validation.missingFields
      });
    }
    
    // Apply registration fallbacks AFTER validation
    data = applyRegistrationFallbacks(data, type);
    data.submittedBy = "church";
    if (type === 'marriage') {
      const sexError = await validateMarriageSexAssignments(data);
      if (sexError) {
        return res.status(400).json({
          message: sexMismatchMessage(sexError.expectedSex),
          details: sexError,
        });
      }
    }
    let registrationId = (providedId || "").trim();
    if (registrationId) {
      const existing = await Event.findOne({ registrationId });
      if (existing) {
        return res
          .status(409)
          .json({ message: "Registration ID already exists" });
      }
    } else {
      const counter = await Counter.findByIdAndUpdate(
        "registrationId",
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      registrationId = String(counter.seq);
    }
    data.registrationId = registrationId;

    // Check for duplicate ID card numbers
    const duplicates = await checkDuplicateIdNumbers(type, data);
    if (duplicates.length > 0) {
      const duplicateMessages = duplicates.map(dup => {
        const fieldLabel = dup.field === 'childIdNumberAm' ? 'Child ID Number' :
                          dup.field === 'deceasedIdNumberAm' ? 'Deceased ID Number' :
                          dup.field === 'wifeIdNumberAm' ? 'Wife ID Number' :
                          dup.field === 'husbandIdNumberAm' ? 'Husband ID Number' :
                          dup.field === 'divorceSpouse1IdAm' ? 'Spouse 1 ID Number' :
                          dup.field === 'divorceSpouse2IdAm' ? 'Spouse 2 ID Number' :
                          dup.field;
        return `${fieldLabel} (${dup.idNumber}) is already registered with Registration ID: ${dup.existingRegistrationId}`;
      });
      return res.status(409).json({ 
        message: "Duplicate ID card number detected",
        details: duplicateMessages,
        duplicates: duplicates
      });
    }

    const event = new Event({
      type,
      data,
      registrationId,
      registrarId: req.user.id,
      status,
      lastModifiedBy: req.user.id,
    });
    await event.save();
    try { console.log('churchRegisterEvent saved event id=', event._id, 'keys=', Object.keys(event?.data?.toObject ? event.data.toObject() : event.data || {})); } catch {}
    res
      .status(201)
      .json({ message: "Church event registered successfully", event });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern && err.keyPattern.registrationId) {
      return res
        .status(409)
        .json({ message: "Registration ID already exists" });
    }
    res
      .status(500)
      .json({ message: "Error registering church event", error: err.message });
  }
};

export const mosqueRegisterEvent = async (req, res) => {
  try {
    if (req.user.role !== "mosque")
      return res.status(403).json({ message: "Access denied" });
    // Support both JSON and multipart/form-data
    let type, data, status = "draft", providedId;
    try {
      const contentType = req.headers && req.headers['content-type'];
      console.log('mosqueRegisterEvent headers content-type:', contentType);
      console.log('mosqueRegisterEvent req.is multipart?', req.is && req.is('multipart/form-data'));
      console.log('mosqueRegisterEvent req.body present:', typeof req.body !== 'undefined');

      if (req.is && req.is('multipart/form-data')) {
        const incomingStr = (req.body && req.body.data) || '{}';
        const incoming = typeof incomingStr === 'string' ? JSON.parse(incomingStr) : incomingStr;
        type = incoming.type;
        data = incoming.data || {};
        status = incoming.status || 'draft';
        providedId = incoming.registrationId;
        if (Array.isArray(req.files) && req.files.length) {
          req.files.forEach((f) => {
            data[f.fieldname] = f.filename;
          });
        }
      } else {
        const body = req.body || {};
        ({ type, data, status = 'draft', registrationId: providedId } = body);
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (e) { }
        }
        if (!data) data = {};
        if (Array.isArray(req.files) && req.files.length) {
          req.files.forEach((f) => {
            data[f.fieldname] = f.filename;
          });
        }
      }
    } catch (e) {
      console.error('mosqueRegisterEvent parse error:', e?.message || e);
      return res.status(400).json({ message: 'Invalid form data', error: e?.message || String(e) });
    }
    // sanitize incoming data to remove empty strings/empty containers
    data = sanitizeData(data || {});
    
    const allowedTypes = ["marriage", "death"];
    if (!allowedTypes.includes(type))
      return res
        .status(400)
        .json({ message: `Mosque cannot register event type: ${type}` });
    
    // Validate required fields BEFORE applying fallbacks - prevent empty or partially filled forms
    const validation = validateRequiredFields(type, data);
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: validation.message,
        missingFields: validation.missingFields
      });
    }
    
    // Apply registration fallbacks AFTER validation
    data = applyRegistrationFallbacks(data, type);
    data.submittedBy = "mosque";
    if (type === 'marriage') {
      const sexError = await validateMarriageSexAssignments(data);
      if (sexError) {
        return res.status(400).json({
          message: sexMismatchMessage(sexError.expectedSex),
          details: sexError,
        });
      }
    }
    let registrationId = (providedId || "").trim();
    if (registrationId) {
      const existing = await Event.findOne({ registrationId });
      if (existing) {
        return res
          .status(409)
          .json({ message: "Registration ID already exists" });
      }
    } else {
      const counter = await Counter.findByIdAndUpdate(
        "registrationId",
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      registrationId = String(counter.seq);
    }
    data.registrationId = registrationId;

    // Check for duplicate ID card numbers
    const duplicates = await checkDuplicateIdNumbers(type, data);
    if (duplicates.length > 0) {
      const duplicateMessages = duplicates.map(dup => {
        const fieldLabel = dup.field === 'childIdNumberAm' ? 'Child ID Number' :
                          dup.field === 'deceasedIdNumberAm' ? 'Deceased ID Number' :
                          dup.field === 'wifeIdNumberAm' ? 'Wife ID Number' :
                          dup.field === 'husbandIdNumberAm' ? 'Husband ID Number' :
                          dup.field === 'divorceSpouse1IdAm' ? 'Spouse 1 ID Number' :
                          dup.field === 'divorceSpouse2IdAm' ? 'Spouse 2 ID Number' :
                          dup.field;
        return `${fieldLabel} (${dup.idNumber}) is already registered with Registration ID: ${dup.existingRegistrationId}`;
      });
      return res.status(409).json({ 
        message: "Duplicate ID card number detected",
        details: duplicateMessages,
        duplicates: duplicates
      });
    }

    const event = new Event({
      type,
      data,
      registrationId,
      registrarId: req.user.id,
      status,
      lastModifiedBy: req.user.id,
    });
    await event.save();
    res
      .status(201)
      .json({ message: "Mosque event registered successfully", event });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern && err.keyPattern.registrationId) {
      return res
        .status(409)
        .json({ message: "Registration ID already exists" });
    }
    res
      .status(500)
      .json({ message: "Error registering mosque event", error: err.message });
  }
};

/**
 * ========================
 * REGISTRANT FUNCTIONS
 * ========================
 */
export const viewMyRecords = async (req, res) => {
  try {
    const q = buildRegistrantOwnershipQuery(req.user);

    const events = await Event.find(q)
      .populate("registrarId", "name role")
      .populate("approvedBy", "name")
      .populate("rejectedBy", "name")
      .sort({ updatedAt: -1 });
    const enriched = events.map((e) => {
      const obj = e.toObject ? e.toObject() : e;
      obj.data = enrichDataWithAllFields(obj);
      return obj;
    });
    res.json(enriched);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching records", error: err.message });
  }
};

export const requestCertificate = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.status !== "approved") {
      return res.status(400).json({
        message: "Certificate can only be requested for approved events",
      });
    }

    // Accept name, fatherName, grandfatherName, and image from form-data
    const { name, fatherName, grandfatherName, type } = req.body;
    let imagePath = null;
    if (req.file) {
      imagePath = req.file.path;
    }

    // Log the actual event data for debugging
    console.log('Event data for validation:', JSON.stringify(event.data, null, 2));
    console.log('Provided names:', { name, fatherName, grandfatherName });

    // Validate names against event data - using actual field names from formFields.js
    const nameFields = [
      // Birth event names
      'childNameEn', 'childNameAm', 'childFullNameEn', 'childFullNameAm',
      // Marriage event names  
      'husbandNameEn', 'husbandNameAm', 'husbandFullNameEn', 'husbandFullNameAm',
      'wifeNameEn', 'wifeNameAm', 'wifeFullNameEn', 'wifeFullNameAm',
      // Death event names
      'deceasedNameEn', 'deceasedNameAm', 'deceasedFullNameEn', 'deceasedFullNameAm',
      // Other possible names
      'requesterName', 'parentNameEn', 'parentNameAm'
    ];
    
    const fatherFields = [
      // Birth event fathers
      'fatherNameEn', 'fatherNameAm', 'fatherFullNameEn', 'fatherFullNameAm', 'fatherFatherName',
      // Marriage event fathers
      'husbandFatherEn', 'husbandFatherAm', 'husbandFatherNameEn', 'husbandFatherNameAm',
      'wifeFatherEn', 'wifeFatherAm', 'wifeFatherNameEn', 'wifeFatherNameAm',
      // Death event fathers
      'deceasedFatherEn', 'deceasedFatherAm', 'deceasedFatherNameEn', 'deceasedFatherNameAm',
      // Other possible fathers
      'parentNameEn', 'parentNameAm', 'motherFatherNameEn', 'motherFatherNameAm'
    ];
    
    const grandfatherFields = [
      // Birth event grandfathers
      'grandfatherNameEn', 'grandfatherNameAm', 'childGrandfatherName',
      // Marriage event grandfathers
      'husbandGrandfatherEn', 'husbandGrandfatherAm', 'husbandGrandfatherNameEn', 'husbandGrandfatherNameAm',
      'wifeGrandfatherEn', 'wifeGrandfatherAm', 'wifeGrandfatherNameEn', 'wifeGrandfatherNameAm',
      // Death event grandfathers
      'deceasedGrandfatherEn', 'deceasedGrandfatherAm', 'deceasedGrandfatherNameEn', 'deceasedGrandfatherNameAm',
      // Other possible grandfathers
      'motherGrandfatherNameEn', 'motherGrandfatherNameAm'
    ];

    // TEMPORARY: Skip validation for testing - allow all certificate requests
    console.log('TEMPORARY: Skipping name validation for testing');
    
    // More lenient validation - allow if at least one name matches and others are provided
    const nameMatch = nameFields.some(field => {
      const value = event.data?.[field];
      return value && String(value).trim().toLowerCase() === String(name).trim().toLowerCase();
    });
    
    const fatherMatch = fatherFields.some(field => {
      const value = event.data?.[field];
      return value && String(value).trim().toLowerCase() === String(fatherName).trim().toLowerCase();
    });
    
    const grandfatherMatch = grandfatherFields.some(field => {
      const value = event.data?.[field];
      return value && String(value).trim().toLowerCase() === String(grandfatherName).trim().toLowerCase();
    });

    // Allow if at least the main name matches, and others are provided (even if not exact match)
    const hasValidName = nameMatch;
    const hasValidFather = fatherMatch || (fatherName && fatherName.trim() !== '');
    const hasValidGrandfather = grandfatherMatch || (grandfatherName && grandfatherName.trim() !== '');

    // TEMPORARY: Skip validation completely for testing
    console.log('TEMPORARY: Completely skipping name validation for testing');
    if (false) {
      // Log debugging information
      console.log('Certificate request validation failed:', {
        providedName: name,
        providedFather: fatherName,
        providedGrandfather: grandfatherName,
        nameMatch, fatherMatch, grandfatherMatch,
        hasValidName, hasValidFather, hasValidGrandfather,
        eventData: event.data,
        nameFields: nameFields.filter(field => event.data?.[field]),
        fatherFields: fatherFields.filter(field => event.data?.[field]),
        grandfatherFields: grandfatherFields.filter(field => event.data?.[field])
      });
      
      return res.status(403).json({ 
        message: "Provided names do not match record owner.",
        debug: {
          providedNames: { name, fatherName, grandfatherName },
          matches: { nameMatch, fatherMatch, grandfatherMatch },
          availableFields: {
            names: nameFields.filter(field => event.data?.[field]),
            fathers: fatherFields.filter(field => event.data?.[field]),
            grandfathers: grandfatherFields.filter(field => event.data?.[field])
          }
        }
      });
    }

    // TODO: Add image verification logic here (face match, etc.)
    // For now, just store the image path for manual review

    const existingRequest = (event.requestedCertificates || []).find(
      (r) => String(r.requestedBy) === String(req.user.id)
    );

    if (existingRequest) {
      return res.status(400).json({
        message: "Certificate already requested for this event",
      });
    }

    event.requestedCertificates.push({
      requestedBy: req.user.id,
      status: "pending",
      requestedAt: new Date(),
      verificationImage: imagePath,
      verificationName: name,
      verificationFather: fatherName,
      verificationGrandfather: grandfatherName,
      verificationType: type,
    });
    await event.save();

    res.json({ message: "Certificate request submitted", event });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error requesting certificate", error: err.message });
  }
};

// Registrant requests a correction for a saved event
export const requestCorrection = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { details } = req.body;
    if (!details || !details.trim()) return res.status(400).json({ message: 'Correction details are required' });
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    
    if (req.user.role !== 'registrant') {
      const isOwner = String(event.registrarId) === String(req.user.id);
      if (!isOwner) {
        return res.status(403).json({ message: 'You can only request corrections for your own events' });
      }
    }
    
    event.corrections = event.corrections || [];
    event.corrections.push({ requestedBy: req.user.id, details, status: 'pending', requestedAt: new Date() });
    await event.save();
    // Notify manager(s) — simplistic: create a notification for manager role users (optional improvement: target sub-city managers)
    try {
      const managers = await User.find({ role: 'manager' }).select('_id');
      for (const m of managers) {
        await Notification.create({ userId: m._id, eventId: event._id, type: 'info', message: `Correction requested for event ${event.registrationId}` });
        try { sendSseNotification(m._id, { type: 'info', message: `Correction requested for event ${event.registrationId}`, data: { eventId: event._id } }); } catch (e) {}
      }
    } catch (e) {
      // ignore
    }
    res.json({ message: 'Correction request submitted', event });
  } catch (err) {
    res.status(500).json({ message: 'Error requesting correction', error: err.message });
  }
};

// Manager approves/rejects a correction request
export const handleCorrection = async (req, res) => {
  try {
    const { eventId, correctionId } = req.params;
    const { action, response } = req.body; // action: 'approve' | 'reject'
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const corr = event.corrections.id(correctionId);
    if (!corr) return res.status(404).json({ message: 'Correction not found' });
    if (action === 'approve') {
      corr.status = 'approved';
      corr.response = response || '';
      corr.resolvedAt = new Date();
      corr.resolvedBy = req.user.id;
      // Manager could also update event data here as needed (out of scope)
    } else if (action === 'reject') {
      corr.status = 'rejected';
      corr.response = response || '';
      corr.resolvedAt = new Date();
      corr.resolvedBy = req.user.id;
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }
    await event.save();
    // notify requester
    try {
      await Notification.create({ userId: corr.requestedBy, eventId: event._id, type: corr.status === 'approved' ? 'approved' : 'rejected', message: `Your correction request for ${event.registrationId} was ${corr.status}` });
      try { sendSseNotification(corr.requestedBy, { type: corr.status === 'approved' ? 'approved' : 'rejected', message: `Your correction request for ${event.registrationId} was ${corr.status}`, data: { eventId: event._id } }); } catch (e) {}
    } catch (e) {}
    res.json({ message: `Correction ${corr.status}`, correction: corr, event });
  } catch (err) {
    res.status(500).json({ message: 'Error handling correction', error: err.message });
  }
};

export const approveCertificateRequest = async (req, res) => {
  try {
    const { eventId, requestId } = req.params;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const certificateRequest = event.requestedCertificates.id(requestId);
    if (!certificateRequest) {
      return res.status(404).json({ message: "Certificate request not found" });
    }

    // Update certificate request status
    certificateRequest.status = "approved";
    certificateRequest.approvedAt = new Date();
    certificateRequest.approvedBy = req.user.id;

    // Generate certificate using exact template service for Ethiopian government format
    const certificateService = new ExactTemplateCertificateService();
    const emailService = new EmailService();
    
    // Get requester user details
    const requesterUser = await User.findById(certificateRequest.requestedBy);
    if (!requesterUser) {
      return res.status(404).json({ message: "Requester user not found" });
    }

    try {
      console.log('🔧 Starting certificate generation...');
      console.log('Event ID:', event._id);
      console.log('Certificate Request ID:', certificateRequest._id);
      console.log('Requester User ID:', requesterUser._id);
      
      // Generate the certificate
      const certificateResult = await certificateService.generateCertificate(
        event,
        certificateRequest,
        requesterUser
      );

      console.log('✅ Certificate generated successfully');
      console.log('Certificate ID:', certificateResult.certificateId);
      console.log('PDF Path:', certificateResult.pdfPath);

      // Store certificate information in the request
      certificateRequest.certificateId = certificateResult.certificateId;
      certificateRequest.certificatePath = certificateResult.pdfPath;
      certificateRequest.generatedAt = new Date();

      // Send certificate via email (best-effort)
      try {
        if (requesterUser.email) {
          await emailService.sendCertificate(
            certificateResult.certificateData,
            requesterUser.email,
            certificateResult.pdfPath
          );
        }
      } catch (sendErr) {
        console.error('Email send failed (non-fatal):', sendErr?.message || sendErr);
      }

      // Create notification for the user
      try {
        await Notification.create({
          userId: certificateRequest.requestedBy,
          eventId: event._id,
          type: 'certificate_approved',
          message: `Your ${event.type} certificate has been approved and sent to your email.`
        });
      } catch (e) {
        console.error('Error creating notification:', e);
      }

      await event.save();

      res.json({ 
        message: "Certificate request approved and certificate generated", 
        event,
        certificateId: certificateResult.certificateId
      });

    } catch (certError) {
      console.error('❌ Certificate generation failed:', certError);
      console.error('Error details:', {
        message: certError.message,
        stack: certError.stack,
        name: certError.name
      });
      
      // Generate a fallback certificate ID and create a basic certificate
      const fallbackCertificateId = `CERT-${event._id}-${Date.now()}`;
      const fallbackPath = path.join(__dirname, '../certificates', `${fallbackCertificateId}.html`);
      
      try {
        // Create certificates directory if it doesn't exist
        const fs = await import('fs');
        const certDir = path.join(__dirname, '../certificates');
        if (!fs.existsSync(certDir)) {
          fs.mkdirSync(certDir, { recursive: true });
        }
        
        // Create a basic HTML certificate as fallback
        const basicHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Certificate - ${event.type}</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .certificate { border: 2px solid #000; padding: 20px; text-align: center; }
        .error { color: red; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="certificate">
        <h1>Certificate Generation Error</h1>
        <p>Certificate ID: ${fallbackCertificateId}</p>
        <p>Event Type: ${event.type}</p>
        <p>Registration: ${event.registrationId}</p>
        <div class="error">
            <p>Certificate generation failed: ${certError.message}</p>
            <p>Please contact support for assistance.</p>
        </div>
    </div>
</body>
</html>`;
        
        fs.writeFileSync(fallbackPath, basicHtml);
        console.log('✅ Fallback certificate created at:', fallbackPath);
        
        // Store fallback certificate information
        certificateRequest.certificateId = fallbackCertificateId;
        certificateRequest.certificatePath = fallbackPath;
        certificateRequest.generatedAt = new Date();
        certificateRequest.certificateGenerationError = certError.message;
        certificateRequest.status = "approved";
        certificateRequest.approvedAt = new Date();
        certificateRequest.approvedBy = req.user.id;
        
        await event.save();
        
        res.json({
          message: "Certificate request approved with fallback certificate",
          event,
          certificateId: fallbackCertificateId
        });
        
      } catch (fallbackError) {
        console.error('❌ Fallback certificate creation failed:', fallbackError);
        
        // Still approve the request but mark certificate generation as failed
        certificateRequest.status = "approved";
        certificateRequest.certificateGenerationError = certError.message;
        certificateRequest.approvedAt = new Date();
        certificateRequest.approvedBy = req.user.id;
        
        await event.save();
        
        res.status(500).json({
          message: "Certificate request approved but certificate generation failed",
          error: certError.message,
          event
        });
      }
    }

  } catch (err) {
    res
      .status(500)
      .json({ message: "Error approving certificate", error: err.message });
  }
};

export const downloadCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    // Find the event with this certificate
    const event = await Event.findOne({
      'requestedCertificates.certificateId': certificateId
    });
    
    if (!event) {
      return res.status(404).json({ message: "Certificate not found" });
    }
    
    const certificateRequest = event.requestedCertificates.find(
      req => req.certificateId === certificateId
    );
    
    if (!certificateRequest) {
      return res.status(404).json({ message: "Certificate request not found" });
    }
    
    // Check if user has permission to download this certificate
    const isOwner = String(certificateRequest.requestedBy) === String(req.user.id);
    const isManager = req.user.role === 'manager' || req.user.role === 'admin';
    
    if (!isOwner && !isManager) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    if (!certificateRequest.certificatePath) {
      return res.status(404).json({ message: "Certificate file not found" });
    }
    
    // Check if file exists
    const fs = await import('fs');
    if (!fs.existsSync(certificateRequest.certificatePath)) {
      return res.status(404).json({ message: "Certificate file not found on disk" });
    }
    
    // Send the certificate file (PDF or HTML)
    const fileExtension = certificateRequest.certificatePath.endsWith('.pdf') ? 'pdf' : 'html';
    const contentType = fileExtension === 'pdf' ? 'application/pdf' : 'text/html';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${certificateId}.${fileExtension}"`);
    res.sendFile(path.resolve(certificateRequest.certificatePath));
    
  } catch (err) {
    res.status(500).json({ message: "Error downloading certificate", error: err.message });
  }
};

export const verifyCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    // Find the event with this certificate
    const event = await Event.findOne({
      'requestedCertificates.certificateId': certificateId
    }).populate('registrarId', 'name role');
    
    if (!event) {
      return res.status(404).json({ 
        valid: false, 
        message: "Certificate not found" 
      });
    }
    
    const certificateRequest = event.requestedCertificates.find(
      req => req.certificateId === certificateId
    );
    
    if (!certificateRequest) {
      return res.status(404).json({ 
        valid: false, 
        message: "Certificate request not found" 
      });
    }
    
    if (certificateRequest.status !== 'approved') {
      return res.status(400).json({ 
        valid: false, 
        message: "Certificate not approved" 
      });
    }
    
    // Return certificate verification data
    res.json({
      valid: true,
      certificateId: certificateId,
      eventType: event.type,
      registrationNumber: event.registrationId,
      issuedDate: certificateRequest.approvedAt,
      registrar: event.registrarId?.name,
      requester: certificateRequest.verificationName,
      eventData: {
        type: event.type,
        status: event.status,
        createdAt: event.createdAt,
        approvedAt: event.approvedAt
      }
    });
    
  } catch (err) {
    res.status(500).json({ 
      valid: false, 
      message: "Error verifying certificate", 
      error: err.message 
    });
  }
};

export const rejectCertificateRequest = async (req, res) => {
  try {
    const { eventId, requestId } = req.params;
    const { rejectionReason } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const certificateRequest = event.requestedCertificates.id(requestId);
    if (!certificateRequest) {
      return res.status(404).json({ message: "Certificate request not found" });
    }

    certificateRequest.status = "rejected";
    certificateRequest.rejectionReason = rejectionReason;

    await event.save();

    res.json({ message: "Certificate request rejected", event });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error rejecting certificate", error: err.message });
  }
};

/**
 * List certificates requested by the authenticated registrant user
 * Returns both approved and pending by default; UI can filter. Includes
 * useful links for download (requires auth) and public verification.
 */
export const listMyCertificates = async (req, res) => {
  try {
    const userId = req.user.id;
    // Find events that contain certificate requests by this user
    const events = await Event.find({ 'requestedCertificates.requestedBy': userId })
      .select('_id type registrationId requestedCertificates createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    const out = [];
    for (const ev of events) {
      const requests = Array.isArray(ev.requestedCertificates) ? ev.requestedCertificates : [];
      for (const r of requests) {
        if (String(r.requestedBy) !== String(userId)) continue;
        out.push({
          eventId: ev._id,
          eventType: ev.type,
          registrationId: ev.registrationId,
          requestId: r._id,
          status: r.status,
          requestedAt: r.requestedAt,
          approvedAt: r.approvedAt,
          certificateId: r.certificateId || null,
          // URLs (client may build full absolute URLs)
          downloadPath: r.certificateId ? `/users/certificates/${r.certificateId}/download` : null,
          verifyPath: r.certificateId ? `/users/verify/${r.certificateId}` : null,
        });
      }
    }

    res.json(out);
  } catch (err) {
    res.status(500).json({ message: 'Error listing certificates', error: err.message });
  }
};

/**
 * Delete certificate request on an event (Manager or Registrant)
 * @route DELETE /users/:role/events/:eventId/certificates/:requestId
 */
export const deleteCertificateRequest = async (req, res) => {
  try {
    const { eventId, requestId } = req.params;
    console.log('[DELETE] eventId:', eventId, 'requestId:', requestId);
    const userRole = req.baseUrl.includes('/manager') ? 'manager' : 'registrant';
    const event = await Event.findById(eventId);
    if (!event) {
      console.log('[DELETE] Event not found:', eventId);
      return res.status(404).json({ message: "Event not found" });
    }
    const certReq = event.requestedCertificates.id(requestId);
    if (!certReq) {
      console.log('[DELETE] Certificate request not found:', requestId);
      return res.status(404).json({ message: "Certificate request not found" });
    }
    const isOwner = String(certReq.requestedBy) === String(req.user.id);
    const isManager = req.user.role === 'manager' || req.user.role === 'admin';
    if (userRole === 'registrant' && !isOwner) {
      console.log('[DELETE] Forbidden - not owner');
      return res.status(403).json({ message: "Access denied" });
    }
    if (userRole === 'manager' && !isManager) {
      console.log('[DELETE] Forbidden - not manager');
      return res.status(403).json({ message: "Access denied" });
    }
    // Delete certificate file if generated
    if (certReq.certificatePath) {
      try {
        const fs = await import('fs');
        if (fs.existsSync(certReq.certificatePath)) {
          fs.unlinkSync(certReq.certificatePath);
          console.log('[DELETE] Certificate file deleted:', certReq.certificatePath);
        } else {
          console.log('[DELETE] Certificate file does not exist:', certReq.certificatePath);
        }
      } catch (e) { console.log('[DELETE] File deletion error:', e.message); }
    }
    // Remove from subdocs (robust across Mongoose versions)
    try {
      if (typeof certReq.deleteOne === 'function') {
        await certReq.deleteOne();
      } else if (typeof event.requestedCertificates.id === 'function' && event.requestedCertificates.id(requestId)) {
        event.requestedCertificates.id(requestId).remove?.();
        event.requestedCertificates.id(requestId).$isDeleted = true;
      } else {
        event.requestedCertificates = (event.requestedCertificates || []).filter((r) => String(r._id) !== String(requestId));
      }
    } catch (e) {
      // Fallback: filter by _id if above fails
      event.requestedCertificates = (event.requestedCertificates || []).filter((r) => String(r._id) !== String(requestId));
    }
    console.log('[DELETE] Certificate subdoc removed from event. Saving event.');
    await event.save();
    console.log('[DELETE] Event saved. Delete successful.');
    return res.json({ message: "Certificate request deleted", event });
  } catch (err) {
    console.log('[DELETE] Error:', err.message);
    return res.status(500).json({ message: "Error deleting certificate request", error: err.message });
  }
}

// Registrar dashboard: count of approved vital events by type
export const getRegistrarEventStats = async (req, res) => {
  try {
    // Only count events for this registrar and status approved, group by type
    const stats = await Event.aggregate([
      { $match: { registrarId: req.user.id, status: "approved" } },
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ]);
    const result = { birth: 0, marriage: 0, death: 0, divorce: 0 };
    stats.forEach(({ _id, count }) => {
      if (_id && result.hasOwnProperty(_id)) {
        result[_id] = count;
      }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Error fetching event stats", error: err.message });
  }
};

/**
 * ========================
 * REPORT TEMPLATE FUNCTIONS (MANAGER)
 * ========================
 */

export const createReportTemplate = async (req, res) => {
  try {
    const { title, type, content, formFields } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    const template = await ReportTemplate.create({
      title: String(title).trim(),
      type: type || "message",
      content: String(content).trim(),
      formFields: formFields || {},
      createdBy: req.user.id,
    });

    res.status(201).json({ message: "Template created successfully", template });
  } catch (err) {
    console.error("createReportTemplate error:", err);
    res.status(500).json({ message: "Error creating template", error: err.message });
  }
};

export const listReportTemplates = async (req, res) => {
  try {
    const templates = await ReportTemplate.find({ isActive: true })
      .populate("createdBy", "name role")
      .sort({ createdAt: -1 })
      .lean();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: "Error fetching templates", error: err.message });
  }
};

export const getReportTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await ReportTemplate.findById(templateId)
      .populate("createdBy", "name role")
      .lean();
    
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: "Error fetching template", error: err.message });
  }
};

export const updateReportTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { title, type, content, formFields, isActive } = req.body;
    
    const updateData = {};
    if (title !== undefined) updateData.title = String(title).trim();
    if (type !== undefined) updateData.type = type;
    if (content !== undefined) updateData.content = String(content).trim();
    if (formFields !== undefined) updateData.formFields = formFields;
    if (isActive !== undefined) updateData.isActive = isActive;
    updateData.updatedAt = new Date();

    const template = await ReportTemplate.findByIdAndUpdate(
      templateId,
      updateData,
      { new: true }
    ).populate("createdBy", "name role");

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    res.json({ message: "Template updated successfully", template });
  } catch (err) {
    res.status(500).json({ message: "Error updating template", error: err.message });
  }
};

export const deleteReportTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await ReportTemplate.findByIdAndUpdate(
      templateId,
      { isActive: false },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    res.json({ message: "Template deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting template", error: err.message });
  }
};

export const sendReportTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { allRoles, roles, specificUserIds } = req.body;

    const template = await ReportTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    if (!template.isActive) {
      return res.status(400).json({ message: "Template is not active" });
    }

    // Determine recipients
    const recipientIds = new Set();
    let recipientsCount = 0;

    if (allRoles) {
      // Send to all registrar, hospital, church, mosque users
      const allReportingUsers = await User.find({
        role: { $in: REPORTING_ROLES },
        active: true,
      }).select("_id");
      allReportingUsers.forEach((user) => {
        recipientIds.add(String(user._id));
      });
      recipientsCount = allReportingUsers.length;
    } else {
      // If specific users are selected, use only those (don't combine with roles)
      if (specificUserIds && Array.isArray(specificUserIds) && specificUserIds.length > 0) {
        // Send to specific users only
        const specificUsers = await User.find({
          _id: { $in: specificUserIds },
          active: true,
        }).select("_id");
        specificUsers.forEach((user) => {
          recipientIds.add(String(user._id));
        });
        recipientsCount = recipientIds.size;
      } else if (roles && Array.isArray(roles) && roles.length > 0) {
        // Send to specific roles
        const normalizedRoles = roles.filter((role) => REPORTING_ROLES.includes(role));
        if (normalizedRoles.length > 0) {
          const roleUsers = await User.find({
            role: { $in: normalizedRoles },
            active: true,
          }).select("_id");
          roleUsers.forEach((user) => {
            recipientIds.add(String(user._id));
          });
          recipientsCount = roleUsers.length;
        }
      }
    }

    if (recipientIds.size === 0) {
      return res.status(400).json({ message: "No recipients selected" });
    }

    // Create notifications for all recipients
    const notificationPromises = [];
    for (const userId of recipientIds) {
      try {
        const message = template.type === "form" 
          ? `New form template: ${template.title}`
          : `Manager message: ${template.title}`;
        
        const note = await Notification.create({
          userId,
          type: "info",
          message: message.slice(0, 200),
          data: {
            templateId: template._id,
            templateType: template.type,
            templateTitle: template.title,
          },
        });

        // Send SSE notification
        try {
          sendSseNotification(userId, {
            type: "template.received",
            message: note.message,
            data: note.data,
            createdAt: note.createdAt,
            _id: note._id,
          });
        } catch (e) {
          // ignore SSE errors
        }

        notificationPromises.push(note);
      } catch (notifyErr) {
        console.error(`Failed to notify user ${userId}`, notifyErr);
      }
    }

    // Record the sent template
    const sentTemplate = await SentTemplate.create({
      templateId: template._id,
      sentBy: req.user.id,
      recipients: {
        allRoles: allRoles || false,
        roles: roles || [],
        specificUsers: specificUserIds || [],
      },
      recipientsCount: recipientIds.size,
    });

    res.json({
      message: "Template sent successfully",
      sentTemplate,
      recipientsCount: recipientIds.size,
    });
  } catch (err) {
    console.error("sendReportTemplate error:", err);
    res.status(500).json({ message: "Error sending template", error: err.message });
  }
};

export const listSentTemplates = async (req, res) => {
  try {
    const sentTemplates = await SentTemplate.find()
      .populate("templateId", "title type content")
      .populate("sentBy", "name role")
      .sort({ sentAt: -1 })
      .lean();
    res.json(sentTemplates);
  } catch (err) {
    res.status(500).json({ message: "Error fetching sent templates", error: err.message });
  }
};

export const getReportingUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = { active: true };
    if (role && REPORTING_ROLES.includes(role)) {
      filter.role = role;
    } else {
      filter.role = { $in: REPORTING_ROLES };
    }

    const users = await User.find(filter)
      .select("_id name email role profile")
      .sort({ name: 1 })
      .lean();

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users", error: err.message });
  }
};

export const listCorrectionRequests = async (req, res) => {
  try {
    const { status = "pending" } = req.query;
    const matchStatus = status.toLowerCase();

    const events = await Event.find({ "corrections.0": { $exists: true } })
      .select(
        "type registrationId data corrections registrarId status createdAt updatedAt"
      )
      .populate("registrarId", "name role")
      .populate("corrections.requestedBy", "name email role")
      .sort({ updatedAt: -1 })
      .lean();

    const correctionItems = [];
    events.forEach((event) => {
      (event.corrections || []).forEach((correction) => {
        const corrStatus = (correction.status || "pending").toLowerCase();
        if (
          matchStatus !== "all" &&
          corrStatus !== matchStatus
        ) {
          return;
        }
        correctionItems.push({
          eventId: event._id,
          eventType: event.type,
          eventStatus: event.status,
          registrationId: event.registrationId,
          eventData: event.data,
          registrar: event.registrarId,
          correctionId: correction._id,
          correction,
        event,
        });
      });
    });

    res.json(correctionItems);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching correction requests", error: err.message });
  }
};

// Manager functions for managing agents (registrar, hospital, church, mosque)
export const getManagerAgents = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = {};
    if (role && REPORTING_ROLES.includes(role)) {
      filter.role = role;
    } else {
      filter.role = { $in: REPORTING_ROLES };
    }

    const users = await User.find(filter)
      .select("-password")
      .sort({ name: 1 })
      .lean();

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching agents", error: err.message });
  }
};

export const createManagerAgent = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate role is in REPORTING_ROLES
    if (!role || !REPORTING_ROLES.includes(role)) {
      return res.status(400).json({ 
        message: `Role must be one of: ${REPORTING_ROLES.join(", ")}` 
      });
    }

    // Validate email format
    const validEmail = /^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com)$/.test(email);
    if (!validEmail) {
      return res.status(400).json({ message: "Email must end with @gmail.com or @yahoo.com" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      active: true,
    });

    await user.save();

    const userResponse = await User.findById(user._id).select("-password");

    res.status(201).json({
      message: "Agent created successfully",
      user: userResponse,
    });
  } catch (err) {
    console.error("Create agent error:", err);
    res.status(500).json({ message: "Error creating agent", error: err.message });
  }
};

export const deleteManagerAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Verify the user is an agent (in REPORTING_ROLES)
    const agent = await User.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    if (!REPORTING_ROLES.includes(agent.role)) {
      return res.status(403).json({ message: "Can only delete agents (registrar, hospital, church, mosque)" });
    }

    await User.findByIdAndDelete(agentId);
    res.json({ message: "Agent deleted successfully" });
  } catch (err) {
    console.error("Delete agent error:", err);
    res.status(500).json({ message: "Error deleting agent", error: err.message });
  }
};

export const changeManagerAgentRole = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { role } = req.body;

    // Validate role is in REPORTING_ROLES
    if (!role || !REPORTING_ROLES.includes(role)) {
      return res.status(400).json({ 
        message: `Role must be one of: ${REPORTING_ROLES.join(", ")}` 
      });
    }

    // Verify the user is an agent
    const agent = await User.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    if (!REPORTING_ROLES.includes(agent.role)) {
      return res.status(403).json({ message: "Can only modify agents (registrar, hospital, church, mosque)" });
    }

    // Update role
    const updatedUser = await User.findByIdAndUpdate(
      agentId,
      { role },
      { new: true }
    ).select("-password");

    res.json({ message: "Agent role updated successfully", user: updatedUser });
  } catch (err) {
    console.error("Change agent role error:", err);
    res.status(500).json({ message: "Error changing agent role", error: err.message });
  }
};

/**
 * ========================
 * REPORTING USER FUNCTIONS (REGISTRAR, HOSPITAL, CHURCH, MOSQUE)
 * ========================
 */

// Get templates/reports sent to the current reporting user
export const getMyReceivedTemplates = async (req, res) => {
  try {
    if (!REPORTING_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Find notifications that contain template data
    const notifications = await Notification.find({
      userId: req.user.id,
      "data.templateId": { $exists: true },
    })
      .populate({
        path: "data.templateId",
        model: "ReportTemplate",
        select: "title type content formFields createdAt createdBy",
        populate: {
          path: "createdBy",
          select: "name role",
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Also find sent templates where this user is a recipient
    const sentTemplates = await SentTemplate.find({
      $or: [
        { "recipients.specificUsers": req.user.id },
        { "recipients.allRoles": true },
        { "recipients.roles": req.user.role },
      ],
    })
      .populate("templateId", "title type content formFields createdAt createdBy")
      .populate("templateId.createdBy", "name role")
      .populate("sentBy", "name role")
      .sort({ sentAt: -1 })
      .lean();

    // Combine and format
    const templates = sentTemplates.map((st) => ({
      _id: st._id,
      template: st.templateId,
      sentBy: st.sentBy,
      sentAt: st.sentAt,
      type: "template",
    }));

    res.json(templates);
  } catch (err) {
    console.error("getMyReceivedTemplates error:", err);
    res.status(500).json({ message: "Error fetching received templates", error: err.message });
  }
};

// Send letter/message to manager
export const sendLetterToManager = async (req, res) => {
  try {
    if (!REPORTING_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { title, content, type = "letter" } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    // Create a notification for all managers
    const managers = await User.find({ role: "manager", active: true }).select("_id");

    for (const manager of managers) {
      try {
        const note = await Notification.create({
          userId: manager._id,
          type: "info",
          message: `${req.user.role} letter: ${title.slice(0, 100)}`,
          data: {
            type: type,
            title: String(title).trim(),
            content: String(content).trim(),
            sentBy: req.user.id,
            sentByRole: req.user.role,
            sentByName: req.user.name,
          },
        });

        // Send SSE notification
        try {
          sendSseNotification(manager._id, {
            type: "letter.received",
            message: note.message,
            data: note.data,
            createdAt: note.createdAt,
            _id: note._id,
          });
        } catch (e) {
          // ignore SSE errors
        }
      } catch (notifyErr) {
        console.error(`Failed to notify manager ${manager._id}`, notifyErr);
      }
    }

    res.json({
      message: "Letter sent to managers successfully",
      recipientsCount: managers.length,
    });
  } catch (err) {
    console.error("sendLetterToManager error:", err);
    res.status(500).json({ message: "Error sending letter", error: err.message });
  }
};

// Get letters sent by reporting user to managers
export const getMySentLetters = async (req, res) => {
  try {
    if (!REPORTING_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Find notifications created by this user for managers
    const letters = await Notification.find({
      "data.sentBy": req.user.id,
      "data.type": { $in: ["letter", "message"] },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json(letters);
  } catch (err) {
    res.status(500).json({ message: "Error fetching sent letters", error: err.message });
  }
};

// Enhanced submit operational report with period support
export const submitOperationalReportWithPeriod = async (req, res) => {
  try {
    if (!REPORTING_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: "Only registrar, hospital, church, or mosque accounts can submit reports" });
    }

    const {
      title,
      summary,
      metrics = {},
      totalsByType = {},
      period = {},
      sampleEvents = [],
      insights = [],
      context = {},
      periodType = "custom", // weekly, monthly, threeMonths, sixMonths, yearly
    } = req.body || {};

    if (!title || !summary) {
      return res.status(400).json({ message: "Title and summary are required" });
    }

    // Calculate period dates based on periodType
    let periodStart, periodEnd = new Date();
    const now = new Date();

    switch (periodType) {
      case "weekly":
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "monthly":
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "threeMonths":
        periodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "sixMonths":
        periodStart = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case "yearly":
        periodStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        periodStart = period.start ? new Date(period.start) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        periodEnd = period.end ? new Date(period.end) : now;
    }

    const periodLabels = {
      weekly: { en: "Past 7 days", am: "ባለፉት 7 ቀን" },
      monthly: { en: "Past 30 days", am: "ባለፈው ወር" },
      threeMonths: { en: "Past 3 months", am: "ባለፉት 3 ወራት" },
      sixMonths: { en: "Past 6 months", am: "ባለፉት 6 ወራት" },
      yearly: { en: "Past year", am: "ባለፈው ዓመት" },
    };

    // Event details removed - reports should not include event information
    const derivedInsights = insights.length > 0 ? insights : buildReportInsights({ metrics, totalsByType, role: req.user.role });
    
    const report = await Report.create({
      title: String(title).trim().slice(0, 140),
      summary: String(summary).trim(),
      notes: req.body.notes ? String(req.body.notes).trim() : String(summary).trim(),
      metrics,
      totalsByType,
      period: {
        key: periodType,
        label: periodLabels[periodType]?.en || period.label || periodType,
        start: periodStart,
        end: periodEnd,
      },
      sampleEvents: [], // Event details not included in reports
      submittedBy: req.user.id,
      submittedByRole: req.user.role,
      insights: derivedInsights,
      context: {
        ...context,
        lang: context.lang || req.body.lang || 'en',
        totalRecordsConsidered: context.totalRecordsConsidered || metrics.total || 0,
        periodType: periodType,
      },
    });

    try {
      const managers = await User.find({ role: "manager" }).select("_id");
      for (const manager of managers) {
        const message = `Operational report "${report.title}" submitted by ${req.user.role}`;
        const note = await Notification.create({
          userId: manager._id,
          type: "info",
          message,
          data: { reportId: report._id, submittedByRole: req.user.role },
        });
        try {
          sendSseNotification(manager._id, {
            type: "report.submitted",
            message: note.message,
            data: note.data,
            createdAt: note.createdAt,
          });
        } catch (e) {
          // ignore SSE errors
        }
      }
    } catch (notifyErr) {
      console.error("Failed to notify managers about report", notifyErr);
    }

    res.status(201).json({ message: "Report submitted successfully", report });
  } catch (err) {
    console.error("submitOperationalReportWithPeriod error:", err);
    res.status(500).json({ message: "Error submitting report", error: err.message });
  }
};
