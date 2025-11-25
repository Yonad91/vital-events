const truthyString = (value) => {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const prefer = (...values) => {
  for (const value of values) {
    const cleaned = truthyString(value);
    if (cleaned) return cleaned;
  }
  return null;
};

const splitFullNameParts = (fullName) => {
  const cleaned = truthyString(fullName);
  if (!cleaned) return [];
  return cleaned
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
};

const joinParts = (...parts) => {
  const cleaned = parts
    .map((part) => {
      if (typeof part === "string") {
        return part.trim();
      }
      return part ?? "";
    })
    .filter((part) => part && String(part).trim().length);
  if (!cleaned.length) return null;
  return cleaned.join(" ").replace(/\s+/g, " ").trim();
};

const toDateObject = (value) => {
  if (!value) return null;
  if (
    typeof value === "object" &&
    value !== null &&
    "year" in value &&
    "month" in value &&
    "day" in value
  ) {
    return value;
  }
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\//g, "-");
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  return {
    year,
    month: String(Number(month)),
    day: String(Number(day)),
  };
};

const isDateObject = (value) =>
  value &&
  typeof value === "object" &&
  "year" in value &&
  "month" in value &&
  "day" in value;

const isEmptyDateObject = (value) =>
  isDateObject(value) &&
  [value.year, value.month, value.day].every(
    (part) => !part && part !== 0 && part !== "0"
  );

const isEmptyValue = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (isDateObject(value)) return isEmptyDateObject(value);
  return false;
};

export const mergePrefillState = (currentState, patch) => {
  if (!patch || typeof patch !== "object") return currentState;
  let changed = false;
  const next = { ...currentState };
  Object.entries(patch).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && !value.trim()) return;
    const existing = currentState[key];
    if (isEmptyValue(existing)) {
      next[key] = value;
      changed = true;
    }
  });
  return changed ? next : currentState;
};

const extractBaseFromBirth = (birthData = {}) => {
  const amParts = splitFullNameParts(birthData.childFullNameAm);
  const enParts = splitFullNameParts(birthData.childFullNameEn);

  const givenNameAm = prefer(birthData.childNameAm, amParts[0]);
  const fatherNameAm = prefer(
    birthData.fatherNameAm,
    birthData.fatherFullNameAm,
    amParts[1]
  );
  const grandfatherNameAm = prefer(
    birthData.childGrandfatherNameAm,
    amParts[2],
    birthData.grandfatherNameAm
  );

  const givenNameEn = prefer(birthData.childNameEn, enParts[0]);
  const fatherNameEn = prefer(
    birthData.fatherNameEn,
    birthData.fatherFullNameEn,
    enParts[1]
  );
  const grandfatherNameEn = prefer(
    birthData.childGrandfatherNameEn,
    enParts[2],
    birthData.grandfatherNameEn
  );

  const childFullNameAm =
    truthyString(birthData.childFullNameAm) ||
    joinParts(givenNameAm, fatherNameAm, grandfatherNameAm);
  const childFullNameEn =
    truthyString(birthData.childFullNameEn) ||
    joinParts(givenNameEn, fatherNameEn, grandfatherNameEn);

  return {
    idNumber: truthyString(birthData.childIdNumberAm),
    fullNameAm: childFullNameAm,
    fullNameEn: childFullNameEn,
    givenNameAm,
    givenNameEn,
    fatherNameAm,
    fatherNameEn,
    grandfatherNameAm,
    grandfatherNameEn,
    birthDate: toDateObject(birthData.birthDate),
    sex: truthyString(birthData.sex),
    religion: prefer(
      birthData.childReligionAm,
      birthData.childReligion,
      birthData.fatherReligion,
      birthData.motherReligionAm
    ),
    nationality:
      truthyString(birthData.nationality) ||
      truthyString(birthData.childNationalityAm),
    ethnicity:
      truthyString(birthData.childEthnicityAm) ||
      truthyString(birthData.motherEthnicityAm) ||
      truthyString(birthData.fatherEthnicity),
    region:
      truthyString(birthData.region) || truthyString(birthData.registrationRegion),
    zone:
      truthyString(birthData.zone) || truthyString(birthData.registrationZone),
    woreda:
      truthyString(birthData.woreda) ||
      truthyString(birthData.registrationWoreda) ||
      truthyString(birthData.birthPlaceWoreda),
    kebele:
      truthyString(birthData.kebele) ||
      truthyString(birthData.registrationKebele) ||
      truthyString(birthData.birthPlaceKebele),
    city:
      truthyString(birthData.birthPlaceCity) ||
      truthyString(birthData.registrationCity),
    subCity:
      truthyString(birthData.birthPlaceSubCity) ||
      truthyString(birthData.registrationSubCity),
    residence:
      truthyString(birthData.registrationCity) ||
      truthyString(birthData.birthPlaceCity),
  };
};

