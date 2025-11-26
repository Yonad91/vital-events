"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { MANAGER_FIELD_CONFIG as FORM_FIELD_CONFIG } from "./ManagerFieldConfig.js";
import { apiFetch, uploadsBaseUrl } from "@/lib/api";
import { formatEthiopianDate } from "@/lib/utils";
import ProfileSidebar from "../components/ProfileSidebar";
import Pagination from "../components/Pagination";
import { useLanguage } from "@/context/LanguageContext";
import FormSelector from "./forms/FormSelector";

// Small mock UI components (kept local to avoid missing imports)
const Card = ({ children, className = "" }) => (
  <div className={`bg-white shadow-md rounded-lg ${className}`}>{children}</div>
);
const CardHeader = ({ children, className = "" }) => (
  <div className={`p-4 border-b ${className}`}>{children}</div>
);
const CardTitle = ({ children, className = "" }) => (
  <h2 className={`text-xl font-semibold ${className}`}>{children}</h2>
);
const CardContent = ({ children, className = "" }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);
const Button = ({ children, onClick, type = "button", className = "", disabled }) => (
  <button type={type} onClick={onClick} disabled={disabled} className={`px-4 py-2 rounded-md ${className}`}>
    {children}
  </button>
);
const Table = ({ children }) => <table className="min-w-full">{children}</table>;
const TableHeader = ({ children }) => <thead className="bg-gray-50">{children}</thead>;
const TableRow = ({ children, className = "" }) => <tr className={className}>{children}</tr>;
const TableHead = ({ children }) => (
  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{children}</th>
);
const TableBody = ({ children }) => <tbody className="bg-white">{children}</tbody>;
const TableCell = ({ children, className = "", colSpan }) => (
  <td colSpan={colSpan} className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${className}`}>
    {children}
  </td>
);

const Badge = ({ children, variant = "default" }) => {
  const variants = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    danger: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
  };
  return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${variants[variant]}`}>{children}</span>;
};

// Utility helpers

const formatLabel = (key) => {
  // simple humanization for keys like childNameEn -> Child Name (En)
  if (!key) return "";
  const parts = key.replace(/([A-Z])/g, " $1").split(/\s|_/).filter(Boolean);
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
};

const getStatusVariant = (status) => {
  switch (status) {
    case "approved":
      return "success";
    case "pending":
      return "warning";
    case "rejected":
      return "danger";
    case "draft":
      return "info";
    default:
      return "default";
  }
};

const getSubmittedByLabel = (who, registrar) => {
  // Prefer the registrar's human name when available
  if (registrar && typeof registrar === 'object') {
    if (registrar.name) return registrar.name;
    if (registrar.username) return registrar.username;
  }
  if (!who) return "-";
  if (typeof who === "object") return who.name || who.username || JSON.stringify(who);
  return String(who);
};

const getValueByPath = (obj, path) => {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
};

const eventMatchesSearchTerm = (event, normalizedTerm) => {
  if (!event || !normalizedTerm) return false;
  const registrationId = (event.registrationId || "").toLowerCase();
  if (registrationId && registrationId.includes(normalizedTerm)) return true;
  const registrationNumber = (event.data?.registrationNumber || "").toLowerCase();
  if (registrationNumber && registrationNumber.includes(normalizedTerm)) return true;

  const nameMatch = SEARCH_NAME_FIELDS.some((field) => {
    const value = getValueByPath(event, field);
    return value && String(value).trim().toLowerCase().includes(normalizedTerm);
  });
  if (nameMatch) return true;

  const idMatch = SEARCH_ID_FIELDS.some((field) => {
    const value = getValueByPath(event, field);
    return value && String(value).toLowerCase().includes(normalizedTerm);
  });
  if (idMatch) return true;

  const combinedGroups = [
    ["data.childNameEn", "data.childFatherNameEn", "data.childGrandfatherNameEn"],
    ["data.childNameAm", "data.childFatherNameAm", "data.childGrandfatherNameAm"],
    ["data.husbandNameEn", "data.husbandFatherEn", "data.husbandGrandfatherEn"],
    ["data.wifeNameEn", "data.wifeFatherEn", "data.wifeGrandfatherEn"],
    ["data.deceasedNameEn", "data.deceasedFatherEn", "data.deceasedGrandfatherEn"],
    ["data.deceasedNameAm", "data.deceasedFatherAm", "data.deceasedGrandfatherAm"],
  ];

  return combinedGroups.some((fields) => {
    const combined = fields
      .map((field) => getValueByPath(event, field))
      .filter(Boolean)
      .join(" ")
      .trim()
      .toLowerCase();
    return combined && combined.includes(normalizedTerm);
  });
};

// Lightweight bilingual label lookup. We intentionally keep this local and
// small — it covers the common fields used across forms. Manager view will
// fall back to a humanized key when a mapping isn't available.
const LABELS = {
		// Requester (applicant) fields for death records
		requesterName: { labelEn: "Requester Name", labelAm: "የመዝገብ ጠያቂ ስም" },
		requesterFatherName: { labelEn: "Requester Father Name", labelAm: "የአባት ስም" },
		requesterGrandName: { labelEn: "Requester Grandfather Name", labelAm: "የአያት ስም" },
		requesterRelation: { labelEn: "Relation to Deceased", labelAm: "ግንኙነት ከሞተው" },
		requesterIdNumber: { labelEn: "Requester ID Number", labelAm: "የመታወቂያ ቁጥር" },
		requesterResidence: { labelEn: "Requester Residence", labelAm: "መኖሪያ ቦታ" },
		requesterPhone: { labelEn: "Requester Phone", labelAm: "ስልክ" },
  registrationId: { labelEn: "Registration ID", labelAm: "የመዝገቢያ መለያ" },
  registrationNumber: { labelEn: "Registration Number", labelAm: "የመመዝገቢያ ቁጥር" },
  mainRegistrationRecordNumberAm: { labelEn: "Main Registration Record Number", labelAm: "ዋና የመመዝገቢያ መዝገብ ቁጥር" },
  registrationDateEth: { labelEn: "Registration Date (E.C)", labelAm: "የመመዝገቢያ ቀን (ኢ.ስ)" },
  registrationTimeHourAm: { labelEn: "Registration Time Hour", labelAm: "የመመዝገቢያ ሰዓት" },
  registrarBureauIdNumber: { labelEn: "Registrar Bureau ID Number", labelAm: "የመመዝገቢያ ቢሮ መታወቂያ ቁጥር" },
  registrationRegion: { labelEn: "Registration Region", labelAm: "የመመዝገቢያ ክልል" },
  registrationZone: { labelEn: "Registration Zone", labelAm: "የመመዝገቢያ ዞን" },
  registrationWoreda: { labelEn: "Registration Woreda", labelAm: "የመመዝገቢያ ወረዳ" },
  registrationCity: { labelEn: "Registration City", labelAm: "የመመዝገቢያ ከተማ" },
  registrationSubCity: { labelEn: "Registration Sub City", labelAm: "የመመዝገቢያ ንዑስ ከተማ" },
  registrationKebele: { labelEn: "Registration Kebele", labelAm: "የመመዝገቢያ ቀበሌ" },
  
  // Birth event fields
  childNameEn: { labelEn: "Child Name (English)", labelAm: "የልጅ ስም (እንግሊዝኛ)" },
  childNameAm: { labelEn: "Child Name (Amharic)", labelAm: "የልጅ ስም (አማርኛ)" },
  fatherNameEn: { labelEn: "Father Name (English)", labelAm: "የአባት ስም (እንግሊዝኛ)" },
  fatherNameAm: { labelEn: "Father Name (Amharic)", labelAm: "የአባት ስም (አማርኛ)" },
  motherNameEn: { labelEn: "Mother Name (English)", labelAm: "የእናት ስም (እንግሊዝኛ)" },
  motherNameAm: { labelEn: "Mother Name (Amharic)", labelAm: "የእናት ስም (አማርኛ)" },
  sex: { labelEn: "Sex", labelAm: "ጾታ" },
  birthDate: { labelEn: "Birth Date", labelAm: "የትውልድ ቀን" },
  region: { labelEn: "Region", labelAm: "ክልል" },
  zone: { labelEn: "Zone", labelAm: "ዞን" },
  woreda: { labelEn: "Woreda", labelAm: "ወረዳ" },
  kebele: { labelEn: "Kebele", labelAm: "ቀበሌ" },
  nationality: { labelEn: "Nationality", labelAm: "ዜግነት" },
  childPhoto: { labelEn: "Child Photo", labelAm: "የልጅ ፎቶ" },
  idCardImage: { labelEn: "ID Card Image", labelAm: "የመለያ ካርድ ፎቶ" },
  consentPhoto: { labelEn: "Consent Photo", labelAm: "የፈቃድ ፎቶ" },
  
  // Marriage event fields
  husbandNameEn: { labelEn: "Husband Name (English)", labelAm: "የባል ስም (እንግሊዝኛ)" },
  husbandNameAm: { labelEn: "Husband Name (Amharic)", labelAm: "የባል ስም (አማርኛ)" },
  husbandFatherEn: { labelEn: "Husband Father (English)", labelAm: "የባል አባት (እንግሊዝኛ)" },
  husbandFatherAm: { labelEn: "Husband Father (Amharic)", labelAm: "የባል አባት (አማርኛ)" },
  husbandGrandfatherEn: { labelEn: "Husband Grandfather (English)", labelAm: "የባል አያት (እንግሊዝኛ)" },
  husbandGrandfatherAm: { labelEn: "Husband Grandfather (Amharic)", labelAm: "የባል አያት (አማርኛ)" },
  husbandNationality: { labelEn: "Husband Nationality", labelAm: "የባል ዜግነት" },
  wifeNameEn: { labelEn: "Wife Name (English)", labelAm: "የሚስት ስም (እንግሊዝኛ)" },
  wifeNameAm: { labelEn: "Wife Name (Amharic)", labelAm: "የሚስት ስም (አማርኛ)" },
  wifeFatherEn: { labelEn: "Wife Father (English)", labelAm: "የሚስት አባት (እንግሊዝኛ)" },
  wifeFatherAm: { labelEn: "Wife Father (Amharic)", labelAm: "የሚስት አባት (አማርኛ)" },
  wifeGrandfatherEn: { labelEn: "Wife Grandfather (English)", labelAm: "የሚስት አያት (እንግሊዝኛ)" },
  wifeGrandfatherAm: { labelEn: "Wife Grandfather (Amharic)", labelAm: "የሚስት አያት (አማርኛ)" },
  wifeNationality: { labelEn: "Wife Nationality", labelAm: "የሚስት ዜግነት" },
  
  // Death event fields
  deceasedNameEn: { labelEn: "Deceased Name (English)", labelAm: "የሞተው ስም (እንግሊዝኛ)" },
  deceasedNameAm: { labelEn: "Deceased Name (Amharic)", labelAm: "የሞተው ስም (አማርኛ)" },
  deceasedFatherEn: { labelEn: "Father's Name (English)", labelAm: "የአባት ስም (እንግሊዝኛ)" },
  deceasedFatherAm: { labelEn: "Father's Name (Amharic)", labelAm: "የአባት ስም (አማርኛ)" },
  deceasedGrandfatherEn: { labelEn: "Grandfather's Name (English)", labelAm: "የአያት ስም (እንግሊዝኛ)" },
  deceasedGrandfatherAm: { labelEn: "Grandfather's Name (Amharic)", labelAm: "የአያት ስም (አማርኛ)" },
  deceasedNationality: { labelEn: "Nationality", labelAm: "ዜግነት" },
  deceasedPhoto: { labelEn: "Deceased Photo", labelAm: "የሞተው ፎቶ" },
  deathDate: { labelEn: "Death Date", labelAm: "የሞት ቀን" },
  causeOfDeath: { labelEn: "Cause of Death", labelAm: "የሞት ምክንያት" },
  
  // Common fields
  submittedBy: { labelEn: "Submitted By", labelAm: "የተላከ በ" },

  // Marriage-specific place keys (as saved by church forms)
  marriageRegion: { labelEn: "Marriage Region", labelAm: "የሰርግ ክልል" },
  marriageZone: { labelEn: "Marriage Zone", labelAm: "የሰርግ ዞን" },
  marriageWoreda: { labelEn: "Marriage Woreda", labelAm: "የሰርግ ወረዳ" },
  marriageDate: { labelEn: "Marriage Date (E.C)", labelAm: "የሰርግ ቀን (ኢ.ስ)" },

  // Husband / Wife additional fields
  husbandBirthDate: { labelEn: "Husband Birth Date (E.C)", labelAm: "የባል ቀን የትውልድ (ኢ.ስ)" },
  husbandReligionAm: { labelEn: "Husband Religion", labelAm: "የባል ሃይማኖት" },
  husbandPrevMaritalStatusAm: { labelEn: "Husband Previous Marital Status", labelAm: "የባል ቀድሞ የጋብቻ ሁኔታ" },
  wifeReligionAm: { labelEn: "Wife Religion", labelAm: "የሚስት ሃይማኖት" },
  wifePrevMaritalStatusAm: { labelEn: "Wife Previous Marital Status", labelAm: "የሚስት ቀድሞ የጋብቻ ሁኔታ" },

  // Documents
  wifePhoto: { labelEn: "Wife Photo", labelAm: "የሚስት ፎቶ" },
  husbandPhoto: { labelEn: "Husband Photo", labelAm: "የባል ፎቶ" },
  consentForm: { labelEn: "Consent Form", labelAm: "የስምምነት ቅፅ" },
  deathConsentForm: { labelEn: "Death Consent Form", labelAm: "የሞት ስምምነት ቅፅ" },
  specialDocuments: { labelEn: "Special Documents", labelAm: "የተለየ ሰነዶች" },

  // Additional marriage location/places
  marriageCity: { labelEn: "Marriage City", labelAm: "የሰርግ ከተማ" },
  marriageSubCity: { labelEn: "Marriage Sub City", labelAm: "የሰርግ ንዑስ ከተማ" },
  marriageKebeleAm: { labelEn: "Marriage Kebele", labelAm: "የሰርግ ቀበሌ" },
  marriagePlaceEn: { labelEn: "Marriage Place (EN)", labelAm: "የሰርግ ቦታ (እንግ)" },
  marriagePlaceAm: { labelEn: "Marriage Place (AM)", labelAm: "የሰርግ ቦታ (አማ)" },
  marriagePlaceName: { labelEn: "Marriage Place Name", labelAm: "የሰርግ ቦታ ስም" },

  // Education / Ethnicity / Residence / Birthplace / IDs
  wifeEducationAm: { labelEn: "Wife Education", labelAm: "የሚስት ትምህርት" },
  wifeEthnicity: { labelEn: "Wife Ethnicity", labelAm: "የሚስት ጎጥ" },
  wifeResidence: { labelEn: "Wife Residence", labelAm: "የሚስት መኖሪያ" },
  wifeBirthDateAm: { labelEn: "Wife Birth Date (E.C)", labelAm: "የሚስት ቀን የትውልድ (ኢ.ስ)" },
  wifeBirthPlace: { labelEn: "Wife Birth Place", labelAm: "የሚስት ልደት ቦታ" },
  wifeAgeAm: { labelEn: "Wife Age", labelAm: "የሚስት እድሜ" },
  wifeIdNumberAm: { labelEn: "Wife ID Number", labelAm: "የሚስት መታወቂያ ቁጥር" },
  wifeNationalityAm: { labelEn: "Wife Nationality", labelAm: "የሚስት ዜግነት" },
  wifeJobAm: { labelEn: "Wife Job", labelAm: "የሚስት ሥራ" },

  husbandEthnicityAm: { labelEn: "Husband Ethnicity", labelAm: "የባል ጎጥ" },
  husbandResidence: { labelEn: "Husband Residence", labelAm: "የባል መኖሪያ" },
  husbandBirthPlace: { labelEn: "Husband Birth Place", labelAm: "የባል ልደት ቦታ" },
  husbandIdNumberAm: { labelEn: "Husband ID Number", labelAm: "የባል መታወቂያ ቁጥር" },

  // Child / birth (duplicates removed - see earlier definitions)
  childFullNameEn: { labelEn: "Full Name (EN)", labelAm: "ሙሉ ስም (እንግ)" },
  childFullNameAm: { labelEn: "Full Name (AM)", labelAm: "ሙሉ ስም (አማ)" },
  childGrandfatherName: { labelEn: "Grandfather's Name", labelAm: "የአያት ስም" },
  motherFullNameEn: { labelEn: "Mother Name (EN)", labelAm: "የእናት ስም (እንግ)" },
  motherFatherName: { labelEn: "Mother's Father Name", labelAm: "የእናት የአባት ስም" },
  motherGrandfatherName: { labelEn: "Mother's Grandfather Name", labelAm: "የእናት የአያት ስም" },
  motherNationalityAm: { labelEn: "Mother's Nationality", labelAm: "የእናት ዜግነት" },
  motherIdOrPassport: { labelEn: "Mother's ID Number", labelAm: "የእናት የመታወቂያ ቁጥር" },
  motherBirthDate: { labelEn: "Mother's Birth Date", labelAm: "የእናት የትውልድ ቀን" },
  motherBirthPlace: { labelEn: "Mother's Birth Place", labelAm: "የእናት የትውልድ ቦታ" },
  motherResidence: { labelEn: "Mother's Residence", labelAm: "የእናት መኖሪያ ቦታ" },
  motherMaritalStatusAm: { labelEn: "Mother's Marital Status", labelAm: "የእናት የጋብቻ ሁኔታ" },
  motherReligionAm: { labelEn: "Mother's Religion", labelAm: "የእናት ሃይማኖት" },
  motherEthnicityAm: { labelEn: "Mother's Ethnicity", labelAm: "የእናት ዘር" },
  motherEducationLevelAm: { labelEn: "Mother's Education Level", labelAm: "የእናት የትምህርት ደረጃ" },
  motherOccupationAm: { labelEn: "Mother's Occupation", labelAm: "የእናት ሥራ" },
  fatherFullNameEn: { labelEn: "Father's Full Name (EN)", labelAm: "የአባት ሙሉ ስም (እንግ)" },
  fatherFullNameAm: { labelEn: "Father's Full Name (AM)", labelAm: "የአባት ሙሉ ስም (አማ)" },
  fatherFatherName: { labelEn: "Father's Father Name", labelAm: "የአባት የአባት ስም" },
  fatherGrandfatherName: { labelEn: "Father's Grandfather Name", labelAm: "የአባት የአያት ስም" },
  fatherNationalityAm: { labelEn: "Father's Nationality", labelAm: "የአባት ዜግነት" },
  fatherIdOrPassportAm: { labelEn: "Father's ID Number", labelAm: "የአባት የመታወቂያ ቁጥር" },
  fatherBirthDate: { labelEn: "Father's Birth Date", labelAm: "የአባት የትውልድ ቀን" },
  fatherBirthPlace: { labelEn: "Father's Birth Place", labelAm: "የአባት የትውልድ ቦታ" },
  fatherResidence: { labelEn: "Father's Residence", labelAm: "የአባት መኖሪያ ቦታ" },
  fatherMaritalStatusAm: { labelEn: "Father's Marital Status", labelAm: "የአባት የጋብቻ ሁኔታ" },
  fatherReligion: { labelEn: "Father's Religion", labelAm: "የአባት ሃይማኖት" },
  fatherEthnicity: { labelEn: "Father's Ethnicity", labelAm: "የአባት ዘር" },
  fatherEducationLevelAm: { labelEn: "Father's Education Level", labelAm: "የአባት የትምህርት ደረጃ" },
  fatherOccupationAm: { labelEn: "Father's Occupation", labelAm: "የአባት ሥራ" },
  guardianFullName: { labelEn: "Guardian Full Name", labelAm: "የአሳዳጊ ሙሉ ስም" },
  guardianOccupationEn: { labelEn: "Guardian Occupation", labelAm: "የአሳዳጊ ሙያ" },
  guardianWorkAddressAm: { labelEn: "Guardian Work Address", labelAm: "የአሳዳጊ የሥራ ቦታ" },
  guardianHouseNoAm: { labelEn: "Guardian House Number", labelAm: "የአሳዳጊ የቤት ቁጥር" },
  guardianMobileAm: { labelEn: "Guardian Mobile Number", labelAm: "የአሳዳጊ ሞባይል ቁጥር" },
  // sex, nationality, birthDate duplicates removed - see earlier definitions
  age: { labelEn: "Age", labelAm: "እድሜ" },
  birthPlaceType: { labelEn: "Birth Place Type", labelAm: "የትውልድ ቦታ አይነት" },
  birthInfoNumberAm: { labelEn: "Birth Info Number", labelAm: "የትውልድ መረጃ ቁጥር" },
  birthType: { labelEn: "Birth Type", labelAm: "የትውልድ አይነት" },
  birthHelpAm: { labelEn: "Birth Help", labelAm: "የተሰጠ እርዳታ" },
  childWeightAm: { labelEn: "Child Weight", labelAm: "የልጅ ክብደት" },
  midwifeLevel: { labelEn: "Midwife Level", labelAm: "የባለሙያው የሙያ ደረጃ" },
  placeOfBirthEn: { labelEn: "Place of Birth (EN)", labelAm: "የትውልድ ቦታ (እንግ)" },
  placeOfBirthAm: { labelEn: "Place of Birth (AM)", labelAm: "የትውልድ ቦታ (አማ)" },
  birthPlaceCity: { labelEn: "City", labelAm: "ከተማ" },
  birthPlaceSubCity: { labelEn: "Sub City", labelAm: "ንዑስ ከተማ" },
  birthPlaceWoreda: { labelEn: "Woreda", labelAm: "ወረዳ" },
  birthPlaceKebele: { labelEn: "ቀበሌ", labelAm: "ቀበሌ" },
  // region, zone, woreda, kebele, childPhoto, idCardImage duplicates removed - see earlier definitions
  signedConsentPhoto: { labelEn: "Signed Consent Photo", labelAm: "የተፈረመ ፍቃድ" },
  registrarNameAm: { labelEn: "Registrar Name", labelAm: "የምዝገባ ስም" },
  registrarFatherNameAm: { labelEn: "Registrar Father Name", labelAm: "የምዝገባ የአባት ስም" },
  registrarGrandNameAm: { labelEn: "Registrar Grandfather Name", labelAm: "የምዝገባ የአያት ስም" },
  registrarDateAm: { labelEn: "Registrar Date", labelAm: "የምዝገባ ቀን" },

  // Marriage (duplicates removed - see earlier definitions)
  
  // Death (duplicates removed - see earlier definitions)
  deceasedName: { labelEn: "Deceased Name", labelAm: "የሞተው ስም" },
  
  // Additional field labels for comprehensive coverage
  motherFullName: { labelEn: "Mother's Full Name", labelAm: "የእናት ሙሉ ስም" },
  fatherFullName: { labelEn: "Father's Full Name", labelAm: "የአባት ሙሉ ስም" },
  wifeName: { labelEn: "Wife Name", labelAm: "የሚስት ስም" },
  husbandName: { labelEn: "Husband Name", labelAm: "የባል ስም" },
  
  // Auto-calculated fields
  childAge: { labelEn: "Child Age", labelAm: "የልጅ እድሜ" },
  motherAge: { labelEn: "Mother Age", labelAm: "የእናት እድሜ" },
  fatherAge: { labelEn: "Father Age", labelAm: "የአባት እድሜ" },
  husbandAge: { labelEn: "Husband Age", labelAm: "የባል እድሜ" },
  wifeAge: { labelEn: "Wife Age", labelAm: "የሚስት እድሜ" },
  deceasedAgeAm: { labelEn: "Deceased Age", labelAm: "የሞተው እድሜ" },
  
  // Dropdown values
  motherSex: { labelEn: "Mother Sex", labelAm: "የእናት ፆታ" },
  fatherSex: { labelEn: "Father Sex", labelAm: "የአባት ፆታ" },
  deceasedSex: { labelEn: "Deceased Sex", labelAm: "የሞተው ፆታ" },
  deathPlaceEn: { labelEn: "Place of Death (EN)", labelAm: "የሞት ቦታ (እንግ)" },

  // Marriage additional photos
  wifeConsent: { labelEn: "Wife Consent", labelAm: "የሚስት ፍቃድ" },
  husbandConsent: { labelEn: "Husband Consent", labelAm: "የባል ፍቃድ" },

  // Divorce event fields
  divorceHusbandNameEn: { labelEn: "Divorce Husband Name (EN)", labelAm: "የፍቺ ባል ስም (እንግ)" },
  divorceHusbandNameAm: { labelEn: "Divorce Husband Name (AM)", labelAm: "የፍቺ ባል ስም (አማ)" },
  divorceWifeNameEn: { labelEn: "Divorce Wife Name (EN)", labelAm: "የፍቺ ሚስት ስም (እንግ)" },
  divorceWifeNameAm: { labelEn: "Divorce Wife Name (AM)", labelAm: "የፍቺ ሚስት ስም (አማ)" },
  divorceDate: { labelEn: "Divorce Date", labelAm: "የፍቺ ቀን" },
  divorceReason: { labelEn: "Divorce Reason", labelAm: "የፍቺ ምክንያት" },
  divorceRegion: { labelEn: "Divorce Region", labelAm: "የፍቺ ክልል" },
  divorceZone: { labelEn: "Divorce Zone", labelAm: "የፍቺ ዞን" },
  divorceWoreda: { labelEn: "Divorce Woreda", labelAm: "የፍቺ ወረዳ" },
  divorceCertificateDate: { labelEn: "Divorce Certificate Date", labelAm: "የፍቺ ማስረጃ ቀን" },
  divorceSpouse1ReligionAm: { labelEn: "Divorce Spouse 1 Religion", labelAm: "የፍቺ የመጀመሪያ የጋብቻ ሃይማኖት" },
  divorceSpouse2ReligionAm: { labelEn: "Divorce Spouse 2 Religion", labelAm: "የፍቺ የሁለተኛ የጋብቻ ሃይማኖት" },

  // Additional birth event fields (duplicates removed - see earlier definitions)
  // Additional marriage event fields (duplicates removed - see earlier definitions)

  // Generic
  uploadedForm: { labelEn: "Uploaded Form", labelAm: "የተጫነ ቅጽ" },
  uploadedFiles: { labelEn: "Files", labelAm: "ፋይሎች" },
  officerName: { labelEn: "Officer Name", labelAm: "የባለሥልጣን ስም" },
  // Additional canonical labels for frequently reported keys
  informationNumberOfBirth: { labelEn: "Information Number of Birth", labelAm: "የትውልድ መረጃ ቁጥር" },
  helpDoneDuringBirth: { labelEn: "Help Done During Birth", labelAm: "በትውልድ ጊዜ የተሰጠ እርዳታ" },
  typeOfBirth: { labelEn: "Type of Birth", labelAm: "የትውልድ አይነት" },
  professionLevelOfTheMidwife: { labelEn: "Profession Level of the Midwife", labelAm: "የድንክ ሙያ ደረጃ" },
  weightOfChild: { labelEn: "Weight of Child", labelAm: "የልጅ ክብደት" },
};

