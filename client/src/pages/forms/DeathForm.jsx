"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { ETH_GEO } from "@/lib/geo";
import { apiFetch } from "@/lib/api";
import { EthiopianDatePicker } from "../../lib/forms.jsx";
import { buildDeathPrefillFromBirth, buildDeathPrefillFromMarriage, mergePrefillState } from "@/lib/birthAutofill";
import { getCurrentEthiopianDate, isEthiopianDateInFuture } from "@/lib/ethioDate";

// UI Components (same as other forms)
const Card = ({ children, className }) => (
  <div className={`bg-white shadow-md rounded-lg ${className}`}>{children}</div>
);

const CardHeader = ({ children, className }) => (
  <div className={`p-4 border-b ${className}`}>{children}</div>
);

const CardTitle = ({ children, className }) => (
  <h2 className={`text-xl font-semibold ${className}`}>{children}</h2>
);

const CardContent = ({ children, className }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);

const Button = ({ children, onClick, type = "button", className }) => (
  <button
    type={type}
    onClick={onClick}
    className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out ${className}`}
  >
    {children}
  </button>
);

const Input = ({ type, name, value, onChange, className, hasError, errorMessage, disabled, ...props }) => {
  const baseClasses = "w-full max-w-xs px-2 py-1 h-8 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const errorClasses = hasError ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "";
  const disabledClasses = disabled ? "bg-gray-100 cursor-not-allowed" : "";
  
  return (
    <div className="w-full">
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${baseClasses} ${errorClasses} ${disabledClasses} ${className || ""}`}
        {...props}
      />
      {hasError && errorMessage && (
        <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  );
};

const Label = ({ children, htmlFor, className }) => (
  <label htmlFor={htmlFor} className={`block text-xs font-medium text-gray-700 mb-1 ${className || ""}`}>
    {children}
  </label>
);

