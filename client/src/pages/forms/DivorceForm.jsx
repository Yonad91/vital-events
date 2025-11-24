"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { ETH_GEO } from "@/lib/geo";
import { apiFetch } from "@/lib/api";
import { EthiopianDatePicker } from "../../lib/forms.jsx";
import { buildDivorcePrefillFromBirth, mergePrefillState } from "@/lib/birthAutofill";
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

// Divorce-specific form configuration (aligned to spec, no roman numerals)
const DIVORCE_FORM_CONFIG = [
  { section: "Registration Details", sectionAm: "የመዝገብ ዝርዝሮች" },
  { name: "registrationNumber", labelEn: "Registration Number", labelAm: "የመመዝገቢያ ቁጥር" },
  { name: "mainRegistrationRecordNumberAm", labelEn: "Registrar Bureaue ID. Number", labelAm: "የምዝገባ ጽ/ቤት መለያ ቁጥር" },
  { name: "registrationDateEth", labelEn: "Registration Date (Ethiopian)", labelAm: "የመመዝገቢያ ቀን (ኢትዮ)", type: "ethiopian-date" },
  { name: "registrationTimeHourAm", labelEn: "Registration Time: Hour", labelAm: "ሰዓት" },

  { section: "Place of divorce", sectionAm: "የጋብቻ/ፍቺ ቦታ" },
  { name: "divorceRegion", labelEn: "region/city administration", labelAm: "ክልል/ከተማ አስተዳደር" },
  { name: "divorceZone", labelEn: "zone/city administration", labelAm: "ዞን/ከተማ አስተዳደር" },
  { name: "divorceCity", labelEn: "city", labelAm: "ከተማ" },
  { name: "divorceSubCity", labelEn: "sub city", labelAm: "ክፍለ ከተማ" },
  { name: "divorceWoreda", labelEn: "woreda", labelAm: "ወረዳ" },
  { name: "divorceKebeleAm", labelEn: "kebele", labelAm: "ቀበሌ" },

  { section: "Full Information of the Spouse 1", sectionAm: "የወገን 1 ሙሉ መረጃ" },
  { name: "divorceSpouse1IdAm", labelEn: "Identification Card Number", labelAm: "የመታወቂያ ቁጥር" },
  { name: "divorceSpouse1NameEn", labelEn: "Name (EN)", labelAm: "Name (EN)" },
  { name: "divorceSpouse1NameAm", labelEn: "ስም", labelAm: "ስም" },
  { name: "divorceSpouse1FatherNameEn", labelEn: "Father's Name (EN)", labelAm: "Father's Name (EN)" },
  { name: "divorceSpouse1FatherNameAm", labelEn: "የአባት ስም", labelAm: "የአባት ስም" },
  { name: "divorceSpouse1GrandfatherNameEn", labelEn: "Grandfather's Name (EN)", labelAm: "Grandfather's Name (EN)" },
  { name: "divorceSpouse1GrandfatherNameAm", labelEn: "የአያት ስም", labelAm: "የአያት ስም" },
  { name: "divorceSpouse1BirthPlaceEn", labelEn: "place of birth (EN)", labelAm: "place of birth (EN)" },
  { name: "divorceSpouse1BirthPlaceAm", labelEn: "የትውልድ ቦታ", labelAm: "የትውልድ ቦታ" },
  { name: "divorceSpouse1ResidenceEn", labelEn: "Place of Residence (EN)", labelAm: "Place of Residence (EN)" },
  { name: "divorceSpouse1ResidenceAm", labelEn: "መኖሪያ ቦታ", labelAm: "መኖሪያ ቦታ" },
  { name: "divorceSpouse1NationalityAm", labelEn: "nationality", labelAm: "ዜግነት" },
  { name: "divorceSpouse1BirthDate", labelEn: "date of birth", labelAm: "የትውልድ ቀን", type: "ethiopian-date" },
  { name: "divorceSpouse1Ethnicity", labelEn: "Ethnicity", labelAm: "ዘር" },
  { name: "divorceSpouse1ReligionAm", labelEn: "Religion", labelAm: "ሃይማኖት", type: "select", options: [
      { value: "orthodox", labelEn: "Orthodox", labelAm: "ኦርቶዶክስ" },
      { value: "protestant", labelEn: "Protestant", labelAm: "ፕሮቴስታንት" },
      { value: "catholic", labelEn: "Catholic", labelAm: "ካቶሊክ" },
      { value: "muslim", labelEn: "Muslim", labelAm: "ሙስሊም" },
      { value: "other", labelEn: "Other", labelAm: "ሌላ" },
  ] },
  { name: "divorceSpouse1EducationAm", labelEn: "Educational Status", labelAm: "የትምህርት ደረጃ" },
  { name: "divorceSpouse1JobAm", labelEn: "Job", labelAm: "ሥራ" },
  { name: "divorceSpouse1Photo", labelEn: "Photo of Spouse 1", labelAm: "የወገን 1 ፎቶ", type: "file" },

  { section: "Full Information of Spouse 2", sectionAm: "የወገን 2 ሙሉ መረጃ" },
  { name: "divorceSpouse2IdAm", labelEn: "Identification Card Number", labelAm: "የመታወቂያ ቁጥር" },
  { name: "divorceSpouse2NameEn", labelEn: "Name (EN)", labelAm: "Name (EN)" },
  { name: "divorceSpouse2NameAm", labelEn: "ስም", labelAm: "ስም" },
  { name: "divorceSpouse2FatherNameEn", labelEn: "Father's Name (EN)", labelAm: "Father's Name (EN)" },
  { name: "divorceSpouse2FatherNameAm", labelEn: "የአባት ስም", labelAm: "የአባት ስም" },
  { name: "divorceSpouse2GrandfatherNameEn", labelEn: "Grandfather's Name (EN)", labelAm: "Grandfather's Name (EN)" },
  { name: "divorceSpouse2GrandfatherNameAm", labelEn: "የአያት ስም", labelAm: "የአያት ስም" },
  { name: "divorceSpouse2BirthPlaceEn", labelEn: "place of birth (EN)", labelAm: "place of birth (EN)" },
  { name: "divorceSpouse2BirthPlaceAm", labelEn: "የትውልድ ቦታ", labelAm: "የትውልድ ቦታ" },
  { name: "divorceSpouse2ResidenceEn", labelEn: "Place of Residence (EN)", labelAm: "Place of Residence (EN)" },
  { name: "divorceSpouse2ResidenceAm", labelEn: "መኖሪያ ቦታ", labelAm: "መኖሪያ ቦታ" },
  { name: "divorceSpouse2NationalityAm", labelEn: "nationality", labelAm: "ዜግነት" },
  { name: "divorceSpouse2BirthDate", labelEn: "date of birth", labelAm: "የትውልድ ቀን", type: "ethiopian-date" },
  { name: "divorceSpouse2Ethnicity", labelEn: "Ethnicity", labelAm: "ዘር" },
  { name: "divorceSpouse2ReligionAm", labelEn: "Religion", labelAm: "ሃይማኖት", type: "select", options: [
      { value: "orthodox", labelEn: "Orthodox", labelAm: "ኦርቶዶክስ" },
      { value: "protestant", labelEn: "Protestant", labelAm: "ፕሮቴስታንት" },
      { value: "catholic", labelEn: "Catholic", labelAm: "ካቶሊክ" },
      { value: "muslim", labelEn: "Muslim", labelAm: "ሙስሊም" },
      { value: "other", labelEn: "Other", labelAm: "ሌላ" },
  ] },
  { name: "divorceSpouse2EducationAm", labelEn: "Educational Status", labelAm: "የትምህርት ደረጃ" },
  { name: "divorceSpouse2JobAm", labelEn: "Job", labelAm: "ሥራ" },
  { name: "divorceSpouse2Photo", labelEn: "Photo of Spouse 2", labelAm: "የወገን 2 ፎቶ", type: "file" },

  { section: "Divorce Information", sectionAm: "የፍቺ መረጃ" },
  { name: "divorceMarriageDate", labelEn: "Date of the marriage", labelAm: "የጋብቻ ቀን", type: "ethiopian-date" },
  { name: "divorceMarriagePlace", labelEn: "Place of marriage", labelAm: "የጋብቻ ቦታ" },
  { name: "divorceReasonAm", labelEn: "Cause of Divorce", labelAm: "የፍቺ ምክንያት" },
  { name: "divorceDate", labelEn: "Date of Divorce", labelAm: "የፍቺ ቀን", type: "ethiopian-date" },
  { name: "divorceCourtNameAm", labelEn: "Court name which Approve Divorce", labelAm: "የፍርድ ቤት ስም" },
  { name: "divorceCourtRegNoAm", labelEn: "Court Registration Number", labelAm: "የፍ/ቤት መ/ቁ" },
  { name: "divorceChildrenCountAm", labelEn: "Number of Childrens", labelAm: "የልጆች ብዛት" },
  { name: "divorceConsentProofAm", labelEn: "Concent Proof of Upload signed by both spouses", labelAm: "የተፈረመ የፍች ስምምነት ቅጽ", type: "file" },

  { section: "Registrar Information", sectionAm: "የምዝገባ መረጃ" },
  { name: "registrarName", labelEn: "Registrar Name", labelAm: "ስም" },
  { name: "registrarFatherNameAm", labelEn: "Father's Name", labelAm: "የአባት ስም" },
  { name: "registrarGrandNameAm", labelEn: "Grandfather's name", labelAm: "የአያት ስም" },
  { name: "registrarDate", labelEn: "Registration Date", labelAm: "የምዝገባ ቀን", type: "ethiopian-date" },
];