const EVENT_TYPE_OPTIONS = [
  { value: "all", labelEn: "All types", labelAm: "ሁሉም አይነቶች" },
  { value: "birth", labelEn: "Birth", labelAm: "ትውልድ" },
  { value: "marriage", labelEn: "Marriage", labelAm: "ጋብቻ" },
  { value: "death", labelEn: "Death", labelAm: "ሞት" },
  { value: "divorce", labelEn: "Divorce", labelAm: "ፍቺ" },
  { value: "special", labelEn: "Special", labelAm: "ልዩ" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", labelEn: "All statuses", labelAm: "ሁሉም ሁኔታዎች" },
  { value: "draft", labelEn: "Draft", labelAm: "ድርሰት" },
  { value: "pending", labelEn: "Pending", labelAm: "በመጠበቅ ላይ" },
  { value: "approved", labelEn: "Approved", labelAm: "ተጸድቋል" },
  { value: "rejected", labelEn: "Rejected", labelAm: "ተቀባይነት አልተሰጠም" },
];

const SEARCH_NAME_FIELDS = [
  "data.childNameEn",
  "data.childNameAm",
  "data.childFullNameEn",
  "data.childFullNameAm",
  "data.childFatherNameEn",
  "data.childFatherNameAm",
  "data.childGrandfatherNameEn",
  "data.childGrandfatherNameAm",
  "data.husbandNameEn",
  "data.husbandNameAm",
  "data.husbandFullNameEn",
  "data.husbandFullNameAm",
  "data.wifeNameEn",
  "data.wifeNameAm",
  "data.wifeFullNameEn",
  "data.wifeFullNameAm",
  "data.deceasedNameEn",
  "data.deceasedNameAm",
  "data.deceasedFullNameEn",
  "data.deceasedFullNameAm",
  "data.motherFullNameEn",
  "data.motherFullNameAm",
  "data.fatherFullNameEn",
  "data.fatherFullNameAm",
  "data.requesterName",
  "data.parentNameEn",
  "data.parentNameAm",
];

const SEARCH_ID_FIELDS = [
  "data.childIdNumberAm",
  "data.husbandIdNumberAm",
  "data.wifeIdNumberAm",
  "data.deceasedIdNumberAm",
  "data.requesterIdNumber",
  "data.idCardNumber",
  "data.motherIdOrPassport",
  "data.fatherIdOrPassportAm",
  "data.registrarBureauIdNumber",
  "data.birthInfoNumberAm",
  "data.divorceSpouse1IdAm",
  "data.divorceSpouse2IdAm",
];

const ManagerDashboard = ({ user, setUser }) => {
  const { lang, toggleLang } = useLanguage();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState("all"); // status filter
  const [viewAll, setViewAll] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchActive, setSearchActive] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [highlightById, setHighlightById] = useState({}); // { [id]: 'new' | 'resubmitted' }
  const [notification, setNotification] = useState({ newCount: 0, resubmittedCount: 0, visible: false });
  const [eventsViewActive, setEventsViewActive] = useState(false);
  const [certificateViewActive, setCertificateViewActive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [certificateCurrentPage, setCertificateCurrentPage] = useState(1);
  const [reportsCurrentPage, setReportsCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
	const [reportsViewActive, setReportsViewActive] = useState(false);
	const [detailsViewActive, setDetailsViewActive] = useState(false);
  const [correctionsViewActive, setCorrectionsViewActive] = useState(false);
  const [corrections, setCorrections] = useState([]);
  const [correctionsLoading, setCorrectionsLoading] = useState(false);
  const [correctionsError, setCorrectionsError] = useState("");
  const [correctionsStatusFilter, setCorrectionsStatusFilter] = useState("pending");
  const [correctionsCurrentPage, setCorrectionsCurrentPage] = useState(1);
  const [correctionUpdating, setCorrectionUpdating] = useState(false);
  const [agentsViewActive, setAgentsViewActive] = useState(false);
  const [agents, setAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsCurrentPage, setAgentsCurrentPage] = useState(1);
  const [showCreateAgentForm, setShowCreateAgentForm] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: "", email: "", password: "", role: "registrar" });
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [actionAgent, setActionAgent] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [pendingDeleteEvent, setPendingDeleteEvent] = useState(null);
  const [showConfirmDeleteEvent, setShowConfirmDeleteEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [formType, setFormType] = useState("birth");
  const [openSections, setOpenSections] = useState({ overview: true, responsibilities: true, tips: false });
  const [certificateRequests, setCertificateRequests] = useState([]);
  const [certificateLoading, setCertificateLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState("");
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [reportFeedbackMessage, setReportFeedbackMessage] = useState("");
  const [reportFeedbackRecipients, setReportFeedbackRecipients] = useState({
    reporter: true,
    registrar: false,
    hospital: false,
    church: false,
    mosque: false,
  });
  const [reportFeedbackSending, setReportFeedbackSending] = useState(false);
  const [reportsTab, setReportsTab] = useState("received"); // "received" or "prepare"
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [reportingUsers, setReportingUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    title: "",
    type: "message",
    content: "",
    formFields: {},
  });
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const [templateRecipients, setTemplateRecipients] = useState({
    allRoles: false,
    roles: [],
    specificUsers: [],
  });
  const [reportFeedbackError, setReportFeedbackError] = useState("");
  const [reportFeedbackSuccess, setReportFeedbackSuccess] = useState("");

  const prevEventsRef = React.useRef([]);
  const [seenEventIds, setSeenEventIds] = useState(() => {
    try {
      const raw = localStorage.getItem('managerSeenEventIds');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? new Set(parsed) : new Set();
    } catch {
      return new Set();
    }
  });

  const showSuccess = (msg, timeout = 4000) => {
    setSuccessMessage(msg);
    if (timeout > 0) {
      setTimeout(() => setSuccessMessage(""), timeout);
    }
  };

  const load = useCallback(async () => {
    if (!user || !user.token) return;
    setLoading(true);
    try {
      // fetch all registered events for manager by default
      const res = await apiFetch("/users/manager/events/all", { token: user.token });
      const evts = Array.isArray(res) ? res : [];
      console.debug("ManagerDashboard: fetched events", evts.length, evts.slice(0,3));
      // Detect new/resubmitted events compared to previous snapshot
      const prev = Array.isArray(prevEventsRef.current) ? prevEventsRef.current : [];
      const prevById = new Map(prev.map(e => [(e._id || e.id), e]));
      const nextById = new Map(evts.map(e => [(e._id || e.id), e]));

      let newCount = 0;
      let resubmittedCount = 0;
      const newHighlights = { ...highlightById };

      evts.forEach(e => {
        const id = e._id || e.id;
        const prevE = prevById.get(id);
        const isPending = e.status === 'pending';
        if (!prevE && isPending && !seenEventIds.has(id)) {
          // Brand new pending event
          if (!newHighlights[id]) newHighlights[id] = 'new';
          newCount += 1;
        } else if (prevE && prevE.status === 'rejected' && e.status === 'pending') {
          // Resubmission after rejection
          newHighlights[id] = 'resubmitted';
          resubmittedCount += 1;
        }
      });

      // Update UI states
      if (newCount > 0 || resubmittedCount > 0) {
        setNotification({ newCount, resubmittedCount, visible: true });
      }
      if (newCount > 0 || resubmittedCount > 0) {
        setHighlightById(newHighlights);
      }

      setEvents(evts);
      prevEventsRef.current = evts;
    } catch (err) {
      setError(err?.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadCertificateRequests = useCallback(async () => {
    if (!user || !user.token) return;
    setCertificateLoading(true);
    try {
      // Extract all certificate requests from events
      const allRequests = [];
      events.forEach(event => {
        if (event.requestedCertificates && event.requestedCertificates.length > 0) {
          event.requestedCertificates.forEach(cert => {
            allRequests.push({
              ...cert,
              eventId: event._id || event.id,
              eventType: event.type,
              registrationId: event.registrationId,
              eventData: event.data
            });
          });
        }
      });
      setCertificateRequests(allRequests);
    } catch (err) {
      console.error("Failed to load certificate requests:", err);
    } finally {
      setCertificateLoading(false);
    }
  }, [user, events]);

  const loadReports = useCallback(async () => {
    if (!user || !user.token) return;
    setReportsLoading(true);
    setReportsError("");
    try {
      const res = await apiFetch("/users/manager/reports", { token: user.token });
      const list = Array.isArray(res) ? res : [];
      setReports(list);
      if (list.length > 0) {
        setSelectedReportId((prev) => prev || list[0]._id || list[0].id);
      }
    } catch (err) {
      setReports([]);
      setReportsError(err?.message || (lang === "en" ? "Failed to load operational reports" : "የስራ ሪፖርቶችን መመልከት አልተቻለም"));
    } finally {
      setReportsLoading(false);
    }
  }, [lang, user?.token]);

  const mapCorrectionsFromEvents = useCallback(() => {
    const items = [];
    (events || []).forEach((event) => {
      if (!event?.corrections || event.corrections.length === 0) return;
      event.corrections.forEach((correction) => {
        items.push({
          eventId: event._id || event.id,
          eventType: event.type,
          eventStatus: event.status,
          registrationId: event.registrationId,
          eventData: event.data,
          registrar: event.registrarId,
          correctionId: correction._id || correction.id,
          correction,
          event,
        });
      });
    });
    return items;
  }, [events]);

  const loadCorrections = useCallback(async () => {
    if (!user?.token) return;
    setCorrectionsLoading(true);
    setCorrectionsError("");
    try {
      const res = await apiFetch(`/users/manager/corrections?status=${correctionsStatusFilter}`, {
        token: user.token,
      });
      const data = Array.isArray(res) ? res : [];
      if (data.length === 0) {
        const fallback = mapCorrectionsFromEvents();
        setCorrections(fallback.filter((item) =>
          correctionsStatusFilter === "all"
            ? true
            : (item.correction.status || "pending").toLowerCase() === correctionsStatusFilter
        ));
      } else {
        setCorrections(data);
      }
    } catch (err) {
      console.error("Failed to load correction requests:", err);
      const fallback = mapCorrectionsFromEvents();
      if (fallback.length > 0) {
        setCorrections(fallback.filter((item) =>
          correctionsStatusFilter === "all"
            ? true
            : (item.correction.status || "pending").toLowerCase() === correctionsStatusFilter
        ));
      } else {
        setCorrections([]);
      }
      setCorrectionsError(err?.message || (lang === "en" ? "Failed to load correction requests" : "የማስተካከያ ጥያቄዎችን ማስገኘት አልተቻለም"));
    } finally {
      setCorrectionsLoading(false);
    }
}, [user?.token, correctionsStatusFilter, lang, mapCorrectionsFromEvents]);

  useEffect(() => {
    if (user?.token) load();
  }, [user?.token, load]);

  useEffect(() => {
    if (events.length > 0) {
      loadCertificateRequests();
    }
  }, [events, loadCertificateRequests]);

  useEffect(() => {
    if (user?.token && reportsViewActive) {
      loadReports();
      if (reportsTab === "prepare") {
        loadTemplates();
        loadReportingUsers();
      }
    }
  }, [user?.token, reportsViewActive, reportsTab, loadReports]);

  useEffect(() => {
    if (user?.token && correctionsViewActive) {
      loadCorrections();
    }
  }, [user?.token, correctionsViewActive, loadCorrections]);

  useEffect(() => {
    if (correctionsViewActive) {
      const fallback = mapCorrectionsFromEvents();
      if (fallback.length > 0) {
        setCorrections(fallback.filter((item) =>
          correctionsStatusFilter === "all"
            ? true
            : (item.correction.status || "pending").toLowerCase() === correctionsStatusFilter
        ));
      }
    }
  }, [events, correctionsViewActive, correctionsStatusFilter, mapCorrectionsFromEvents]);

  useEffect(() => {
    if (correctionsViewActive) {
      loadCorrections();
    }
    setCorrectionsCurrentPage(1);
  }, [correctionsStatusFilter, correctionsViewActive, loadCorrections]);

  useEffect(() => {
    if (searchActive && searchInput.trim()) {
      const normalized = searchInput.trim().toLowerCase();
      const matches = events
        .filter((event) => eventMatchesSearchTerm(event, normalized))
        .map((event) => event._id || event.id);
      setSearchResults(matches);
    }
  }, [events, searchActive, searchInput]);

  const loadTemplates = useCallback(async () => {
    if (!user || !user.token) return;
    setTemplatesLoading(true);
    try {
      const res = await apiFetch("/users/manager/templates", { token: user.token });
      setTemplates(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Failed to load templates:", err);
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, [user?.token]);

  const loadReportingUsers = useCallback(async () => {
    if (!user || !user.token) return;
    setUsersLoading(true);
    try {
      const res = await apiFetch("/users/manager/reporting-users", { token: user.token });
      setReportingUsers(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Failed to load reporting users:", err);
      setReportingUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    setReportFeedbackMessage("");
    setReportFeedbackError("");
    setReportFeedbackSuccess("");
    setReportFeedbackRecipients({
      reporter: true,
      registrar: false,
      hospital: false,
      church: false,
      mosque: false,
    });
  }, [selectedReportId]);

  // Sync filter with location hash (#pending, #approved, #rejected, #certificates, or default all)
  const applyHashFilter = useCallback(() => {
    try {
      const h = (typeof window !== 'undefined' ? window.location.hash : '').toLowerCase();
      // Only show Events Review when dropdown is open and a status is selected: #events/<status>
      if (/^#events\/(pending|approved|rejected)$/.test(h)) {
        const status = h.split('/')[1];
        setFilter(status);
        setViewAll(false);
        setEventsViewActive(true);
        setCertificateViewActive(false);
        setReportsViewActive(false);
        return;
      }
      // Show certificate management view
      if (h === '#certificates') {
        setFilter('all');
        setViewAll(true);
        setEventsViewActive(false);
        setCertificateViewActive(true);
        setReportsViewActive(false);
        setDetailsViewActive(false);
        setAgentsViewActive(false);
        setCorrectionsViewActive(false);
        return;
      }
      if (h === '#reports') {
        setFilter('all');
        setViewAll(true);
        setEventsViewActive(false);
        setCertificateViewActive(false);
        setDetailsViewActive(false);
        setReportsViewActive(true);
        setAgentsViewActive(false);
        setCorrectionsViewActive(false);
        return;
      }
      if (h === '#corrections') {
        setFilter('all');
        setViewAll(true);
        setEventsViewActive(false);
        setCertificateViewActive(false);
        setDetailsViewActive(false);
        setReportsViewActive(false);
        setAgentsViewActive(false);
        setCorrectionsViewActive(true);
        return;
      }
      if (h === '#agents') {
        setFilter('all');
        setViewAll(true);
        setEventsViewActive(false);
        setCertificateViewActive(false);
        setReportsViewActive(false);
        setDetailsViewActive(false);
        setAgentsViewActive(true);
        setCorrectionsViewActive(false);
        return;
      }
      // Hash is #events (opened but not selected) or anything else: hide
      setFilter('all');
      setViewAll(true);
      setEventsViewActive(false);
      setCertificateViewActive(false);
      setReportsViewActive(false);
      setAgentsViewActive(false);
      setCorrectionsViewActive(false);
    } catch {}
  }, []);

  // Initialize filter from hash on mount and listen for changes
  useEffect(() => {
    applyHashFilter();
    if (typeof window === 'undefined') return;
    const onHashChange = () => applyHashFilter();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [applyHashFilter]);

  // Poll for updates periodically to surface notifications/highlights
  useEffect(() => {
    if (!user?.token) return;
    const interval = setInterval(() => {
      load();
    }, 30000); // 30s polling
    return () => clearInterval(interval);
  }, [user?.token, load]);

  const getEventDisplayDate = (event) => {
    const data = event?.data || {};
    // Prefer explicit Ethiopian registration date if present
    const candidates = [
      data?.registrationDateEth,
      data?.dateOfEvent,
      data?.birthDate,
      data?.deathDate,
      data?.marriageDate,
      data?.registrarDate,
      event?.submittedAt,
      event?.createdAt,
    ];
    for (const c of candidates) {
      if (c !== undefined && c !== null && c !== "") return formatEthiopianDisplay(c);
    }
    return "-";
  };

  const formatEthiopianDisplay = (v) => {
    // Desired format: DD/MM/YYYY E.C
    const toDDMMYYYYEC = (ethY, ethM, ethD) => {
      const dd = String(ethD).padStart(2, "0");
      const mm = String(ethM).padStart(2, "0");
      const yyyy = String(ethY);
      return `${dd}/${mm}/${yyyy} E.C`;
    };

  if (!v) return "-";
  // Guard against string literal 'null'/'undefined' coming from some backends
  if (typeof v === "string" && /^(null|undefined)$/i.test(v.trim())) return "-";
    if (typeof v === "object" && v.year && v.month && v.day) {
      return toDDMMYYYYEC(v.year, v.month, v.day);
    }

    if (typeof v === "string") {
      const datePart = v.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        const eth = formatEthiopianDate(datePart); // returns YYYY-MM-DD (E.C)
        if (eth) {
          const [ey, em, ed] = eth.split("-");
          return toDDMMYYYYEC(ey, em, ed);
        }
        // fallback to showing ISO date in DD/MM/YYYY
        const [gy, gm, gd] = datePart.split("-");
        return `${gd}/${gm}/${gy}`;
      }
      const d = new Date(v);
      if (!isNaN(d.getTime())) {
        const eth = formatEthiopianDate(d.toISOString().slice(0, 10));
        if (eth) {
          const [ey, em, ed] = eth.split("-");
          return toDDMMYYYYEC(ey, em, ed);
        }
        const iso = d.toISOString().slice(0, 10).split("-");
        return `${iso[2]}/${iso[1]}/${iso[0]}`;
      }
      return datePart;
    }

    if (v instanceof Date) {
      const eth = formatEthiopianDate(v.toISOString().slice(0, 10));
      if (eth) {
        const [ey, em, ed] = eth.split("-");
        return toDDMMYYYYEC(ey, em, ed);
      }
      const iso = v.toISOString().slice(0, 10).split("-");
      return `${iso[2]}/${iso[1]}/${iso[0]}`;
    }

    try {
      const s = String(v).slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [gy, gm, gd] = s.split("-");
        return `${gd}/${gm}/${gy}`;
      }
      return s;
    } catch {
      return "-";
    }
  };

const FEEDBACK_RECIPIENT_ROLES = ["registrar", "hospital", "church", "mosque"];

const formatDateTime = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
};

const humanizeRole = (role, lang) => {
  if (!role) return "-";
  const names = {
    registrar: lang === "en" ? "Registrar" : "መመዝገቢያ",
    hospital: lang === "en" ? "Hospital" : "ሆስፒታል",
    church: lang === "en" ? "Church" : "ቤተ ክርስቲያን",
    mosque: lang === "en" ? "Mosque" : "መስጂድ",
    manager: lang === "en" ? "Manager" : "ማናጀር",
    admin: lang === "en" ? "Admin" : "አስተዳዳሪ",
  };
  return names[role] || role;
};

const getReportStatusVariant = (status) => {
  switch (status) {
    case "responded":
      return "success";
    case "acknowledged":
      return "info";
    default:
      return "warning";
  }
};

  // ... unified actions handled by handleAction(action, event)

  // Unified action handler for dropdown
  const handleAction = (action, event) => {
    switch (action) {
      case "view":
        setSelectedEvent(event);
        setModalType("view");
				setIsModalOpen(false);
				setDetailsViewActive(true);
				setEventsViewActive(false);
				setCertificateViewActive(false);
        setReportsViewActive(false);
        if (event && typeof window !== 'undefined') {
          // Debug: print the full event object to the console
          console.log('ManagerDashboard: Full event object', event);
        }
        // Mark as seen and clear highlight for this event
        try {
          const evId = event?._id || event?.id;
          if (evId) {
            const copy = new Set(Array.from(seenEventIds));
            copy.add(evId);
            setSeenEventIds(copy);
            localStorage.setItem('managerSeenEventIds', JSON.stringify(Array.from(copy)));
            setHighlightById((prev) => {
              if (!prev[evId]) return prev;
              const next = { ...prev };
              delete next[evId];
              return next;
            });
          }
        } catch {}
        break;
      case "approve":
        // Route approve to the view modal; actions live under the viewed details
        setSelectedEvent(event);
        setModalType("view");
				setIsModalOpen(false);
				setDetailsViewActive(true);
        setShowRejectForm(false);
        setReportsViewActive(false);
        break;
      case "reject":
        // Route reject to the view modal and open reject form inline
        setSelectedEvent(event);
        setModalType("view");
				setIsModalOpen(false);
				setDetailsViewActive(true);
        setShowRejectForm(true);
        setReportsViewActive(false);
        break;
      case "edit":
        setEditingEvent(event);
        setFormType(event.type);
        setShowEventForm(true);
        setDetailsViewActive(false);
        break;
      case "delete":
        setPendingDeleteEvent(event);
        setShowConfirmDeleteEvent(true);
        break;
      default:
        break;
    }
  };

  const handleApproveEvent = async () => {
    if (!selectedEvent) return;
    setProcessing(true);
    try {
      const evId = selectedEvent._id || selectedEvent.id;
      await apiFetch(`/users/manager/events/${evId}/approve`, { method: "PATCH", token: user.token });
      // show success then refresh and close modal
      showSuccess(lang === "en" ? "Event approved" : "ክስተቱ ተጸድቋል");
      await load();
      setIsModalOpen(false);
			setDetailsViewActive(false);
			setSelectedEvent(null);
    } catch (err) {
      console.error('Approve error', err);
      setError(err?.message || "Failed to approve");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectEvent = async () => {
    if (!selectedEvent) return;
    setProcessing(true);
    try {
      const evId = selectedEvent._id || selectedEvent.id;
      await apiFetch(`/users/manager/events/${evId}/reject`, {
        method: "PATCH",
        token: user.token,
        body: { rejectionReason },
      });
      // show success then refresh and close modal
      const msg = lang === "en" ? `Event rejected: ${rejectionReason}` : `ክስተቱ ተወገዷል: ${rejectionReason}`;
      showSuccess(msg);
      await load();
      setIsModalOpen(false);
			setDetailsViewActive(false);
			setSelectedEvent(null);
      setRejectionReason("");
    } catch (err) {
      console.error('Reject error', err);
      setError(err?.message || "Failed to reject");
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveCertificate = async (eventId, requestId) => {
    setProcessing(true);
    try {
      await apiFetch(`/users/manager/events/${eventId}/certificates/${requestId}/approve`, {
        method: "PATCH",
        token: user.token,
      });
      showSuccess(lang === "en" ? "Certificate request approved" : "የማረጋገጫ ጥያቄ ተቀባይነት አግኝቷል");
      load(); // Refresh the list
    } catch (err) {
      setError(err?.message || "Failed to approve certificate");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectCertificate = async (eventId, requestId, reason) => {
    setProcessing(true);
    try {
      await apiFetch(`/users/manager/events/${eventId}/certificates/${requestId}/reject`, {
        method: "PATCH",
        body: { reason },
        token: user.token,
      });
      showSuccess(lang === "en" ? "Certificate request rejected" : "የማረጋገጫ ጥያቄ ተቀባይነት አላገኘም");
      load(); // Refresh the list
    } catch (err) {
      setError(err?.message || "Failed to reject certificate");
    } finally {
      setProcessing(false);
    }
  };

  const toggleReportRecipient = (key) => {
    setReportFeedbackRecipients((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.title.trim() || !templateForm.content.trim()) {
      setError(lang === "en" ? "Title and content are required" : "ርዕስ እና ይዘት ያስፈልጋሉ");
      return;
    }
    setSendingTemplate(true);
    try {
      await apiFetch("/users/manager/templates", {
        method: "POST",
        token: user.token,
        body: templateForm,
      });
      showSuccess(lang === "en" ? "Template created successfully" : "መለጠፊያው በተሳካ ሁኔታ ተፈጥሯል");
      setTemplateForm({ title: "", type: "message", content: "", formFields: {} });
      loadTemplates();
    } catch (err) {
      setError(err?.message || (lang === "en" ? "Failed to create template" : "መለጠፊያ መፍጠር አልተቻለም"));
    } finally {
      setSendingTemplate(false);
    }
  };

  const handleSendTemplate = async (templateId) => {
    if (!templateRecipients.allRoles && 
        (!templateRecipients.roles || templateRecipients.roles.length === 0) &&
        (!templateRecipients.specificUsers || templateRecipients.specificUsers.length === 0)) {
      setError(lang === "en" ? "Please select at least one recipient" : "ቢያንስ አንድ ተቀባይ ይምረጡ");
      return;
    }
    setSendingTemplate(true);
    setError("");
    try {
      // Prepare the payload - if specific users are selected, only send to those
      const payload = {
        allRoles: templateRecipients.allRoles || false,
        roles: templateRecipients.allRoles ? [] : (templateRecipients.roles || []),
        specificUserIds: templateRecipients.allRoles ? [] : (templateRecipients.specificUsers || []),
      };
      
      await apiFetch(`/users/manager/templates/${templateId}/send`, {
        method: "POST",
        token: user.token,
        body: payload,
      });
      showSuccess(lang === "en" ? "Template sent successfully" : "መለጠፊያው በተሳካ ሁኔታ ተልኳል");
      setTemplateRecipients({ allRoles: false, roles: [], specificUsers: [] });
      // Refresh templates list
      loadTemplates();
    } catch (err) {
      console.error("Send template error:", err);
      setError(err?.message || (lang === "en" ? "Failed to send template" : "መለጠፊያ መላክ አልተቻለም"));
    } finally {
      setSendingTemplate(false);
    }
  };

  const handleReportFeedbackSubmit = async () => {
    if (!selectedReportId) return;
    const trimmed = reportFeedbackMessage.trim();
    if (!trimmed) {
      setReportFeedbackError(lang === "en" ? "Feedback message is required." : "የአስተያየት መልዕክት ያስፈልጋል።");
      return;
    }
    const recipientRoles = FEEDBACK_RECIPIENT_ROLES.filter((role) => reportFeedbackRecipients[role]);
    if (!reportFeedbackRecipients.reporter && recipientRoles.length === 0) {
      setReportFeedbackError(lang === "en" ? "Select at least one recipient group." : "ቢያንስ አንድ ተቀባይ ቡድን ይምረጡ።");
      return;
    }
    setReportFeedbackSending(true);
    setReportFeedbackError("");
    setReportFeedbackSuccess("");
    try {
      const res = await apiFetch(`/users/manager/reports/${selectedReportId}/feedback`, {
        method: "POST",
        token: user.token,
        body: {
          message: trimmed,
          recipientRoles,
          includeReporter: reportFeedbackRecipients.reporter,
        },
      });
      if (res?.report) {
        setReports((prev) =>
          prev.map((item) =>
            (item._id || item.id) === (res.report._id || res.report.id) ? res.report : item
          )
        );
      }
      setReportFeedbackMessage("");
      setReportFeedbackSuccess(lang === "en" ? "Feedback sent successfully." : "አስተያየት ተልኳል።");
    } catch (err) {
      setReportFeedbackError(
        err?.message || (lang === "en" ? "Failed to send feedback." : "አስተያየት መላክ አልተቻለም።")
      );
    } finally {
      setReportFeedbackSending(false);
    }
  };


  // Debug: print the full event object to the console for troubleshooting
  useEffect(() => {
    if (isModalOpen && selectedEvent && typeof window !== 'undefined') {
      console.log('ManagerDashboard: Full event object', selectedEvent);
    }
  }, [isModalOpen, selectedEvent]);

  const renderEventDetails = (event) => {

    const data = event.data || {};

    // Deep-flatten nested objects so every nested field is renderable as key paths (e.g., parent.child)
    const flattenObject = (obj, prefix = "") => {
      const out = {};
      if (!obj || typeof obj !== "object") return out;
      Object.entries(obj).forEach(([k, v]) => {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) && !(v.year && v.month && v.day)) {
          Object.assign(out, flattenObject(v, key));
        } else {
          out[key] = v;
        }
      });
      return out;
    };
    const flatData = flattenObject(data);

    // Use the form specification from AllFormsPage to ensure complete field coverage
    const formSpec = FORM_FIELD_CONFIG[event.type] || [];

    // Fallback aliases so labels show values even if forms used variant names
    const FIELD_ALIASES = {
      registrationRegion: ['registrationRegion'],
      registrationZone: ['registrationZone'],
		// Requester (applicant) common variants
		requesterName: ['requesterName', 'applicantName', 'applicantFullName', 'requestorName'],
		requesterFatherName: ['requesterFatherName', 'applicantFatherName'],
		requesterGrandName: ['requesterGrandName', 'applicantGrandfatherName', 'requesterGrandfatherName'],
		requesterRelation: ['requesterRelation', 'relationToDeceased', 'relationWithDeceased', 'applicantRelation'],
		requesterIdNumber: ['requesterIdNumber', 'requesterId', 'requesterNationalId', 'applicantIdNumber'],
		requesterResidence: ['requesterResidence', 'requesterAddress', 'applicantResidence'],
		requesterPhone: ['requesterPhone', 'requesterMobile', 'requesterPhoneNumber', 'applicantPhone'],
      // Birth
      kebele: ['kebele'],
      // Marriage specific place keys occasionally vary
      marriageKebele: ['marriageKebele', 'marriageKebeleAm'],
    };
    
    // Extract field names and labels from form specification
    const canonicalOrder = formSpec
      .map((f) => (typeof f === 'string' ? f : f?.name))
      .filter(Boolean);
    
    const nameToLabel = new Map();
    formSpec.forEach((f) => {
      if (f && typeof f === 'object' && f.name) {
        nameToLabel.set(f.name, { labelEn: f.labelEn, labelAm: f.labelAm });
      }
    });
    
    // Get all actual data keys from the event
    const actualDataKeys = Object.keys(flatData || {});
    
    // Filter actual data keys to only include those relevant to the current event type
    const eventTypeRelevantKeys = actualDataKeys.filter(key => {
      // Always include registration-related fields and common fields
      if (key.startsWith('registration') || key === 'submittedBy' || 
          key.includes('region') || key.includes('zone') || key.includes('woreda') ||
          key.includes('kebele') || key.includes('city') || key.includes('place') ||
          key.includes('date') || key.includes('time') || key.includes('photo') ||
          key.includes('consent') || key.includes('id') || key.includes('form') ||
          key.includes('document') || key.includes('file') || key.includes('upload') || key.includes('registrar')) {
        return true;
      }
      
      // Include fields that are specific to the current event type
      const eventType = event.type;
      if (eventType === 'birth') {
        return key.includes('child') || key.includes('mother') || key.includes('father') || 
               key.includes('birth') || key.includes('midwife') || key.includes('weight') ||
               key.includes('sex') || key.includes('nationality') || key.includes('age');
      } else if (eventType === 'marriage') {
        return key.includes('husband') || key.includes('wife') || key.includes('marriage') ||
               key.includes('wedding') || key.includes('spouse') || key.includes('bride') ||
               key.includes('groom') || key.includes('religion') || key.includes('ethnicity');
      } else if (eventType === 'death') {
        return key.includes('deceased') || key.includes('death') || key.includes('cause');
      } else if (eventType === 'divorce') {
        return key.includes('divorce') || key.includes('separation') || key.includes('spouse');
      }
      
      // For unknown event types, include all fields
      return true;
    });
    
    // Merge form specification fields with event-type-relevant actual data keys
    // Priority: 1) Fields in form spec order, 2) Additional relevant fields from actual data
    const mergedKeys = Array.from(
      new Set([...canonicalOrder, ...eventTypeRelevantKeys])
    ).filter((k) => k !== 'registrationId' && k !== 'submittedBy');

    // Alias map: maps canonical keys to alternative keys commonly used by forms
    const ALIASES = {
      // Registrar info common
      registrationNumber: ['registrationId', 'mainRegistrationRecordNumberAm', 'የመመዝገቢያ ቁጥር', 'registrationNumberAm'],
      registrationTimeHourAm: ['registrationTimeHour', 'registrationTime', 'timeOfRegistration'],
      registrarBureauIdNumber: ['registrarBureauId', 'registrarBureauIdNo', 'registrarBureauIDNumber'],

      // Registration place (merged to include all variants)
      registrationRegion: ['region', 'birthRegion', 'marriageRegion', 'deathRegion'],
      registrationZone: ['zone', 'birthZone', 'marriageZone', 'deathZone'],
      registrationCity: ['city', 'birthCity', 'marriageCity', 'deathCity', 'birthPlaceCity', 'registrationCityAm'],
      registrationSubCity: ['subCity', 'birthSubCity', 'marriageSubCity', 'deathSubCity', 'birthPlaceSubCity', 'registrationSubCityAm'],
      registrationWoreda: ['woreda', 'birthWoreda', 'marriageWoreda', 'deathWoreda', 'birthPlaceWoreda', 'registrationWoredaAm'],
      registrationKebele: ['kebele', 'birthKebele', 'marriageKebele', 'deathKebele', 'birthPlaceKebele', 'marriageKebeleAm', 'deathKebeleAm', 'registrationKebeleAm'],

      // Dates
      registrationDateEth: ['registrarDate', 'dateOfEvent', 'birthDate', 'marriageDate', 'deathDate'],

      // Birth event aliases
      informationNumberOfBirth: ['birthInfoNumberAm', 'informationNoOfBirth', 'birthInformationNumber'],
      helpDoneDuringBirth: ['birthHelpAm', 'helpDuringBirth'],
      typeOfBirth: ['birthType'],
      professionLevelOfTheMidwife: ['midwifeLevel', 'midwifeProfessionLevel'],
      weightOfChild: ['childWeightAm', 'childWeight'],
      childNameEn: ['childFullNameEn', 'childName'],
      childNameAm: ['childFullNameAm', 'childName'],
      motherNameEn: ['motherFullName', 'motherName'],
      motherNameAm: ['motherFullName', 'motherName'],
      motherFatherName: ['motherFatherEn', 'motherFatherAm'],
      motherGrandfatherName: ['motherGrandfatherEn', 'motherGrandfatherAm'],
      motherBirthDate: ['motherBirthDateAm'],
      motherNationality: ['motherNationalityAm'],
      motherIdOrPassport: ['motherIdNumber', 'motherNationalIdNumber', 'motherNationalId'],
      motherResidence: ['motherResidenceAm', 'Place of Residence (mother)'],
      motherBirthPlace: ['motherBirthPlaceAm', 'placeOfBirthMother'],
      motherEducationLevelAm: ['motherEducation', 'motherEducationalStatus'],
      motherOccupationAm: ['motherJobAm', 'motherJob', 'jobMother'],
      motherEthnicityAm: ['motherEthnicity'],
      fatherNameEn: ['fatherFullName', 'fatherName'],
      fatherNameAm: ['fatherFullName', 'fatherName'],
      fatherFatherName: ['fatherFatherEn', 'fatherFatherAm'],
      fatherGrandfatherName: ['fatherGrandfatherEn', 'fatherGrandfatherAm'],
      fatherBirthDate: ['fatherBirthDateAm'],
      fatherNationality: ['fatherNationalityAm'],
      fatherIdOrPassportAm: ['fatherNationalIdNumber', 'fatherNationalId', 'National Id. Number (father)'],
      fatherResidence: ['fatherResidenceAm', 'መኖሪያ ቦታ (father)'],
      fatherBirthPlace: ['fatherBirthPlaceAm', 'placeOfBirthFather'],
      fatherEducationLevelAm: ['fatherEducation', 'fatherEducationalStatus'],
      fatherOccupationAm: ['fatherJobAm', 'fatherJob', 'jobFather'],
      fatherEthnicity: ['fatherEthnicityAm'],

      // Marriage event aliases
      wifeNameEn: ['wifeName'],
      wifeNameAm: ['wifeName'],
      wifeFatherEn: ['wifeFather'],
      wifeFatherAm: ['wifeFather'],
      wifeGrandfatherEn: ['wifeGrandfather'],
      wifeGrandfatherAm: ['wifeGrandfather'],
      wifeNationality: ['wifeNationalityAm'],
      husbandNameEn: ['husbandName'],
      husbandNameAm: ['husbandName'],
      husbandFatherEn: ['husbandFather'],
      husbandFatherAm: ['husbandFather'],
      husbandGrandfatherEn: ['husbandGrandfather'],
      husbandGrandfatherAm: ['husbandGrandfather'],
      husbandNationality: ['husbandNationalityAm'],

      // Death event aliases
      deceasedNameEn: ['deceasedName'],
      deceasedNameAm: ['deceasedName'],
      deceasedFatherEn: ['deceasedFather'],
      deceasedFatherAm: ['deceasedFather'],
      deceasedGrandfatherEn: ['deceasedGrandfather'],
      deceasedGrandfatherAm: ['deceasedGrandfather'],
      deceasedNationality: ['deceasedNationalityAm'],
      causeOfDeath: ['causeOfDeath1Am', 'causeOfDeath2Am', 'causeOfDeath3Am'],
		// Requester (applicant) aliases
		requesterName: ['applicantName', 'requestorName'],
		requesterFatherName: ['applicantFatherName'],
		requesterGrandName: ['applicantGrandfatherName', 'requesterGrandfatherName'],
		requesterRelation: ['relationToDeceased', 'relationWithDeceased', 'applicantRelation'],
		requesterIdNumber: ['requesterId', 'requesterNationalId', 'applicantIdNumber'],
		requesterResidence: ['requesterAddress', 'applicantResidence'],
		requesterPhone: ['requesterMobile', 'requesterPhoneNumber', 'applicantPhone'],

      // Divorce event aliases
      divorceHusbandNameEn: ['divorceHusbandName'],
      divorceHusbandNameAm: ['divorceHusbandName'],
      divorceWifeNameEn: ['divorceWifeName'],
      divorceWifeNameAm: ['divorceWifeName'],
    };

    // Build alias -> canonical lookup for de-duplication
    const aliasToCanonical = new Map();
    Object.entries(ALIASES).forEach(([canonical, alts]) => {
      (alts || []).forEach((a) => aliasToCanonical.set(a, canonical));
    });

    // Drop alias keys when their canonical counterpart is present to avoid duplicates
    const dedupedKeys = mergedKeys.filter((k) => {
      const canonical = aliasToCanonical.get(k);
      if (!canonical) return true;
      return !mergedKeys.includes(canonical);
    });

    // Define helper functions before using them
    const trySuffixAlternates = (k) => {
      // If key ends with En/Am, try base or the other suffix
      const m = k.match(/^(.*?)(En|Am)$/);
      if (!m) return [];
      const base = m[1];
      const suff = m[2];
      return [base, `${base}${suff === 'En' ? 'Am' : 'En'}`];
    };

    const getValueForKey = (obj, k) => {
      const direct = (obj && (obj[k] ?? flatData[k]));
      if (direct !== undefined && direct !== null && direct !== '' && direct !== 'null' && direct !== 'undefined') return direct;
      // Alias list
      const alts = [
        ...(ALIASES[k] || []),
        ...trySuffixAlternates(k),
      ];
      for (const alt of alts) {
        const v = (obj && (obj[alt] ?? flatData[alt]));
        if (v !== undefined && v !== null && v !== '' && v !== 'null' && v !== 'undefined') return v;
      }
      return direct; // could be undefined
    };

    // Filter out fields that have no meaningful data
    const fieldsWithData = dedupedKeys.filter(key => {
      const value = key === 'registrationId' ? event.registrationId : getValueForKey(data, key);
      
      // Always show registrationId
      if (key === 'registrationId') return true;
      
      // More aggressive filtering for empty/null values
      if (value === null || value === undefined || value === '') return false;
      
      // Filter out string values that are empty or contain only whitespace
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined' || trimmed === '""' || trimmed === "''") {
          return false;
        }
      }
      
      // Filter out empty arrays
      if (Array.isArray(value) && value.length === 0) return false;
      
      // Filter out empty objects (except Ethiopian dates)
      if (typeof value === 'object' && value !== null && !(value.year && value.month && value.day)) {
        // Check if object has any non-empty values
        const hasContent = Object.values(value).some(v => {
          if (v === null || v === undefined || v === '') return false;
          if (typeof v === 'string' && v.trim() === '') return false;
          return true;
        });
        return hasContent;
      }
      
      // Filter out specific empty patterns and common empty field names
      if (typeof value === 'string' && (
        value === 'null' || 
        value === 'undefined' || 
        value === '""' || 
        value === "''" ||
        value.trim() === '' ||
        value === '0' && (key.includes('Age') || key.includes('Weight') || key.includes('Number'))
      )) {
        return false;
      }
      
      // Filter out fields that are commonly empty in the data
      const commonlyEmptyFields = [
        'registrationTimeHourAm', 'birthPlaceSubCity', 'childGrandfatherName',
        'birthPlaceType', 'birthInfoNumberAm', 'birthType', 'birthHelpAm',
        'childWeightAm', 'midwifeLevel', 'signedConsentPhoto', 'motherFatherName',
        'motherGrandfatherName', 'motherNationality', 'motherResidence',
        'motherEthnicityAm', 'motherEducationLevelAm', 'motherOccupationAm',
        'fatherFatherName', 'fatherGrandfatherName', 'fatherNationality',
        'fatherIdOrPassportAm', 'fatherResidence', 'fatherEthnicity',
        'fatherEducationLevelAm', 'fatherOccupationAm', 'guardianFullName',
        'guardianOccupationEn', 'guardianWorkAddressAm', 'guardianHouseNoAm',
        'guardianMobileAm', 'registrarNameAm', 'registrarFatherNameAm',
        'registrarGrandNameAm', 'registrarDateAm', 'childFullNameAm',
        'childFullNameEn', 'grandfatherNameEn', 'grandfatherNameAm',
        'birthTime', 'placeOfBirthEn', 'placeOfBirthAm', 'birthPlaceWoreda',
        'birthPlaceKebele', 'uploadedform', 'motherFullNameAm', 'motherFullNameEn',
        'motherSex', 'motherEducationLevel', 'motherOccupation', 'fatherFullNameAm',
        'fatherFullNameEn', 'fatherSex', 'fatherIdOrPassport', 'fatherEducationLevel',
        'fatherOccupation', 'registrationCity', 'registrationSubCity', 'birthPlaceCity'
      ];
      
      if (commonlyEmptyFields.includes(key) && (value === null || value === undefined || value === '')) {
        return false;
      }
      
      // Special handling for important fields that should be shown even if empty
      const importantFields = [
        'childNameEn', 'childNameAm', 'fatherNameEn', 'fatherNameAm', 'motherNameEn', 'motherNameAm',
        'sex', 'nationality', 'age', 'registrationId', 'registrationNumber', 'registrationRegion',
        'registrationZone', 'registrationWoreda', 'registrationKebele', 'region', 'zone', 'woreda', 'kebele'
      ];
      
      // Always show important fields if they have any value (even if it's an empty string for some)
      if (importantFields.includes(key)) {
        return true;
      }
      
      return true;
    });

    const allKeys = ["registrationId", ...fieldsWithData.filter(k => k !== 'registrationId')];
    
    // Build section groups. If no explicit sections are defined in formSpec (e.g., birth forms),
    // create a single default group that follows the form spec order exactly.
    const groups = [];
    const hasSections = formSpec.some((item) => item && typeof item === 'object' && item.section);
    if (hasSections) {
      let current = null;
      formSpec.forEach((item) => {
        if (item && typeof item === 'object' && item.section) {
          if (current && current.keys.length > 0) groups.push(current);
          current = { titleEn: item.section, titleAm: item.sectionAm || '', keys: [] };
        } else if (item && typeof item === 'object' && item.name) {
          if (!current) return;
          // Push every field from the spec in exact order; show '-' when empty
          current.keys.push(item.name);
        }
      });
      if (current && current.keys.length > 0) groups.push(current);
    } else {
      // No sections: make a single group with exact form order (strict)
      const defaultKeys = canonicalOrder.slice();
      const defaultGroup = {
        titleEn: 'Event Details',
        titleAm: 'የክስተቱ ዝርዝሮች',
        keys: defaultKeys,
      };
      groups.push(defaultGroup);
    }
    
    // Fallback: if no groups were created, create a default one with all keys
    if (groups.length === 0 && allKeys.length > 0) {
      groups.push({
        titleEn: 'Event Details',
        titleAm: 'የክስተቱ ዝርዝሮች',
        keys: allKeys
      });
    }
    
    // Debug: Log what fields are being displayed
    console.log('ManagerDashboard: Event type:', event.type);
    console.log('ManagerDashboard: Available data keys:', Object.keys(data));
    console.log('ManagerDashboard: Form spec fields:', canonicalOrder);
    console.log('ManagerDashboard: Event-type relevant keys:', eventTypeRelevantKeys);
    console.log('ManagerDashboard: All fields to display:', allKeys);
    console.log('ManagerDashboard: Section groups:', groups.map(g => ({ title: g.titleEn, keyCount: g.keys.length })));
    
    // After sectioning, count non-empty fields for debug
    const nonEmptyCount = allKeys.reduce((acc, key) => {
      const val = key === 'registrationId' ? event.registrationId : getValueForKey(data, key);
      return acc + (val !== null && val !== undefined && val !== "" ? 1 : 0);
    }, 0);
    console.log('ManagerDashboard: Visible entries:', nonEmptyCount, 'non-empty fields out of', allKeys.length, 'total fields');

    const isImageString = (val) => typeof val === "string" && val.match(/\.(png|jpg|jpeg|webp)(\?|$)/i);
    const isFileString = (val) => typeof val === "string" && val.match(/\.(pdf|docx?|xlsx?|txt)(\?|$)/i);

    const extractStringFromValue = (val) => {
      // Accept strings, arrays of strings, or objects with common path/url keys
      if (val == null) return null;
      if (typeof val === "string") return val;
      if (Array.isArray(val)) {
        // prefer first non-empty string
        const s = val.find((x) => typeof x === "string" && x.trim() !== "");
        return s || null;
      }
      if (typeof val === "object") {
        for (const k of ["url", "path", "filename", "file", "src"]) {
          if (val[k] && typeof val[k] === "string") return val[k];
        }
      }
      return null;
    };

    const getFileUrl = (val) => {
      const s = extractStringFromValue(val);
      if (!s) return "";
      if (s.startsWith("http")) return s;
      // If server stored just the filename (e.g. "childPhoto-12345.jpg"), serve from /uploads
      if (!s.startsWith("/")) return `${uploadsBaseUrl()}/${s}`;
      // If it is an absolute path like "/uploads/xxx.jpg", prefix with backend base
      if (s.startsWith("/uploads/")) return `${uploadsBaseUrl()}${s.replace(/^\/uploads\//, '/')}`;
      return s;
    };

    const renderValue = (key, value) => {
      // Debug: Log all values for troubleshooting
      console.log(`ManagerDashboard: Field ${key} has value:`, value, 'Type:', typeof value, 'IsArray:', Array.isArray(value));

      // Handle null/undefined/empty values
      if (value === null || value === undefined || value === "" || 
          (typeof value === "string" && /^(null|undefined)$/i.test(value.trim())) ||
          (typeof value === "string" && value.trim() === "")) {
        // Special handling for image/file fields: show placeholder image or dash
        if (/photo|image|file|consent|idcard|form/i.test(key)) {
          return <span className="text-gray-400 italic">No file uploaded</span>;
        }
        return <span className="text-gray-400">-</span>;
      }

      // Handle Ethiopian date objects (year, month, day structure)
      if (typeof value === "object" && value !== null && value.year && value.month && value.day) {
        return <span className="font-mono text-sm">{formatEthiopianDisplay(value)}</span>;
      }

      // Handle date-like keys (strings that look like dates)
      if (/date/i.test(key) && typeof value === "string") {
        return <span className="font-mono text-sm">{formatEthiopianDisplay(value)}</span>;
      }

      // Handle numbers (including auto-calculated values like age)
      if (typeof value === "number") {
        return <span className="font-mono text-sm bg-blue-50 px-2 py-1 rounded">{value}</span>;
      }

      // Handle boolean values
      if (typeof value === "boolean") {
        return <span className={`px-2 py-1 rounded text-sm ${value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {value ? (lang === "en" ? "Yes" : "አዎ") : (lang === "en" ? "No" : "አይ")}
        </span>;
      }

      // Files / images: support arrays of files or single file
      if (Array.isArray(value) && value.length > 0) {
        return (
          <div className="flex flex-wrap gap-2">
            {value.map((v, idx) => {
              const s = extractStringFromValue(v);
              if (!s) return null;
              const url = getFileUrl(s);
              if (isImageString(s)) {
                return (
                  <img
                    key={idx}
                    src={url}
                    alt={`${formatLabel(key)} ${idx}`}
                    style={{ width: 160, height: 160, objectFit: 'contain', background: '#fff', border: '1px solid #eee', borderRadius: 8, display: 'block', cursor: 'pointer' }}
                    onError={e => { e.currentTarget.onerror = null; e.currentTarget.replaceWith(document.createElement('span')); }}
                    onClick={() => window.open(url, '_blank')}
                    title={lang === "en" ? "Click to view full size" : "ሙሉ መጠን ለማየት ይጫኑ"}
                  />
                );
              }
              return <a key={idx} href={url} target="_blank" rel="noreferrer" className="text-blue-600 underline hover:text-blue-800">{lang === "en" ? "Download file" : "ፋይል ይውሰዱ"}</a>;
            })}
          </div>
        );
      }

      const fileStr = extractStringFromValue(value);
      if (fileStr) {
        if (isImageString(fileStr)) {
          return (
            <img
              src={getFileUrl(fileStr)}
              alt={formatLabel(key)}
              style={{ width: 160, height: 160, objectFit: 'contain', background: '#fff', border: '1px solid #eee', borderRadius: 8, display: 'block', marginTop: 4, cursor: 'pointer' }}
              onError={e => { e.currentTarget.onerror = null; e.currentTarget.replaceWith(document.createElement('span')); }}
              onClick={() => window.open(getFileUrl(fileStr), '_blank')}
              title={lang === "en" ? "Click to view full size" : "ሙሉ መጠን ለማየት ይጫኑ"}
            />
          );
        }
        if (isFileString(fileStr)) {
          return <a href={getFileUrl(fileStr)} target="_blank" rel="noreferrer" className="text-blue-600 underline hover:text-blue-800">{lang === "en" ? "Download file" : "ፋይል ይውሰዱ"}</a>;
        }
      }

      // Handle dropdown/selection values with better formatting
      if (typeof value === "string") {
        // Check if it's a dropdown value that should be highlighted
        const isDropdownValue = /sex|religion|marital|education|occupation|ethnicity|nationality|title/i.test(key);
        if (isDropdownValue) {
          return <span className="bg-yellow-50 px-2 py-1 rounded text-sm border border-yellow-200">{value}</span>;
        }
        
        // Check if it's a numeric string (like ID numbers, phone numbers)
        if (/^[0-9\s\-\.]+$/.test(value) && (key.includes('Id') || key.includes('Number') || key.includes('Phone') || key.includes('Mobile'))) {
          return <span className="font-mono text-sm bg-gray-50 px-2 py-1 rounded">{value}</span>;
        }
        
        // Regular text
        return <span className="text-gray-800">{value}</span>;
      }

      // Handle objects (like complex data structures)
      if (typeof value === "object" && value !== null) {
        try {
          // Try to display object as JSON for debugging
          return <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-w-md">{JSON.stringify(value, null, 2)}</pre>;
        } catch {
          return <span className="text-gray-500 italic">[Complex Data]</span>;
        }
      }

      // Fallback to string representation
      try {
        return <span className="text-gray-800">{String(value)}</span>;
      } catch {
        return <span className="text-gray-400">-</span>;
      }
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>{lang === "en" ? "Event Type:" : "የክስተቱ አይነት:"}</strong>
            <span className="ml-2 capitalize">{event.type}</span>
            <div>
              <strong>{lang === "en" ? "Date:" : "ቀን:"}</strong>
              <span className="ml-2">{getEventDisplayDate(event)}</span>
            </div>
          </div>
          <div>
            <strong>{lang === "en" ? "Submitted By:" : "የተላከ በ:"}</strong>
            <span className="ml-2">{getSubmittedByLabel(event.submittedBy, event.registrarId)}</span>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">{lang === "en" ? "Event Details:" : "የክስተቱ ዝርዝሮች:"}</h4>
          {groups.map((g, gi) => (
            <div key={gi} className="mb-6">
              <div className="text-sm font-semibold text-blue-700 mb-2">
                {lang === 'en' ? g.titleEn : (g.titleAm || g.titleEn)}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {g.keys.map((key) => {
                  let value;
                  if (key === 'registrationId') {
                    value = event.registrationId;
                  } else {
                    const aliases = (FIELD_ALIASES[key] && Array.isArray(FIELD_ALIASES[key])) ? FIELD_ALIASES[key] : [key];
                    for (const k of aliases) {
                      const v = getValueForKey(data, k);
                      if (v !== undefined && v !== null && v !== '') { value = v; break; }
                    }
                    if (value === undefined) value = getValueForKey(data, key);
                  }
              const fromSpec = nameToLabel.get(key) || {};
              const meta = LABELS[key] || {};
              const preferAm = /Am$/.test(key);
              const preferEn = /En$/.test(key);
              let displayLabel;
              if (preferAm) {
                displayLabel = fromSpec.labelAm || fromSpec.labelEn || meta.labelAm || meta.labelEn || formatLabel(key);
              } else if (preferEn) {
                displayLabel = fromSpec.labelEn || meta.labelEn || fromSpec.labelAm || meta.labelAm || formatLabel(key);
              } else {
                displayLabel = (lang === 'en')
                  ? (fromSpec.labelEn || meta.labelEn || formatLabel(key))
                  : (fromSpec.labelAm || fromSpec.labelEn || meta.labelAm || meta.labelEn || formatLabel(key));
              }
               return (
                     <div key={key}>
                       <div><strong>{displayLabel}:</strong></div>
                       <div className="mt-1">{renderValue(key, value)}</div>
                     </div>
               );
                })}
              </div>
            </div>
          ))}
        </div>

        {event.requestedCertificates && event.requestedCertificates.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">{lang === "en" ? "Certificate Requests:" : "የሰነድ ጥያቄዎች:"}</h4>
            <div className="space-y-2">
              {event.requestedCertificates.map((cert, idx) => (
                <div key={idx} className="border p-3 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <Badge variant={getStatusVariant(cert.status)}>{cert.status}</Badge>
                      <span className="ml-2 text-sm">{lang === "en" ? "Requested:" : "የተጠየቀ:"} {new Date(cert.requestedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {cert.rejectionReason && <div className="mt-2 text-sm text-red-600"><strong>{lang === "en" ? "Rejection Reason:" : "የመሰወሪያ ምክንያት:"}</strong> {cert.rejectionReason}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const filteredEvents = useMemo(() => {
    let list = events;
    if (!viewAll) {
      list = list.filter((e) => (filter === "all" ? true : e.status === filter));
    }
    if (eventTypeFilter !== "all") {
      list = list.filter((e) => e.type === eventTypeFilter);
    }
    if (searchActive) {
      if (searchResults.length === 0) {
        list = [];
      } else {
        const ids = new Set(searchResults);
        list = list.filter((e) => ids.has(e._id || e.id));
      }
    }
    return list;
  }, [events, viewAll, filter, eventTypeFilter, searchActive, searchResults]);
  
  // Pagination for events
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, viewAll, eventTypeFilter, searchActive, searchResults]);
  const selectedReport = useMemo(
    () => reports.find((r) => (r._id || r.id) === selectedReportId) || null,
    [reports, selectedReportId]
  );
  const overviewActive = !eventsViewActive && !certificateViewActive && !reportsViewActive && !detailsViewActive && !agentsViewActive && !correctionsViewActive;

  // Load agents
  const loadAgents = useCallback(async () => {
    if (!user || !user.token) return;
    setAgentsLoading(true);
    try {
      const res = await apiFetch("/users/manager/agents", { token: user.token });
      setAgents(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Failed to load agents:", err);
      setAgents([]);
      setError(err?.message || "Failed to load agents");
    } finally {
      setAgentsLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    if (user?.token && agentsViewActive) {
      loadAgents();
    }
  }, [user?.token, agentsViewActive, loadAgents]);

  // Create agent
  const handleCreateAgent = async (e) => {
    e.preventDefault();
    setCreatingAgent(true);
    setError("");
    try {
      const created = await apiFetch("/users/manager/agents", {
        method: "POST",
        token: user.token,
        body: newAgent,
      });
      showSuccess(lang === "en" ? "Agent created successfully" : "ወኪል በተሳካ ሁኔታ ተፈጥሯል");
      setNewAgent({ name: "", email: "", password: "", role: "registrar" });
      setShowCreateAgentForm(false);
      await loadAgents();
    } catch (err) {
      setError(err?.message || (lang === "en" ? "Failed to create agent" : "ወኪል መፍጠር አልተቻለም"));
    } finally {
      setCreatingAgent(false);
    }
  };

  // Delete agent
  const handleDeleteAgent = (agentId) => {
    setPendingDelete(agentId);
    setShowConfirmDelete(true);
  };

  const confirmDeleteAgent = async () => {
    if (!pendingDelete) return;
    try {
      await apiFetch(`/users/manager/agents/${pendingDelete}`, {
        method: "DELETE",
        token: user.token,
      });
      showSuccess(lang === "en" ? "Agent deleted successfully" : "ወኪል በተሳካ ሁኔታ ተሰርዟል");
      await loadAgents();
    } catch (err) {
      setError(err?.message || (lang === "en" ? "Failed to delete agent" : "ወኪል ማስወገድ አልተቻለም"));
    } finally {
      setPendingDelete(null);
      setShowConfirmDelete(false);
    }
  };

  // Change agent role
  const handleChangeAgentRole = async (agentId, newRole) => {
    try {
      await apiFetch(`/users/manager/agents/${agentId}/role`, {
        method: "PATCH",
        token: user.token,
        body: { role: newRole },
      });
      showSuccess(lang === "en" ? "Agent role updated successfully" : "የወኪል ሚና በተሳካ ሁኔታ ተዘምኗል");
      await loadAgents();
    } catch (err) {
      setError(err?.message || (lang === "en" ? "Failed to update agent role" : "የወኪል ሚና ማዘምን አልተቻለም"));
    }
  };

  // Handle event form submit (for editing)
  const handleEventFormSubmit = async (payload) => {
    try {
      if (editingEvent) {
        await apiFetch(`/users/manager/events/${editingEvent._id || editingEvent.id}`, {
          method: 'PUT',
          token: user.token,
          ...(payload.isForm ? { body: payload.body, isForm: true } : { body: payload.body }),
        });
        setEditingEvent(null);
        setShowEventForm(false);
        showSuccess(lang === "en" ? "Event updated successfully" : "ክስተቱ በተሳካ ሁኔታ ተዘምኗል");
        await load();
        if (correctionsViewActive) {
          await loadCorrections();
        }
      }
    } catch (err) {
      setError(err?.message || (lang === "en" ? "Failed to update event" : "ክስተቱን ማዘምን አልተቻለም"));
    }
  };

  // Handle delete event
  const confirmDeleteEvent = async () => {
    if (!pendingDeleteEvent) return;
    try {
      await apiFetch(`/users/manager/events/${pendingDeleteEvent._id || pendingDeleteEvent.id}`, {
        method: "DELETE",
        token: user.token,
      });
      showSuccess(lang === "en" ? "Event deleted successfully" : "ክስተቱ በተሳካ ሁኔታ ተሰርዟል");
      await load();
      if (correctionsViewActive) {
        await loadCorrections();
      }
    } catch (err) {
      setError(err?.message || (lang === "en" ? "Failed to delete event" : "ክስተቱን ማስወገድ አልተቻለም"));
    } finally {
      setPendingDeleteEvent(null);
      setShowConfirmDeleteEvent(false);
    }
  };

  // Handle delete certificate
  const handleDeleteCertificate = async (eventId, requestId) => {
    const confirmMessage = lang === 'en' 
      ? 'Are you sure you want to delete this certificate request? This action cannot be undone.'
      : 'ይህንን የማረጋገጫ ጥያቄ ማጥፋት እርግጠኛ ነዎት? ይህ እርምጃ ሊመለስ አይችልም።';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await apiFetch(`/users/manager/events/${eventId}/certificates/${requestId}`, {
        method: "DELETE",
        token: user.token,
      });
      showSuccess(lang === "en" ? "Certificate deleted successfully" : "ማረጋገጫው በተሳካ ሁኔታ ተሰርዟል");
      await loadCertificateRequests();
    } catch (err) {
      setError(err?.message || (lang === "en" ? "Failed to delete certificate" : "ማረጋገጫውን ማስወገድ አልተቻለም"));
    }
  };

  const handleStatusFilterChange = (status) => {
    if (status === "all") {
      setViewAll(true);
      setFilter("all");
    } else {
      setViewAll(false);
      setFilter(status);
    }
  };

  const handleEventSearch = (e) => {
    e.preventDefault();
    const term = searchInput.trim();
    if (!term) {
      setSearchActive(false);
      setSearchResults([]);
      setSearchMessage(lang === "en" ? "Enter a full name or ID number to search." : "ስም ወይም የመታወቂያ ቁጥር አስገብተው ይፈልጉ።");
      return;
    }
    const normalized = term.toLowerCase();
    setSearching(true);
    const matches = events
      .filter((event) => eventMatchesSearchTerm(event, normalized))
      .map((event) => event._id || event.id);
    setSearchActive(true);
    setSearchResults(matches);
    setSearchMessage(
      matches.length > 0
        ? lang === "en"
          ? `${matches.length} event(s) found.`
          : `${matches.length} ክስተቶች ተገኝተዋል።`
        : lang === "en"
        ? `No events found for "${term}".`
        : `ምንም ክስተት አልተገኘም ለ "${term}".`
    );
    setSearching(false);
  };

  const handleResetSearch = () => {
    setSearchInput("");
    setSearchResults([]);
    setSearchActive(false);
    setSearchMessage("");
    setSearching(false);
  };

  const handleCorrectionAction = async (eventId, correctionId, action) => {
    let responseMessage = "";
    if (action === "reject") {
      responseMessage = prompt(
        lang === "en" ? "Reason for rejection:" : "የመሰወሪያ ምክንያት:"
      );
      if (!responseMessage || !responseMessage.trim()) {
        return;
      }
    }
    setCorrectionUpdating(true);
    try {
      await apiFetch(`/users/manager/events/${eventId}/corrections/${correctionId}`, {
        method: "PATCH",
        token: user.token,
        body: { action, response: responseMessage },
      });
      showSuccess(
        action === "approve"
          ? (lang === "en" ? "Correction approved" : "ማስተካከያው ተፈቅዷል")
          : (lang === "en" ? "Correction rejected" : "ማስተካከያው ተቀባይነት አልተሰጠውም")
      );
      await loadCorrections();
    } catch (err) {
      setError(err?.message || (lang === "en" ? "Failed to update correction" : "ማስተካከያውን ማዘመን አልተቻለም"));
    } finally {
      setCorrectionUpdating(false);
    }
  };

  const handleOpenCorrectionEdit = (item) => {
    const eventPayload = item?.event || {
      _id: item.eventId,
      type: item.eventType,
      data: item.eventData,
      registrationId: item.registrationId,
      status: item.eventStatus,
    };
    setEditingEvent(eventPayload);
    setFormType(eventPayload.type);
    setShowEventForm(true);
  };

  if (!user || !user.token) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Please log in to access the Manager Dashboard.</h2>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full" style={{ marginLeft: 0, paddingLeft: 0 }}>
      <div className="flex-shrink-0 h-screen sticky top-0" style={{ width: "20rem" }}>
        <ProfileSidebar user={user} setUser={setUser} />
      </div>
      <div className="flex-grow w-full">
        <div className="p-4 space-y-6">
          
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">{lang === "en" ? "Manager Dashboard" : "የማነጂ ዳሽቦርድ"}</h1>
            <Button onClick={toggleLang} className="bg-blue-600 text-white">{lang === "en" ? "አማርኛ" : "English"}</Button>
          </div>

          {notification.visible && (notification.newCount > 0 || notification.resubmittedCount > 0) && (
            <div className="p-3 rounded border bg-yellow-50 border-yellow-200 text-yellow-900 flex justify-between items-center">
              <div className="text-sm">
                {notification.newCount > 0 && (
                  <span className="mr-4">{lang === 'en' ? `New events: ${notification.newCount}` : `አዲስ ክስተቶች: ${notification.newCount}`}</span>
                )}
                {notification.resubmittedCount > 0 && (
                  <span>{lang === 'en' ? `Resubmitted: ${notification.resubmittedCount}` : `እንደገና የቀረቡ: ${notification.resubmittedCount}`}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button className="bg-yellow-600 text-white" onClick={() => setNotification({ newCount: 0, resubmittedCount: 0, visible: false })}>
                  {lang === 'en' ? 'Dismiss' : 'ዝጋ'}
                </Button>
                <Button className="bg-blue-600 text-white" onClick={() => { setFilter('pending'); setViewAll(false); }}>
                  {lang === 'en' ? 'Show Pending' : 'በግምገማ ላይ አሳይ'}
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-100 text-red-700 p-2 rounded">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="bg-green-100 text-green-800 p-2 rounded">
              {successMessage}
            </div>
          )}

          {certificateViewActive ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{lang === "en" ? "Certificate Management" : "የማረጋገጫ አያያዝ"}</CardTitle>
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                    title={lang === 'en' ? 'Close' : 'ዝጋ'}
                    onClick={() => { try { window.location.hash = ''; } catch {} }}
                  >
                    ✕
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {certificateLoading ? (
                  <div className="text-center py-8">{lang === "en" ? "Loading certificate requests..." : "የማረጋገጫ ጥያቄዎች በመጫን ላይ..."}</div>
                ) : certificateRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">{lang === "en" ? "No certificate requests found." : "ምንም የማረጋገጫ ጥያቄ አልተገኘም።"}</div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {(() => {
                        const totalPages = Math.ceil(certificateRequests.length / itemsPerPage);
                        const startIndex = (certificateCurrentPage - 1) * itemsPerPage;
                        const endIndex = startIndex + itemsPerPage;
                        const paginatedCertificateRequests = certificateRequests.slice(startIndex, endIndex);
                        return paginatedCertificateRequests.map((request, idx) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={getStatusVariant(request.status)}>{request.status}</Badge>
                              <span className="text-sm text-gray-600">
                                {lang === "en" ? "Event Type:" : "የክስተት አይነት:"} {request.eventType}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {lang === "en" ? "Registration ID:" : "የመመዝገቢያ መለያ:"} {request.registrationId}
                            </div>
                            <div className="text-sm text-gray-600">
                              {lang === "en" ? "Requested:" : "የተጠየቀ:"} {new Date(request.requestedAt).toLocaleDateString()}
                            </div>
                          </div>
                            <div className="flex gap-2">
                            {request.status === 'pending' && (
                              <>
                              <Button
                                onClick={() => handleApproveCertificate(request.eventId, request._id)}
                                disabled={processing}
                                className="bg-green-600 text-white hover:bg-green-700"
                              >
                                {lang === "en" ? "Approve" : "ፈቅድ"}
                              </Button>
                              <Button
                                onClick={() => {
                                  const reason = prompt(lang === "en" ? "Rejection reason:" : "የመሰወሪያ ምክንያት:");
                                  if (reason && reason.trim()) {
                                    handleRejectCertificate(request.eventId, request._id, reason.trim());
                                  }
                                }}
                                disabled={processing}
                                className="bg-red-600 text-white hover:bg-red-700"
                              >
                                {lang === "en" ? "Reject" : "አስወግድ"}
                              </Button>
                              </>
                            )}
                            <Button
                              onClick={() => handleDeleteCertificate(request.eventId, request._id)}
                              disabled={processing}
                              className="bg-gray-600 text-white hover:bg-gray-700"
                            >
                              {lang === "en" ? "Delete" : "ሰርዝ"}
                            </Button>
                          </div>
                        </div>
                        
                        {request.verificationName && (
                          <div className="mt-3 p-3 bg-gray-50 rounded">
                            <h4 className="font-semibold mb-2">{lang === "en" ? "Verification Details:" : "የማረጋገጫ ዝርዝሮች:"}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                              <div><strong>{lang === "en" ? "Name:" : "ስም:"}</strong> {request.verificationName}</div>
                              <div><strong>{lang === "en" ? "Father:" : "አባት:"}</strong> {request.verificationFather}</div>
                              <div><strong>{lang === "en" ? "Grandfather:" : "አያት:"}</strong> {request.verificationGrandfather}</div>
                            </div>
                            {request.verificationImage && (
                              <div className="mt-2">
                                <strong>{lang === "en" ? "Verification Image:" : "የማረጋገጫ ምስል:"}</strong>
                                <img 
                                  src={`${uploadsBaseUrl}/${request.verificationImage}`} 
                                  alt="Verification" 
                                  className="mt-1 max-w-xs rounded border"
                                />
                              </div>
                            )}
                          </div>
                        )}
                        
                        {request.rejectionReason && (
                          <div className="mt-3 p-3 bg-red-50 rounded">
                            <strong className="text-red-800">{lang === "en" ? "Rejection Reason:" : "የመሰወሪያ ምክንያት:"}</strong>
                            <p className="text-red-700 mt-1">{request.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                        ));
                      })()}
                    </div>
                    {certificateRequests.length > 0 && (() => {
                      const totalPages = Math.ceil(certificateRequests.length / itemsPerPage);
                      return (
                        <Pagination
                          currentPage={certificateCurrentPage}
                          totalPages={totalPages}
                          onPageChange={setCertificateCurrentPage}
                          itemsPerPage={itemsPerPage}
                          totalItems={certificateRequests.length}
                          lang={lang}
                        />
                      );
                    })()}
                  </>
                )}
              </CardContent>
            </Card>
          ) : correctionsViewActive ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{lang === "en" ? "Event Correction Requests" : "የክስተት ማስተካከያ ጥያቄዎች"}</CardTitle>
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                    title={lang === 'en' ? 'Close' : 'ዝጋ'}
                    onClick={() => {
                      try { window.location.hash = ''; } catch {}
                      setCorrectionsViewActive(false);
                    }}
                  >
                    ✕
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {["pending", "approved", "rejected", "all"].map((status) => (
                    <button
                      key={status}
                      className={`px-3 py-1 rounded-full text-xs border ${
                        correctionsStatusFilter === status
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                      onClick={() => setCorrectionsStatusFilter(status)}
                    >
                      {lang === "en"
                        ? status.charAt(0).toUpperCase() + status.slice(1)
                        : status === "pending"
                        ? "በመጠበቅ ላይ"
                        : status === "approved"
                        ? "ተጸድቋል"
                        : status === "rejected"
                        ? "ተቀባይነት አልያቸውም"
                        : "ሁሉም"}
                    </button>
                  ))}
                </div>
                {correctionsError && (
                  <div className="mb-3 bg-red-50 text-red-700 px-3 py-2 rounded text-sm">
                    {correctionsError}
                  </div>
                )}
                {correctionsLoading ? (
                  <div className="text-center py-8 text-gray-600">
                    {lang === "en" ? "Loading correction requests..." : "የማስተካከያ ጥያቄዎች በመጫን ላይ..."}
                  </div>
                ) : corrections.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {lang === "en" ? "No correction requests found." : "የማስተካከያ ጥያቄ አልተገኘም።"}
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {(() => {
                        const totalPages = Math.ceil(corrections.length / itemsPerPage);
                        const startIndex = (correctionsCurrentPage - 1) * itemsPerPage;
                        const endIndex = startIndex + itemsPerPage;
                        const paginatedCorrections = corrections.slice(startIndex, endIndex);
                        return paginatedCorrections.map((item) => (
                          <div key={`${item.eventId}-${item.correctionId}`} className="border rounded-lg p-4 bg-white">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <Badge variant={getStatusVariant(item.correction.status || "pending")}>
                                    {item.correction.status || "pending"}
                                  </Badge>
                                  <span className="text-sm text-gray-600 capitalize">
                                    {lang === "en" ? "Event Type:" : "የክስተት አይነት:"} {item.eventType}
                                  </span>
                                  <span className="text-sm text-gray-600">
                                    {lang === "en" ? "Registration ID:" : "የመመዝገቢያ መለያ:"} {item.registrationId}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {lang === "en" ? "Requested at:" : "የተጠየቀበት ጊዜ:"}{" "}
                                  {formatDateTime(item.correction.requestedAt)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {lang === "en" ? "Requested by:" : "ከመነሻው ተጠያቂ:"}{" "}
                                {item.correction.requestedBy?.name || (lang === "en" ? "Registrant" : "ተመዝጋቢ")}
                                </div>
                              </div>
                              <div className="text-sm text-gray-600">
                                {lang === "en" ? "Current event status:" : "የአሁኑ የክስተት ሁኔታ:"}{" "}
                                <Badge variant={getStatusVariant(item.eventStatus || "pending")}>
                                  {item.eventStatus || "pending"}
                                </Badge>
                              </div>
                            </div>
                            <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-800 whitespace-pre-line">
                              {item.correction.details}
                            </div>
                            {item.correction.response && (
                              <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-800 whitespace-pre-line">
                                <strong>{lang === "en" ? "Manager response:" : "የማናጀሩ መልስ:"}</strong>
                                <div className="mt-1">{item.correction.response}</div>
                              </div>
                            )}
                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button
                                onClick={() => handleOpenCorrectionEdit(item)}
                                className="bg-indigo-600 text-white hover:bg-indigo-700"
                              >
                                {lang === "en" ? "Edit Event" : "ክስተቱን አርትዕ"}
                              </Button>
                              {item.correction.status === "pending" && (
                                <>
                                  <Button
                                    onClick={() => handleCorrectionAction(item.eventId, item.correctionId, "approve")}
                                    disabled={correctionUpdating}
                                    className="bg-green-600 text-white hover:bg-green-700"
                                  >
                                    {correctionUpdating ? (lang === "en" ? "Processing..." : "በማስኬድ ላይ...") : (lang === "en" ? "Approve" : "አጽድቅ")}
                                  </Button>
                                  <Button
                                    onClick={() => handleCorrectionAction(item.eventId, item.correctionId, "reject")}
                                    disabled={correctionUpdating}
                                    className="bg-red-600 text-white hover:bg-red-700"
                                  >
                                    {lang === "en" ? "Reject" : "አስወግድ"}
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                    {corrections.length > 0 && (() => {
                      const totalPages = Math.ceil(corrections.length / itemsPerPage);
                      return (
                        <Pagination
                          currentPage={correctionsCurrentPage}
                          totalPages={totalPages}
                          onPageChange={setCorrectionsCurrentPage}
                          itemsPerPage={itemsPerPage}
                          totalItems={corrections.length}
                          lang={lang}
                        />
                      );
                    })()}
                  </>
                )}
              </CardContent>
            </Card>
          ) : reportsViewActive ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{lang === "en" ? "Operational Reports" : "የስራ ሪፖርቶች"}</CardTitle>
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                    title={lang === 'en' ? 'Close' : 'ዝጋ'}
                    onClick={() => {
                      try { window.location.hash = ''; } catch {}
                      setReportsViewActive(false);
                    }}
                  >
                    ✕
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Tab Navigation */}
                <div className="flex border-b mb-4">
                  <button
                    onClick={() => setReportsTab("received")}
                    className={`px-4 py-2 font-medium text-sm ${
                      reportsTab === "received"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {lang === "en" ? "Received Reports" : "የተቀበሉ ሪፖርቶች"}
                  </button>
                  <button
                    onClick={() => {
                      setReportsTab("prepare");
                      if (templates.length === 0) loadTemplates();
                      if (reportingUsers.length === 0) loadReportingUsers();
                    }}
                    className={`px-4 py-2 font-medium text-sm ${
                      reportsTab === "prepare"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {lang === "en" ? "Prepare Report" : "ሪፖርት ዝግጁ ያድርጉ"}
                  </button>
                </div>

                {reportsTab === "received" ? (
                  <>
                    {reportsError && (
                      <div className="mb-3 bg-red-50 text-red-700 px-3 py-2 rounded text-sm">
                        {reportsError}
                      </div>
                    )}
                    {reportsLoading ? (
                      <div className="text-center py-8 text-gray-600">
                        {lang === "en" ? "Loading reports..." : "ሪፖርቶች በመጫን ላይ..."}
                      </div>
                    ) : reports.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        {lang === "en" ? "No reports received yet." : "እስካሁን ሪፖርት አልደረሰም።"}
                      </div>
                    ) : (
                  <>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                        {(() => {
                          const totalPages = Math.ceil(reports.length / itemsPerPage);
                          const startIndex = (reportsCurrentPage - 1) * itemsPerPage;
                          const endIndex = startIndex + itemsPerPage;
                          const paginatedReports = reports.slice(startIndex, endIndex);
                          return paginatedReports.map((report) => {
                            const id = report._id || report.id;
                            return (
                              <button
                                key={id}
                                onClick={() => setSelectedReportId(id)}
                                className={`w-full text-left border rounded px-3 py-2 text-sm transition ${
                                  selectedReportId === id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-semibold text-gray-800 truncate">{report.title}</div>
                                  <Badge variant={getReportStatusVariant(report.status)}>{report.status || "submitted"}</Badge>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {humanizeRole(report.submittedByRole, lang)} · {formatDateTime(report.createdAt)}
                                </div>
                              </button>
                            );
                          });
                        })()}
                        {reports.length > 0 && (() => {
                          const totalPages = Math.ceil(reports.length / itemsPerPage);
                          return (
                            <div className="mt-4">
                              <Pagination
                                currentPage={reportsCurrentPage}
                                totalPages={totalPages}
                                onPageChange={setReportsCurrentPage}
                                itemsPerPage={itemsPerPage}
                                totalItems={reports.length}
                                lang={lang}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    <div className="md:col-span-2 border rounded-lg bg-gray-50 p-4 max-h-[70vh] overflow-y-auto">
                      {selectedReport ? (
                        <>
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                            <div>
                              <div className="text-lg font-semibold text-gray-900">{selectedReport.title}</div>
                              <div className="text-sm text-gray-600">
                                {lang === "en" ? "Submitted by:" : "የተላከ በ:"}{" "}
                                {selectedReport.submittedBy?.name || humanizeRole(selectedReport.submittedByRole, lang)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDateTime(selectedReport.createdAt)}
                              </div>
                              {selectedReport.period && (
                                <div className="text-xs text-gray-500">
                                  {lang === "en" ? "Period:" : "ጊዜ:"} {selectedReport.period.label || "-"} ·{" "}
                                  {formatDateTime(selectedReport.period.start)} - {formatDateTime(selectedReport.period.end)}
                                </div>
                              )}
                            </div>
                            <Badge variant={getReportStatusVariant(selectedReport.status)}>
                              {selectedReport.status || "submitted"}
                            </Badge>
                          </div>
                          <div className="mt-3 text-sm">
                            <strong>{lang === "en" ? "Summary" : "ማጠቃለያ"}</strong>
                            <p className="mt-1 text-gray-800 whitespace-pre-line">
                              {selectedReport.summary || "-"}
                            </p>
                          </div>
                          {selectedReport.insights && selectedReport.insights.length > 0 && (
                            <div className="mt-3">
                              <strong>{lang === "en" ? "Highlights" : "ትኩረቶች"}</strong>
                              <ul className="list-disc pl-5 mt-1 text-sm text-gray-700 space-y-1">
                                {selectedReport.insights.map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                            {Object.entries(selectedReport.metrics || {}).map(([key, value]) => (
                              <div key={key} className="bg-white border rounded p-3 text-center">
                                <div className="text-xs uppercase text-gray-500">{key}</div>
                                <div className="text-2xl font-bold text-gray-900">{value}</div>
                              </div>
                            ))}
                          </div>
                          {selectedReport.totalsByType && Object.keys(selectedReport.totalsByType).length > 0 && (
                            <div className="mt-4">
                              <strong>{lang === "en" ? "Records by type" : "መዝገቦች በአይነት"}</strong>
                              <div className="overflow-x-auto mt-2">
                                <table className="min-w-full text-sm bg-white rounded">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {lang === "en" ? "Type" : "አይነት"}
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {lang === "en" ? "Count" : "ብዛት"}
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.entries(selectedReport.totalsByType).map(([type, count]) => (
                                      <tr key={type} className="border-t">
                                        <td className="px-3 py-2 capitalize">{type}</td>
                                        <td className="px-3 py-2 font-semibold">{count}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          {/* Event details removed from reports - no longer displayed */}
                          <div className="mt-4">
                            <strong>{lang === "en" ? "Feedback history" : "የአስተያየት ታሪክ"}</strong>
                            {selectedReport.feedback && selectedReport.feedback.length > 0 ? (
                              <div className="space-y-2 mt-2">
                                {selectedReport.feedback.map((entry) => {
                                  const recipients = [
                                    entry.includeReporter ? (lang === "en" ? "Reporter" : "ሪፖርተር") : null,
                                    ...(entry.recipients || []).map((role) => humanizeRole(role, lang)),
                                  ].filter(Boolean).join(", ");
                                  return (
                                    <div key={entry._id || entry.createdAt} className="bg-white border rounded px-3 py-2 text-sm">
                                      <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>{entry.sentBy?.name || humanizeRole(entry.sentBy?.role || "manager", lang)}</span>
                                        <span>{formatDateTime(entry.createdAt)}</span>
                                      </div>
                                      <p className="mt-1 text-gray-800">{entry.message}</p>
                                      {recipients && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          {lang === "en" ? "Recipients:" : "ተቀባዮች:"} {recipients}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 mt-1">
                                {lang === "en" ? "No feedback sent yet." : "ገና አስተያየት አልተላከም።"}
                              </p>
                            )}
                          </div>
                          <div className="mt-4 bg-white border rounded p-3">
                            <h4 className="font-semibold text-sm mb-2">
                              {lang === "en" ? "Send feedback" : "አስተያየት ይላኩ"}
                            </h4>
                            <textarea
                              className="w-full border rounded px-3 py-2 text-sm"
                              rows={3}
                              value={reportFeedbackMessage}
                              onChange={(e) => setReportFeedbackMessage(e.target.value)}
                              placeholder={lang === "en" ? "Share guidance, decisions, or required follow-up..." : "መመሪያ፣ ውሳኔ ወይም የሚያስፈልገውን እርምጃ ይጋሩ..."}
                            />
                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 mt-2">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  className="rounded"
                                  checked={reportFeedbackRecipients.reporter}
                                  onChange={() => toggleReportRecipient("reporter")}
                                />
                                {lang === "en" ? "Original reporter" : "ዋናው ሪፖርተር"}
                              </label>
                              {FEEDBACK_RECIPIENT_ROLES.map((role) => (
                                <label key={role} className="flex items-center gap-2 capitalize">
                                  <input
                                    type="checkbox"
                                    className="rounded"
                                    checked={reportFeedbackRecipients[role]}
                                    onChange={() => toggleReportRecipient(role)}
                                  />
                                  {humanizeRole(role, lang)}
                                </label>
                              ))}
                            </div>
                            {reportFeedbackError && (
                              <div className="mt-2 text-sm text-red-600">{reportFeedbackError}</div>
                            )}
                            {reportFeedbackSuccess && (
                              <div className="mt-2 text-sm text-green-700">{reportFeedbackSuccess}</div>
                            )}
                            <div className="flex justify-end mt-3">
                              <Button
                                onClick={handleReportFeedbackSubmit}
                                disabled={reportFeedbackSending || !reportFeedbackMessage.trim()}
                                className="bg-blue-600 text-white"
                              >
                                {reportFeedbackSending
                                  ? (lang === "en" ? "Sending..." : "በመላክ ላይ...")
                                  : (lang === "en" ? "Send feedback" : "አስተያየት ላክ")}
                              </Button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-gray-500 text-sm">
                          {lang === "en" ? "Select a report to review its details." : "ዝርዝሩን ለማየት ሪፖርት ይምረጡ።"}
                        </p>
                      )}
                    </div>
                  </div>
                    </>
                    )}
                  </>
                ) : (
                  /* Prepare Report Section */
                  <div className="space-y-6">
                    {/* Create New Template */}
                    <div className="bg-white border rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-4">
                        {lang === "en" ? "Create New Template" : "አዲስ መለጠፊያ ይፍጠሩ"}
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            {lang === "en" ? "Title" : "ርዕስ"}
                          </label>
                          <input
                            type="text"
                            className="w-full border rounded px-3 py-2"
                            value={templateForm.title}
                            onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                            placeholder={lang === "en" ? "Template title" : "የመለጠፊያ ርዕስ"}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            {lang === "en" ? "Type" : "አይነት"}
                          </label>
                          <select
                            className="w-full border rounded px-3 py-2"
                            value={templateForm.type}
                            onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                          >
                            <option value="message">{lang === "en" ? "Message" : "መልዕክት"}</option>
                            <option value="form">{lang === "en" ? "Form" : "ፎርም"}</option>
                            <option value="template">{lang === "en" ? "Template" : "መለጠፊያ"}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            {lang === "en" ? "Content" : "ይዘት"}
                          </label>
                          <textarea
                            className="w-full border rounded px-3 py-2"
                            rows={6}
                            value={templateForm.content}
                            onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                            placeholder={lang === "en" ? "Enter template content..." : "የመለጠፊያ ይዘት ያስገቡ..."}
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button
                            onClick={handleCreateTemplate}
                            disabled={sendingTemplate || !templateForm.title.trim() || !templateForm.content.trim()}
                            className="bg-blue-600 text-white"
                          >
                            {sendingTemplate
                              ? (lang === "en" ? "Creating..." : "በመፍጠር ላይ...")
                              : (lang === "en" ? "Create Template" : "መለጠፊያ ይፍጠሩ")}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Existing Templates */}
                    <div className="bg-white border rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-4">
                        {lang === "en" ? "Existing Templates" : "ያሉት መለጠፊያዎች"}
                      </h3>
                      {templatesLoading ? (
                        <div className="text-center py-8 text-gray-600">
                          {lang === "en" ? "Loading templates..." : "መለጠፊያዎች በመጫን ላይ..."}
                        </div>
                      ) : templates.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          {lang === "en" ? "No templates created yet." : "ገና ምንም መለጠፊያ አልተፈጠረም።"}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {templates.map((template) => (
                            <div key={template._id || template.id} className="border rounded p-3">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-semibold">{template.title}</h4>
                                  <p className="text-xs text-gray-500 capitalize">{template.type}</p>
                                </div>
                                <Badge variant="info">{template.type}</Badge>
                              </div>
                              <p className="text-sm text-gray-700 mb-3 line-clamp-2">{template.content}</p>
                              
                              {/* Recipient Selection */}
                              <div className="border-t pt-3 space-y-2">
                                <label className="block text-sm font-medium mb-2">
                                  {lang === "en" ? "Select Recipients" : "ተቀባዮችን ይምረጡ"}
                                </label>
                                
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={templateRecipients.allRoles}
                                    onChange={(e) => {
                                      setTemplateRecipients({
                                        allRoles: e.target.checked,
                                        roles: [],
                                        specificUsers: [],
                                      });
                                    }}
                                  />
                                  {lang === "en" ? "All Registrar, Hospital, Church, and Mosque users" : "ሁሉም ምዝገባ፣ ሆስፒታል፣ ቤተክርስትያን እና መስጊድ ተጠቃሚዎች"}
                                </label>

                                {!templateRecipients.allRoles && (
                                  <>
                                    <div className="mb-3">
                                      <label className="block text-xs font-medium mb-2">
                                        {lang === "en" ? "Select by role:" : "በሚና ይምረጡ:"}
                                      </label>
                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                        {["registrar", "hospital", "church", "mosque"].map((role) => (
                                          <label key={role} className="flex items-center gap-2">
                                            <input
                                              type="checkbox"
                                              checked={templateRecipients.roles?.includes(role)}
                                              onChange={(e) => {
                                                const currentRoles = templateRecipients.roles || [];
                                                if (e.target.checked) {
                                                  setTemplateRecipients({
                                                    ...templateRecipients,
                                                    roles: [...currentRoles, role],
                                                    specificUsers: [], // Clear specific users when roles are selected
                                                  });
                                                } else {
                                                  setTemplateRecipients({
                                                    ...templateRecipients,
                                                    roles: currentRoles.filter((r) => r !== role),
                                                  });
                                                }
                                              }}
                                            />
                                            {humanizeRole(role, lang)}
                                          </label>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="mb-3">
                                      <label className="block text-xs font-medium mb-1">
                                        {lang === "en" ? "Or select specific users:" : "ወይም የተወሰኑ ተጠቃሚዎችን ይምረጡ:"}
                                      </label>
                                      {usersLoading ? (
                                        <div className="text-xs text-gray-500 py-2">
                                          {lang === "en" ? "Loading users..." : "ተጠቃሚዎች በመጫን ላይ..."}
                                        </div>
                                      ) : (
                                        <>
                                          <select
                                            multiple
                                            className="w-full border rounded px-2 py-1 text-sm max-h-32 overflow-y-auto"
                                            value={templateRecipients.specificUsers || []}
                                            onChange={(e) => {
                                              const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
                                              setTemplateRecipients({
                                                ...templateRecipients,
                                                specificUsers: selected,
                                                roles: [], // Clear roles when specific users are selected
                                              });
                                            }}
                                          >
                                            {reportingUsers.map((user) => (
                                              <option key={user._id || user.id} value={user._id || user.id}>
                                                {user.name} ({humanizeRole(user.role, lang)})
                                              </option>
                                            ))}
                                          </select>
                                          <p className="text-xs text-gray-500 mt-1">
                                            {lang === "en" ? "Hold Ctrl/Cmd to select multiple users" : "ብዙ ተጠቃሚዎችን ለመምረጥ Ctrl/Cmd ይጫኑ"}
                                          </p>
                                        </>
                                      )}
                                    </div>
                                  </>
                                )}

                                <div className="flex justify-end mt-3">
                                  <Button
                                    onClick={() => handleSendTemplate(template._id || template.id)}
                                    disabled={sendingTemplate || 
                                      (!templateRecipients.allRoles && 
                                       (!templateRecipients.roles || templateRecipients.roles.length === 0) &&
                                       (!templateRecipients.specificUsers || templateRecipients.specificUsers.length === 0))}
                                    className="bg-green-600 text-white"
                                  >
                                    {sendingTemplate
                                      ? (lang === "en" ? "Sending..." : "በመላክ ላይ...")
                                      : (lang === "en" ? "Send Template" : "መለጠፊያ ላክ")}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : detailsViewActive && selectedEvent ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
						<CardTitle>{lang === "en" ? "Event Details" : "ዝርዝሮች"}</CardTitle>
                  <div className="flex items-center gap-2">
							{selectedEvent?.data && (
                      <button
                        className="px-2 py-1 text-xs border rounded"
                        onClick={() => {
                          try {
                            const keys = Object.keys(selectedEvent?.data || {}).sort();
                            const payload = JSON.stringify(keys, null, 2);
                            if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(payload);
                            if (typeof window !== 'undefined') {
                              window.lastEventData = selectedEvent.data;
                              window.lastEventKeys = keys;
                              console.log('ManagerDashboard: Available data keys:', keys);
                              console.log('ManagerDashboard: Full event object', selectedEvent);
                            }
                            alert(lang === 'en' ? 'Data keys copied to clipboard' : 'የመረጃ ቁልፎች ተቀድተዋል');
                          } catch (e) {
                            alert('Could not copy keys.');
                          }
                        }}
                      >
                        {lang === 'en' ? 'Copy data keys' : 'የመረጃ ቁልፎች ኮፒ'}
                      </button>
                    )}
							{selectedEvent?.data && (
                      <button
                        className="px-2 py-1 text-xs border rounded bg-yellow-100"
                        onClick={() => {
                          try {
                            const data = selectedEvent.data || {};
                            const formSpec = FORM_FIELD_CONFIG[selectedEvent.type] || [];
                            const canonicalOrder = formSpec
                              .map((f) => (typeof f === 'string' ? f : f?.name))
                              .filter(Boolean);
                            const debugReport = {
                              eventType: selectedEvent.type,
                              availableDataKeys: Object.keys(data),
                              formSpecFields: canonicalOrder,
                              missingFromFormSpec: Object.keys(data).filter(k => !canonicalOrder.includes(k)),
                              missingFromData: canonicalOrder.filter(k => !(k in data)),
                              nonEmptyFields: Object.entries(data).filter(([k, v]) => v !== null && v !== undefined && v !== ""),
                              emptyFields: Object.entries(data).filter(([k, v]) => v === null || v === undefined || v === "")
                            };
                            console.log('ManagerDashboard: Detailed Debug Report', debugReport);
                            alert(lang === 'en' ? 'Debug report logged to console' : 'የማስተካከያ ሪፖርት በኮንሶል ተመዝግቧል');
                          } catch (e) {
                            console.error('Debug report error:', e);
                            alert('Could not generate debug report.');
                          }
                        }}
                      >
                        {lang === 'en' ? 'Debug Report' : 'የማስተካከያ ሪፖርት'}
                      </button>
                    )}
							<button
								className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
								title={lang === 'en' ? 'Close' : 'ዝጋ'}
								onClick={() => {
									setDetailsViewActive(false);
									setSelectedEvent(null);
									setRejectionReason("");
									setShowRejectForm(false);
									// Return to events review if it was previously active
									setEventsViewActive(true);
								}}
							>
								✕
							</button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{/* Raw toggle */}
					<div className="mb-3">
                      <button
                        className="px-2 py-1 text-xs border rounded"
                        onClick={() => setShowRaw((v) => !v)}
                      >
                        {showRaw ? (lang === 'en' ? 'Hide raw' : 'Raw ደብቅ') : (lang === 'en' ? 'Show raw' : 'Raw አሳይ')}
                      </button>
                  </div>
                {showRaw ? (
                  <pre className="text-xs bg-gray-100 p-3 rounded max-h-[60vh] overflow-auto">{JSON.stringify((() => {
                    try {
                      const data = selectedEvent?.data || {};
                      const formSpec = FORM_FIELD_CONFIG[selectedEvent?.type] || [];
                      const canonicalKeys = formSpec
                        .map((f) => (typeof f === 'string' ? f : f?.name))
                        .filter(Boolean);
                      const actualKeys = Object.keys(data);
                      const allKeys = Array.from(new Set(["registrationId", ...canonicalKeys, ...actualKeys]));
                      const rawOut = {};
                      allKeys.forEach((k) => {
                        if (k === 'registrationId') {
                          rawOut[k] = selectedEvent?.registrationId ?? null;
                        } else {
                          try {
                            const direct = (data[k] !== undefined ? data[k] : undefined);
                            const v = (direct !== undefined && direct !== null) ? direct : getValueForKey(data, k);
                            rawOut[k] = (v !== undefined ? v : null);
                          } catch {
                            rawOut[k] = (data[k] !== undefined ? data[k] : null);
                          }
                        }
                      });
                      return rawOut;
                    } catch {
                      return selectedEvent?.data || {};
                    }
                  })(), null, 2)}</pre>
                ) : (
                  <div>
                    {/* Debug summary */}
                    {selectedEvent?.data && (
                      <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
                        <div className="font-semibold text-blue-800 mb-2">
                          {lang === "en" ? "Data Summary" : "የመረጃ ማጠቃለያ"}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <strong>{lang === "en" ? "Total Fields:" : "ጠቅላላ መስኮች:"}</strong> {Object.keys(selectedEvent.data).length}
                          </div>
                          <div>
                            <strong>{lang === "en" ? "Non-empty Fields:" : "ያልባዩ መስኮች:"}</strong> {Object.entries(selectedEvent.data).filter(([k, v]) => v !== null && v !== undefined && v !== "" && v !== "null" && v !== "undefined").length}
                          </div>
                        </div>
                      </div>
                    )}
                    {renderEventDetails(selectedEvent)}

                    {selectedEvent?.status === "pending" && (
                      <div className="mt-6 border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-semibold">
                            {lang === "en" ? "Take Action" : "እርምጃ ይውሰዱ"}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleApproveEvent}
                              disabled={processing}
                              className="bg-green-600 text-white"
                            >
                              {processing ? (lang === "en" ? "Approving..." : "በመጸደቅ ላይ...") : (lang === "en" ? "Approve" : "ይጸድቁ")}
                            </Button>
                            <Button
                              onClick={() => { setShowRejectForm((v) => !v); if (!showRejectForm) setRejectionReason(""); }}
                              className="bg-red-50 text-red-700 border border-red-200"
                            >
                              {showRejectForm ? (lang === "en" ? "Hide Reject" : "መሰወሪያ ደብቅ") : (lang === "en" ? "Reject" : "ያስወግዱ")}
                            </Button>
                          </div>
                        </div>

                        {showRejectForm && (
                          <div className="bg-red-50 border border-red-200 rounded p-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {lang === "en" ? "Rejection Reason" : "የመሰወሪያ ምክንያት"}
                            </label>
                            <textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="w-full px-3 py-2 border rounded-md"
                              rows={3}
                              placeholder={lang === "en" ? "Provide a clear reason..." : "ግልጽ ምክንያት ያብራሩ..."}
                            />
                            <div className="mt-3 flex justify-end gap-2">
                              <Button onClick={() => { setShowRejectForm(false); setRejectionReason(""); }} className="bg-gray-200">
                                {lang === "en" ? "Cancel" : "ያስወግዱ"}
                              </Button>
                              <Button onClick={handleRejectEvent} disabled={processing || !rejectionReason.trim()} className="bg-red-600 text-white">
                                {processing ? (lang === "en" ? "Rejecting..." : "በመሰወሪያ ላይ...") : (lang === "en" ? "Confirm Reject" : "መሰወር ያረጋግጡ")}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
				</CardContent>
			</Card>
	  ) : eventsViewActive ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{lang === "en" ? "Events for Review" : "ለግምገማ ያሉ ክስተቶች"}</CardTitle>
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                    title={lang === 'en' ? 'Close' : 'ዝጋ'}
                    onClick={() => { try { window.location.hash = ''; } catch {} }}
                  >
                    ✕
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-4">
                  <div className="flex flex-wrap gap-2">
                    {STATUS_FILTER_OPTIONS.map((option) => {
                      const isActive =
                        option.value === "all" ? viewAll : !viewAll && filter === option.value;
                      return (
                        <button
                          key={option.value}
                          className={`px-3 py-1 rounded-full text-xs border transition ${
                            isActive
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => handleStatusFilterChange(option.value)}
                        >
                          {lang === "en" ? option.labelEn : option.labelAm}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {lang === "en" ? "Filter by event type" : "በክስተት አይነት ይለዩ"}
                      </label>
                      <select
                        value={eventTypeFilter}
                        onChange={(e) => setEventTypeFilter(e.target.value)}
                        className="w-full border rounded px-3 py-2 text-sm"
                      >
                        {EVENT_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {lang === "en" ? option.labelEn : option.labelAm}
                          </option>
                        ))}
                      </select>
                    </div>
                    <form onSubmit={handleEventSearch} className="flex flex-col gap-2">
                      <label className="text-sm font-medium">
                        {lang === "en"
                          ? "Search by full name or identification number"
                          : "በሙሉ ስም ወይም በመታወቂያ ቁጥር ይፈልጉ"}
                      </label>
                      <div className="flex flex-col md:flex-row gap-2">
                        <input
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          className="flex-1 border rounded px-3 py-2 text-sm"
                          placeholder={
                            lang === "en"
                              ? "e.g. Kidus Alemayehu or 12-3456789"
                              : "ለምሳሌ ኪዱስ አለማየሁ ወይም 12-3456789"
                          }
                        />
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            disabled={searching}
                            className="bg-blue-600 text-white whitespace-nowrap"
                          >
                            {searching
                              ? lang === "en"
                                ? "Searching..."
                                : "በመፈለግ ላይ..."
                              : lang === "en"
                              ? "Search"
                              : "ፈልግ"}
                          </Button>
                          {(searchActive || searchInput.trim()) && (
                            <Button
                              type="button"
                              onClick={handleResetSearch}
                              className="bg-gray-200 text-gray-700 whitespace-nowrap"
                            >
                              {lang === "en" ? "Clear" : "አጽዳ"}
                            </Button>
                          )}
                        </div>
                      </div>
                      {searchMessage && (
                        <div
                          className={`text-sm ${
                            searchActive
                              ? searchResults.length > 0
                                ? "text-green-700"
                                : "text-red-600"
                              : "text-gray-600"
                          }`}
                        >
                          {searchMessage}
                        </div>
                      )}
                    </form>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>{lang === "en" ? "Type" : "አይነት"}</TableHead>
                          <TableHead>{lang === "en" ? "Submitted By" : "የተላከ በ"}</TableHead>
                          <TableHead>{lang === "en" ? "Date" : "ቀን"}</TableHead>
                          <TableHead>{lang === "en" ? "Status" : "ሁኔታ"}</TableHead>
                          <TableHead>{lang === "en" ? "Actions" : "ድርጊቶች"}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={6} className="text-center">{lang === "en" ? "Loading..." : "በመጫን ላይ..."}</TableCell></TableRow>
                      ) : filteredEvents.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center">{lang === "en" ? "No events found." : "ምንም ክስተት አልተገኘም።"}</TableCell></TableRow>
                      ) : (
                        paginatedEvents.map((event) => {
                          const id = event._id || event.id;
                          const data = event.data || {};
                          const name = lang === "en" ? data.childNameEn || data.husbandNameEn || data.deceasedNameEn || "-" : data.childNameAm || data.husbandNameAm || data.deceasedNameAm || "-";
                          return (
                            <TableRow
                              key={id}
                              className={`hover:bg-gray-50 ${highlightById[id] === 'new' ? 'bg-green-50' : ''} ${highlightById[id] === 'resubmitted' ? 'bg-purple-50' : ''}`}
                              title={highlightById[id] === 'new' ? (lang === 'en' ? 'New event' : 'አዲስ ክስተት') : highlightById[id] === 'resubmitted' ? (lang === 'en' ? 'Resubmitted event' : 'እንደገና የቀረበ ክስተት') : ''}
                            >
                              <TableCell className="font-mono text-xs">{id}</TableCell>
                              <TableCell className="capitalize">{event.type}</TableCell>
                              <TableCell>
                                <div>
                                  <div className="text-sm font-medium">{getSubmittedByLabel(event.submittedBy, event.registrarId)}</div>
                                  <div className="text-xs text-gray-600">{name}</div>
                                </div>
                              </TableCell>
                              <TableCell>{getEventDisplayDate(event)}</TableCell>
                              <TableCell><Badge variant={getStatusVariant(event.status)}>{event.status}</Badge></TableCell>
                              <TableCell>
                                <div className="relative inline-block text-left">
                                  <button
                                    className="px-3 py-2 bg-gray-100 text-gray-800 rounded-md"
                                    onClick={(e) => {
                                      const menu = e.currentTarget.nextSibling;
                                      menu.style.display = menu.style.display === "block" ? "none" : "block";
                                    }}
                                  >
                                    {lang === "en" ? "Actions" : "ድርጊቶች"}
                                  </button>
                                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-10" style={{ display: "none" }}>
                                    <button className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700" onClick={() => handleAction("view", event)}>{lang === "en" ? "View" : "ይመልከቱ"}</button>
                                    <button className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-blue-700" onClick={() => handleAction("edit", event)}>{lang === "en" ? "Edit" : "አርትዖት"}</button>
                                    <button className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-700" onClick={() => handleAction("delete", event)}>{lang === "en" ? "Delete" : "ሰርዝ"}</button>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                {filteredEvents.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredEvents.length}
                    lang={lang}
                  />
                )}
              </CardContent>
            </Card>
          ) : agentsViewActive ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{lang === "en" ? "Agents Management" : "የወኪሎች አስተዳደር"}</CardTitle>
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                    title={lang === 'en' ? 'Close' : 'ዝጋ'}
                    onClick={() => {
                      try { window.location.hash = ''; } catch {}
                      setAgentsViewActive(false);
                    }}
                  >
                    ✕
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {lang === "en" 
                      ? "Manage registrar, hospital, church, and mosque users" 
                      : "የመዝገበ ካሳ፣ ሆስፒታል፣ ቤተ ክርስቲያን እና መስጊድ ተጠቃሚዎችን ያስተዳድሩ"}
                  </div>
                  <Button
                    onClick={() => setShowCreateAgentForm(true)}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {lang === "en" ? "+ Add Agent" : "+ ወኪል ጨምር"}
                  </Button>
                </div>

                {showCreateAgentForm && (
                  <Card className="mb-4 border-2 border-blue-200">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{lang === "en" ? "Create New Agent" : "አዲስ ወኪል ይፍጠሩ"}</CardTitle>
                        <button
                          onClick={() => {
                            setShowCreateAgentForm(false);
                            setNewAgent({ name: "", email: "", password: "", role: "registrar" });
                          }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ✕
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleCreateAgent} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              {lang === "en" ? "Name" : "ስም"} *
                            </label>
                            <input
                              type="text"
                              value={newAgent.name}
                              onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                              className="w-full px-3 py-2 border rounded-md"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              {lang === "en" ? "Email" : "ኢሜይል"} *
                            </label>
                            <input
                              type="email"
                              value={newAgent.email}
                              onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                              className="w-full px-3 py-2 border rounded-md"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              {lang === "en" ? "Password" : "የሚስጥር ቃል"} *
                            </label>
                            <input
                              type="password"
                              value={newAgent.password}
                              onChange={(e) => setNewAgent({ ...newAgent, password: e.target.value })}
                              className="w-full px-3 py-2 border rounded-md"
                              required
                              minLength={6}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              {lang === "en" ? "Role" : "ሚና"} *
                            </label>
                            <select
                              value={newAgent.role}
                              onChange={(e) => setNewAgent({ ...newAgent, role: e.target.value })}
                              className="w-full px-3 py-2 border rounded-md"
                              required
                            >
                              <option value="registrar">{lang === "en" ? "Registrar" : "መዝገበ ካሳ"}</option>
                              <option value="hospital">{lang === "en" ? "Hospital" : "ሆስፒታል"}</option>
                              <option value="church">{lang === "en" ? "Church" : "ቤተ ክርስቲያን"}</option>
                              <option value="mosque">{lang === "en" ? "Mosque" : "መስጊድ"}</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            onClick={() => {
                              setShowCreateAgentForm(false);
                              setNewAgent({ name: "", email: "", password: "", role: "registrar" });
                            }}
                            className="bg-gray-500 text-white hover:bg-gray-600"
                          >
                            {lang === "en" ? "Cancel" : "ተወው"}
                          </Button>
                          <Button
                            type="submit"
                            disabled={creatingAgent}
                            className="bg-blue-600 text-white hover:bg-blue-700"
                          >
                            {creatingAgent 
                              ? (lang === "en" ? "Creating..." : "በመፍጠር ላይ...")
                              : (lang === "en" ? "Create Agent" : "ወኪል ይፍጠሩ")
                            }
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {agentsLoading ? (
                  <div className="text-center py-8">{lang === "en" ? "Loading agents..." : "ወኪሎች በመጫን ላይ..."}</div>
                ) : agents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {lang === "en" ? "No agents found." : "ምንም ወኪል አልተገኘም።"}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{lang === "en" ? "Name" : "ስም"}</TableHead>
                            <TableHead>{lang === "en" ? "Email" : "ኢሜይል"}</TableHead>
                            <TableHead>{lang === "en" ? "Role" : "ሚና"}</TableHead>
                            <TableHead>{lang === "en" ? "Status" : "ሁኔታ"}</TableHead>
                            <TableHead>{lang === "en" ? "Actions" : "ድርጊቶች"}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            const totalPages = Math.ceil(agents.length / itemsPerPage);
                            const startIndex = (agentsCurrentPage - 1) * itemsPerPage;
                            const endIndex = startIndex + itemsPerPage;
                            const paginatedAgents = agents.slice(startIndex, endIndex);
                            
                            return paginatedAgents.map((agent) => (
                              <TableRow key={agent._id || agent.id}>
                                <TableCell className="font-medium">{agent.name}</TableCell>
                                <TableCell>{agent.email}</TableCell>
                                <TableCell>
                                  <span className="capitalize">
                                    {lang === "en" 
                                      ? agent.role 
                                      : agent.role === "registrar" ? "መዝገበ ካሳ"
                                      : agent.role === "hospital" ? "ሆስፒታል"
                                      : agent.role === "church" ? "ቤተ ክርስቲያን"
                                      : agent.role === "mosque" ? "መስጊድ"
                                      : agent.role
                                    }
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={agent.active ? "success" : "danger"}>
                                    {agent.active 
                                      ? (lang === "en" ? "Active" : "ንቁ") 
                                      : (lang === "en" ? "Inactive" : "ንቁ አይደለም")
                                    }
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="relative inline-block text-left">
                                    <Button
                                      onClick={() => {
                                        setActionAgent(agent);
                                        setShowActionMenu(true);
                                      }}
                                      className="bg-gray-100 text-gray-800 hover:bg-gray-200"
                                    >
                                      {lang === "en" ? "Actions" : "ድርጊቶች"}
                                    </Button>
                                    {showActionMenu && actionAgent && (actionAgent._id || actionAgent.id) === (agent._id || agent.id) && (
                                      <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-10">
                                        <button
                                          className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                          onClick={() => {
                                            setShowRoleSelector(true);
                                            setShowActionMenu(false);
                                          }}
                                        >
                                          {lang === "en" ? "Change Role" : "ሚና ይቀይሩ"}
                                        </button>
                                        <button
                                          className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                                          onClick={() => {
                                            handleDeleteAgent(agent._id || agent.id);
                                            setShowActionMenu(false);
                                          }}
                                        >
                                          {lang === "en" ? "Delete Agent" : "ወኪል ያስወግዱ"}
                                        </button>
                                      </div>
                                    )}
                                    {showRoleSelector && actionAgent && (actionAgent._id || actionAgent.id) === (agent._id || agent.id) && (
                                      <div className="absolute right-0 mt-2 w-56 bg-white border rounded shadow-lg z-20 p-4">
                                        <div className="mb-2 font-semibold">{lang === "en" ? "Select Role" : "ሚና ይምረጡ"}</div>
                                        <select
                                          value={actionAgent.role}
                                          onChange={(e) => {
                                            handleChangeAgentRole(actionAgent._id || actionAgent.id, e.target.value);
                                            setShowRoleSelector(false);
                                            setActionAgent(null);
                                          }}
                                          className="w-full px-2 py-1 border rounded"
                                        >
                                          <option value="registrar">{lang === "en" ? "Registrar" : "መዝገበ ካሳ"}</option>
                                          <option value="hospital">{lang === "en" ? "Hospital" : "ሆስፒታል"}</option>
                                          <option value="church">{lang === "en" ? "Church" : "ቤተ ክርስቲያን"}</option>
                                          <option value="mosque">{lang === "en" ? "Mosque" : "መስጊድ"}</option>
                                        </select>
                                        <div className="flex gap-2 mt-2">
                                          <Button
                                            onClick={() => {
                                              setShowRoleSelector(false);
                                              setActionAgent(null);
                                            }}
                                            className="bg-gray-500 text-white text-sm px-2 py-1"
                                          >
                                            {lang === "en" ? "Close" : "ዝጋ"}
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ));
                          })()}
                        </TableBody>
                      </Table>
                    </div>
                    {agents.length > 0 && (
                      <Pagination
                        currentPage={agentsCurrentPage}
                        totalPages={Math.ceil(agents.length / itemsPerPage)}
                        onPageChange={setAgentsCurrentPage}
                        itemsPerPage={itemsPerPage}
                        totalItems={agents.length}
                        lang={lang}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card><CardContent><div className="text-center"><div className="text-2xl font-bold text-blue-600">{events.length}</div><div className="text-sm text-gray-600">{lang === "en" ? "Total Events" : "ጠቅላላ ክስተቶች"}</div></div></CardContent></Card>
                <Card><CardContent><div className="text-center"><div className="text-2xl font-bold text-yellow-600">{events.filter((e) => e.status === "pending").length}</div><div className="text-sm text-gray-600">{lang === "en" ? "Pending Review" : "በግምገማ ላይ"}</div></div></CardContent></Card>
                <Card><CardContent><div className="text-center"><div className="text-2xl font-bold text-green-600">{events.filter((e) => e.status === "approved").length}</div><div className="text-sm text-gray-600">{lang === "en" ? "Approved" : "የተጸድቀ"}</div></div></CardContent></Card>
                <Card><CardContent><div className="text-center"><div className="text-2xl font-bold text-red-600">{events.filter((e) => e.status === "rejected").length}</div><div className="text-sm text-gray-600">{lang === "en" ? "Rejected" : "የተተወ"}</div></div></CardContent></Card>
              </div>

              <Card>
                <CardContent>
                  <div className="relative overflow-hidden rounded-lg">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50" />
                    <div className="relative p-5 md:p-7">
                      <div>
                        <p className="text-gray-600 max-w-3xl">
                          This system streamlines registration, review, and certification for Birth, Marriage, Divorce, and Death events.
                          As a manager, you review submitted records, approve or reject them with reasons, and oversee certificate and agent operations.
                        </p>
              </div>

                      {/* Expandable sections */}
                      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Overview */}
                        <div className="border rounded-lg bg-white/70">
                          <button
                            className="w-full text-left px-4 py-3 font-semibold flex items-center justify-between"
                            onClick={() => setOpenSections((s) => ({ ...s, overview: !s.overview }))}
                          >
                            <span>{lang === 'en' ? 'System Overview' : 'የስርዓቱ አጠቃላይ መግለጫ'}</span>
                            <span className="text-gray-500">{openSections.overview ? '▴' : '▾'}</span>
                          </button>
                          {openSections.overview && (
                            <div className="px-4 pb-4 text-sm text-gray-700">
                              - Centralized review of registrations with rich details and documents.
                              <br />- Real-time notifications for new and resubmitted events.
                              <br />- Certificate request tracking tied to each event.
            </div>
          )}
        </div>

                        {/* Responsibilities */}
                        <div className="border rounded-lg bg-white/70">
                          <button
                            className="w-full text-left px-4 py-3 font-semibold flex items-center justify-between"
                            onClick={() => setOpenSections((s) => ({ ...s, responsibilities: !s.responsibilities }))}
                          >
                            <span>{lang === 'en' ? 'Manager Responsibilities' : 'የማነጂ ሀላፊነቶች'}</span>
                            <span className="text-gray-500">{openSections.responsibilities ? '▴' : '▾'}</span>
                          </button>
                          {openSections.responsibilities && (
                            <div className="px-4 pb-4 text-sm text-gray-700">
                              - Validate data accuracy and completeness.
                              <br />- Approve legitimate events; reject with a clear reason when needed.
                              <br />- Oversee certificate issuance and agent performance.
                            </div>
                          )}
                        </div>

                        {/* Tips */}
                        <div className="border rounded-lg bg-white/70">
                          <button
                            className="w-full text-left px-4 py-3 font-semibold flex items-center justify-between"
                            onClick={() => setOpenSections((s) => ({ ...s, tips: !s.tips }))}
                          >
                            <span>{lang === 'en' ? 'Quick Tips' : 'ፈጣን ምክሮች'}</span>
                            <span className="text-gray-500">{openSections.tips ? '▴' : '▾'}</span>
                          </button>
                          {openSections.tips && (
                            <div className="px-4 pb-4 text-sm text-gray-700">
                              - Use the sidebar Events menu to filter by status.
                              <br />- Inside a record, use Approve/Reject actions and include rejection reasons.
                              <br />- Toggle "Show raw" in the viewer for debugging tricky cases.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Confirm Delete Dialog for Agents */}
          {showConfirmDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
              <div className="rounded-lg p-6 shadow-xl border bg-white min-w-[320px]">
                <div className="mb-4 text-lg font-semibold">
                  {lang === "en" 
                    ? "Are you sure you want to delete this agent?" 
                    : "ይህንን ወኪል ማጥፋት እርግጠኛ ነዎት?"}
                </div>
                <div className="flex flex-row gap-4 justify-end w-full">
                  <Button 
                    onClick={confirmDeleteAgent}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    {lang === "en" ? "Delete" : "ያስወግዱ"}
                  </Button>
                  <Button 
                    onClick={() => setShowConfirmDelete(false)}
                    className="bg-gray-500 text-white hover:bg-gray-600"
                  >
                    {lang === "en" ? "Cancel" : "ተወው"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Delete Dialog for Events */}
          {showConfirmDeleteEvent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
              <div className="rounded-lg p-6 shadow-xl border bg-white min-w-[320px]">
                <div className="mb-4 text-lg font-semibold">
                  {lang === "en" 
                    ? "Are you sure you want to delete this event? This action cannot be undone." 
                    : "ይህንን ክስተት ማጥፋት እርግጠኛ ነዎት? ይህ እርምጃ ሊመለስ አይችልም።"}
                </div>
                <div className="flex flex-row gap-4 justify-end w-full">
                  <Button 
                    onClick={confirmDeleteEvent}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    {lang === "en" ? "Delete" : "ያስወግዱ"}
                  </Button>
                  <Button 
                    onClick={() => setShowConfirmDeleteEvent(false)}
                    className="bg-gray-500 text-white hover:bg-gray-600"
                  >
                    {lang === "en" ? "Cancel" : "ተወው"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Event Edit Form Modal */}
          {showEventForm && editingEvent && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    {lang === "en"
                      ? `Edit ${formType.charAt(0).toUpperCase() + formType.slice(1)} Event`
                      : `${formType} ክስተት አርትዖት`}
                  </h2>
                  <Button
                    onClick={() => {
                      setShowEventForm(false);
                      setEditingEvent(null);
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    {lang === "en" ? "Close" : "ዝጋ"}
                  </Button>
                </div>
                <div className="p-4">
                  <FormSelector
                    user={user}
                    setUser={setUser}
                    formType={formType}
                    onSubmit={handleEventFormSubmit}
                    editingEvent={editingEvent}
                  />
                </div>
              </div>
            </div>
          )}

			{/* Modal content removed in favor of in-page details view */}
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