const filterEmpty = (obj = {}) => {
  const result = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && !value.trim()) return;
    if (isDateObject(value) && isEmptyDateObject(value)) return;
    result[key] = value;
  });
  return result;
};

export const buildMarriagePrefillFromBirth = (birthData, target = "wife") => {
  const base = extractBaseFromBirth(birthData);
  if (!base.fullNameAm && !base.fullNameEn) return {};
  const isWife = target === "wife";
  const prefix = isWife ? "wife" : "husband";
  const patch = {
    [`${prefix}IdNumberAm`]: base.idNumber,
    [`${prefix}NameAm`]: base.givenNameAm || base.fullNameAm,
    [`${prefix}NameEn`]: base.givenNameEn || base.fullNameEn,
    [`${prefix}FatherAm`]: base.fatherNameAm,
    [`${prefix}FatherEn`]: base.fatherNameEn,
    [`${prefix}GrandfatherAm`]: base.grandfatherNameAm,
    [`${prefix}GrandfatherEn`]: base.grandfatherNameEn,
    [`${prefix}BirthPlace`]: joinParts(base.city, base.subCity, base.woreda),
    [`${prefix}Residence`]: base.residence,
    [`${prefix}NationalityAm`]: base.nationality,
    [`${prefix}ReligionAm`]: base.religion,
  };
  if (isWife) {
    patch.wifeBirthDate = base.birthDate;
    patch.wifeEthnicity = base.ethnicity;
  } else {
    patch.husbandBirthDate = base.birthDate;
    patch.husbandEthnicityAm = base.ethnicity;
  }
  return filterEmpty(patch);
};

export const buildDeathPrefillFromBirth = (birthData) => {
  const base = extractBaseFromBirth(birthData);
  if (!base.fullNameAm && !base.fullNameEn) return {};
  const patch = {
    deceasedNameAm: base.givenNameAm || base.fullNameAm,
    deceasedNameEn: base.givenNameEn || base.fullNameEn,
    deceasedFatherAm: base.fatherNameAm,
    deceasedFatherEn: base.fatherNameEn,
    deceasedGrandfatherAm: base.grandfatherNameAm,
    deceasedGrandfatherEn: base.grandfatherNameEn,
    deceasedBirthDate: base.birthDate,
    deceasedNationalityAm: base.nationality,
    deceasedResidence: base.residence,
    deceasedEthnicity: base.ethnicity,
    deceasedSex: base.sex,
    deceasedIdNumberAm: base.idNumber,
    deceasedReligion: base.religion,
  };
  return filterEmpty(patch);
};

export const buildDivorcePrefillFromBirth = (birthData, target = "spouse1") => {
  const base = extractBaseFromBirth(birthData);
  if (!base.fullNameAm && !base.fullNameEn) return {};
  const prefix = target === "spouse2" ? "divorceSpouse2" : "divorceSpouse1";
  const patch = {
    [`${prefix}IdAm`]: base.idNumber,
    [`${prefix}NameAm`]: base.givenNameAm || base.fullNameAm,
    [`${prefix}NameEn`]: base.givenNameEn || base.fullNameEn,
    [`${prefix}FatherNameAm`]: base.fatherNameAm,
    [`${prefix}FatherNameEn`]: base.fatherNameEn,
    [`${prefix}GrandfatherNameAm`]: base.grandfatherNameAm,
    [`${prefix}GrandfatherNameEn`]: base.grandfatherNameEn,
    [`${prefix}BirthPlaceAm`]: joinParts(base.city, base.subCity, base.woreda),
    [`${prefix}BirthPlaceEn`]: joinParts(base.city, base.subCity, base.woreda),
    [`${prefix}ResidenceAm`]: base.residence,
    [`${prefix}ResidenceEn`]: base.residence,
    [`${prefix}NationalityAm`]: base.nationality,
    [`${prefix}BirthDate`]: base.birthDate,
    [`${prefix}Ethnicity`]: base.ethnicity,
    [`${prefix}ReligionAm`]: base.religion,
  };
  return filterEmpty(patch);
};