// Initial divorce form state (synced to config)
const initialDivorceFormState = {
  type: "divorce",
  registrationId: "",
  country: "Ethiopia",
  // Registration details
  registrationNumber: "",
  mainRegistrationRecordNumberAm: "",
  registrationDateEth: "",
  registrationTimeHourAm: "",
  // Place of divorce
  divorceRegion: "",
  divorceZone: "",
  divorceCity: "",
  divorceSubCity: "",
  divorceWoreda: "",
  divorceKebeleAm: "",
  // Spouse 1 (bilingual)
  divorceSpouse1NameEn: "",
  divorceSpouse1NameAm: "",
  divorceSpouse1FatherNameEn: "",
  divorceSpouse1FatherNameAm: "",
  divorceSpouse1GrandfatherNameEn: "",
  divorceSpouse1GrandfatherNameAm: "",
  divorceSpouse1BirthPlaceEn: "",
  divorceSpouse1BirthPlaceAm: "",
  divorceSpouse1ResidenceEn: "",
  divorceSpouse1ResidenceAm: "",
  divorceSpouse1NationalityAm: "",
  divorceSpouse1IdAm: "",
  divorceSpouse1BirthDate: "",
  divorceSpouse1Ethnicity: "",
  divorceSpouse1ReligionAm: "",
  divorceSpouse1EducationAm: "",
  divorceSpouse1JobAm: "",
  divorceSpouse1Photo: null,
  // Spouse 2 (bilingual)
  divorceSpouse2NameEn: "",
  divorceSpouse2NameAm: "",
  divorceSpouse2FatherNameEn: "",
  divorceSpouse2FatherNameAm: "",
  divorceSpouse2GrandfatherNameEn: "",
  divorceSpouse2GrandfatherNameAm: "",
  divorceSpouse2BirthPlaceEn: "",
  divorceSpouse2BirthPlaceAm: "",
  divorceSpouse2ResidenceEn: "",
  divorceSpouse2ResidenceAm: "",
  divorceSpouse2NationalityAm: "",
  divorceSpouse2IdAm: "",
  divorceSpouse2BirthDate: "",
  divorceSpouse2Ethnicity: "",
  divorceSpouse2ReligionAm: "",
  divorceSpouse2EducationAm: "",
  divorceSpouse2JobAm: "",
  divorceSpouse2Photo: null,
  // Divorce info
  divorceMarriageDate: "",
  divorceMarriagePlace: "",
  divorceReasonAm: "",
  divorceDate: "",
  divorceCourtNameAm: "",
  divorceCourtRegNoAm: "",
  divorceChildrenCountAm: "",
  divorceConsentProofAm: null,
  // Registration place fields
  registrationRegion: "",
  registrationZone: "",
  registrationWoreda: "",
  registrationCity: "",
  registrationSubCity: "",
  registrationKebele: "",
  // Registrar info
  registrarName: "",
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

// Helper: geo options for divorceRegion/Zone/Woreda and registration*
const regionOptions = (lang) => Object.entries(ETH_GEO || {}).map(([key, val]) => {
  const value = typeof key === 'object' ? (key.am || key.en || '') : key;
  const label = (val && typeof val === 'object' && (val[lang] || val.am || val.en)) ? (val[lang] || val.am || val.en) : value;
  return { value, label };
});

const zonesFor = (regionKey, lang) => {
  if (!regionKey) return [];
  const zonesObj = ETH_GEO[regionKey]?.zones || {};
  return Object.entries(zonesObj).map(([key, val]) => {
    const value = typeof key === 'object' ? (key.am || key.en || '') : key;
    const label = (val && typeof val === 'object' && (val[lang] || val.am || val.en)) ? (val[lang] || val.am || val.en) : value;
    return { value, label };
  });
};

const woredasFor = (regionKey, zoneKey, lang) => {
  if (!regionKey || !zoneKey) return [];
  const woredas = ETH_GEO[regionKey]?.zones?.[zoneKey]?.woredas || [];
  const toLabel = (item) => (typeof item === "string" ? item : (lang === "en" ? item.en : item.am));
  const toValue = (item) => (typeof item === "string" ? item : (item.en || item.am || String(item)));
  return woredas.map(w => ({ value: toValue(w), label: toLabel(w) }));
};

// Divorce Form Component
const DivorceForm = ({ user, setUser, onSubmit, onEdit, editingEvent = null }) => {
  const [lang, setLang] = useState("am");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialDivorceFormState);
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

  // Registration geo options
  const registrationRegionOptions = useMemo(() => regionOptions(lang), [lang]);
  const registrationZoneOptions = useMemo(() => zonesFor(form.registrationRegion, lang), [form.registrationRegion, lang]);
  const registrationWoredaOptions = useMemo(() => woredasFor(form.registrationRegion, form.registrationZone, lang), [form.registrationRegion, form.registrationZone, lang]);

  // Divorce place geo options
  const divorceRegionOptions = useMemo(() => regionOptions(lang), [lang]);
  const divorceZoneOptions = useMemo(() => zonesFor(form.divorceRegion, lang), [form.divorceRegion, lang]);
  const divorceWoredaOptions = useMemo(() => woredasFor(form.divorceRegion, form.divorceZone, lang), [form.divorceRegion, form.divorceZone, lang]);

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
        type: 'divorce',
        idNumber: String(idNumber).trim(),
        fieldName: fieldName,
      });
      const shouldRequestPrefill = fieldName === 'divorceSpouse1IdAm' || fieldName === 'divorceSpouse2IdAm';
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

      if (result.isDuplicate) {
        const fieldLabel = fieldName === 'divorceSpouse1IdAm' ? (lang === 'en' ? 'Spouse 1' : 'ወገን 1') : (lang === 'en' ? 'Spouse 2' : 'ወገን 2');
        const errorMsg = lang === 'en' 
          ? `${fieldLabel} ID number is already registered (Registration ID: ${result.existingRegistrationId})`
          : `${fieldLabel} የመታወቂያ ቁጥር አስቀድሞ ተመዝግቧል (የመመዝገቢያ መለያ: ${result.existingRegistrationId})`;
        setValidationErrors((prev) => ({ ...prev, [fieldName]: errorMsg }));
      } else {
        setValidationErrors((prev) => {
          const next = { ...prev };
          delete next[fieldName];
          return next;
        });
      }
      let birthData = result?.birthRecord?.data;
      if (!birthData && shouldRequestPrefill) {
        birthData = await fetchBirthRecord(idNumber);
      }
      if (shouldRequestPrefill && birthData) {
        const patch = buildDivorcePrefillFromBirth(
          birthData,
          fieldName === 'divorceSpouse2IdAm' ? 'spouse2' : 'spouse1'
        );
        applyPrefillPatch(patch);
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
        ...initialDivorceFormState,
        ...editingEvent.data,
        type: editingEvent.type,
        registrationId: editingEvent.registrationId,
      });
      setGeneratedRegistrationId(editingEvent.registrationId);
    } else {
      setForm(initialDivorceFormState);
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

  // Auto-set registrationNumber from generated id
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

  const NUMERIC_ONLY_FIELDS = new Set([
    'mainRegistrationRecordNumberAm', 'divorceSpouse1IdAm', 'divorceSpouse2IdAm', 'divorceCourtRegNoAm'
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

    if (NUMERIC_ONLY_FIELDS.has(name)) {
      if (!isNumericString(nextVal)) {
        nextVal = String(nextVal || '').replace(/\D+/g, '');
        warn = translate(lang, 'Numbers only', 'ቁጥር ብቻ');
      }
    }

    if (!isSelect && /En$/.test(name) && containsAmharic(nextVal)) {
      warn = translate(lang, 'Please use English for this field', 'እባክዎ እንግሊዝኛ ይጠቀሙ');
    }
    if (!isSelect && /Am$/.test(name) && containsLatin(nextVal)) {
      warn = translate(lang, 'Please use Amharic for this field', 'እባክዎ አማርኛ ይጠቀሙ');
    }

    const SPOUSE1_FIELDS_TO_CLEAR = [
      'divorceSpouse1NameAm', 'divorceSpouse1NameEn',
      'divorceSpouse1FatherNameAm', 'divorceSpouse1FatherNameEn',
      'divorceSpouse1GrandfatherNameAm', 'divorceSpouse1GrandfatherNameEn',
      'divorceSpouse1BirthPlaceAm', 'divorceSpouse1BirthPlaceEn',
      'divorceSpouse1ResidenceAm', 'divorceSpouse1ResidenceEn',
      'divorceSpouse1NationalityAm', 'divorceSpouse1BirthDate',
      'divorceSpouse1Ethnicity', 'divorceSpouse1ReligionAm',
    ];
    const SPOUSE2_FIELDS_TO_CLEAR = [
      'divorceSpouse2NameAm', 'divorceSpouse2NameEn',
      'divorceSpouse2FatherNameAm', 'divorceSpouse2FatherNameEn',
      'divorceSpouse2GrandfatherNameAm', 'divorceSpouse2GrandfatherNameEn',
      'divorceSpouse2BirthPlaceAm', 'divorceSpouse2BirthPlaceEn',
      'divorceSpouse2ResidenceAm', 'divorceSpouse2ResidenceEn',
      'divorceSpouse2NationalityAm', 'divorceSpouse2BirthDate',
      'divorceSpouse2Ethnicity', 'divorceSpouse2ReligionAm',
    ];

    const clearingSpouse1 = name === 'divorceSpouse1IdAm';
    const clearingSpouse2 = name === 'divorceSpouse2IdAm';

    setForm((prev) => {
      const next = { ...prev, [name]: nextVal };

      if (clearingSpouse1) {
        SPOUSE1_FIELDS_TO_CLEAR.forEach((field) => {
          next[field] = field === 'divorceSpouse1BirthDate' ? emptyEthiopianDate() : '';
        });
      }

      if (clearingSpouse2) {
        SPOUSE2_FIELDS_TO_CLEAR.forEach((field) => {
          next[field] = field === 'divorceSpouse2BirthDate' ? emptyEthiopianDate() : '';
        });
      }

      return next;
    });

    if (clearingSpouse1) {
      unlockFields(SPOUSE1_FIELDS_TO_CLEAR);
    }
    if (clearingSpouse2) {
      unlockFields(SPOUSE2_FIELDS_TO_CLEAR);
    }
    setValidationErrors((prev) => ({ ...prev, [name]: warn || undefined }));

    // Check for duplicate ID card number with debounce (for both spouses)
    if ((name === 'divorceSpouse1IdAm' || name === 'divorceSpouse2IdAm') && nextVal && nextVal.trim() !== '') {
      // Clear previous timeout
      if (duplicateCheckTimeoutRef.current) {
        clearTimeout(duplicateCheckTimeoutRef.current);
      }
      
      // Set new timeout for debounced check (500ms delay)
      duplicateCheckTimeoutRef.current = setTimeout(() => {
        checkDuplicateId(nextVal, name);
      }, 500);
    } else if ((name === 'divorceSpouse1IdAm' || name === 'divorceSpouse2IdAm') && (!nextVal || nextVal.trim() === '')) {
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
      (key === 'divorceSpouse1IdAm' || key === 'divorceSpouse2IdAm') && validationErrors[key]?.includes('already registered')
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
      // Normalize Ethiopian date objects
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

      const formData = new FormData();
      formData.append('data', JSON.stringify({
        type: 'divorce',
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

  // renderField similar to other forms
  const renderField = (field) => {
    const hasError = validationErrors[field.name];
    const errorMessage = hasError;
    const isLocked = lockedFields.has(field.name);

    // Geo handling for registration*
    if (field.name === 'registrationRegion') {
      return (
        <Select name={field.name} value={form[field.name] || ''} onChange={(e)=>{ handleChange(e); setForm(prev=>({...prev, registrationZone:'', registrationWoreda:''})); }} disabled={isLocked}>
          <option value="">{translate(lang, 'Select...', 'ይምረጡ...')}</option>
          {registrationRegionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      );
    }
    if (field.name === 'registrationZone') {
      return (
        <Select name={field.name} value={form[field.name] || ''} disabled={isLocked || !form.registrationRegion} onChange={(e)=>{ handleChange(e); setForm(prev=>({...prev, registrationWoreda:''})); }}>
          <option value="">{translate(lang, 'Select...', 'ይምረጡ...')}</option>
          {registrationZoneOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      );
    }
    if (field.name === 'registrationWoreda') {
      return (
        <Select name={field.name} value={form[field.name] || ''} disabled={isLocked || !form.registrationZone} onChange={handleChange}>
          <option value="">{translate(lang, 'Select...', 'ይምረጡ...')}</option>
          {registrationWoredaOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      );
    }

    // Geo handling for divorce*
    if (field.name === 'divorceRegion') {
      return (
        <Select name={field.name} value={form[field.name] || ''} onChange={(e)=>{ handleChange(e); setForm(prev=>({...prev, divorceZone:'', divorceWoreda:''})); }} disabled={isLocked}>
          <option value="">{translate(lang, 'Select...', 'ይምረጡ...')}</option>
          {divorceRegionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      );
    }
    if (field.name === 'divorceZone') {
      return (
        <Select name={field.name} value={form[field.name] || ''} disabled={isLocked || !form.divorceRegion} onChange={(e)=>{ handleChange(e); setForm(prev=>({...prev, divorceWoreda:''})); }}>
          <option value="">{translate(lang, 'Select...', 'ይምረጡ...')}</option>
          {divorceZoneOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      );
    }
    if (field.name === 'divorceWoreda') {
      return (
        <Select name={field.name} value={form[field.name] || ''} disabled={isLocked || !form.divorceZone} onChange={handleChange}>
          <option value="">{translate(lang, 'Select...', 'ይምረጡ...')}</option>
          {divorceWoredaOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      );
    }

    if (field.type === 'select') {
      return (
        <Select name={field.name} value={form[field.name] || ''} onChange={handleChange} hasError={hasError} errorMessage={errorMessage} disabled={isLocked}>
          <option value="">{translate(lang, 'Select...', 'መምረጥ...')}</option>
          {field.options?.map(option => (
            <option key={option.value} value={option.value}>{translate(lang, option.labelEn, option.labelAm)}</option>
          ))}
        </Select>
      );
    }

    if (field.type === 'ethiopian-date') {
      return (
        <div className={isLocked ? "pointer-events-none opacity-70" : ""}>
          <EthiopianDatePicker
            name={field.name}
            value={form[field.name] || ''}
            onChange={(date) => {
              if (isLocked) return;
              setForm(prev => ({ ...prev, [field.name]: date }));
              // Validate future dates for divorce date
              if (field.name === "divorceDate" && date && date.year && date.month && date.day) {
                if (isEthiopianDateInFuture(date)) {
                  const errorMsg = lang === 'en' 
                    ? 'Divorce date cannot be in the future'
                    : 'የፍቺ ቀን ወደፊት ሊሆን አይችልም';
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
      );
    }

    if (field.type === 'file') {
      return (
        <Input type="file" name={field.name} onChange={handleChange} hasError={hasError} errorMessage={errorMessage} accept="image/*,.pdf" disabled={isLocked} />
      );
    }

    return (
      <Input type="text" name={field.name} value={form[field.name] || ''} onChange={handleChange} hasError={hasError} errorMessage={errorMessage} disabled={isLocked} />
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {translate(lang, "Divorce Registration Form", "የፍቺ መዝገብ ቅፅ")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(() => {
                const elements = [];
                for (let i = 0; i < DIVORCE_FORM_CONFIG.length; i++) {
                  const field = DIVORCE_FORM_CONFIG[i];
              if (field.section) {
                    elements.push(
                      <div key={`section-${i}`} className="border-t pt-4 mt-4 md:col-span-2">
                        <h3 className="text-base font-semibold text-gray-800 mb-3">
                      {translate(lang, field.section, field.sectionAm)}
                    </h3>
                  </div>
                );
                    continue;
                  }

                  const name = field.name || "";
                  const isEn = /En$/.test(name);
                  const isAm = /Am$/.test(name);
                  const base = name.replace(/(Am|En)$/,'');

                  // Pair Am/En adjacent fields if present
                  let paired = false;
                  if (isEn || isAm) {
                    const next = DIVORCE_FORM_CONFIG[i + 1];
                    if (next && !next.section && next.name) {
                      const nextName = next.name || "";
                      const nextIsEn = /En$/.test(nextName);
                      const nextIsAm = /Am$/.test(nextName);
                      const nextBase = nextName.replace(/(Am|En)$/,'');
                      if (base === nextBase && ((isEn && nextIsAm) || (isAm && nextIsEn))) {
                        const left = isAm ? field : next;
                        const right = isEn ? field : next;
                        elements.push(
                          <React.Fragment key={`pair-${base}-${i}`}>
                            <div className="md:col-start-1">
                              <Label htmlFor={left.name}>{translate(lang, left.labelEn, left.labelAm)}</Label>
                              {renderField(left)}
                            </div>
                            <div className="md:col-start-2">
                              <Label htmlFor={right.name}>{translate(lang, right.labelEn, right.labelAm)}</Label>
                              {renderField(right)}
                  </div>
                          </React.Fragment>
                        );
                        i++; paired = true;
                      }
                    }
                  }

                  if (!paired) {
                    elements.push(
                      <div key={name} className="md:col-span-1">
                        <Label htmlFor={field.name}>{translate(lang, field.labelEn, field.labelAm)}</Label>
                        {renderField(field)}
                </div>
              );
                  }
                }
                return elements;
              })()}
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
                  : translate(lang, "Save Divorce Record", "የፍቺ መዝገብ አስቀምጥ")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DivorceForm;
