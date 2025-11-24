"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { ETH_GEO } from "@/lib/geo";
import { EthiopianDatePicker } from "../../lib/forms.jsx";
import { ethToGreg, getCurrentEthiopianDate, isEthiopianDateInFuture } from "@/lib/ethioDate.js";

// UI Components
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
  const baseClasses = "w-full px-2 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
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
        className={`${baseClasses} ${errorClasses} ${disabledClasses} ${className}`}
        {...props}
      />
      {hasError && errorMessage && (
        <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  );
};

const Label = ({ children, htmlFor, className }) => (
  <label htmlFor={htmlFor} className={`block text-xs font-medium text-gray-700 mb-1 ${className}`}>
    {children}
  </label>
);

const Select = ({ children, name, value, onChange, className, hasError, errorMessage, disabled, ...props }) => {
  const baseClasses = "w-full px-2 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const errorClasses = hasError ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "";
  const disabledClasses = disabled ? "bg-gray-100 cursor-not-allowed" : "";
  
  return (
    <div className="w-full">
      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${baseClasses} ${errorClasses} ${disabledClasses} ${className}`}
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

// Birth-specific form configuration
const BIRTH_FORM_CONFIG = [
  { section: "Registration Details", sectionAm: "የመዝገብ ዝርዝሮች" },
  {
    name: "registrationNumber",
    labelEn: "Registration Number",
    labelAm: "የመመዝገቢያ ቁጥር",
  },
  {
    name: "mainRegistrationRecordNumberAm",
    labelEn: "Registrar Bureau ID Number",
    labelAm: "የምዝገባ ጽ/ቤት መለያ ቁጥር",
  },
  {
    name: "registrationDateEth",
    labelEn: "Registration Date (Ethiopian)",
    labelAm: "የመመዝገቢያ ቀን (ኢትዮ)",
    type: "ethiopian-date",
  },
  {
    name: "registrationTimeHourAm",
    labelEn: "Registration Time: Hour",
    labelAm: "ሰዓት",
  },

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

  { section: "Place of birth", sectionAm: "የትውልድ ቦታ" },
  {
    name: "region",
    labelEn: "Region/City Administration",
    labelAm: "ክልል/ከተማ አስተዳደር",
    type: "location-region",
  },
  {
    name: "zone",
    labelEn: "zone/city administration",
    labelAm: "ዞን/ከተማ አስተዳደር",
    type: "location-zone",
  },
  {
    name: "birthPlaceCity",
    labelEn: "city",
    labelAm: "ከተማ",
  },
  {
    name: "birthPlaceSubCity",
    labelEn: "sub city",
    labelAm: "ክፍለ ከተማ",
  },
  {
    name: "woreda",
    labelEn: "woreda",
    labelAm: "ወረዳ",
    type: "location-woreda",
  },
  {
    name: "kebele",
    labelEn: "kebele",
    labelAm: "ቀበሌ",
  },

  { section: "Full Information of the Child", sectionAm: "የህፃኑ ሙሉ መረጃ" },
  { name: "childNameEn", labelEn: "Child Name (EN)", labelAm: "Child Name (EN)" },
  { name: "childNameAm", labelEn: "ስም", labelAm: "ስም" },
  { name: "fatherNameEn", labelEn: "Father's Name (EN)", labelAm: "Father's Name (EN)" },
  { name: "fatherNameAm", labelEn: "የአባት ስም", labelAm: "የአባት ስም" },
  { name: "childGrandfatherNameEn", labelEn: "Grandfather's Name (EN)", labelAm: "Grandfather's Name (EN)" },
  { name: "childGrandfatherNameAm", labelEn: "የአያት ስም", labelAm: "የአያት ስም" },
  { name: "childIdNumberAm", labelEn: "ID. Card Number", labelAm: "የመታወቂያ ቁጥር", type: "numeric-string" },
  { name: "sex", labelEn: "Sex", labelAm: "ጾታ", type: "select", options: [
      { value: "male", labelEn: "Male", labelAm: "ወንድ" },
      { value: "female", labelEn: "Female", labelAm: "ሴት" },
  ] },
  { name: "nationality", labelEn: "Nationality", labelAm: "ዜግነት" },
  { name: "birthDate", labelEn: "Birth Date", labelAm: "የትውልድ ቀን", type: "ethiopian-date" },
  { name: "birthPlaceType", labelEn: "Birth Place Type", labelAm: "የትውልድ ቦታ አይነት" },
  { name: "birthInfoNumberAm", labelEn: "Birth Information Number", labelAm: "የትውልድ መረጃ ቁጥር" },
  { name: "birthType", labelEn: "Birth Type", labelAm: "የትውልድ አይነት" },
  { name: "birthHelpAm", labelEn: "Birth Help", labelAm: "የትውልድ እርዳታ" },
  { name: "childWeightAm", labelEn: "Child Weight", labelAm: "የልጅ ክብደት" },
  { name: "midwifeLevel", labelEn: "Midwife Level", labelAm: "የማይድዊፍ ደረጃ" },
  { name: "placeOfBirthEn", labelEn: "Place of Birth (English)", labelAm: "የትውልድ ቦታ (እንግሊዝኛ)" },
  { name: "placeOfBirthAm", labelEn: "Place of Birth (Amharic)", labelAm: "የትውልድ ቦታ (አማርኛ)" },
  { name: "childPhoto", labelEn: "Child Photo", labelAm: "የልጅ ፎቶ", type: "file" },

  { section: "Full Information Mother", sectionAm: "የእናት ሙሉ መረጃ" },
  { name: "motherFullNameEn", labelEn: "Name (EN)", labelAm: "Name (EN)" },
  { name: "motherFullNameAm", labelEn: "ስም", labelAm: "ስም" },
  { name: "motherBirthDate", labelEn: "Mother Birth Date", labelAm: "የእናት የትውልድ ቀን", type: "ethiopian-date" },
  { name: "motherFatherNameEn", labelEn: "Father's Name (EN)", labelAm: "Father's Name (EN)" },
  { name: "motherFatherNameAm", labelEn: "የአባት ስም", labelAm: "የአባት ስም" },
  { name: "motherGrandfatherNameEn", labelEn: "Grandfather's Name (EN)", labelAm: "Grandfather's Name (EN)" },
  { name: "motherGrandfatherNameAm", labelEn: "የአያት ስም", labelAm: "የአያት ስም" },
  { name: "motherBirthPlaceEn", labelEn: "place of birth (EN)", labelAm: "place of birth (EN)" },
  { name: "motherBirthPlaceAm", labelEn: "የትውልድ ቦታ", labelAm: "የትውልድ ቦታ" },
  { name: "motherResidenceEn", labelEn: "Place of Residence (EN)", labelAm: "Place of Residence (EN)" },
  { name: "motherResidenceAm", labelEn: "መኖሪያ ቦታ", labelAm: "መኖሪያ ቦታ" },
  { name: "motherNationalityAm", labelEn: "nationality", labelAm: "ዜግነት" },
  { name: "motherIdOrPassport", labelEn: "National Id. Number", labelAm: "የመታወቂያ ቁጥር" },
  { name: "motherEthnicityAm", labelEn: "Mother Ethnicity", labelAm: "የእናት ብሄር" },
  { name: "motherEducationLevelAm", labelEn: "Mother Education Level", labelAm: "የእናት የትምህርት ደረጃ" },
  { name: "motherOccupationAm", labelEn: "Mother Occupation", labelAm: "የእናት ሙያ" },
  { name: "motherMaritalStatusAm", labelEn: "Mother Marital Status", labelAm: "የእናት የጋብቻ ሁኔታ", type: "select", options: [
      { value: "single", labelEn: "Single", labelAm: "ያልተጋባ" },
      { value: "married", labelEn: "Married", labelAm: "ያገባ" },
      { value: "divorced", labelEn: "Divorced", labelAm: "የተፈታ" },
      { value: "widowed", labelEn: "Widowed", labelAm: "የተጠፋ" },
  ] },
  { name: "motherReligionAm", labelEn: "Mother Religion", labelAm: "የእናት ሃይማኖት", type: "select", options: [
      { value: "orthodox", labelEn: "Orthodox", labelAm: "ኦርቶዶክስ" },
      { value: "protestant", labelEn: "Protestant", labelAm: "ፕሮቴስታንት" },
      { value: "catholic", labelEn: "Catholic", labelAm: "ካቶሊክ" },
      { value: "muslim", labelEn: "Muslim", labelAm: "ሙስሊም" },
      { value: "other", labelEn: "Other", labelAm: "ሌላ" },
  ] },

  { section: "Full Information of Father", sectionAm: "የአባት ሙሉ መረጃ" },
  { name: "fatherFullNameEn", labelEn: "Name (EN)", labelAm: "Name (EN)" },
  { name: "fatherFullNameAm", labelEn: "ስም", labelAm: "ስም" },
  { name: "fatherBirthDate", labelEn: "Father Birth Date", labelAm: "የአባት የትውልድ ቀን", type: "ethiopian-date" },
  { name: "fatherFatherNameEn", labelEn: "Father's Name (EN)", labelAm: "Father's Name (EN)" },
  { name: "fatherFatherNameAm", labelEn: "የአባት ስም", labelAm: "የአባት ስም" },
  { name: "fatherGrandfatherNameEn", labelEn: "Grandfather's Name (EN)", labelAm: "Grandfather's Name (EN)" },
  { name: "fatherGrandfatherNameAm", labelEn: "የአያት ስም", labelAm: "የአያት ስም" },
  { name: "fatherBirthPlaceEn", labelEn: "place of birth (EN)", labelAm: "place of birth (EN)" },
  { name: "fatherBirthPlaceAm", labelEn: "የትውልድ ቦታ", labelAm: "የትውልድ ቦታ" },
  { name: "fatherResidenceEn", labelEn: "Place of Residence (EN)", labelAm: "Place of Residence (EN)" },
  { name: "fatherResidenceAm", labelEn: "መኖሪያ ቦታ", labelAm: "መኖሪያ ቦታ" },
  { name: "fatherNationalityAm", labelEn: "nationality", labelAm: "ዜግነት" },
  { name: "fatherIdOrPassportAm", labelEn: "National Id. Number", labelAm: "የመታወቂያ ቁጥር" },
  { name: "fatherEthnicity", labelEn: "Father Ethnicity", labelAm: "የአባት ብሄር" },
  { name: "fatherEducationLevelAm", labelEn: "Father Education Level", labelAm: "የአባት የትምህርት ደረጃ" },
  { name: "fatherOccupationAm", labelEn: "Father Occupation", labelAm: "የአባት ሙያ" },
  { name: "fatherMaritalStatusAm", labelEn: "Father Marital Status", labelAm: "የአባት የጋብቻ ሁኔታ", type: "select", options: [
      { value: "single", labelEn: "Single", labelAm: "ያልተጋባ" },
      { value: "married", labelEn: "Married", labelAm: "ያገባ" },
      { value: "divorced", labelEn: "Divorced", labelAm: "የተፈታ" },
      { value: "widowed", labelEn: "Widowed", labelAm: "የተጠፋ" },
  ] },
  { name: "fatherReligion", labelEn: "Father Religion", labelAm: "የአባት ሃይማኖት", type: "select", options: [
      { value: "orthodox", labelEn: "Orthodox", labelAm: "ኦርቶዶክስ" },
      { value: "protestant", labelEn: "Protestant", labelAm: "ፕሮቴስታንት" },
      { value: "catholic", labelEn: "Catholic", labelAm: "ካቶሊክ" },
      { value: "muslim", labelEn: "Muslim", labelAm: "ሙስሊም" },
      { value: "other", labelEn: "Other", labelAm: "ሌላ" },
  ] },

  { section: "Documents", sectionAm: "ሰነዶች" },
  {
    name: "idCardImage",
    labelEn: "ID Card Image",
    labelAm: "የመታወቂያ ካርድ ምስል",
    type: "file",
  },
  {
    name: "signedConsentPhoto",
    labelEn: "Signed Consent Form",
    labelAm: "የተፈረመ ፍቃድ ቅጽ",
    type: "file",
  },
  {
    name: "uploadedform",
    labelEn: "Uploaded Form",
    labelAm: "የተቀረበ ፎርም",
    type: "file",
  },
  
  { section: "Parents/Guardians Information", sectionAm: "የወላጆች/አሳዳጊ መረጃ" },
  { name: "guardianFullName", labelEn: "Full Name", labelAm: "ሙሉ ስም" },
  { name: "guardianOccupationEn", labelEn: "Occupation", labelAm: "ሙያ" },
  { name: "guardianWorkAddressAm", labelEn: "Work Place/Address", labelAm: "የሥራ ቦታ/አድራሻ" },
  { name: "guardianHouseNoAm", labelEn: "House Number", labelAm: "የቤት ቁጥር" },
  { name: "guardianMobileAm", labelEn: "Mobile Number", labelAm: "ሞባይል ቁጥር" },

  { section: "Registrar Information", sectionAm: "የምዝገባ መረጃ" },
  { name: "registrarNameAm", labelEn: "Name", labelAm: "ስም" },
  { name: "registrarFatherNameAm", labelEn: "Father's Name", labelAm: "የአባት ስም" },
  { name: "registrarGrandNameAm", labelEn: "Grandfather's name", labelAm: "የአያት ስም" },
  { name: "registrarDateAm", labelEn: "Registration Date", labelAm: "የምዝገባ ቀን", type: "ethiopian-date" },
];

// Initial birth form state
const initialBirthFormState = {
  type: "birth",
  registrationId: "",
  country: "Ethiopia",
  // Child information
  childNameEn: "",
  childNameAm: "",
  childGrandfatherNameEn: "",
  childGrandfatherNameAm: "",
  childIdNumberAm: "",
  // Full name fields are consolidated in parent sections per spec
  sex: "",
  age: "",
  nationality: "",
  birthDate: "",
  birthPlaceType: "",
  birthInfoNumberAm: "",
  birthType: "",
  birthHelpAm: "",
  childWeightAm: "",
  midwifeLevel: "",
  placeOfBirthEn: "",
  placeOfBirthAm: "",
  childPhoto: null,
  childGrandfatherName: "",
  grandfatherNameEn: "",
  grandfatherNameAm: "",
  // Registration place fields
  registrationRegion: "",
  registrationZone: "",
  registrationWoreda: "",
  registrationCity: "",
  registrationSubCity: "",
  registrationKebele: "",
  // Mother information
  motherFullNameEn: "",
  motherFullNameAm: "",
  motherSex: "",
  motherBirthDate: "",
  motherBirthPlaceEn: "",
  motherBirthPlaceAm: "",
  motherFatherNameEn: "",
  motherFatherNameAm: "",
  motherGrandfatherNameEn: "",
  motherGrandfatherNameAm: "",
  motherNationalityAm: "",
  motherIdOrPassport: "",
  motherResidenceEn: "",
  motherResidenceAm: "",
  motherEthnicityAm: "",
  motherEducationLevelAm: "",
  motherOccupationAm: "",
  motherMaritalStatusAm: "",
  motherReligionAm: "",
  // Father information
  fatherFullNameEn: "",
  fatherFullNameAm: "",
  fatherSex: "",
  fatherBirthDate: "",
  fatherBirthPlaceEn: "",
  fatherBirthPlaceAm: "",
  fatherFatherNameEn: "",
  fatherFatherNameAm: "",
  fatherGrandfatherNameEn: "",
  fatherGrandfatherNameAm: "",
  fatherNationalityAm: "",
  fatherIdOrPassportAm: "",
  fatherResidenceEn: "",
  fatherResidenceAm: "",
  fatherEthnicity: "",
  fatherEducationLevelAm: "",
  fatherOccupationAm: "",
  fatherMaritalStatusAm: "",
  fatherReligion: "",
  // Location fields
  region: "",
  zone: "",
  woreda: "",
  kebele: "",
  birthPlaceCity: "",
  birthPlaceSubCity: "",
  
  // Documents
  idCardImage: null,
  signedConsentPhoto: null,
  uploadedform: null,
  // Parents/Guardians information
  guardianFullName: "",
  guardianOccupationEn: "",
  guardianWorkAddressAm: "",
  guardianHouseNoAm: "",
  guardianMobileAm: "",
  // Registrar information
  registrarNameAm: "",
  registrarFatherNameAm: "",
  registrarGrandNameAm: "",
  registrarDateAm: "",
};

// Translation helper
const translate = (lang, en, am) => (lang === "en" ? en : am);

// Helpers: language & numeric validation
const containsAmharic = (s) => /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF]/.test(String(s || ''));
const containsLatin = (s) => /[A-Za-z]/.test(String(s || ''));
const isNumericString = (s) => /^[0-9]+$/.test(String(s || ''));

// Birth Form Component
const BirthForm = ({ user, setUser, onSubmit, onEdit, editingEvent = null }) => {
  const [lang, setLang] = useState("am");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialBirthFormState);
  const [generatedRegistrationId, setGeneratedRegistrationId] = useState(null);
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [hasValidationErrors, setHasValidationErrors] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const duplicateCheckTimeoutRef = React.useRef(null);

  // Location dropdowns - using ETH_GEO data
  const regionOptions = useMemo(() => 
    Object.keys(ETH_GEO).map(region => ({ value: region, label: region })), []
  );
  
  const zoneOptions = useMemo(() => {
    if (!form.region) return [];
    const zones = ETH_GEO[form.region]?.zones ? Object.keys(ETH_GEO[form.region].zones) : [];
    return zones.map(zone => ({ value: zone, label: zone }));
  }, [form.region]);
  
  const woredaOptions = useMemo(() => {
    if (!form.region || !form.zone) return [];
    const woredas = ETH_GEO[form.region]?.zones?.[form.zone]?.woredas || [];
    const toLabel = (item) => (typeof item === "string" ? item : (lang === "en" ? item.en : item.am));
    const toValue = (item) => (typeof item === "string" ? item : (item.en || item.am || String(item)));
    return woredas.map(woreda => ({ value: toValue(woreda), label: toLabel(woreda) }));
  }, [form.region, form.zone, lang]);

  const registrationRegionOptions = useMemo(() => 
    Object.keys(ETH_GEO).map(region => ({ value: region, label: region })), []
  );

  const registrationZoneOptions = useMemo(() => {
    if (!form.registrationRegion) return [];
    const zones = ETH_GEO[form.registrationRegion]?.zones ? Object.keys(ETH_GEO[form.registrationRegion].zones) : [];
    return zones.map(zone => ({ value: zone, label: zone }));
  }, [form.registrationRegion]);
  
  const registrationWoredaOptions = useMemo(() => {
    if (!form.registrationRegion || !form.registrationZone) return [];
    const woredas = ETH_GEO[form.registrationRegion]?.zones?.[form.registrationZone]?.woredas || [];
    const toLabel = (item) => (typeof item === "string" ? item : (lang === "en" ? item.en : item.am));
    const toValue = (item) => (typeof item === "string" ? item : (item.en || item.am || String(item)));
    return woredas.map(woreda => ({ value: toValue(woreda), label: toLabel(woreda) }));
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
        type: 'birth',
        idNumber: String(idNumber).trim(),
        fieldName: fieldName,
      });
      
      if (editingEvent?._id) {
        params.append('excludeEventId', editingEvent._id);
      }

      const result = await apiFetch(`/users/check-duplicate-id?${params.toString()}`, {
        method: 'GET',
        token: user.token,
      });

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
    } catch (err) {
      console.error('Error checking duplicate ID:', err);
      // Don't show error on API failure, just log it
    } finally {
      setCheckingDuplicate(false);
    }
  }, [user?.token, lang, editingEvent?._id]);

  // Update form when editingEvent changes
  useEffect(() => {
    if (editingEvent) {
      setForm({
        ...initialBirthFormState,
        ...editingEvent.data,
        type: editingEvent.type,
        registrationId: editingEvent.registrationId,
      });
      setGeneratedRegistrationId(editingEvent.registrationId);
    } else {
      setForm(initialBirthFormState);
      setGeneratedRegistrationId(null);
    }
    setValidationErrors({});
    setHasValidationErrors(false);
  }, [editingEvent]);

  // Auto-generate registration ID when form loads (for new events)
  useEffect(() => {
    if (!editingEvent && !generatedRegistrationId) {
      generateRegistrationId();
    }
  }, [editingEvent, generatedRegistrationId, generateRegistrationId]);

  // Auto-set registrationNumber from generated id if present in form
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
          registrarDateAm: prev.registrarDateAm || ethDateObj,
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
    'mainRegistrationRecordNumberAm', 'birthInfoNumberAm', 'motherIdOrPassport', 'fatherIdOrPassportAm', 'childIdNumberAm'
  ]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    const isSelect = String(e?.target?.tagName).toUpperCase() === 'SELECT';

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

    setForm((prev) => ({ ...prev, [name]: nextVal }));
    setValidationErrors((prev) => ({ ...prev, [name]: warn || undefined }));

    // Check for duplicate ID card number with debounce
    if (name === 'childIdNumberAm' && nextVal && nextVal.trim() !== '') {
      // Clear previous timeout
      if (duplicateCheckTimeoutRef.current) {
        clearTimeout(duplicateCheckTimeoutRef.current);
      }
      
      // Set new timeout for debounced check (500ms delay)
      duplicateCheckTimeoutRef.current = setTimeout(() => {
        checkDuplicateId(nextVal, name);
      }, 500);
    } else if (name === 'childIdNumberAm' && (!nextVal || nextVal.trim() === '')) {
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
      key === 'childIdNumberAm' && validationErrors[key]?.includes('already registered')
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
      // Normalize Ethiopian date objects to ISO strings so the manager dashboard sees consistent data
      const normalizeDates = (obj) => {
        const out = { ...obj };
        Object.entries(out).forEach(([k, v]) => {
          if (v && typeof v === 'object' && 'year' in v && 'month' in v && 'day' in v) {
            const y = Number(v.year); const m = Number(v.month); const d = Number(v.day);
            if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
              // Store as YYYY-MM-DD (ISO date without time) to avoid timezone shifts
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
        type: 'birth',
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

  // Helper to render a single field control consistently
  const renderField = (field) => {
              const hasError = !!validationErrors[field.name];
              const errorMessage = validationErrors[field.name] || '';

              return (
      <>
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
                      >
                        <option value="">{translate(lang, "Select...", "መምረጥ...")}</option>
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {translate(lang, option.labelEn, option.labelAm)}
                          </option>
                        ))}
                      </Select>
                    ) : field.type === "location-region" ? (
                      <Select
                        name={field.name}
                        value={form[field.name] || ""}
                        onChange={(e) => {
                          handleChange(e);
                          if (field.name === "region") {
                            setForm(prev => ({ ...prev, zone: "", woreda: "" }));
                          }
                          if (field.name === "zone") {
                            setForm(prev => ({ ...prev, woreda: "" }));
                          }
                          if (field.name === "registrationRegion") {
                            setForm(prev => ({ ...prev, registrationZone: "", registrationWoreda: "" }));
                          }
                          if (field.name === "registrationZone") {
                            setForm(prev => ({ ...prev, registrationWoreda: "" }));
                          }
                        }}
                        hasError={hasError}
                        errorMessage={errorMessage}
                      >
                        <option value="">{translate(lang, "Select Region...", "ክልል ይምረጡ...")}</option>
                        {(field.name === "region" ? regionOptions : registrationRegionOptions).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    ) : field.type === "location-zone" ? (
                      <Select
                        name={field.name}
                        value={form[field.name] || ""}
                        onChange={(e) => {
                          handleChange(e);
                          if (field.name === "zone") {
                            setForm(prev => ({ ...prev, woreda: "" }));
                          }
                          if (field.name === "registrationZone") {
                            setForm(prev => ({ ...prev, registrationWoreda: "" }));
                          }
                        }}
                        hasError={hasError}
                        errorMessage={errorMessage}
                      >
                        <option value="">{translate(lang, "Select Zone...", "ዞን ይምረጡ...")}</option>
                        {(field.name === "zone" ? zoneOptions : registrationZoneOptions).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    ) : field.type === "location-woreda" ? (
                      <Select
                        name={field.name}
                        value={form[field.name] || ""}
                        onChange={handleChange}
                        hasError={hasError}
                        errorMessage={errorMessage}
                      >
                        <option value="">{translate(lang, "Select Woreda...", "ወረዳ ይምረጡ...")}</option>
                        {(field.name === "woreda" ? woredaOptions : registrationWoredaOptions).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    ) : field.type === "ethiopian-date" ? (
                      <div>
                        <EthiopianDatePicker
                          name={field.name}
                          value={form[field.name] || ""}
                          onChange={(date) => {
                            setForm(prev => ({ ...prev, [field.name]: date }));
                            // Validate future dates for ALL date fields - check immediately when date is complete
                            if (date && date.year && date.month && date.day) {
                              if (isEthiopianDateInFuture(date)) {
                                // Get field label for error message
                                const fieldLabel = field.labelAm || field.labelEn || field.name;
                                let errorMsg = '';
                                
                                // Generate appropriate error message based on field name
                                if (field.name === "birthDate") {
                                  errorMsg = lang === 'en' 
                                    ? 'Birth date cannot be in the future'
                                    : 'የትውልድ ቀን ወደፊት ሊሆን አይችልም';
                                } else if (field.name === "motherBirthDate") {
                                  errorMsg = lang === 'en' 
                                    ? 'Mother birth date cannot be in the future'
                                    : 'የእናት የትውልድ ቀን ወደፊት ሊሆን አይችልም';
                                } else if (field.name === "fatherBirthDate") {
                                  errorMsg = lang === 'en' 
                                    ? 'Father birth date cannot be in the future'
                                    : 'የአባት የትውልድ ቀን ወደፊት ሊሆን አይችልም';
                                } else if (field.name === "registrationDateEth" || field.name === "registrarDateAm") {
                                  errorMsg = lang === 'en' 
                                    ? 'Registration date cannot be in the future'
                                    : 'የምዝገባ ቀን ወደፊት ሊሆን አይችልም';
                                } else {
                                  // Generic error message for any other date field
                                  errorMsg = lang === 'en' 
                                    ? `${fieldLabel} cannot be in the future`
                                    : `${fieldLabel} ወደፊት ሊሆን አይችልም`;
                                }
                                setValidationErrors(prev => ({ ...prev, [field.name]: errorMsg }));
                              } else {
                                // Clear error if date is valid
                                setValidationErrors(prev => {
                                  const next = { ...prev };
                                  delete next[field.name];
                                  return next;
                                });
                              }
                            } else {
                              // Clear error if date is incomplete
                              setValidationErrors(prev => {
                                const next = { ...prev };
                                delete next[field.name];
                                return next;
                              });
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
                      />
                    ) : field.type === "numeric-string" ? (
                      <Input
                        type="text"
                        name={field.name}
                        value={form[field.name] || ""}
                        onChange={(e) => {
                          // Allow only digits
                          const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                          handleChange({ target: { name: field.name, value: digitsOnly } });
                        }}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        hasError={hasError}
                        errorMessage={errorMessage}
                        placeholder={translate(lang, "Digits only", "ቁጥሮች ብቻ")}
                      />
                    ) : (
                      <Input
                        type="text"
                        name={field.name}
                        value={form[field.name] || ""}
                        onChange={handleChange}
                        hasError={hasError}
                        errorMessage={errorMessage}
                      />
                    )}
      </>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {translate(lang, "Birth Registration Form", "የትውልድ መዝገብ ቅፅ")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(() => {
                const elements = [];
                for (let i = 0; i < BIRTH_FORM_CONFIG.length; i++) {
                  const field = BIRTH_FORM_CONFIG[i];
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

                  // Try to pair Am/En fields on the same row
                  let paired = false;
                  if (isEn || isAm) {
                    const next = BIRTH_FORM_CONFIG[i + 1];
                    if (next && !next.section) {
                      const nextName = next.name || "";
                      const nextIsEn = /En$/.test(nextName);
                      const nextIsAm = /Am$/.test(nextName);
                      const nextBase = nextName.replace(/(Am|En)$/,'');
                      if (base === nextBase && ((isEn && nextIsAm) || (isAm && nextIsEn))) {
                        // Left should be Am, right should be En
                        const left = isAm ? field : next;
                        const right = isEn ? field : next;
                        elements.push(
                          <React.Fragment key={`pair-${base}-${i}`}>
                            <div className="md:col-start-1">
                              {renderField(left)}
                            </div>
                            <div className="md:col-start-2">
                              {renderField(right)}
                  </div>
                          </React.Fragment>
                        );
                        i++; // skip the next one since it's paired
                        paired = true;
                      }
                    }
                  }

                  if (!paired) {
                    elements.push(
                      <div key={name} className="md:col-span-1">
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
                  : translate(lang, "Save Birth Record", "የትውልድ መዝገብ አስቀምጥ")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BirthForm;