// Extract person data from marriage event (for wife or husband)
const extractPersonFromMarriage = (marriageData = {}, personType = "wife") => {
  const isWife = personType === "wife";
  const prefix = isWife ? "wife" : "husband";
  
  const nameAm = prefer(
    marriageData[`${prefix}NameAm`],
    marriageData[`${prefix}FullNameAm`]
  );
  const nameEn = prefer(
    marriageData[`${prefix}NameEn`],
    marriageData[`${prefix}FullNameEn`]
  );
  
  const fatherNameAm = prefer(
    marriageData[`${prefix}FatherAm`],
    marriageData[`${prefix}FatherNameAm`],
    marriageData[`${prefix}FatherEn`],
    marriageData[`${prefix}FatherNameEn`]
  );
  const fatherNameEn = prefer(
    marriageData[`${prefix}FatherEn`],
    marriageData[`${prefix}FatherNameEn`],
    marriageData[`${prefix}FatherAm`],
    marriageData[`${prefix}FatherNameAm`]
  );
  
  const grandfatherNameAm = prefer(
    marriageData[`${prefix}GrandfatherAm`],
    marriageData[`${prefix}GrandfatherNameAm`],
    marriageData[`${prefix}GrandfatherEn`],
    marriageData[`${prefix}GrandfatherNameEn`]
  );
  const grandfatherNameEn = prefer(
    marriageData[`${prefix}GrandfatherEn`],
    marriageData[`${prefix}GrandfatherNameEn`],
    marriageData[`${prefix}GrandfatherAm`],
    marriageData[`${prefix}GrandfatherNameAm`]
  );
  
  const education = prefer(
    marriageData[`${prefix}EducationAm`],
    marriageData[`${prefix}Education`]
  );
  const job = prefer(
    marriageData[`${prefix}JobAm`],
    marriageData[`${prefix}Occupation`]
  );
  const photo = truthyString(marriageData[`${prefix}Photo`]);
  
  return {
    idNumber: truthyString(marriageData[`${prefix}IdNumberAm`]),
    nameAm,
    nameEn,
    fatherNameAm,
    fatherNameEn,
    grandfatherNameAm,
    grandfatherNameEn,
    birthDate: toDateObject(isWife ? (marriageData.wifeBirthDate || marriageData.wifeBirthDateAm) : marriageData.husbandBirthDate),
    nationality: truthyString(marriageData[`${prefix}NationalityAm`]),
    religion: prefer(
      marriageData[`${prefix}ReligionAm`],
      marriageData[`${prefix}Religion`]
    ),
    ethnicity: truthyString(marriageData[`${prefix}Ethnicity`] || marriageData[`${prefix}EthnicityAm`]),
    residence: truthyString(marriageData[`${prefix}Residence`]),
    birthPlace: truthyString(marriageData[`${prefix}BirthPlace`]),
    education,
    job,
    photo,
    sex: isWife ? 'female' : 'male', // Add sex information for validation
    personType: personType, // Add personType for reference
  };
};

// Build prefill data for death form from marriage event
export const buildDeathPrefillFromMarriage = (marriageData, idNumber) => {
  if (!marriageData || !idNumber) return {};
  
  // Determine if the ID belongs to wife or husband
  const wifeId = truthyString(marriageData.wifeIdNumberAm);
  const husbandId = truthyString(marriageData.husbandIdNumberAm);
  const normalizedId = String(idNumber || '').trim().toLowerCase();
  
  let personData = null;
  let personType = null;
  
  if (wifeId && String(wifeId).trim().toLowerCase() === normalizedId) {
    personData = extractPersonFromMarriage(marriageData, "wife");
    personType = "wife";
  } else if (husbandId && String(husbandId).trim().toLowerCase() === normalizedId) {
    personData = extractPersonFromMarriage(marriageData, "husband");
    personType = "husband";
  }
  
  if (!personData || (!personData.nameAm && !personData.nameEn)) {
    console.warn('[buildDeathPrefillFromMarriage] No person data found for ID:', idNumber, 'wifeId:', wifeId, 'husbandId:', husbandId);
    return {};
  }
  
  console.log('[buildDeathPrefillFromMarriage] Found person data for', personType, ':', personData);
  
  const patch = {
    deceasedNameAm: personData.nameAm,
    deceasedNameEn: personData.nameEn,
    deceasedFatherAm: personData.fatherNameAm,
    deceasedFatherEn: personData.fatherNameEn,
    deceasedGrandfatherAm: personData.grandfatherNameAm,
    deceasedGrandfatherEn: personData.grandfatherNameEn,
    deceasedBirthDate: personData.birthDate,
    deceasedNationalityAm: personData.nationality,
    deceasedResidence: personData.residence,
    deceasedEthnicity: personData.ethnicity,
    deceasedIdNumberAm: personData.idNumber,
    deceasedReligion: personData.religion,
  };
  const filtered = filterEmpty(patch);
  console.log('[buildDeathPrefillFromMarriage] Generated patch:', filtered);
  return filtered;
};

