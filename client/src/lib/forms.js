// Ethiopian Date Picker (reusable for forms)
import React from "react";
const ETH_MONTHS = [
  "መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት", "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜን"
];
export function EthiopianDatePicker({ value, onChange, name, id, hasError, errorMessage }) {
  const [year, setYear] = React.useState(value?.year || "");
  const [month, setMonth] = React.useState(value?.month || "");
  const [day, setDay] = React.useState(value?.day || "");

  const handleYearChange = (e) => {
    setYear(e.target.value);
    onChange({ year: e.target.value, month, day });
  };
  const handleMonthChange = (e) => {
    setMonth(e.target.value);
    onChange({ year, month: e.target.value, day });
  };
  const handleDayChange = (e) => {
    setDay(e.target.value);
    onChange({ year, month, day: e.target.value });
  };

  const errorBorderStyle = hasError ? { border: "1px solid #ef4444", borderRadius: "4px" } : {};

  return (
    <div>
      <div style={{ display: "flex", gap: 8, ...errorBorderStyle, padding: hasError ? "4px" : "0" }}>
        <input
          type="number"
          min="2000"
          max="2099"
          placeholder="ዓመት"
          value={year}
          onChange={handleYearChange}
          style={{ 
            width: 60,
            border: hasError ? "1px solid #ef4444" : "1px solid #d1d5db",
            borderRadius: "4px",
            padding: "4px"
          }}
          name={name ? `${name}Year` : undefined}
          id={id ? `${id}Year` : undefined}
        />
        <select
          value={month}
          onChange={handleMonthChange}
          style={{ 
            width: 60,
            border: hasError ? "1px solid #ef4444" : "1px solid #d1d5db",
            borderRadius: "4px",
            padding: "4px"
          }}
          name={name ? `${name}Month` : undefined}
          id={id ? `${id}Month` : undefined}
        >
          <option value="">ወር</option>
          {ETH_MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          max={month === "13" ? "6" : "30"}
          placeholder="ቀን"
          value={day}
          onChange={handleDayChange}
          style={{ 
            width: 40,
            border: hasError ? "1px solid #ef4444" : "1px solid #d1d5db",
            borderRadius: "4px",
            padding: "4px"
          }}
          name={name ? `${name}Day` : undefined}
          id={id ? `${id}Day` : undefined}
        />
      </div>
      {hasError && errorMessage && (
        <p style={{ marginTop: "4px", fontSize: "12px", color: "#ef4444" }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
// Shared form schema to ensure identical forms across dashboards (Amharic-first)

export const INITIAL_FORM_STATE = {
  type: "birth",
  registrationId: "",

  // Birth section I
  childFullNameAm: "",
  childFullNameEn: "",
  sex: "",
  birthDate: "",
  birthTime: "",
  birthPlaceCity: "",
  birthPlaceWoreda: "",
  birthPlaceKebele: "",
  placeOfBirthEn: "",
    birthDate: "", // type: 'ethiopian-date'
  region: "",
  zone: "",
  woreda: "",
  kebele: "",
  nationality: "",

  // Mother section II
  motherFullNameAm: "",
  motherFullNameEn: "",
  motherSex: "",
  motherBirthDate: "",
  motherBirthPlace: "",
  motherIdOrPassport: "",
  motherEducationLevel: "",
  motherOccupation: "",

    motherBirthDate: "", // type: 'ethiopian-date'
  fatherFullNameAm: "",
  fatherFullNameEn: "",
  fatherBirthPlace: "",
  fatherSex: "",
  fatherBirthDate: "",
  fatherIdOrPassport: "",
  fatherEducationLevel: "",
  fatherOccupation: "",

  // Witness section IV
    fatherBirthDate: "", // type: 'ethiopian-date'
  witnessTwoFullName: "",
  witnessIdOrPassport: "",
  witnessAddress: "",

  // Officer section V
  officerName: "",
  officerSignature: "",
    officerDate: "", // type: 'ethiopian-date'

  // Files
  childPhoto: null,
    husbandBirthDate: "", // type: 'ethiopian-date'
  consentPhoto: null,
    wifeBirthDate: "", // type: 'ethiopian-date'
  idCardImage: null,
    marriageDate: "", // type: 'ethiopian-date'
  uploadedform: null,
    certificateDate: "", // type: 'ethiopian-date'

    deceasedBirthDate: "", // type: 'ethiopian-date'
  // Marriage
    deathDate: "", // type: 'ethiopian-date'
  husbandNameEn: "",
    deathCertificateDate: "", // type: 'ethiopian-date'
  husbandNameAm: "",
  husbandFatherEn: "",
  husbandFatherAm: "",
  husbandGrandfatherEn: "",
  husbandGrandfatherAm: "",
  husbandBirthDate: "", // type: 'ethiopian-date'
  husbandNationality: "",
  husbandPhoto: null,
  wifeNameEn: "",
  wifeNameAm: "",
  wifeFatherEn: "",
  wifeFatherAm: "",
  wifeGrandfatherEn: "",
  wifeGrandfatherAm: "",
  wifeBirthDate: "", // type: 'ethiopian-date'
  wifeNationality: "",
  wifePhoto: null,
  marriageDate: "", // type: 'ethiopian-date'
  marriagePlaceEn: "",
  marriagePlaceAm: "",
  marriageRegion: "",
  marriageZone: "",
  marriageCity: "",
  marriageSubCity: "",
  marriageWoreda: "",
  marriageKebele: "",
  certificateDate: "", // type: 'ethiopian-date'
  consentForm: null,

  // Death
  deceasedNameEn: "",
  deceasedNameAm: "",
  deceasedFatherEn: "",
  deceasedFatherAm: "",
  deceasedGrandfatherEn: "",
  deceasedGrandfatherAm: "",
  deceasedBirthDate: "", // type: 'ethiopian-date'
  deceasedNationality: "",
  deceasedPhoto: null,
  deathDate: "", // type: 'ethiopian-date'
  deathPlaceEn: "",
  deathPlaceAm: "",
  deathRegion: "",
  deathZone: "",
  deathWoreda: "",
  deathKebele: "",
  causeOfDeath: "",
  deathCertificateDate: "", // type: 'ethiopian-date'
  deathConsentForm: null,
};

export const FORM_CONFIG = {
  birth: [
    // I. የልጅ ነባር
    { name: "childFullNameAm", labelAm: "ሙሉ ስም (አማርኛ)" },
    { name: "childFullNameEn", labelAm: "ሙሉ ስም (እንግሊዝኛ)" },
    { name: "sex", labelAm: "ፆታ" },
  { name: "birthDate", labelAm: "የትውልድ ቀን", type: "ethiopian-date" },
    { name: "birthTime", labelAm: "የትውልድ ሰአት" },
    { name: "birthPlaceCity", labelAm: "ከተማ" },
    { name: "birthPlaceWoreda", labelAm: "ወረዳ" },
    { name: "birthPlaceKebele", labelAm: "ቀበሌ" },

    // II. የእናቱ መረጃ
    { name: "motherFullNameAm", labelAm: "ሙሉ ስም (አማርኛ)" },
    { name: "motherFullNameEn", labelAm: "ሙሉ ስም (እንግሊዝኛ)" },
    { name: "motherSex", labelAm: "የእናቱ ፆታ" },
  { name: "motherBirthDate", labelAm: "የትውልድ ቀን", type: "ethiopian-date" },
    { name: "motherBirthPlace", labelAm: "የትውልድ ቦታ" },
    { name: "motherIdOrPassport", labelAm: "የእናቱ አይዲ / ፓስፖርት ቁጥር" },
    { name: "motherEducationLevel", labelAm: "የትምህርት ደረጃ" },
    { name: "motherOccupation", labelAm: "ሙያ" },

    // III. የአባቱ መረጃ
    { name: "fatherFullNameAm", labelAm: "ሙሉ ስም (አማርኛ)" },
    { name: "fatherFullNameEn", labelAm: "ሙሉ ስም (እንግሊዝኛ)" },
    { name: "fatherBirthPlace", labelAm: "የትውልድ ቦታ" },
    { name: "fatherSex", labelAm: "የአባቱ ፆታ" },
  { name: "fatherBirthDate", labelAm: "የትውልድ ቀን", type: "ethiopian-date" },
    { name: "fatherIdOrPassport", labelAm: "የአይዲ / ፓስፖርት ቁጥር" },
    { name: "fatherEducationLevel", labelAm: "የትምህርት ደረጃ" },
    { name: "fatherOccupation", labelAm: "ሙያ" },

    // IV. ምስክር መረጃ
    { name: "witnessOneFullName", labelAm: "ስም አንድ (ሙሉ ስም)" },
    { name: "witnessTwoFullName", labelAm: "ስም ሁለት (ሙሉ ስም)" },
    { name: "witnessIdOrPassport", labelAm: "አይዲ / ፓስፖርት ቁጥር" },
    { name: "witnessAddress", labelAm: "አድራሻ" },

    // V. የምዝገባ ባለስልጣን
    { name: "officerName", labelAm: "ስም" },
    { name: "officerSignature", labelAm: "ፊርማ" },
  { name: "officerDate", labelAm: "ቀን", type: "ethiopian-date" },

    // Files
    { name: "childPhoto", labelAm: "የልጅ ፎቶ", type: "file" },
    { name: "consentPhoto", labelAm: "የፍቃድ ፎርም", type: "file" },
    { name: "idCardImage", labelAm: "የመታወቂያ ካርድ ምስል", type: "file" },
    { name: "uploadedform", labelAm: "የተቀረበ ፎርም", type: "file" },
  ],
  marriage: [
    // Registration Details (copied from birth form)
    { name: "childFullNameAm", labelAm: "ሙሉ ስም (አማርኛ)" },
    { name: "childFullNameEn", labelAm: "ሙሉ ስም (እንግሊዝኛ)" },
    { name: "sex", labelAm: "ፆታ" },
    { name: "birthDate", labelAm: "የትውልድ ቀን", type: "ethiopian-date" },
    { name: "birthTime", labelAm: "የትውልድ ሰአት" },
    { name: "birthPlaceCity", labelAm: "ከተማ" },
    { name: "birthPlaceWoreda", labelAm: "ወረዳ" },
    { name: "birthPlaceKebele", labelAm: "ቀበሌ" },
  ],
  death: [
    // Registration Details (copied from birth form)
    { name: "childFullNameAm", labelAm: "ሙሉ ስም (አማርኛ)" },
    { name: "childFullNameEn", labelAm: "ሙሉ ስም (እንግሊዝኛ)" },
    { name: "sex", labelAm: "ፆታ" },
    { name: "birthDate", labelAm: "የትውልድ ቀን", type: "ethiopian-date" },
    { name: "birthTime", labelAm: "የትውልድ ሰአት" },
    { name: "birthPlaceCity", labelAm: "ከተማ" },
    { name: "birthPlaceWoreda", labelAm: "ወረዳ" },
    { name: "birthPlaceKebele", labelAm: "ቀበሌ" },
  ],
  divorce: [
    // Registration Details (copied from birth form)
    { name: "childFullNameAm", labelAm: "ሙሉ ስም (አማርኛ)" },
    { name: "childFullNameEn", labelAm: "ሙሉ ስም (እንግሊዝኛ)" },
    { name: "sex", labelAm: "ፆታ" },
    { name: "birthDate", labelAm: "የትውልድ ቀን", type: "ethiopian-date" },
    { name: "birthTime", labelAm: "የትውልድ ሰአት" },
    { name: "birthPlaceCity", labelAm: "ከተማ" },
    { name: "birthPlaceWoreda", labelAm: "ወረዳ" },
    { name: "birthPlaceKebele", labelAm: "ቀበሌ" },
  ],
};