const Select = ({ children, name, value, onChange, className, hasError, errorMessage, disabled, ...props }) => {
  const baseClasses = "w-full max-w-xs h-8 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const errorClasses = hasError ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "";
  const disabledClasses = disabled ? "bg-gray-100 cursor-not-allowed" : "";
  
  return (
    <div className="w-full">
      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${baseClasses} ${errorClasses} ${disabledClasses} ${className || ""}`}
        {...props}
      >
        {children}
      </select>
      {hasError && errorMessage && (
        <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  );
};

// Death-specific form configuration
const DEATH_FORM_CONFIG = [
  { section: "Registration Details", sectionAm: "የመዝገብ ዝርዝሮች" },
  { name: "registrationNumber", labelEn: "Registration Number", labelAm: "የመመዝገቢያ ቁጥር" },
  { name: "mainRegistrationRecordNumberAm", labelEn: "Registrar Bureaue ID. Number", labelAm: "የምዝገባ ጽ/ቤት መለያ ቁጥር" },
  { name: "registrationDateEth", labelEn: "Registration Date (Ethiopian)", labelAm: "የመመዝገቢያ ቀን (ኢትዮ)", type: "ethiopian-date" },
  { name: "registrationTimeHourAm", labelEn: "Registration Time: Hour", labelAm: "ሰዓት" },


   { section: "Registration Place", sectionAm: "የመዝገብ ቦታ" },
  {
    name: "registrationRegion",
    labelEn: "Region/City Administration",
    labelAm: "ክልል/ከተማ አስተዳደር",
    type: "location-region",
  },
  {
    name: "registrationZone",
    labelEn: "Zone",
    labelAm: "ዞን",
    type: "location-zone",
  },
  {
    name: "registrationWoreda",
    labelEn: "Woreda",
    labelAm: "ወረዳ",
    type: "location-woreda",
  },
  {
    name: "registrationCity",
    labelEn: "City",
    labelAm: "ከተማ",
  },
  {
    name: "registrationSubCity",
    labelEn: "Sub City",
    labelAm: "ክፍለ ከተማ",
  },
  {
    name: "registrationKebele",
    labelEn: "Kebele",
    labelAm: "ቀበሌ",
  },

  
  { section: "Place of death", sectionAm: "የሞት ቦታ" },
  { name: "deathRegion", labelEn: "region/city administration", labelAm: "ክልል/ከተማ አስተዳደር" },
  { name: "deathZone", labelEn: "zone/city administration", labelAm: "ዞን/ከተማ አስተዳደር" },
  { name: "deathCity", labelEn: "city", labelAm: "ከተማ" },
  { name: "deathSubCity", labelEn: "sub city", labelAm: "ክፍለ ከተማ" },
  { name: "deathWoreda", labelEn: "woreda", labelAm: "ወረዳ" },
  { name: "deathKebeleAm", labelEn: "kebele", labelAm: "ቀበሌ" },

{ section: "Full Information of the Deceased", sectionAm: "የሟች ሙሉ መረጃ" },
{ name: "deceasedIdNumberAm", labelEn: "Identification Card Number", labelAm: "የመታወቂያ ቁጥር" },
{ name: "deceasedNameEn", labelEn: "Name (EN)", labelAm: "Name (EN)" },
{ name: "deceasedNameAm", labelEn: "ስም", labelAm: "ስም" },
  { name: "deceasedFatherEn", labelEn: "Father's Name (EN)", labelAm: "Father's Name (EN)" },
  { name: "deceasedFatherAm", labelEn: "የአባት ስም", labelAm: "የአባት ስም" },
  { name: "deceasedGrandfatherEn", labelEn: "Grandfather's Name (EN)", labelAm: "Grandfather's Name (EN)" },
  { name: "deceasedGrandfatherAm", labelEn: "የአያት ስም", labelAm: "የአያት ስም" },
{ name: "deceasedNationalityAm", labelEn: "nationality", labelAm: "ዜግነት" },
  { name: "deceasedTitleAm", labelEn: "Title", labelAm: "ማዕረግ" },
  { name: "deceasedSex", labelEn: "Sex", labelAm: "ጾታ", type: "select", options: [
    { value: "male", labelEn: "Male", labelAm: "ወንድ" },
    { value: "female", labelEn: "Female", labelAm: "ሴት" },
  ] },
  { name: "deceasedAgeAm", labelEn: "Age", labelAm: "እድሜ" },
  { name: "deceasedBirthDate", labelEn: "date of birth", labelAm: "የትውልድ ቀን", type: "ethiopian-date" },
  { name: "deceasedResidence", labelEn: "መኖሪያ ቦታ", labelAm: "መኖሪያ ቦታ" },
  { name: "deceasedEthnicity", labelEn: "Ethnicity", labelAm: "ዘር" },
  { name: "deceasedReligion", labelEn: "Religion", labelAm: "ሃይማኖት", type: "select", options: [
      { value: "orthodox", labelEn: "Orthodox", labelAm: "ኦርቶዶክስ" },
      { value: "protestant", labelEn: "Protestant", labelAm: "ፕሮቴስታንት" },
      { value: "catholic", labelEn: "Catholic", labelAm: "ካቶሊክ" },
      { value: "muslim", labelEn: "Muslim", labelAm: "ሙስሊም" },
      { value: "other", labelEn: "Other", labelAm: "ሌላ" },
  ] },
  { name: "deceasedEducation", labelEn: "የትምህርት ደረጃ", labelAm: "የትምህርት ደረጃ" },
  { name: "deceasedJob", labelEn: "ሥራ", labelAm: "ሥራ" },
{ name: "deceasedPhoto", labelEn: "Deceased Photo", labelAm: "የሞተው ፎቶ", type: "file" },
  { name: "deceasedMaritalStatusAm", labelEn: "Martial Status", labelAm: "የጋብቻ ሁኔታ", type: "select", options: [
      { value: "single", labelEn: "Single", labelAm: "ያልተጋባ" },
      { value: "married", labelEn: "Married", labelAm: "ያገባ" },
      { value: "divorced", labelEn: "Divorced", labelAm: "የተፈታ" },
      { value: "widowed", labelEn: "Widowed", labelAm: "የተጠፋ" },
  ] },

  { section: "Death Details", sectionAm: "የሞት ዝርዝር" },
  { name: "deathDate", labelEn: "Date", labelAm: "ቀን", type: "ethiopian-date" },
  { name: "deathPlace", labelEn: "Place of Death", labelAm: "የሞት ቦታ" },
  { name: "deathPlaceEn", labelEn: "Place of Death (English)", labelAm: "የሞት ቦታ (እንግሊዝኛ)" },
  { name: "deathPlaceAm", labelEn: "Place of Death (Amharic)", labelAm: "የሞት ቦታ (አማርኛ)" },
  { name: "deathLocationType", labelEn: "Death Location Type", labelAm: "የሞት ቦታ አይነት" },
  { name: "deathPlaceRegion", labelEn: "Region/city administration", labelAm: "ክልል" },
  { name: "deathPlaceZone", labelEn: "zone/city administration", labelAm: "ዞን" },
  { name: "deathPlaceSubCity", labelEn: "sub city", labelAm: "ንዑስ ከተማ" },
  { name: "deathPlaceWoreda", labelEn: "woreda", labelAm: "ወረዳ" },
  { name: "deathPlaceKebele", labelEn: "kebele", labelAm: "ቀበሌ" },
  { name: "causeOfDeath1Am", labelEn: "Cause of Death: 1", labelAm: "የሞት ምክንያት 1" },
  { name: "causeOfDeath2Am", labelEn: "Cause of Death: 2", labelAm: "የሞት ምክንያት 2" },
  { name: "causeOfDeath3Am", labelEn: "Cause of Death: 3", labelAm: "የሞት ምክንያት 3" },
  { name: "deathProofTypeAm", labelEn: "Proof of cause of death", labelAm: "የሞት ማረጋገጫ ዓይነት" },
  { name: "deathProofNumber", labelEn: "Proof given for the Death cause", labelAm: "የማረጋገጫ ቁጥር" },
  { name: "burialPlace", labelEn: "place of burial", labelAm: "የቀብር ቦታ" },

  { section: "Registration Requester", sectionAm: "የመዝገብ ጠያቂ" },
  { name: "requesterName", labelEn: "Name", labelAm: "ስም" },
  { name: "requesterFather", labelEn: "father's Name", labelAm: "የአባት ስም" },
  { name: "requesterGrand", labelEn: "Grandfather's Name", labelAm: "የአያት ስም" },
  { name: "requesterRegistrationDate", labelEn: "Registration Date", labelAm: "የምዝገባ ቀን", type: "ethiopian-date" },
  { name: "requesterRelation", labelEn: "Relation with Deceased", labelAm: "ግንኙነት" },
  { name: "requesterIdNumber", labelEn: "የመታወቂያ ቁጥር", labelAm: "የመታወቂያ ቁጥር" },
  { name: "deathSignedConsent", labelEn: "Signed Registration Concent", labelAm: "የተፈረመ ፍቃድ", type: "file" },

  { section: "Registrar Information", sectionAm: "የምዝገባ መረጃ" },
  { name: "registrarNameAm", labelEn: "Name", labelAm: "ስም" },
  { name: "registrarFatherNameAm", labelEn: "Father's Name", labelAm: "የአባት ስም" },
  { name: "registrarGrandNameAm", labelEn: "Grandfather's name", labelAm: "የአያት ስም" },
  { name: "registrarDate", labelEn: "Registration Date", labelAm: "የምዝገባ ቀን", type: "ethiopian-date" },
];

// Initial death form state
const initialDeathFormState = {
  type: "death",
  registrationId: "",
  country: "Ethiopia",
  // Registration details
  registrationNumber: "",
  mainRegistrationRecordNumberAm: "",
  registrationDateEth: "",
  registrationTimeHourAm: "",
  // Registration place
  registrationRegion: "",
  registrationZone: "",
  registrationWoreda: "",
  registrationCity: "",
  registrationSubCity: "",
  registrationKebele: "",
  // Place of death
  deathRegion: "",
  deathZone: "",
  deathCity: "",
  deathSubCity: "",
  deathWoreda: "",
  deathKebeleAm: "",
  // Deceased information
  deceasedNameEn: "",
  deceasedNameAm: "",
  deceasedFatherEn: "",
  deceasedFatherAm: "",
  deceasedGrandfatherEn: "",
  deceasedGrandfatherAm: "",
  deceasedNationalityAm: "",
  deceasedIdNumberAm: "",
  deceasedTitleAm: "",
  deceasedSex: "",
  deceasedAgeAm: "",
  deceasedBirthDate: "",
  deceasedResidence: "",
  deceasedEthnicity: "",
  deceasedReligion: "",
  deceasedEducation: "",
  deceasedJob: "",
  deceasedPhoto: null,
  deceasedMaritalStatusAm: "",
  // Death details
  deathDate: "",
  deathPlace: "",
  deathPlaceEn: "",
  deathPlaceAm: "",
  deathLocationType: "",
  deathPlaceRegion: "",
  deathPlaceZone: "",
  deathPlaceSubCity: "",
  deathPlaceWoreda: "",
  deathPlaceKebele: "",
  causeOfDeath1Am: "",
  causeOfDeath2Am: "",
  causeOfDeath3Am: "",
  deathProofTypeAm: "",
  deathProofNumber: "",
  burialPlace: "",
  // Registration requester
  requesterName: "",
  requesterFather: "",
  requesterGrand: "",
  requesterRegistrationDate: "",
  requesterRelation: "",
  requesterIdNumber: "",
  deathSignedConsent: null,
  // Registrar information
  registrarNameAm: "",
  registrarFatherNameAm: "",
  registrarGrandNameAm: "",
  registrarDate: "",
};

// Translation helper
const translate = (lang, en, am) => (lang === "en" ? en : am);

// Helpers: language & numeric validation
const containsAmharic = (s) => /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF]/.test(String(s || ''));
const containsLatin = (s) => /[A-Za-z]/.test(String(s || ''));
const isNumericString = (s) => /^[0-9]+$/.test(String(s || ''));
const emptyEthiopianDate = () => ({ year: '', month: '', day: '' });
const isValueEmpty = (value) => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (typeof value === 'object') {
    if ('year' in value && 'month' in value && 'day' in value) {
      return !value.year && !value.month && !value.day;
    }
    return Object.keys(value).length === 0;
  }
  return false;
};

const getGeoOptions = (parentType, parentValue, lang) => {
  if (parentType === 'region') {
    return Object.entries(ETH_GEO).map(([key, val]) => {
      const v = typeof key === 'object' ? (key.am || key.en || '') : key;
      const label = (val && typeof val === 'object' && (val[lang] || val.am || val.en)) ? (val[lang] || val.am || val.en) : v;
      return { value: v, label };
    });
  } else if (parentType === 'zone' && parentValue && ETH_GEO[parentValue]?.zones) {
    return Object.entries(ETH_GEO[parentValue].zones).map(([key, val]) => {
      const v = typeof key === 'object' ? (key.am || key.en || '') : key;
      const label = (val && typeof val === 'object' && (val[lang] || val.am || val.en)) ? (val[lang] || val.am || val.en) : v;
      return { value: v, label };
    });
  } else if (parentType === 'woreda' && parentValue.region && parentValue.zone && ETH_GEO[parentValue.region]?.zones?.[parentValue.zone]?.woredas) {
    const woredas = ETH_GEO[parentValue.region].zones[parentValue.zone].woredas;
    const toLabel = (w) => typeof w === 'string' ? w : (lang === 'en' ? w.en : w.am);
    const toValue = (w) => typeof w === 'string' ? w : (w.en || w.am || String(w));
    return woredas.map(w => ({ value: toValue(w), label: toLabel(w) }));
  }
  return [];
};

// Update geo option handling to support deathPlace* keys in additions to death* and registration*
// Helper to derive parent keys by field name prefix
const getGeoParentKeys = (fieldName, form) => {
  if (fieldName.startsWith('deathPlace')) {
    return {
      regionKey: form.deathPlaceRegion,
      zoneKey: form.deathPlaceZone,
      group: 'deathPlace',
    };
  }
  if (fieldName.startsWith('death')) {
    return {
      regionKey: form.deathRegion,
      zoneKey: form.deathZone,
      group: 'death',
    };
  }
  if (fieldName.startsWith('registration')) {
    return {
      regionKey: form.registrationRegion,
      zoneKey: form.registrationZone,
      group: 'registration',
    };
  }
  return { regionKey: undefined, zoneKey: undefined, group: '' };
};

// Death Form Component
const DeathForm = ({ user, setUser, onSubmit, onEdit, editingEvent = null }) => {
  const [lang, setLang] = useState("am");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialDeathFormState);
  const [generatedRegistrationId, setGeneratedRegistrationId] = useState(null);
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [hasValidationErrors, setHasValidationErrors] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const duplicateCheckTimeoutRef = React.useRef(null);
  const [lockedFields, setLockedFields] = useState(() => new Set());

  const lockFields = useCallback((fields) => {
    if (!fields?.length) return;
    setLockedFields((prev) => {
      const next = new Set(prev);
      fields.forEach((field) => next.add(field));
      return next;
    });
  }, []);

  const unlockFields = useCallback((fields) => {
    if (!fields?.length) return;
    setLockedFields((prev) => {
      const next = new Set(prev);
      fields.forEach((field) => next.delete(field));
      return next;
    });
  }, []);

  const applyPrefillPatch = useCallback((patch) => {
    if (!patch || !Object.keys(patch).length) return;
    setForm((prev) => {
      const next = mergePrefillState(prev, patch);
      const newlyFilled = [];
      Object.keys(patch).forEach((key) => {
        if (isValueEmpty(prev[key]) && !isValueEmpty(next[key])) {
          newlyFilled.push(key);
        }
      });
      if (newlyFilled.length) {
        lockFields(newlyFilled);
      }
      return next;
    });
  }, [lockFields]);

  // Language-aware registration region/zone/woreda options
  const registrationRegionOptions = useMemo(() => {
    return Object.entries(ETH_GEO || {}).map(([key, val]) => {
      const value = typeof key === 'object' ? (key.am || key.en || '') : key;
      const label = (val && typeof val === 'object' && (val[lang] || val.am || val.en)) ? (val[lang] || val.am || val.en) : value;
      return { value, label };
    });
  }, [lang]);

  const registrationZoneOptions = useMemo(() => {
    if (!form.registrationRegion) return [];
    const zonesObj = ETH_GEO[form.registrationRegion]?.zones || {};
    return Object.entries(zonesObj).map(([key, val]) => {
      const value = typeof key === 'object' ? (key.am || key.en || '') : key;
      const label = (val && typeof val === 'object' && (val[lang] || val.am || val.en)) ? (val[lang] || val.am || val.en) : value;
      return { value, label };
    });
  }, [form.registrationRegion, lang]);

  const registrationWoredaOptions = useMemo(() => {
    if (!form.registrationRegion || !form.registrationZone) return [];
    const woredas = ETH_GEO[form.registrationRegion]?.zones?.[form.registrationZone]?.woredas || [];
    const toLabel = (item) => (typeof item === "string" ? item : (lang === "en" ? item.en : item.am));
    const toValue = (item) => (typeof item === "string" ? item : (item.en || item.am || String(item)));
    return woredas.map(w => ({ value: toValue(w), label: toLabel(w) }));
  }, [form.registrationRegion, form.registrationZone, lang]);

  // Generate registration ID
  const generateRegistrationId = useCallback(async () => {
    if (generatedRegistrationId) return;
    setIsGeneratingId(true);
    try {
      const res = await apiFetch("/users/registration-id", {
        method: "POST",
        token: user.token,
      });
      if (res?.registrationId) {
        setGeneratedRegistrationId(res.registrationId);
        setForm(prev => ({ ...prev, registrationId: res.registrationId }));
      }
    } catch (err) {
      console.error("Generate registration ID error:", err);
    } finally {
      setIsGeneratingId(false);
    }
  }, [user?.token, generatedRegistrationId]);

  const fetchBirthRecord = useCallback(
    async (idNumber) => {
      try {
        if (!idNumber || !user?.token) return null;
        const params = new URLSearchParams({
          idNumber: String(idNumber).trim(),
        });
        const result = await apiFetch(`/users/birth-records/by-id?${params.toString()}`, {
          token: user.token,
        });
        return result?.birthRecord?.data || null;
      } catch (err) {
        if (!String(err.message || '').includes('404')) {
          console.error('Birth record lookup failed:', err);
        }
        return null;
      }
    },
    [user?.token]
  );

  // Check for duplicate ID card number
  const checkDuplicateId = useCallback(async (idNumber, fieldName) => {
    if (!idNumber || String(idNumber).trim() === '' || !user?.token) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
      return;
    }

    setCheckingDuplicate(true);
    try {
      const params = new URLSearchParams({
        type: 'death',
        idNumber: String(idNumber).trim(),
        fieldName: fieldName,
      });
      const shouldRequestPrefill = fieldName === 'deceasedIdNumberAm';
      if (shouldRequestPrefill) {
        params.append('prefillBirth', 'true');
      }
      
      if (editingEvent?._id) {
        params.append('excludeEventId', editingEvent._id);
      }

      const result = await apiFetch(`/users/check-duplicate-id?${params.toString()}`, {
        method: 'GET',
        token: user.token,
      });

      console.log('[DeathForm] checkDuplicateId response:', result);

      if (result.isDuplicate) {
        const errorMsg = lang === 'en' 
          ? `This ID number is already registered (Registration ID: ${result.existingRegistrationId})`
          : `ይህ የመታወቂያ ቁጥር አስቀድሞ ተመዝግቧል (የመመዝገቢያ መለያ: ${result.existingRegistrationId})`;
        setValidationErrors((prev) => ({ ...prev, [fieldName]: errorMsg }));
      } else {
        setValidationErrors((prev) => {
          const next = { ...prev };
          delete next[fieldName];
          return next;
        });
      }
      
      // Check for birth record first (from initial response or fallback API call)
      let birthData = result?.birthRecord?.data;
      console.log('[DeathForm] Birth record from response:', birthData ? 'found' : 'not found');
      
      if (!birthData && shouldRequestPrefill) {
        console.log('[DeathForm] Fetching birth record as fallback...');
        birthData = await fetchBirthRecord(idNumber);
        console.log('[DeathForm] Birth record from fallback:', birthData ? 'found' : 'not found');
      }
      
      // Use birth data if available
      if (shouldRequestPrefill && birthData) {
        console.log('[DeathForm] Using birth record for autofill');
        const patch = buildDeathPrefillFromBirth(birthData);
        applyPrefillPatch(patch);
      } 
      // If no birth record found, try to use marriage record data
      else if (shouldRequestPrefill && !birthData) {
        console.log('[DeathForm] No birth record, checking for marriage record...');
        // Check marriage record from initial response
        const marriageRecord = result?.marriageRecord;
        console.log('[DeathForm] Marriage record from response:', marriageRecord);
        
        if (marriageRecord?.data) {
          console.log('[DeathForm] Using marriage record for autofill:', marriageRecord);
          const marriageData = marriageRecord.data;
          const patch = buildDeathPrefillFromMarriage(marriageData, idNumber);
          console.log('[DeathForm] Generated patch from marriage:', patch);
          if (Object.keys(patch).length > 0) {
            applyPrefillPatch(patch);
            console.log('[DeathForm] Applied marriage autofill patch');
          } else {
            console.warn('[DeathForm] Empty patch generated from marriage record');
          }
        } else {
          console.log('[DeathForm] No marriage record found in response. Full result:', JSON.stringify(result, null, 2));
        }
      }
    } catch (err) {
      console.error('Error checking duplicate ID:', err);
    } finally {
      setCheckingDuplicate(false);
    }
  }, [user?.token, lang, editingEvent?._id, fetchBirthRecord, applyPrefillPatch]);

  // Update form when editingEvent changes
  useEffect(() => {
    if (editingEvent) {
      setForm({
        ...initialDeathFormState,
        ...editingEvent.data,
        type: editingEvent.type,
        registrationId: editingEvent.registrationId,
      });
      setGeneratedRegistrationId(editingEvent.registrationId);
    } else {
      setForm(initialDeathFormState);
      setGeneratedRegistrationId(null);
    }
    setValidationErrors({});
    setHasValidationErrors(false);
    setLockedFields(new Set());
  }, [editingEvent]);

  // Auto-generate registration ID when form loads (for new events)
  useEffect(() => {
    if (!editingEvent && !generatedRegistrationId) {
      generateRegistrationId();
    }
  }, [editingEvent, generatedRegistrationId, generateRegistrationId]);

  // Auto-populate registrationNumber from generated ID (no reservation until submit)
  useEffect(() => {
    if (generatedRegistrationId && !form.registrationNumber) {
      setForm(prev => ({ ...prev, registrationNumber: generatedRegistrationId }));
    }
  }, [generatedRegistrationId]);

  // Auto-fill registration date fields with current Ethiopian date (only for new events)
  useEffect(() => {
    if (!editingEvent) {
      const currentEthDate = getCurrentEthiopianDate();
      if (currentEthDate.y && currentEthDate.m && currentEthDate.d) {
        const ethDateObj = { year: currentEthDate.y, month: currentEthDate.m, day: currentEthDate.d };
        setForm(prev => ({
          ...prev,
          registrationDateEth: prev.registrationDateEth || ethDateObj,
          registrarDate: prev.registrarDate || ethDateObj,
        }));
      }
    }
  }, [editingEvent]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (duplicateCheckTimeoutRef.current) {
        clearTimeout(duplicateCheckTimeoutRef.current);
      }
    };
  }, []);

  // Auto-calc age from deceasedBirthDate
  useEffect(() => {
    const v = form.deceasedBirthDate;
    if (v && typeof v === 'object' && v.year && v.month && v.day) {
      const y = Number(v.year), m = Number(v.month), d = Number(v.day);
      if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
        const today = new Date();
        const gregYear = y; // already using normalized Y-M-D semantics pre-submit
        let age = today.getFullYear() - gregYear;
        const md = (today.getMonth() + 1) * 100 + today.getDate();
        const bmd = m * 100 + d;
        if (md < bmd) age -= 1;
        if (age >= 0 && String(age) !== String(form.deceasedAgeAm || '')) {
          setForm(prev => ({ ...prev, deceasedAgeAm: String(age) }));
        }
      }
    }
  }, [form.deceasedBirthDate]);

  const NUMERIC_ONLY_FIELDS = new Set([
    'mainRegistrationRecordNumberAm', 'deceasedIdNumberAm', 'deathProofNumber', 'requesterIdNumber'
  ]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    const isSelect = String(e?.target?.tagName).toUpperCase() === 'SELECT';

    if (!files && lockedFields.has(name)) {
      return;
    }

    if (files) {
      setForm((prev) => ({ ...prev, [name]: files[0] }));
      return;
    }

    let nextVal = value;
    let warn = null;

    // Enforce numeric-only for specific fields
    if (NUMERIC_ONLY_FIELDS.has(name)) {
      if (!isNumericString(nextVal)) {
        nextVal = String(nextVal || '').replace(/\D+/g, '');
        warn = translate(lang, 'Numbers only', 'ቁጥር ብቻ');
      }
    }

    // Language script warnings for bilingual fields (skip for selects)
    if (!isSelect && /En$/.test(name) && containsAmharic(nextVal)) {
      warn = translate(lang, 'Please use English for this field', 'እባክዎ እንግሊዝኛ ይጠቀሙ');
    }
    if (!isSelect && /Am$/.test(name) && containsLatin(nextVal)) {
      warn = translate(lang, 'Please use Amharic for this field', 'እባክዎ አማርኛ ይጠቀሙ');
    }

    const DECEASED_FIELDS_TO_CLEAR = [
      'deceasedNameAm', 'deceasedNameEn',
      'deceasedFatherAm', 'deceasedFatherEn',
      'deceasedGrandfatherAm', 'deceasedGrandfatherEn',
      'deceasedBirthDate', 'deceasedNationalityAm',
      'deceasedResidence', 'deceasedEthnicity',
      'deceasedSex', 'deceasedReligion',
    ];

    const shouldClearDeceased = name === 'deceasedIdNumberAm';

    setForm((prev) => {
      const next = { ...prev, [name]: nextVal };

      if (shouldClearDeceased) {
        DECEASED_FIELDS_TO_CLEAR.forEach((field) => {
          next[field] = field === 'deceasedBirthDate' ? emptyEthiopianDate() : '';
        });
      }

      return next;
    });
    if (shouldClearDeceased) {
      unlockFields(DECEASED_FIELDS_TO_CLEAR);
    }
    setValidationErrors((prev) => ({ ...prev, [name]: warn || undefined }));

    // Check for duplicate ID card number with debounce
    if (name === 'deceasedIdNumberAm' && nextVal && nextVal.trim() !== '') {
      // Clear previous timeout
      if (duplicateCheckTimeoutRef.current) {
        clearTimeout(duplicateCheckTimeoutRef.current);
      }
      
      // Set new timeout for debounced check (500ms delay)
      duplicateCheckTimeoutRef.current = setTimeout(() => {
        checkDuplicateId(nextVal, name);
      }, 500);
    } else if (name === 'deceasedIdNumberAm' && (!nextVal || nextVal.trim() === '')) {
      // Clear error if field is empty
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check for duplicate ID errors before submitting
    const hasDuplicateErrors = Object.keys(validationErrors).some(key => 
      key === 'deceasedIdNumberAm' && validationErrors[key]?.includes('already registered')
    );
    
    if (hasDuplicateErrors) {
      const errorMsg = lang === 'en' 
        ? 'Cannot submit: ID card number is already registered. Please use a different ID number.'
        : 'ሊላክ አይችልም: የመታወቂያ ቁጥሩ አስቀድሞ ተመዝግቧል። እባክዎ የተለየ የመታወቂያ ቁጥር ይጠቀሙ።';
      alert(errorMsg);
      return;
    }

    // Check for future date errors before submitting
    const hasFutureDateErrors = Object.keys(validationErrors).some(key => 
      validationErrors[key]?.includes('cannot be in the future') || validationErrors[key]?.includes('ወደፊት ሊሆን አይችልም')
    );
    
    if (hasFutureDateErrors) {
      const errorMsg = lang === 'en' 
        ? 'Cannot submit: Please correct the date fields that are in the future.'
        : 'ሊላክ አይችልም: እባክዎ ወደፊት ያሉ የቀን መስኮችን ይስተካከሉ።';
      alert(errorMsg);
      return;
    }
    
    setSubmitting(true);

    try {
      const normalizeDates = (obj) => {
        const out = { ...obj };
        Object.entries(out).forEach(([k, v]) => {
          if (v && typeof v === 'object' && 'year' in v && 'month' in v && 'day' in v) {
            const y = Number(v.year); const m = Number(v.month); const d = Number(v.day);
            if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
              const mm = String(m).padStart(2, '0');
              const dd = String(d).padStart(2, '0');
              out[k] = `${y}-${mm}-${dd}`;
            }
          }
        });
        return out;
      };

      const normalizedData = normalizeDates(form);
      
      // Construct deathPlace from geographic components if missing
      if (!normalizedData.deathPlace && !normalizedData.deathPlaceEn && !normalizedData.deathPlaceAm) {
        const placeParts = [
          normalizedData.deathPlaceRegion,
          normalizedData.deathPlaceZone,
          normalizedData.deathPlaceWoreda,
          normalizedData.deathPlaceSubCity,
          normalizedData.deathPlaceKebele,
          normalizedData.deathCity,
          normalizedData.deathSubCity,
          normalizedData.deathWoreda,
          normalizedData.deathKebeleAm
        ].filter(Boolean);
        if (placeParts.length > 0) {
          const placeStr = placeParts.join(', ');
          normalizedData.deathPlace = placeStr;
          normalizedData.deathPlaceAm = placeStr;
        }
      }
      
      // Ensure required fields are always present in the data (even if empty)
      // This helps with backend validation error messages
      if (!normalizedData.deathPlace && !normalizedData.deathPlaceEn && !normalizedData.deathPlaceAm) {
        normalizedData.deathPlace = '';
      }

      const formData = new FormData();
      formData.append('data', JSON.stringify({
        type: 'death',
        data: normalizedData,
        status: 'draft',
        registrationId: form.registrationId,
      }));

      // Append files
      Object.entries(form).forEach(([key, value]) => {
        if (value instanceof File) {
          formData.append(key, value);
        }
      });

      await onSubmit({
        isForm: true,
        body: formData,
      });
    } catch (err) {
      console.error("Form submission error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {translate(lang, "Death Registration Form", "የሞት መዝገብ ቅፅ")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {DEATH_FORM_CONFIG.map((field, index) => {
              if (field.section) {
                return (
                    <div key={index} className="border-t pt-3 mt-3 md:col-span-2">
                      <h3 className="text-sm font-semibold text-gray-800 mb-2">
                      {translate(lang, field.section, field.sectionAm)}
                    </h3>
                  </div>
                );
              }

              const hasError = validationErrors[field.name];
              const errorMessage = hasError;
              const isLocked = lockedFields.has(field.name);

                if (/Region/.test(field.name)) {
                  const { group } = getGeoParentKeys(field.name, form);
                  const options = getGeoOptions('region', null, lang);
                  return (
                    <div key={field.name} className='md:col-span-1'>
                      <Label htmlFor={field.name}>{translate(lang, field.labelEn, field.labelAm)}</Label>
                      <Select
                        name={field.name}
                        value={form[field.name] || ''}
                        onChange={(e) => {
                          handleChange(e);
                          if (group === 'death') setForm(prev => ({ ...prev, deathZone: '', deathWoreda: '' }));
                          if (group === 'deathPlace') setForm(prev => ({ ...prev, deathPlaceZone: '', deathPlaceWoreda: '' }));
                          if (group === 'registration') setForm(prev => ({ ...prev, registrationZone: '', registrationWoreda: '' }));
                        }}
                        disabled={isLocked}
                      >
                        <option value=''>{translate(lang, 'Select...', 'ይምረጡ...')}</option>
                        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option> )}
                      </Select>
                    </div>
                  );
                }
                if (/Zone/.test(field.name)) {
                  const { regionKey, group } = getGeoParentKeys(field.name, form);
                  const options = getGeoOptions('zone', regionKey, lang);
                  return (
                    <div key={field.name} className='md:col-span-1'>
                      <Label htmlFor={field.name}>{translate(lang, field.labelEn, field.labelAm)}</Label>
                      <Select
                        name={field.name}
                        value={form[field.name] || ''}
                        onChange={(e) => {
                          handleChange(e);
                          if (group === 'death') setForm(prev => ({ ...prev, deathWoreda: '' }));
                          if (group === 'deathPlace') setForm(prev => ({ ...prev, deathPlaceWoreda: '' }));
                          if (group === 'registration') setForm(prev => ({ ...prev, registrationWoreda: '' }));
                        }}
                        disabled={isLocked || !regionKey}
                      >
                        <option value=''>{translate(lang, 'Select...', 'ይምረጡ...')}</option>
                        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>) }
                      </Select>
                    </div>
                  );
                }
                if (/Woreda/.test(field.name)) {
                  const { regionKey, zoneKey } = getGeoParentKeys(field.name, form);
                  const options = getGeoOptions('woreda', { region: regionKey, zone: zoneKey }, lang);
                  return (
                    <div key={field.name} className='md:col-span-1'>
                      <Label htmlFor={field.name}>{translate(lang, field.labelEn, field.labelAm)}</Label>
                      <Select
                        name={field.name}
                        value={form[field.name] || ''}
                        onChange={handleChange}
                        disabled={isLocked || !zoneKey}
                      >
                        <option value=''>{translate(lang, 'Select...', 'ይምረጡ...')}</option>
                        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>) }
                      </Select>
                    </div>
                  );
                }
              return (
                  <div key={field.name} className="md:col-span-1">
                    <Label htmlFor={field.name}>
                      {translate(lang, field.labelEn, field.labelAm)}
                    </Label>
                    {field.type === "select" ? (
                      <Select
                        name={field.name}
                        value={form[field.name] || ""}
                        onChange={handleChange}
                        hasError={hasError}
                        errorMessage={errorMessage}
                        disabled={isLocked}
                      >
                        <option value="">{translate(lang, "Select...", "መምረጥ...")}</option>
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {translate(lang, option.labelEn, option.labelAm)}
                          </option>
                        ))}
                      </Select>
                    ) : field.type === "ethiopian-date" ? (
                      <div className={isLocked ? "pointer-events-none opacity-70" : ""}>
                        <EthiopianDatePicker
                          name={field.name}
                          value={form[field.name] || ""}
                          onChange={(date) => {
                            if (isLocked) return;
                            setForm(prev => ({ ...prev, [field.name]: date }));
                            // Validate future dates for death date
                            if (field.name === "deathDate" && date && date.year && date.month && date.day) {
                              if (isEthiopianDateInFuture(date)) {
                                const errorMsg = lang === 'en' 
                                  ? 'Death date cannot be in the future'
                                  : 'የሞት ቀን ወደፊት ሊሆን አይችልም';
                                setValidationErrors(prev => ({ ...prev, [field.name]: errorMsg }));
                              } else {
                                setValidationErrors(prev => {
                                  const next = { ...prev };
                                  delete next[field.name];
                                  return next;
                                });
                              }
                            }
                          }}
                          hasError={hasError}
                          errorMessage={errorMessage}
                        />
                      </div>
                    ) : field.type === "file" ? (
                      <Input
                        type="file"
                        name={field.name}
                        onChange={handleChange}
                        hasError={hasError}
                        errorMessage={errorMessage}
                        accept="image/*,.pdf"
                        disabled={isLocked}
                      />
                    ) : (
                      <Input
                        type="text"
                        name={field.name}
                        value={form[field.name] || ""}
                        onChange={handleChange}
                        hasError={hasError}
                        errorMessage={errorMessage}
                        disabled={isLocked}
                      />
                    )}
                </div>
              );
            })}
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button
                type="button"
                onClick={() => window.history.back()}
                className="bg-gray-600 hover:bg-gray-700"
              >
                {translate(lang, "Cancel", "ሰርዝ")}
              </Button>
              <Button
                type="submit"
                disabled={submitting || isGeneratingId || Object.keys(validationErrors).length > 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? translate(lang, "Saving...", "በመቀመጥ ላይ...")
                  : translate(lang, "Save Death Record", "የሞት መዝገብ አስቀምጥ")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeathForm;