// Build prefill data for divorce form from marriage event
const buildDivorcePatchFromPerson = (personData = {}, prefix) => {
  if (!prefix) return {};
  const patch = {
    [`${prefix}IdAm`]: personData.idNumber,
    [`${prefix}NameAm`]: personData.nameAm,
    [`${prefix}NameEn`]: personData.nameEn,
    [`${prefix}FatherNameAm`]: personData.fatherNameAm,
    [`${prefix}FatherNameEn`]: personData.fatherNameEn,
    [`${prefix}GrandfatherNameAm`]: personData.grandfatherNameAm,
    [`${prefix}GrandfatherNameEn`]: personData.grandfatherNameEn,
    [`${prefix}BirthPlaceAm`]: personData.birthPlace,
    [`${prefix}BirthPlaceEn`]: personData.birthPlace,
    [`${prefix}ResidenceAm`]: personData.residence,
    [`${prefix}ResidenceEn`]: personData.residence,
    [`${prefix}NationalityAm`]: personData.nationality,
    [`${prefix}BirthDate`]: personData.birthDate,
    [`${prefix}Ethnicity`]: personData.ethnicity,
    [`${prefix}ReligionAm`]: personData.religion,
    [`${prefix}EducationAm`]: personData.education,
    [`${prefix}JobAm`]: personData.job,
    [`${prefix}Photo`]: personData.photo,
  };
  return filterEmpty(patch);
};

