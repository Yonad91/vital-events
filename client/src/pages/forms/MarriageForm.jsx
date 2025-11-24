"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { EthiopianDatePicker } from "../../lib/forms.jsx";
import { ETH_GEO } from "@/lib/geo";
import { buildMarriagePrefillFromBirth, mergePrefillState } from "@/lib/birthAutofill";
import { ethToGreg, getCurrentEthiopianDate, isEthiopianDateInFuture } from "@/lib/ethioDate";

// UI Components (same as BirthForm)
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
  const baseClasses = "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
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
  <label htmlFor={htmlFor} className={`block text-sm font-medium text-gray-700 mb-1 ${className}`}>
    {children}
  </label>
);

const Select = ({ children, name, value, onChange, className, hasError, errorMessage, disabled, ...props }) => {
  const baseClasses = "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
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

// Marriage-specific form configuration
const MARRIAGE_FORM_CONFIG = [
  { section: "Registration Details", sectionAm: "የመዝገብ ዝርዝሮች" },
  { name: "registrationNumber", labelEn: "Registration Number", labelAm: "የመመዝገቢያ ቁጥር" },
  { name: "mainRegistrationRecordNumberAm", labelEn: "Registrar Bureaue ID. Number", labelAm: "የምዝገባ ጽ/ቤት መለያ ቁጥር" },
  { name: "registrationDateEth", labelEn: "Registration Date (Ethiopian)", labelAm: "የመመዝገቢያ ቀን (ኢትዮ)", type: "ethiopian-date" },
  { name: "registrationTimeHourAm", labelEn: "Registration Time: Hour", labelAm: "ሰዓት" },

  { section: "Place of marriage", sectionAm: "የጋብቻ ቦታ" },
  { name: "marriageRegion", labelEn: "region/city administration", labelAm: "ክልል/ከተማ አስተዳደር" },
  { name: "marriageZone", labelEn: "zone/city administration", labelAm: "ዞን/ከተማ አስተዳደር" },
  { name: "marriageCity", labelEn: "city", labelAm: "ከተማ" },
  { name: "marriageSubCity", labelEn: "sub city", labelAm: "ክፍለ ከተማ" },
  { name: "marriageWoreda", labelEn: "woreda", labelAm: "ወረዳ" },
  { name: "marriageKebeleAm", labelEn: "kebele", labelAm: "ቀበሌ" },

  { section: "Full Information of the Bride", sectionAm: "የሚስት ሙሉ መረጃ" },
  { name: "wifeIdNumberAm", labelEn: "ID. Card Number", labelAm: "የመታወቂያ ቁጥር" },
  { name: "wifeNameAm", labelEn: "Wife Name (AM)", labelAm: "የሚስት ስም (አማ)" },
  { name: "wifeNameEn", labelEn: "Wife Name (EN)", labelAm: "የሚስት ስም (እንግ)" },
  { name: "wifeFatherAm", labelEn: "Wife Father's Name (AM)", labelAm: "የሚስት የአባት ስም (አማ)" },
  { name: "wifeFatherEn", labelEn: "Wife Father's Name (EN)", labelAm: "የሚስት የአባት ስም (እንግ)" },
  { name: "wifeGrandfatherAm", labelEn: "Wife Grandfather's Name (AM)", labelAm: "የሚስት የአያት ስም (አማ)" },
  { name: "wifeGrandfatherEn", labelEn: "Wife Grandfather's Name (EN)", labelAm: "የሚስት የአያት ስም (እንግ)" },
  { name: "wifeNationalityAm", labelEn: "Nationality", labelAm: "ዜግነት" },
  { name: "wifeBirthDateAm", labelEn: "date of birth", labelAm: "የትውልድ ቀን", type: "ethiopian-date" },
  { name: "wifeBirthPlace", labelEn: "place of birth", labelAm: "የትውልድ ቦታ" },
  { name: "wifeResidence", labelEn: "Place of Residence", labelAm: "መኖሪያ ቦታ" },
  { name: "wifeEthnicity", labelEn: "Ethnicity", labelAm: "ዘር" },
  { name: "wifeReligionAm", labelEn: "Wife Religion", labelAm: "የሚስት ሃይማኖት", type: "select", options: [
      { value: "orthodox", labelEn: "Orthodox", labelAm: "ኦርቶዶክስ" },
      { value: "protestant", labelEn: "Protestant", labelAm: "ፕሮቴስታንት" },
      { value: "catholic", labelEn: "Catholic", labelAm: "ካቶሊክ" },
      { value: "muslim", labelEn: "Muslim", labelAm: "ሙስሊም" },
      { value: "other", labelEn: "Other", labelAm: "ሌላ" },
  ] },
  { name: "wifePrevMaritalStatusAm", labelEn: "የቀድሞ የጋብቻ ሁኔታ", labelAm: "የቀድሞ የጋብቻ ሁኔታ", type: "select", options: [
      { value: "single", labelEn: "Single", labelAm: "ያልተጋባ" },
      { value: "married", labelEn: "Married", labelAm: "ያገባ" },
      { value: "divorced", labelEn: "Divorced", labelAm: "የተፈታ" },
      { value: "widowed", labelEn: "Widowed", labelAm: "የተጠፋ" },
  ] },
  { name: "wifeEducationAm", labelEn: "የትምህርት ደረጃ", labelAm: "የትምህርት ደረጃ" },
  { name: "wifeJobAm", labelEn: "ሥራ", labelAm: "ሥራ" },
  { name: "wifePhoto", labelEn: "Photo of Bride", labelAm: "የሚስት ፎቶ", type: "file" },

  { section: "Full Information of Groom", sectionAm: "የባል ሙሉ መረጃ" },
  { name: "husbandIdNumberAm", labelEn: "ID. Card Number", labelAm: "የመታወቂያ ቁጥር" },
  { name: "husbandNameAm", labelEn: "Husband Name (AM)", labelAm: "የባል ስም (አማ)" },
  { name: "husbandNameEn", labelEn: "Husband Name (EN)", labelAm: "የባል ስም (እንግ)" },
  { name: "husbandFatherAm", labelEn: "Husband Father's Name (AM)", labelAm: "የባል የአባት ስም (አማ)" },
  { name: "husbandFatherEn", labelEn: "Husband Father's Name (EN)", labelAm: "የባል የአባት ስም (እንግ)" },
  { name: "husbandGrandfatherAm", labelEn: "Husband Grandfather's Name (AM)", labelAm: "የባል የአያት ስም (አማ)" },
  { name: "husbandGrandfatherEn", labelEn: "Husband Grandfather's Name (EN)", labelAm: "የባል የአያት ስም (እንግ)" },
  { name: "husbandNationalityAm", labelEn: "ዜግነት", labelAm: "ዜግነት" },
  { name: "husbandBirthDate", labelEn: "date of birth", labelAm: "የትውልድ ቀን", type: "ethiopian-date" },
  { name: "husbandBirthPlace", labelEn: "place of birth", labelAm: "የትውልድ ቦታ" },
  { name: "husbandResidence", labelEn: "መኖሪያ ቦታ", labelAm: "መኖሪያ ቦታ" },
  { name: "husbandEthnicityAm", labelEn: "Ethnicity", labelAm: "ዘር" },
  { name: "husbandReligionAm", labelEn: "Husband Religion", labelAm: "የባል ሃይማኖት", type: "select", options: [
      { value: "orthodox", labelEn: "Orthodox", labelAm: "ኦርቶዶክስ" },
      { value: "protestant", labelEn: "Protestant", labelAm: "ፕሮቴስታንት" },
      { value: "catholic", labelEn: "Catholic", labelAm: "ካቶሊክ" },
      { value: "muslim", labelEn: "Muslim", labelAm: "ሙስሊም" },
      { value: "other", labelEn: "Other", labelAm: "ሌላ" },
  ] },
  { name: "husbandPrevMaritalStatusAm", labelEn: "የቀድሞ የጋብቻ ሁኔታ", labelAm: "የቀድሞ የጋብቻ ሁኔታ", type: "select", options: [
      { value: "single", labelEn: "Single", labelAm: "ያልተጋባ" },
      { value: "married", labelEn: "Married", labelAm: "ያገባ" },
      { value: "divorced", labelEn: "Divorced", labelAm: "የተፈታ" },
      { value: "widowed", labelEn: "Widowed", labelAm: "የተጠፋ" },
  ] },
  { name: "husbandEducationAm", labelEn: "የትምህርት ደረጃ", labelAm: "የትምህርት ደረጃ" },
  { name: "husbandJobAm", labelEn: "ሥራ", labelAm: "ሥራ" },
  { name: "husbandConsent", labelEn: "Concent signed by Bride and Groom", labelAm: "በባል እና በሚስት የተፈረመ የስምምነት ቅጽ", type: "file" },
  { name: "husbandPhoto", labelEn: "Photo of Groom", labelAm: "የባል ፎቶ", type: "file" },

  { section: "Marriage Information", sectionAm: "የጋብቻ መረጃ" },
  { name: "marriageDate", labelEn: "Date", labelAm: "ቀን", type: "ethiopian-date" },
  { name: "marriagePlaceName", labelEn: "Place of Marriage", labelAm: "የጋብቻ ቦታ" },

  { section: "Witnesses of Bride", sectionAm: "የሚስት ምስክሮች" },
  { name: "brideWitness1Name", labelEn: "Witness 1: Name", labelAm: "ምስክር 1 ስም" },
  { name: "brideWitness1Father", labelEn: "Father's Name", labelAm: "የአባት ስም" },
  { name: "brideWitness1Grand", labelEn: "Grand Father's Name", labelAm: "የአያት ስም" },
  { name: "brideWitness1Residence", labelEn: "መኖሪያ ቦታ", labelAm: "መኖሪያ ቦታ" },
  { name: "brideWitness1IdAm", labelEn: "የመታወቂያ ቁጥር", labelAm: "የመታወቂያ ቁጥር" },
  { name: "brideWitness2Name", labelEn: "Witness 2: Name", labelAm: "ምስክር 2 ስም" },
  { name: "brideWitness2Father", labelEn: "Father's Name", labelAm: "የአባት ስም" },
  { name: "brideWitness2Grand", labelEn: "Grand Father's Name", labelAm: "የአያት ስም" },
  { name: "brideWitness2Residence", labelEn: "መኖሪያ ቦታ", labelAm: "መኖሪያ ቦታ" },
  { name: "brideWitness2IdAm", labelEn: "የመታወቂያ ቁጥር", labelAm: "የመታወቂያ ቁጥር" },

  { section: "Witnesses of Groom", sectionAm: "የባል ምስክሮች" },
  { name: "groomWitness1Name", labelEn: "Witness 1: Name", labelAm: "ምስክር 1 ስም" },
  { name: "groomWitness1Father", labelEn: "Father's Name", labelAm: "የአባት ስም" },
  { name: "groomWitness1Grand", labelEn: "Grand Father's Name", labelAm: "የአያት ስም" },
  { name: "groomWitness1Residence", labelEn: "መኖሪያ ቦታ", labelAm: "መኖሪያ ቦታ" },
  { name: "groomWitness1IdAm", labelEn: "ID. Card Number", labelAm: "የመታወቂያ ቁጥር" },
  { name: "groomWitness2Name", labelEn: "Witness 2: Name", labelAm: "ምስክር 2 ስም" },
  { name: "groomWitness2Father", labelEn: "Father's Name", labelAm: "የአባት ስም" },
  { name: "groomWitness2Grand", labelEn: "Grand Father's Name", labelAm: "የአያት ስም" },
  { name: "groomWitness2Residence", labelEn: "መኖሪያ ቦታ", labelAm: "መኖሪያ ቦታ" },
  { name: "groomWitness2IdAm", labelEn: "ID. Card Number", labelAm: "የመታወቂያ ቁጥር" },

  { section: "Registrar Information", sectionAm: "የምዝገባ መረጃ" },
  { name: "marriageConsentProof", labelEn: "Concent Proof", labelAm: "የፍቃድ ማረጋገጫ", type: "file" },
  { name: "registrarNameAm", labelEn: "Name", labelAm: "ስም" },
  { name: "registrarFatherNameAm", labelEn: "Father's Name", labelAm: "የአባት ስም" },
  { name: "registrarGrandNameAm", labelEn: "Grandfather's name", labelAm: "የአያት ስም" },
  { name: "registrarDate", labelEn: "Registration Date", labelAm: "የምዝገባ ቀን", type: "ethiopian-date" },
];

// Initial marriage form state
const initialMarriageFormState = {
  type: "marriage",
  registrationId: "",
  country: "Ethiopia",
  // Registration details
  registrationNumber: "",
  mainRegistrationRecordNumberAm: "",
  registrationDateEth: "",
  registrationTimeHourAm: "",
  // Place of marriage
  marriageRegion: "",
  marriageZone: "",
  marriageCity: "",
  marriageSubCity: "",
  marriageWoreda: "",
  marriageKebeleAm: "",
  // Bride
  wifeNameAm: "",
  wifeNameEn: "",
  wifeFatherAm: "",
  wifeFatherEn: "",
  wifeGrandfatherAm: "",
  wifeGrandfatherEn: "",
  wifeNationalityAm: "",
  wifeIdNumberAm: "",
  wifeBirthDateAm: "",
  wifeBirthPlace: "",
  wifeResidence: "",
  wifeEthnicity: "",
  wifeReligionAm: "",
  wifePrevMaritalStatusAm: "",
  wifeEducationAm: "",
  wifeJobAm: "",
  wifePhoto: null,
  // Groom
  husbandNameAm: "",
  husbandNameEn: "",
  husbandFatherAm: "",
  husbandFatherEn: "",
  husbandGrandfatherAm: "",
  husbandGrandfatherEn: "",
  husbandNationalityAm: "",
  husbandIdNumberAm: "",
  husbandBirthDate: "",
  husbandBirthPlace: "",
  husbandResidence: "",
  husbandEthnicityAm: "",
  husbandReligionAm: "",
  husbandPrevMaritalStatusAm: "",
  husbandEducationAm: "",
  husbandJobAm: "",
  husbandConsent: null,
  husbandPhoto: null,
  // Marriage info
  marriageDate: "",
  marriagePlaceName: "",
  // Witnesses - Bride
  brideWitness1Name: "",
  brideWitness1Father: "",
  brideWitness1Grand: "",
  brideWitness1Residence: "",
  brideWitness1IdAm: "",
  brideWitness2Name: "",
  brideWitness2Father: "",
  brideWitness2Grand: "",
  brideWitness2Residence: "",
  brideWitness2IdAm: "",
  // Witnesses - Groom
  groomWitness1Name: "",
  groomWitness1Father: "",
  groomWitness1Grand: "",
  groomWitness1Residence: "",
  groomWitness1IdAm: "",
  groomWitness2Name: "",
  groomWitness2Father: "",
  groomWitness2Grand: "",
  groomWitness2Residence: "",
  groomWitness2IdAm: "",
  // Registrar section
  marriageConsentProof: null,
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

const normalizeSexValue = (value) => {
  if (value === undefined || value === null) return null;
  const str = String(value).trim().toLowerCase();
  if (!str) return null;
  const maleTokens = ['male', 'm', 'boy', 'ወንድ', 'ወን'];
  const femaleTokens = ['female', 'f', 'girl', 'ሴት'];
  if (maleTokens.some((token) => str.startsWith(token))) return 'male';
  if (femaleTokens.some((token) => str.startsWith(token))) return 'female';
  return null;
};

const expectedSexForMarriageField = (fieldName) => {
  if (fieldName === 'wifeIdNumberAm') return 'female';
  if (fieldName === 'husbandIdNumberAm') return 'male';
  return null;
};

const buildSexErrorMessage = (expectedSex, lang) => {
  if (lang === 'am') {
    return expectedSex === 'female'
      ? "ይህ የመታወቂያ ቁጥር ሴት አይደለም።"
      : "ይህ የመታወቂያ ቁጥር ወንድ አይደለም።";
  }
  return expectedSex === 'female'
    ? "This ID number is not female's."
    : "This ID number is not male's.";
};

// Calculate age from Ethiopian date
const calculateAge = (ethDate) => {
  if (!ethDate || !ethDate.year || !ethDate.month || !ethDate.day) {
    return null;
  }
  try {
    const gregDateStr = ethToGreg(ethDate.year, ethDate.month, ethDate.day);
    if (!gregDateStr) return null;
    const birthDate = new Date(gregDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  } catch {
    return null;
  }
};

// Helper render function copied/adapted from BirthForm
const renderField = (field, form, setForm, lang, validationErrors, setValidationErrors, handleChange, opts, onBirthDateChange) => {
  const hasError = validationErrors[field.name];
  const errorMessage = hasError;
  const lockedSet = opts?.lockedFields;
  const isLocked = Boolean(lockedSet?.has?.(field.name));

  if (field.type === "select") {
    return (
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
    );
  }

  if (field.type === "location-region") {
    const isReg = field.name.startsWith("registration");
    const options = isReg ? opts.registrationRegionOptions : opts.regionOptions;
    return (
      <Select
        name={field.name}
        value={form[field.name] || ""}
        onChange={(e) => {
          handleChange(e);
          if (isReg) setForm(prev => ({ ...prev, registrationZone: "", registrationWoreda: "" }));
          else setForm(prev => ({ ...prev, marriageZone: "", marriageWoreda: "" }));
        }}
        hasError={hasError}
        errorMessage={errorMessage}
        disabled={isLocked}
      >
        <option value="">{translate(lang, "Select Region...", "ክልል ይምረጡ...")}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </Select>
    );
  }

  if (field.type === "location-zone") {
    const isReg = field.name.startsWith("registration");
    const options = isReg ? opts.registrationZoneOptions : opts.zoneOptions;
    return (
      <Select
        name={field.name}
        value={form[field.name] || ""}
        onChange={(e) => {
          handleChange(e);
          if (isReg) setForm(prev => ({ ...prev, registrationWoreda: "" }));
          else setForm(prev => ({ ...prev, marriageWoreda: "" }));
        }}
        hasError={hasError}
        errorMessage={errorMessage}
        disabled={isLocked || (isReg ? !form.registrationRegion : !form.marriageRegion)}
      >
        <option value="">{translate(lang, "Select Zone...", "ዞን ይምረጡ...")}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </Select>
    );
  }

  if (field.type === "location-woreda") {
    const isReg = field.name.startsWith("registration");
    const options = isReg ? opts.registrationWoredaOptions : opts.woredaOptions;
    return (
      <Select
        name={field.name}
        value={form[field.name] || ""}
        onChange={handleChange}
        hasError={hasError}
        errorMessage={errorMessage}
        disabled={isLocked || (isReg ? !form.registrationZone : !form.marriageZone)}
      >
        <option value="">{translate(lang, "Select Woreda...", "ወረዳ ይምረጡ...")}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </Select>
    );
  }

  // Name-based geo handling for marriage place (fields are plain names, not typed)
  if (/Region/.test(field.name)) {
    const isReg = field.name.startsWith("registration");
    const options = isReg ? opts.registrationRegionOptions : opts.regionOptions;
    return (
      <Select
        name={field.name}
        value={form[field.name] || ""}
        onChange={(e) => {
          handleChange(e);
          if (isReg) setForm(prev => ({ ...prev, registrationZone: "", registrationWoreda: "" }));
          else setForm(prev => ({ ...prev, marriageZone: "", marriageWoreda: "" }));
        }}
      >
        <option value="">{translate(lang, "Select...", "ይምረጡ...")}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
    );
  }
  if (/Zone/.test(field.name)) {
    const isReg = field.name.startsWith("registration");
    const options = isReg ? opts.registrationZoneOptions : opts.zoneOptions;
    const disabled = isReg ? !form.registrationRegion : !form.marriageRegion;
    return (
      <Select
        name={field.name}
        value={form[field.name] || ""}
        onChange={(e) => {
          handleChange(e);
          if (isReg) setForm(prev => ({ ...prev, registrationWoreda: "" }));
          else setForm(prev => ({ ...prev, marriageWoreda: "" }));
        }}
        disabled={disabled}
      >
        <option value="">{translate(lang, "Select...", "ይምረጡ...")}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
    );
  }
  if (/Woreda/.test(field.name)) {
    const isReg = field.name.startsWith("registration");
    const options = isReg ? opts.registrationWoredaOptions : opts.woredaOptions;
    const disabled = isReg ? !form.registrationZone : !form.marriageZone;
    return (
      <Select
        name={field.name}
        value={form[field.name] || ""}
        onChange={handleChange}
        disabled={disabled}
      >
        <option value="">{translate(lang, "Select...", "ይምረጡ...")}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
    );
  }

  if (field.type === "ethiopian-date") {
    const isBirthDate = field.name === "wifeBirthDateAm" || field.name === "husbandBirthDate";
    const currentAge = field.name === "wifeBirthDateAm" ? opts.wifeAge : (field.name === "husbandBirthDate" ? opts.husbandAge : null);
    const dateValue = form[field.name];
    const hasCompleteDate = dateValue && dateValue.year && dateValue.month && dateValue.day;
    
    return (
      <div>
        <div className={isLocked ? "pointer-events-none opacity-70" : ""}>
          <EthiopianDatePicker
            name={field.name}
            value={form[field.name] || ""}
            onChange={(date) => {
              if (isLocked) return;
              setForm(prev => ({ ...prev, [field.name]: date }));
              if (isBirthDate && onBirthDateChange) {
                onBirthDateChange(field.name, date);
              }
              // Validate future dates for marriage date
              if (field.name === "marriageDate" && date && date.year && date.month && date.day) {
                if (isEthiopianDateInFuture(date)) {
                  const errorMsg = opts.lang === 'en' 
                    ? 'Marriage date cannot be in the future'
                    : 'የጋብቻ ቀን ወደፊት ሊሆን አይችልም';
                  if (setValidationErrors) {
                    setValidationErrors(prev => ({ ...prev, [field.name]: errorMsg }));
                  }
                } else {
                  if (setValidationErrors) {
                    setValidationErrors(prev => {
                      const next = { ...prev };
                      delete next[field.name];
                      return next;
                    });
                  }
                }
              }
            }}
            hasError={hasError}
            errorMessage={errorMessage}
          />
        </div>
        {isBirthDate && hasCompleteDate && currentAge !== null && (
          <p className={`mt-1 text-sm ${currentAge < 18 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
            {opts.lang === 'en' ? `Age: ${currentAge} years` : `ዕድሜ: ${currentAge} ዓመት`}
          </p>
        )}
        {isBirthDate && hasCompleteDate && currentAge === null && (
          <p className="mt-1 text-sm text-gray-500">
            {opts.lang === 'en' ? 'Calculating age...' : 'ዕድሜ እየተሰላ ነው...'}
          </p>
        )}
      </div>
    );
  }

  if (field.type === "file") {
    return (
      <Input
        type="file"
        name={field.name}
        onChange={handleChange}
        hasError={hasError}
        errorMessage={errorMessage}
        accept="image/*,.pdf"
        disabled={isLocked}
      />
    );
  }

  return (
    <Input
      type="text"
      name={field.name}
      value={form[field.name] || ""}
      onChange={handleChange}
      hasError={hasError}
      errorMessage={errorMessage}
      disabled={isLocked}
    />
  );
};

// Marriage Form Component
const MarriageForm = ({ user, setUser, onSubmit, onEdit, editingEvent = null }) => {
  const [lang, setLang] = useState("am");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialMarriageFormState);
  const [generatedRegistrationId, setGeneratedRegistrationId] = useState(null);
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [hasValidationErrors, setHasValidationErrors] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const duplicateCheckTimeoutRef = React.useRef(null);
  const [wifeAge, setWifeAge] = useState(null);
  const [husbandAge, setHusbandAge] = useState(null);
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

  // Location dropdowns - using ETH_GEO data
  const regionOptions = useMemo(() => 
    Object.keys(ETH_GEO).map(region => ({ value: region, label: region })), []
  );

  const zoneOptions = useMemo(() => {
    if (!form.marriageRegion) return [];
    const zones = ETH_GEO[form.marriageRegion]?.zones ? Object.keys(ETH_GEO[form.marriageRegion].zones) : [];
    return zones.map(zone => ({ value: zone, label: zone }));
  }, [form.marriageRegion]);

  const woredaOptions = useMemo(() => {
    if (!form.marriageRegion || !form.marriageZone) return [];
    const woredas = ETH_GEO[form.marriageRegion]?.zones?.[form.marriageZone]?.woredas || [];
    const toLabel = (item) => (typeof item === "string" ? item : (lang === "en" ? item.en : item.am));
    const toValue = (item) => (typeof item === "string" ? item : (item.en || item.am || String(item)));
    return woredas.map(w => ({ value: toValue(w), label: toLabel(w) }));
  }, [form.marriageRegion, form.marriageZone, lang]);

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

    const expectedFieldSex = expectedSexForMarriageField(fieldName);
    setCheckingDuplicate(true);
    try {
      // Get the entered name for this person
      const enteredName = fieldName === 'wifeIdNumberAm' 
        ? (form.wifeNameAm || form.wifeNameEn || '')
        : (form.husbandNameAm || form.husbandNameEn || '');

      const params = new URLSearchParams({
        type: 'marriage',
        idNumber: String(idNumber).trim(),
        fieldName: fieldName,
      });
      
      // Pass the entered name to check for name mismatch
      if (enteredName) {
        params.append('enteredName', enteredName);
      }
      
      const shouldRequestPrefill = fieldName === 'wifeIdNumberAm' || fieldName === 'husbandIdNumberAm';
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

      if (result.sexMismatch) {
        const errorMsg = buildSexErrorMessage(result.expectedSex, lang);
        setValidationErrors((prev) => ({ ...prev, [fieldName]: errorMsg }));
        return;
      }

      if (result.isDuplicate) {
        // Check if this is a wrong person (ID belongs to someone else)
        if (result.isWrongPerson) {
          const errorMsg = lang === 'en' 
            ? `This identification card number belongs to another person (${result.existingName || 'different person'}).`
            : `ይህ የመታወቂያ ካርድ ቁጥር የሌላ ሰው ነው (${result.existingName || 'የተለየ ሰው'})።`;
          setValidationErrors((prev) => ({ ...prev, [fieldName]: errorMsg }));
        } else {
          // Check if it's a marriage-specific duplicate
          if (result.existingEventType === 'marriage') {
            const fieldLabel = fieldName === 'wifeIdNumberAm' ? (lang === 'en' ? 'Wife' : 'ሚስት') : (lang === 'en' ? 'Husband' : 'ባል');
            const errorMsg = lang === 'en' 
              ? `${fieldLabel} is already married. This person's ID number is already registered in a previous marriage event (Registration ID: ${result.existingRegistrationId})`
              : `${fieldLabel} አስቀድሞ ተጋብቷል። የዚህ ሰው የመታወቂያ ቁጥር በቀድሞ የጋብቻ ምዝገባ ተመዝግቧል (የመመዝገቢያ መለያ: ${result.existingRegistrationId})`;
            setValidationErrors((prev) => ({ ...prev, [fieldName]: errorMsg }));
          } else {
            // ID exists in another event type
            const errorMsg = lang === 'en' 
              ? `This identification card number belongs to another person (${result.existingName || 'different person'}).`
              : `ይህ የመታወቂያ ካርድ ቁጥር የሌላ ሰው ነው (${result.existingName || 'የተለየ ሰው'})።`;
            setValidationErrors((prev) => ({ ...prev, [fieldName]: errorMsg }));
          }
        }
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
      if (birthData && expectedFieldSex) {
        const detectedBirthSex = normalizeSexValue(
          birthData.childSex ??
          birthData.sex ??
          birthData.childSexAm ??
          birthData.childSexEn
        );
        if (detectedBirthSex && detectedBirthSex !== expectedFieldSex) {
          const errorMsg = buildSexErrorMessage(expectedFieldSex, lang);
          setValidationErrors((prev) => ({ ...prev, [fieldName]: errorMsg }));
          return;
        }
      }
      if (shouldRequestPrefill && birthData) {
        const patch = buildMarriagePrefillFromBirth(
          birthData,
          fieldName === 'wifeIdNumberAm' ? 'wife' : 'husband'
        );
        applyPrefillPatch(patch);
      }
    } catch (err) {
      console.error('Error checking duplicate ID:', err);
    } finally {
      setCheckingDuplicate(false);
    }
  }, [user?.token, lang, editingEvent?._id, fetchBirthRecord, form.wifeNameAm, form.wifeNameEn, form.husbandNameAm, form.husbandNameEn, applyPrefillPatch]);

  // Update form when editingEvent changes
  useEffect(() => {
    if (editingEvent) {
      setForm({
        ...initialMarriageFormState,
        ...editingEvent.data,
        type: editingEvent.type,
        registrationId: editingEvent.registrationId,
      });
      setGeneratedRegistrationId(editingEvent.registrationId);
    } else {
      setForm(initialMarriageFormState);
      setGeneratedRegistrationId(null);
    }
    setValidationErrors({});
    setHasValidationErrors(false);
    setWifeAge(null);
    setHusbandAge(null);
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

  // Handle birth date changes and calculate age
  const handleBirthDateChange = useCallback((fieldName, date) => {
    if (lockedFields.has(fieldName)) {
      return;
    }
    // Only calculate age if date is complete
    if (!date || !date.year || !date.month || !date.day) {
      if (fieldName === "wifeBirthDateAm") {
        setWifeAge(null);
      } else if (fieldName === "husbandBirthDate") {
        setHusbandAge(null);
      }
      return;
    }
    
    const age = calculateAge(date);
    if (fieldName === "wifeBirthDateAm") {
      setWifeAge(age);
      if (age !== null && age < 18) {
        const errorMsg = lang === 'en' 
          ? `Age is ${age} years. Minimum age for marriage is 18 years.`
          : `ዕድሜ ${age} ዓመት ነው። ለጋብቻ ዝቅተኛው ዕድሜ 18 ዓመት ነው።`;
        setValidationErrors((prev) => ({ ...prev, [fieldName]: errorMsg }));
      } else if (age !== null) {
        setValidationErrors((prev) => {
          const next = { ...prev };
          delete next[fieldName];
          return next;
        });
      }
    } else if (fieldName === "husbandBirthDate") {
      setHusbandAge(age);
      if (age !== null && age < 18) {
        const errorMsg = lang === 'en' 
          ? `Age is ${age} years. Minimum age for marriage is 18 years.`
          : `ዕድሜ ${age} ዓመት ነው። ለጋብቻ ዝቅተኛው ዕድሜ 18 ዓመት ነው።`;
        setValidationErrors((prev) => ({ ...prev, [fieldName]: errorMsg }));
      } else if (age !== null) {
        setValidationErrors((prev) => {
          const next = { ...prev };
          delete next[fieldName];
          return next;
        });
      }
    }
  }, [lang, lockedFields]);

  // Calculate ages when birth dates change
  useEffect(() => {
    if (form.wifeBirthDateAm && form.wifeBirthDateAm.year && form.wifeBirthDateAm.month && form.wifeBirthDateAm.day) {
      const age = calculateAge(form.wifeBirthDateAm);
      setWifeAge(age);
      if (age !== null && age < 18) {
        const errorMsg = lang === 'en' 
          ? `Age is ${age} years. Minimum age for marriage is 18 years.`
          : `ዕድሜ ${age} ዓመት ነው። ለጋብቻ ዝቅተኛው ዕድሜ 18 ዓመት ነው።`;
        setValidationErrors((prev) => ({ ...prev, wifeBirthDateAm: errorMsg }));
      } else if (age !== null) {
        setValidationErrors((prev) => {
          const next = { ...prev };
          delete next.wifeBirthDateAm;
          return next;
        });
      }
    } else {
      setWifeAge(null);
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next.wifeBirthDateAm;
        return next;
      });
    }
  }, [form.wifeBirthDateAm, lang]);

  useEffect(() => {
    if (form.husbandBirthDate && form.husbandBirthDate.year && form.husbandBirthDate.month && form.husbandBirthDate.day) {
      const age = calculateAge(form.husbandBirthDate);
      setHusbandAge(age);
      if (age !== null && age < 18) {
        const errorMsg = lang === 'en' 
          ? `Age is ${age} years. Minimum age for marriage is 18 years.`
          : `ዕድሜ ${age} ዓመት ነው። ለጋብቻ ዝቅተኛው ዕድሜ 18 ዓመት ነው።`;
        setValidationErrors((prev) => ({ ...prev, husbandBirthDate: errorMsg }));
      } else if (age !== null) {
        setValidationErrors((prev) => {
          const next = { ...prev };
          delete next.husbandBirthDate;
          return next;
        });
      }
    } else {
      setHusbandAge(null);
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next.husbandBirthDate;
        return next;
      });
    }
  }, [form.husbandBirthDate, lang]);

  // Re-check ID when name changes to detect name mismatches
  useEffect(() => {
    if (form.wifeIdNumberAm && form.wifeIdNumberAm.trim() !== '') {
      const timeoutId = setTimeout(() => {
        checkDuplicateId(form.wifeIdNumberAm, 'wifeIdNumberAm');
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [form.wifeNameAm, form.wifeNameEn, checkDuplicateId]);

  useEffect(() => {
    if (form.husbandIdNumberAm && form.husbandIdNumberAm.trim() !== '') {
      const timeoutId = setTimeout(() => {
        checkDuplicateId(form.husbandIdNumberAm, 'husbandIdNumberAm');
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [form.husbandNameAm, form.husbandNameEn, checkDuplicateId]);

  const NUMERIC_ONLY_FIELDS = new Set([
    'mainRegistrationRecordNumberAm', 'husbandIdNumberAm', 'brideWitness1IdAm', 'brideWitness2IdAm', 'groomWitness1IdAm', 'groomWitness2IdAm'
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

    const WIFE_FIELDS_TO_CLEAR = [
      'wifeNameAm', 'wifeNameEn',
      'wifeFatherAm', 'wifeFatherEn',
      'wifeGrandfatherAm', 'wifeGrandfatherEn',
      'wifeBirthDateAm', 'wifeBirthPlace',
      'wifeResidence', 'wifeEthnicity',
      'wifeReligionAm', 'wifeNationalityAm',
    ];
    const HUSBAND_FIELDS_TO_CLEAR = [
      'husbandNameAm', 'husbandNameEn',
      'husbandFatherAm', 'husbandFatherEn',
      'husbandGrandfatherAm', 'husbandGrandfatherEn',
      'husbandBirthDate', 'husbandBirthPlace',
      'husbandResidence', 'husbandEthnicityAm',
      'husbandReligionAm', 'husbandNationalityAm',
    ];
    const clearingWife = name === 'wifeIdNumberAm';
    const clearingHusband = name === 'husbandIdNumberAm';

    setForm((prev) => {
      const next = { ...prev, [name]: nextVal };

      if (clearingWife) {
        WIFE_FIELDS_TO_CLEAR.forEach((field) => {
          next[field] = field === 'wifeBirthDateAm' ? emptyEthiopianDate() : '';
        });
      }

      if (clearingHusband) {
        HUSBAND_FIELDS_TO_CLEAR.forEach((field) => {
          next[field] = field === 'husbandBirthDate' ? emptyEthiopianDate() : '';
        });
      }

      return next;
    });

    if (clearingWife) {
      unlockFields(WIFE_FIELDS_TO_CLEAR);
    }
    if (clearingHusband) {
      unlockFields(HUSBAND_FIELDS_TO_CLEAR);
    }
    setValidationErrors((prev) => ({ ...prev, [name]: warn || undefined }));

    // Check for duplicate ID card number with debounce (for both wife and husband)
    if ((name === 'wifeIdNumberAm' || name === 'husbandIdNumberAm') && nextVal && nextVal.trim() !== '') {
      // Clear previous timeout
      if (duplicateCheckTimeoutRef.current) {
        clearTimeout(duplicateCheckTimeoutRef.current);
      }
      
      // Set new timeout for debounced check (500ms delay)
      duplicateCheckTimeoutRef.current = setTimeout(() => {
        checkDuplicateId(nextVal, name);
      }, 500);
    } else if ((name === 'wifeIdNumberAm' || name === 'husbandIdNumberAm') && (!nextVal || nextVal.trim() === '')) {
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
    
    // Check for duplicate ID errors (already married or wrong person) before submitting
    const hasDuplicateErrors = Object.keys(validationErrors).some(key => 
      (key === 'wifeIdNumberAm' || key === 'husbandIdNumberAm') && 
      (validationErrors[key]?.includes('already married') || 
       validationErrors[key]?.includes('ተጋብቷል') || 
       validationErrors[key]?.includes('already registered') ||
       validationErrors[key]?.includes('belongs to another person') ||
       validationErrors[key]?.includes('የሌላ ሰው'))
    );
    
    if (hasDuplicateErrors) {
      const hasWrongPerson = Object.keys(validationErrors).some(key => 
        (key === 'wifeIdNumberAm' || key === 'husbandIdNumberAm') && 
        (validationErrors[key]?.includes('belongs to another person') ||
         validationErrors[key]?.includes('የሌላ ሰው'))
      );
      
      const errorMsg = hasWrongPerson
        ? (lang === 'en' 
            ? 'Cannot submit: One or both identification card numbers belong to different persons. Please verify the ID numbers match the persons being registered.'
            : 'ሊላክ አይችልም: አንድ ወይም ሁለቱም የመታወቂያ ካርድ ቁጥሮች የተለያዩ ሰዎች ናቸው። እባክዎ የመታወቂያ ቁጥሮቹ ከሚመዘገቡ ሰዎች ጋር እንደሚጣጣሙ ያረጋግጡ።')
        : (lang === 'en' 
            ? 'Cannot submit: One or both persons are already married. A person cannot be registered in multiple marriage events.'
            : 'ሊላክ አይችልም: አንድ ወይም ሁለቱም ሰዎች አስቀድሞ ተጋብተዋል። አንድ ሰው በበርካታ የጋብቻ ምዝገባዎች ሊመዘገብ አይችልም።');
      alert(errorMsg);
      return;
    }

    // Check for age validation errors before submitting
    const hasAgeErrors = (wifeAge !== null && wifeAge < 18) || (husbandAge !== null && husbandAge < 18);
    if (hasAgeErrors) {
      const errorMsg = lang === 'en' 
        ? 'Cannot submit: Both persons must be at least 18 years old to register a marriage.'
        : 'ሊላክ አይችልም: ሁለቱም ሰዎች ጋብቻ ለመመዝገብ ቢያንስ 18 ዓመት መሆን አለባቸው።';
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
      // Normalize Ethiopian date objects to ISO strings
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
        type: 'marriage',
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
            {translate(lang, "Marriage Registration Form", "የጋብቻ መዝገብ ቅፅ")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(() => {
                // Ensure English input fields always show English label text
                const labelFor = (fld) => {
                  try {
                    const n = fld?.name || "";
                    if (/En$/.test(n)) return fld.labelEn || fld.labelAm || n;
                    if (/Am$/.test(n)) return fld.labelAm || fld.labelEn || n;
                    return translate(lang, fld.labelEn, fld.labelAm);
                  } catch {
                    return translate(lang, fld?.labelEn, fld?.labelAm);
                  }
                };
                const elements = [];
                for (let i = 0; i < MARRIAGE_FORM_CONFIG.length; i++) {
                  const field = MARRIAGE_FORM_CONFIG[i];
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
                    const next = MARRIAGE_FORM_CONFIG[i + 1];
                    if (next && !next.section && next.name) {
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
                              <Label htmlFor={left.name}>{labelFor(left)}</Label>
                                {renderField(left, form, setForm, lang, validationErrors, setValidationErrors, handleChange, { regionOptions, zoneOptions, woredaOptions, registrationRegionOptions, registrationZoneOptions, registrationWoredaOptions, wifeAge, husbandAge, lang, lockedFields }, handleBirthDateChange)}
                            </div>
                            <div className="md:col-start-2">
                              <Label htmlFor={right.name}>{labelFor(right)}</Label>
                                {renderField(right, form, setForm, lang, validationErrors, setValidationErrors, handleChange, { regionOptions, zoneOptions, woredaOptions, registrationRegionOptions, registrationZoneOptions, registrationWoredaOptions, wifeAge, husbandAge, lang, lockedFields }, handleBirthDateChange)}
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
                        <Label htmlFor={field.name}>{labelFor(field)}</Label>
                        {renderField(field, form, setForm, lang, validationErrors, setValidationErrors, handleChange, { regionOptions, zoneOptions, woredaOptions, registrationRegionOptions, registrationZoneOptions, registrationWoredaOptions, wifeAge, husbandAge, lang, lockedFields }, handleBirthDateChange)}
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
                  : translate(lang, "Save Marriage Record", "የጋብቻ መዝገብ አስቀምጥ")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarriageForm;
