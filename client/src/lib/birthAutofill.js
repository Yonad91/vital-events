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
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
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
    patch.wifeBirthDateAm = base.birthDate;
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