export const buildDivorcePrefillFromMarriage = (marriageData, idNumber, target = "spouse1", currentFormData = {}) => {
  if (!marriageData || !idNumber) return { shouldAutofill: false, error: null };
  
  // Determine if the ID belongs to wife or husband
  const wifeId = truthyString(marriageData.wifeIdNumberAm);
  const husbandId = truthyString(marriageData.husbandIdNumberAm);
  const normalizedId = String(idNumber || '').trim().toLowerCase();
  
  let personData = null;
  let personType = null;
  
  if (wifeId && String(wifeId).trim().toLowerCase() === normalizedId) {
    personData = extractPersonFromMarriage(marriageData, "wife");
    personType = "wife";
  } else if (husbandId && String(husbandId).trim().toLowerCase() === normalizedId) {
    personData = extractPersonFromMarriage(marriageData, "husband");
    personType = "husband";
  }
  
  if (!personData || (!personData.nameAm && !personData.nameEn)) {
    console.warn('[buildDivorcePrefillFromMarriage] No person data found for ID:', idNumber, 'wifeId:', wifeId, 'husbandId:', husbandId);
    return { shouldAutofill: false, error: null };
  }
  
  console.log('[buildDivorcePrefillFromMarriage] Found person data for', personType, ':', personData);
  
  // Validate gender assignment: prevent husband data from being filled into wrong spouse field
  // Rule: If autofilling from marriage, ensure gender consistency
  const otherSpousePrefix = target === "spouse2" ? "divorceSpouse1" : "divorceSpouse2";
  const otherSpouseId = currentFormData[`${otherSpousePrefix}IdAm`];
  const currentSpousePrefix = target === "spouse2" ? "divorceSpouse2" : "divorceSpouse1";
  
  // Check if the other spouse already has an ID from the same marriage
  if (otherSpouseId) {
    const otherNormalizedId = String(otherSpouseId).trim().toLowerCase();
    const otherIsWife = wifeId && String(wifeId).trim().toLowerCase() === otherNormalizedId;
    const otherIsHusband = husbandId && String(husbandId).trim().toLowerCase() === otherNormalizedId;
    
    // If both spouses are from the same marriage but have same gender, that's an error
    if ((otherIsWife && personType === "wife") || (otherIsHusband && personType === "husband")) {
      const errorMsg = personType === "wife" 
        ? "Cannot autofill: Both spouses cannot be the wife from the same marriage record."
        : "Cannot autofill: Both spouses cannot be the husband from the same marriage record.";
      console.warn('[buildDivorcePrefillFromMarriage] Gender conflict detected:', errorMsg);
      return { 
        shouldAutofill: false, 
        error: errorMsg,
        personType,
        personSex: personData.sex
      };
    }
  }
  
  // Additional validation: Check if we're trying to fill the wrong gender
  // If spouse1 already has wife data and we're trying to fill spouse2 with wife data, prevent it
  // If spouse2 already has husband data and we're trying to fill spouse1 with husband data, prevent it
  const spouse1Id = currentFormData.divorceSpouse1IdAm;
  const spouse2Id = currentFormData.divorceSpouse2IdAm;
  
  // Check if spouse1 has wife ID from this marriage and we're trying to fill spouse2 with wife
  if (target === "spouse2" && personType === "wife" && spouse1Id) {
    const spouse1NormalizedId = String(spouse1Id).trim().toLowerCase();
    if (wifeId && String(wifeId).trim().toLowerCase() === spouse1NormalizedId) {
      const errorMsg = "Cannot autofill: Spouse 2 cannot be the wife when Spouse 1 is already the wife from the same marriage.";
      console.warn('[buildDivorcePrefillFromMarriage] Gender conflict: Spouse2 cannot be wife when Spouse1 is wife');
      return { 
        shouldAutofill: false, 
        error: errorMsg,
        personType,
        personSex: personData.sex
      };
    }
  }
  
  // Check if spouse2 has husband ID from this marriage and we're trying to fill spouse1 with husband
  if (target === "spouse1" && personType === "husband" && spouse2Id) {
    const spouse2NormalizedId = String(spouse2Id).trim().toLowerCase();
    if (husbandId && String(husbandId).trim().toLowerCase() === spouse2NormalizedId) {
      const errorMsg = "Cannot autofill: Spouse 1 cannot be the husband when Spouse 2 is already the husband from the same marriage.";
      console.warn('[buildDivorcePrefillFromMarriage] Gender conflict: Spouse1 cannot be husband when Spouse2 is husband');
      return { 
        shouldAutofill: false, 
        error: errorMsg,
        personType,
        personSex: personData.sex
      };
    }
  }
  
  // Prevent: If spouse1 is being filled with husband data, but spouse2 already has husband data from same marriage
  if (target === "spouse1" && personType === "husband" && spouse2Id) {
    const spouse2NormalizedId = String(spouse2Id).trim().toLowerCase();
    if (husbandId && String(husbandId).trim().toLowerCase() === spouse2NormalizedId) {
      const errorMsg = "Cannot autofill: Cannot fill husband's data into Spouse 1 when Spouse 2 is already the husband.";
      console.warn('[buildDivorcePrefillFromMarriage] Gender conflict: Cannot fill husband into Spouse1 when Spouse2 is husband');
      return { 
        shouldAutofill: false, 
        error: errorMsg,
        personType,
        personSex: personData.sex
      };
    }
  }
  
  // Prevent: If spouse2 is being filled with wife data, but spouse1 already has wife data from same marriage
  if (target === "spouse2" && personType === "wife" && spouse1Id) {
    const spouse1NormalizedId = String(spouse1Id).trim().toLowerCase();
    if (wifeId && String(wifeId).trim().toLowerCase() === spouse1NormalizedId) {
      const errorMsg = "Cannot autofill: Cannot fill wife's data into Spouse 2 when Spouse 1 is already the wife.";
      console.warn('[buildDivorcePrefillFromMarriage] Gender conflict: Cannot fill wife into Spouse2 when Spouse1 is wife');
      return { 
        shouldAutofill: false, 
        error: errorMsg,
        personType,
        personSex: personData.sex
      };
    }
  }
  
  const prefix = target === "spouse2" ? "divorceSpouse2" : "divorceSpouse1";
  const partnerPrefix = target === "spouse2" ? "divorceSpouse1" : "divorceSpouse2";
  const partnerType = personType === "wife" ? "husband" : "wife";
  const partnerData = extractPersonFromMarriage(marriageData, partnerType);

  const selfPatch = buildDivorcePatchFromPerson(personData, prefix);
  const partnerPatch = partnerData ? buildDivorcePatchFromPerson(partnerData, partnerPrefix) : {};
  const combinedPatch = { ...partnerPatch, ...selfPatch };
  
  const marriagePlace = prefer(
    marriageData.marriagePlaceAm,
    marriageData.marriagePlaceName,
    marriageData.marriagePlaceEn,
    marriageData.marriageCity
  );
  if (marriagePlace) {
    combinedPatch.divorceMarriagePlace = marriagePlace;
  }
  const marriageDate = toDateObject(marriageData.marriageDate || marriageData.marriageDateEth);
  if (marriageDate) {
    combinedPatch.divorceMarriageDate = marriageDate;
  }

  console.log('[buildDivorcePrefillFromMarriage] Generated patch:', combinedPatch);
  return { 
    shouldAutofill: true, 
    patch: combinedPatch,
    personType,
    personSex: personData.sex
  };
};


