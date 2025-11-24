// Manager Dashboard Field Configuration
// This file provides comprehensive field configurations for all event types
// to ensure 100% complete data display in the manager dashboard

export const MANAGER_FIELD_CONFIG = {
  birth: [
    // Registration Details
    { section: "Registration Details", sectionAm: "የመዝገብ ዝርዝሮች" },
    { name: "registrationNumber", labelEn: "Registration Number", labelAm: "የመመዝገቢያ ቁጥር" },
    { name: "mainRegistrationRecordNumberAm", labelEn: "Registrar Bureau ID Number", labelAm: "የምዝገባ ጽ/ቤት መለያ ቁጥር" },
    { name: "registrationDateEth", labelEn: "Registration Date (Ethiopian)", labelAm: "የመመዝገቢያ ቀን (ኢትዮ)", type: "ethiopian-date" },
    { name: "registrationTimeHourAm", labelEn: "Registration Time: Hour", labelAm: "ሰዓት" },
    
    // Registration Place
    { section: "Registration Place", sectionAm: "የመዝገብ ቦታ" },
    { name: "registrationRegion", labelEn: "Region/City Administration", labelAm: "ክልል/ከተማ አስተዳደር", type: "location-region" },
    { name: "registrationZone", labelEn: "Zone", labelAm: "ዞን", type: "location-zone" },
    { name: "registrationWoreda", labelEn: "Woreda", labelAm: "ወረዳ", type: "location-woreda" },
    { name: "registrationCity", labelEn: "City", labelAm: "ከተማ" },
    { name: "registrationSubCity", labelEn: "Sub City", labelAm: "ክፍለ ከተማ" },
    { name: "registrationKebele", labelEn: "Kebele", labelAm: "ቀበሌ" },

    // Place of birth
    { section: "Place of birth", sectionAm: "የትውልድ ቦታ" },
    { name: "region", labelEn: "Region/City Administration", labelAm: "ክልል/ከተማ አስተዳደር", type: "location-region" },
    { name: "zone", labelEn: "zone/city administration", labelAm: "ዞን/ከተማ አስተዳደር", type: "location-zone" },
    { name: "birthPlaceCity", labelEn: "city", labelAm: "ከተማ" },
    { name: "birthPlaceSubCity", labelEn: "sub city", labelAm: "ክፍለ ከተማ" },
    { name: "woreda", labelEn: "woreda", labelAm: "ወረዳ", type: "location-woreda" },
    { name: "kebele", labelEn: "kebele", labelAm: "ቀበሌ" },

    // Full Information of the Child
    { section: "Full Information of the Child", sectionAm: "የህፃኑ ሙሉ መረጃ" },
    { name: "childNameEn", labelEn: "Child Name (EN)", labelAm: "Child Name (EN)" },
    { name: "childNameAm", labelEn: "ስም", labelAm: "ስም" },
    { name: "fatherNameEn", labelEn: "Father's Name (EN)", labelAm: "Father's Name (EN)" },
    { name: "fatherNameAm", labelEn: "የአባት ስም", labelAm: "የአባት ስም" },
    { name: "childGrandfatherNameEn", labelEn: "Grandfather's Name (EN)", labelAm: "Grandfather's Name (EN)" },
    { name: "childGrandfatherNameAm", labelEn: "የአያት ስም", labelAm: "የአያት ስም" },
    { name: "childIdNumberAm", labelEn: "ID. Card Number", labelAm: "የመታወቂያ ቁጥር" },
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

    // Full Information Mother
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

    // Full Information of Father
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
    
    // Documents
    { section: "Documents", sectionAm: "ሰነዶች" },
    { name: "idCardImage", labelEn: "ID Card Image", labelAm: "የመታወቂያ ካርድ ምስል", type: "file" },
    { name: "signedConsentPhoto", labelEn: "Signed Consent Form", labelAm: "የተፈረመ ፍቃድ ቅጽ", type: "file" },
    { name: "uploadedform", labelEn: "Uploaded Form", labelAm: "የተቀረበ ፎርም", type: "file" },

    // Parents/Guardians Information
    { section: "Parents/Guardians Information", sectionAm: "የወላጆች/አሳዳጊ መረጃ" },
    { name: "guardianFullName", labelEn: "Full Name", labelAm: "ሙሉ ስም" },
    { name: "guardianOccupationEn", labelEn: "Occupation", labelAm: "ሙያ" },
    { name: "guardianWorkAddressAm", labelEn: "Work Place/Address", labelAm: "የሥራ ቦታ/አድራሻ" },
    { name: "guardianHouseNoAm", labelEn: "House Number", labelAm: "የቤት ቁጥር" },
    { name: "guardianMobileAm", labelEn: "Mobile Number", labelAm: "ሞባይል ቁጥር" },

    // Registrar Information
    { section: "Registrar Information", sectionAm: "የምዝገባ መረጃ" },
    { name: "registrarNameAm", labelEn: "Name", labelAm: "ስም" },
    { name: "registrarFatherNameAm", labelEn: "Father's Name", labelAm: "የአባት ስም" },
    { name: "registrarGrandNameAm", labelEn: "Grandfather's name", labelAm: "የአያት ስም" },
    { name: "registrarDateAm", labelEn: "Registration Date", labelAm: "የምዝገባ ቀን", type: "ethiopian-date" },
  ],

  marriage: [
    // Registration Details
    { section: "Registration Details", sectionAm: "የመዝገብ ዝርዝሮች" },
    { name: "registrationNumber", labelEn: "Registration Number", labelAm: "የመመዝገቢያ ቁጥር" },
    { name: "mainRegistrationRecordNumberAm", labelEn: "Registrar Bureau ID Number", labelAm: "የምዝገባ ጽ/ቤት መለያ ቁጥር" },
    { name: "registrationDateEth", labelEn: "Registration Date (Ethiopian)", labelAm: "የመመዝገቢያ ቀን (ኢትዮ)", type: "ethiopian-date" },
    { name: "registrationTimeHourAm", labelEn: "Registration Time: Hour", labelAm: "ሰዓት" },
    
    // Registration Place
    { section: "Registration Place", sectionAm: "የመዝገብ ቦታ" },
    { name: "registrationRegion", labelEn: "Registration Region", labelAm: "የመመዝገቢያ ክልል" },
    { name: "registrationZone", labelEn: "Registration Zone", labelAm: "የመመዝገቢያ ዞን" },
    { name: "registrationWoreda", labelEn: "Registration Woreda", labelAm: "የመመዝገቢያ ወረዳ" },
    { name: "registrationCity", labelEn: "Registration City", labelAm: "የመመዝገቢያ ከተማ" },
    { name: "registrationSubCity", labelEn: "Registration Sub City", labelAm: "የመመዝገቢያ ክፍለ ከተማ" },
    { name: "registrationKebele", labelEn: "Registration Kebele", labelAm: "የመመዝገቢያ ቀበሌ" },
    
    // Place of marriage
    { section: "Place of marriage", sectionAm: "የጋብቻ ቦታ" },
    { name: "marriageRegion", labelEn: "Region/City Administration", labelAm: "ክልል/ከተማ አስተዳደር" },
    { name: "marriageZone", labelEn: "Zone/City Administration", labelAm: "ዞን/ከተማ አስተዳደር" },
    { name: "marriageCity", labelEn: "City", labelAm: "ከተማ" },
    { name: "marriageSubCity", labelEn: "Sub City", labelAm: "ክፍለ ከተማ" },
    { name: "marriageWoreda", labelEn: "Woreda", labelAm: "ወረዳ" },
    { name: "marriageKebeleAm", labelEn: "Kebele", labelAm: "ቀበሌ" },

    // Full Information of the Bride
    { section: "Full Information of the Bride", sectionAm: "የሚስት ሙሉ መረጃ" },
    { name: "wifeNameAm", labelEn: "Wife Name (Amharic)", labelAm: "የሚስት ስም (አማ)" },
    { name: "wifeNameEn", labelEn: "Wife Name (English)", labelAm: "የሚስት ስም (እንግ)" },
    { name: "wifeFatherAm", labelEn: "Wife Father's Name (Amharic)", labelAm: "የሚስት የአባት ስም (አማ)" },
    { name: "wifeFatherEn", labelEn: "Wife Father's Name (English)", labelAm: "የሚስት የአባት ስም (እንግ)" },
    { name: "wifeGrandfatherAm", labelEn: "Wife Grandfather's Name (Amharic)", labelAm: "የሚስት የአያት ስም (አማ)" },
    { name: "wifeGrandfatherEn", labelEn: "Wife Grandfather's Name (English)", labelAm: "የሚስት የአያት ስም (እንግ)" },
    { name: "wifeNationalityAm", labelEn: "Nationality", labelAm: "ዜግነት" },
    { name: "wifeIdNumberAm", labelEn: "ID Card Number", labelAm: "የመታወቂያ ቁጥር" },
    { name: "wifeBirthDateAm", labelEn: "Date of Birth", labelAm: "የትውልድ ቀን", type: "ethiopian-date" },
    { name: "wifeBirthPlace", labelEn: "Place of Birth", labelAm: "የትውልድ ቦታ" },
    { name: "wifeResidence", labelEn: "Place of Residence", labelAm: "መኖሪያ ቦታ" },
    { name: "wifeEthnicity", labelEn: "Ethnicity", labelAm: "ዘር" },
    { name: "wifeReligionAm", labelEn: "Wife Religion", labelAm: "የሚስት ሃይማኖት" },
    { name: "wifePrevMaritalStatusAm", labelEn: "Previous Marital Status", labelAm: "የቀድሞ የጋብቻ ሁኔታ" },
    { name: "wifeEducationAm", labelEn: "Education Level", labelAm: "የትምህርት ደረጃ" },
    { name: "wifeJobAm", labelEn: "Occupation", labelAm: "ሥራ" },
    { name: "wifePhoto", labelEn: "Photo of Bride", labelAm: "የሚስት ፎቶ", type: "file" },

    // Full Information of Groom
    { section: "Full Information of Groom", sectionAm: "የባል ሙሉ መረጃ" },
    { name: "husbandNameAm", labelEn: "Husband Name (Amharic)", labelAm: "የባል ስም (አማ)" },
    { name: "husbandNameEn", labelEn: "Husband Name (English)", labelAm: "የባል ስም (እንግ)" },
    { name: "husbandFatherAm", labelEn: "Husband Father's Name (Amharic)", labelAm: "የባል የአባት ስም (አማ)" },
    { name: "husbandFatherEn", labelEn: "Husband Father's Name (English)", labelAm: "የባል የአባት ስም (እንግ)" },
    { name: "husbandGrandfatherAm", labelEn: "Husband Grandfather's Name (Amharic)", labelAm: "የባል የአያት ስም (አማ)" },
    { name: "husbandGrandfatherEn", labelEn: "Husband Grandfather's Name (English)", labelAm: "የባል የአያት ስም (እንግ)" },
    { name: "husbandNationalityAm", labelEn: "Nationality", labelAm: "ዜግነት" },
    { name: "husbandIdNumberAm", labelEn: "ID Card Number", labelAm: "የመታወቂያ ቁጥር" },
    { name: "husbandBirthDate", labelEn: "Date of Birth", labelAm: "የትውልድ ቀን", type: "ethiopian-date" },
    { name: "husbandBirthPlace", labelEn: "Place of Birth", labelAm: "የትውልድ ቦታ" },
    { name: "husbandResidence", labelEn: "Place of Residence", labelAm: "መኖሪያ ቦታ" },
    { name: "husbandEthnicityAm", labelEn: "Ethnicity", labelAm: "ዘር" },
    { name: "husbandReligionAm", labelEn: "Husband Religion", labelAm: "የባል ሃይማኖት" },
    { name: "husbandPrevMaritalStatusAm", labelEn: "Previous Marital Status", labelAm: "የቀድሞ የጋብቻ ሁኔታ" },
    { name: "husbandEducationAm", labelEn: "Education Level", labelAm: "የትምህርት ደረጃ" },
    { name: "husbandJobAm", labelEn: "Occupation", labelAm: "ሥራ" },
    { name: "husbandConsent", labelEn: "Consent signed by Bride and Groom", labelAm: "በባል እና በሚስት የተፈረመ የስምምነት ቅጽ", type: "file" },
    { name: "husbandPhoto", labelEn: "Photo of Groom", labelAm: "የባል ፎቶ", type: "file" },

    // Marriage Information
    { section: "Marriage Information", sectionAm: "የጋብቻ መረጃ" },
    { name: "marriageDate", labelEn: "Marriage Date", labelAm: "የጋብቻ ቀን", type: "ethiopian-date" },
    { name: "marriagePlaceName", labelEn: "Place of Marriage", labelAm: "የጋብቻ ቦታ" },

    // Witnesses of Bride
    { section: "Witnesses of Bride", sectionAm: "የሚስት ምስክሮች" },
    { name: "brideWitness1Name", labelEn: "Witness 1: Name", labelAm: "ምስክር 1 ስም" },
    { name: "brideWitness1Father", labelEn: "Father's Name", labelAm: "የአባት ስም" },
    { name: "brideWitness1Grand", labelEn: "Grand Father's Name", labelAm: "የአያት ስም" },
    { name: "brideWitness1Residence", labelEn: "Place of Residence", labelAm: "መኖሪያ ቦታ" },
    { name: "brideWitness1IdAm", labelEn: "ID Card Number", labelAm: "የመታወቂያ ቁጥር" },
    { name: "brideWitness2Name", labelEn: "Witness 2: Name", labelAm: "ምስክር 2 ስም" },
    { name: "brideWitness2Father", labelEn: "Father's Name", labelAm: "የአባት ስም" },
    { name: "brideWitness2Grand", labelEn: "Grand Father's Name", labelAm: "የአያት ስም" },
    { name: "brideWitness2Residence", labelEn: "Place of Residence", labelAm: "መኖሪያ ቦታ" },
    { name: "brideWitness2IdAm", labelEn: "ID Card Number", labelAm: "የመታወቂያ ቁጥር" },

    // Witnesses of Groom
    { section: "Witnesses of Groom", sectionAm: "የባል ምስክሮች" },
    { name: "groomWitness1Name", labelEn: "Witness 1: Name", labelAm: "ምስክር 1 ስም" },
    { name: "groomWitness1Father", labelEn: "Father's Name", labelAm: "የአባት ስም" },
    { name: "groomWitness1Grand", labelEn: "Grand Father's Name", labelAm: "የአያት ስም" },
    { name: "groomWitness1Residence", labelEn: "Place of Residence", labelAm: "መኖሪያ ቦታ" },
    { name: "groomWitness1IdAm", labelEn: "ID Card Number", labelAm: "የመታወቂያ ቁጥር" },
    { name: "groomWitness2Name", labelEn: "Witness 2: Name", labelAm: "ምስክር 2 ስም" },
    { name: "groomWitness2Father", labelEn: "Father's Name", labelAm: "የአባት ስም" },
    { name: "groomWitness2Grand", labelEn: "Grand Father's Name", labelAm: "የአያት ስም" },
    { name: "groomWitness2Residence", labelEn: "Place of Residence", labelAm: "መኖሪያ ቦታ" },
    { name: "groomWitness2IdAm", labelEn: "ID Card Number", labelAm: "የመታወቂያ ቁጥር" },

    // Registrar Information
    { section: "Registrar Information", sectionAm: "የምዝገባ መረጃ" },
    { name: "marriageConsentProof", labelEn: "Consent Proof", labelAm: "የፍቃድ ማረጋገጫ", type: "file" },
    { name: "registrarNameAm", labelEn: "Name", labelAm: "ስም" },
    { name: "registrarFatherNameAm", labelEn: "Father's Name", labelAm: "የአባት ስም" },
    { name: "registrarGrandNameAm", labelEn: "Grandfather's Name", labelAm: "የአያት ስም" },
    { name: "registrarDate", labelEn: "Registration Date", labelAm: "የምዝገባ ቀን", type: "ethiopian-date" },
  ],

  death: [
    // Registration Details
    { section: "Registration Details", sectionAm: "የመዝገብ ዝርዝሮች" },
    { name: "registrationNumber", labelEn: "Registration Number", labelAm: "የመመዝገቢያ ቁጥር" },
    { name: "mainRegistrationRecordNumberAm", labelEn: "Main Registration Record Number", labelAm: "ዋና የመመዝገቢያ ምዝገባ ቁጥር" },
    { name: "registrationDateEth", labelEn: "Registration Date (Ethiopian)", labelAm: "የመመዝገቢያ ቀን (ኢትዮ)" },
    { name: "registrationTimeHourAm", labelEn: "Registration Time", labelAm: "የመመዝገቢያ ሰዓት" },
    
    // Registration Place
    { section: "Registration Place", sectionAm: "የመዝገብ ቦታ" },
    { name: "registrationRegion", labelEn: "Registration Region", labelAm: "የመመዝገቢያ ክልል" },
    { name: "registrationZone", labelEn: "Registration Zone", labelAm: "የመመዝገቢያ ዞን" },
    { name: "registrationWoreda", labelEn: "Registration Woreda", labelAm: "የመመዝገቢያ ወረዳ" },
    { name: "registrationCity", labelEn: "Registration City", labelAm: "የመመዝገቢያ ከተማ" },
    { name: "registrationSubCity", labelEn: "Registration Sub City", labelAm: "የመመዝገቢያ ክፍለ ከተማ" },
    { name: "registrationKebele", labelEn: "Registration Kebele", labelAm: "የመመዝገቢያ ቀበሌ" },
        
    // Deceased Information
    { section: "Deceased Information", sectionAm: "የሞተው ሙሉ መረጃ" },
    { name: "deceasedNameEn", labelEn: "Deceased Name (English)", labelAm: "የሞተው ስም (እንግሊዝኛ)" },
    { name: "deceasedNameAm", labelEn: "Deceased Name (Amharic)", labelAm: "የሞተው ስም (አማርኛ)" },
    { name: "deceasedFatherEn", labelEn: "Deceased Father Name (English)", labelAm: "የሞተው አባት ስም (እንግሊዝኛ)" },
    { name: "deceasedFatherAm", labelEn: "Deceased Father Name (Amharic)", labelAm: "የሞተው አባት ስም (አማርኛ)" },
    { name: "deceasedGrandfatherEn", labelEn: "Deceased Grandfather Name (English)", labelAm: "የሞተው አያት ስም (እንግሊዝኛ)" },
    { name: "deceasedGrandfatherAm", labelEn: "Deceased Grandfather Name (Amharic)", labelAm: "የሞተው አያት ስም (አማርኛ)" },
    { name: "deceasedBirthDate", labelEn: "Deceased Birth Date", labelAm: "የሞተው የትውልድ ቀን" },
    { name: "deceasedSex", labelEn: "Deceased Sex", labelAm: "የሞተው ጾታ" },
    { name: "deceasedAgeAm", labelEn: "Deceased Age", labelAm: "የሞተው እድሜ" },
    { name: "deceasedNationality", labelEn: "Deceased Nationality", labelAm: "የሞተው ዜግነት" },
    { name: "deceasedIdNumberAm", labelEn: "Deceased ID Number", labelAm: "የሞተው መታወቂያ ቁጥር" },
    { name: "deceasedTitleAm", labelEn: "Deceased Title", labelAm: "የሞተው የስም ቅድም" },
    { name: "deceasedResidence", labelEn: "Deceased Residence", labelAm: "የሞተው መኖሪያ" },
    { name: "deceasedPhoto", labelEn: "Deceased Photo", labelAm: "የሞተው ፎቶ" },
    { name: "deceasedReligion", labelEn: "Deceased Religion", labelAm: "የሞተው ሃይማኖት" },
    { name: "deceasedMaritalStatusAm", labelEn: "Deceased Marital Status", labelAm: "የሞተው የጋብቻ ሁኔታ" },
    
    // Death Details
    { section: "Death Details", sectionAm: "የሞት ዝርዝር" },
    { name: "deathDate", labelEn: "Death Date", labelAm: "የሞት ቀን" },
    { name: "deathPlaceEn", labelEn: "Death Place (English)", labelAm: "የሞት ቦታ (እንግሊዝኛ)" },
    { name: "deathPlaceAm", labelEn: "Death Place (Amharic)", labelAm: "የሞት ቦታ (አማርኛ)" },
    { name: "deathRegion", labelEn: "Death Region", labelAm: "የሞት ክልል" },
    { name: "deathZone", labelEn: "Death Zone", labelAm: "የሞት ዞን" },
    { name: "deathCity", labelEn: "Death City", labelAm: "የሞት ከተማ" },
    { name: "deathSubCity", labelEn: "Death Sub City", labelAm: "የሞት ክፍለ ከተማ" },
    { name: "deathWoreda", labelEn: "Death Woreda", labelAm: "የሞት ወረዳ" },
    { name: "deathKebele", labelEn: "Death Kebele", labelAm: "የሞት ቀበሌ" },
    { name: "causeOfDeath", labelEn: "Cause of Death", labelAm: "የሞት ምክንያት" },
    { name: "burialPlace", labelEn: "Burial Place", labelAm: "የቀብር ቦታ" },
    
    // Documents
    { section: "Documents", sectionAm: "ሰነዶች" },
    { name: "deathConsentForm", labelEn: "Death Consent Form", labelAm: "የሞት ፍቃድ ቅጽ" },
    
    // Requester (Applicant) Information
    { section: "Registration Requester", sectionAm: "የመዝገብ ጠያቂ" },
    { name: "requesterName", labelEn: "Requester Name", labelAm: "ስም" },
    { name: "requesterFatherName", labelEn: "Requester Father Name", labelAm: "የአባት ስም" },
    { name: "requesterGrandName", labelEn: "Requester Grandfather Name", labelAm: "የአያት ስም" },
    { name: "requesterRelation", labelEn: "Relation to Deceased", labelAm: "ግንኙነት ከሞተው" },
    { name: "requesterIdNumber", labelEn: "Requester ID Number", labelAm: "የመታወቂያ ቁጥር" },
    { name: "requesterResidence", labelEn: "Requester Residence", labelAm: "መኖሪያ ቦታ" },
    { name: "requesterPhone", labelEn: "Requester Phone", labelAm: "ስልክ" },
    
    // Registrar Information
    { section: "Registrar Information", sectionAm: "የምዝገባ መረጃ" },
    { name: "registrarNameAm", labelEn: "Name", labelAm: "ስም" },
    { name: "registrarFatherNameAm", labelEn: "Father's Name", labelAm: "የአባት ስም" },
    { name: "registrarGrandNameAm", labelEn: "Grandfather's name", labelAm: "የአያት ስም" },
    { name: "registrarDateAm", labelEn: "Registration Date", labelAm: "የምዝገባ ቀን", type: "ethiopian-date" },
  ],

  divorce: [
    // Registration Details
    { section: "Registration Details", sectionAm: "የመዝገብ ዝርዝሮች" },
    { name: "registrationNumber", labelEn: "Registration Number", labelAm: "የመመዝገቢያ ቁጥር" },
    { name: "mainRegistrationRecordNumberAm", labelEn: "Registrar Bureau ID Number", labelAm: "የምዝገባ ጽ/ቤት መለያ ቁጥር" },
    { name: "registrationDateEth", labelEn: "Registration Date (Ethiopian)", labelAm: "የመመዝገቢያ ቀን (ኢትዮ)", type: "ethiopian-date" },
    { name: "registrationTimeHourAm", labelEn: "Registration Time: Hour", labelAm: "ሰዓት" },
    
    // Registration Place
    { section: "Registration Place", sectionAm: "የመዝገብ ቦታ" },
    { name: "registrationRegion", labelEn: "Region/City Administration", labelAm: "ክልል/ከተማ አስተዳደር" },
    { name: "registrationZone", labelEn: "Zone", labelAm: "ዞን" },
    { name: "registrationWoreda", labelEn: "Woreda", labelAm: "ወረዳ" },
    { name: "registrationCity", labelEn: "City", labelAm: "ከተማ" },
    { name: "registrationSubCity", labelEn: "Sub City", labelAm: "ክፍለ ከተማ" },
    { name: "registrationKebele", labelEn: "Kebele", labelAm: "ቀበሌ" },

    // Place of divorce
    { section: "Place of divorce", sectionAm: "የጋብቻ/ፍቺ ቦታ" },
    { name: "divorceRegion", labelEn: "Region/City Administration", labelAm: "ክልል/ከተማ አስተዳደር" },
    { name: "divorceZone", labelEn: "Zone/City Administration", labelAm: "ዞን/ከተማ አስተዳደር" },
    { name: "divorceCity", labelEn: "City", labelAm: "ከተማ" },
    { name: "divorceSubCity", labelEn: "Sub City", labelAm: "ክፍለ ከተማ" },
    { name: "divorceWoreda", labelEn: "Woreda", labelAm: "ወረዳ" },
    { name: "divorceKebeleAm", labelEn: "Kebele", labelAm: "ቀበሌ" },

    // Full Information of the Spouse 1
    { section: "Full Information of the Spouse 1", sectionAm: "የወገን 1 ሙሉ መረጃ" },
    { name: "divorceSpouse1NameEn", labelEn: "Name (EN)", labelAm: "Name (EN)" },
    { name: "divorceSpouse1NameAm", labelEn: "ስም", labelAm: "ስም" },
    { name: "divorceSpouse1FatherNameEn", labelEn: "Father's Name (EN)", labelAm: "Father's Name (EN)" },
    { name: "divorceSpouse1FatherNameAm", labelEn: "የአባት ስም", labelAm: "የአባት ስም" },
    { name: "divorceSpouse1GrandfatherNameEn", labelEn: "Grandfather's Name (EN)", labelAm: "Grandfather's Name (EN)" },
    { name: "divorceSpouse1GrandfatherNameAm", labelEn: "የአያት ስም", labelAm: "የአያት ስም" },
    { name: "divorceSpouse1BirthPlaceEn", labelEn: "Place of birth (EN)", labelAm: "place of birth (EN)" },
    { name: "divorceSpouse1BirthPlaceAm", labelEn: "የትውልድ ቦታ", labelAm: "የትውልድ ቦታ" },
    { name: "divorceSpouse1ResidenceEn", labelEn: "Place of Residence (EN)", labelAm: "Place of Residence (EN)" },
    { name: "divorceSpouse1ResidenceAm", labelEn: "መኖሪያ ቦታ", labelAm: "መኖሪያ ቦታ" },
    { name: "divorceSpouse1NationalityAm", labelEn: "Nationality", labelAm: "ዜግነት" },
    { name: "divorceSpouse1IdAm", labelEn: "Identification Card Number", labelAm: "የመታወቂያ ቁጥር" },
    { name: "divorceSpouse1BirthDate", labelEn: "Date of birth", labelAm: "የትውልድ ቀን", type: "ethiopian-date" },
    { name: "divorceSpouse1Ethnicity", labelEn: "Ethnicity", labelAm: "ዘር" },
    { name: "divorceSpouse1ReligionAm", labelEn: "Religion", labelAm: "ሃይማኖት" },
    { name: "divorceSpouse1EducationAm", labelEn: "Educational Status", labelAm: "የትምህርት ደረጃ" },
    { name: "divorceSpouse1JobAm", labelEn: "Job", labelAm: "ሥራ" },
    { name: "divorceSpouse1Photo", labelEn: "Photo of Spouse 1", labelAm: "የወገን 1 ፎቶ", type: "file" },

    // Full Information of Spouse 2
    { section: "Full Information of Spouse 2", sectionAm: "የወገን 2 ሙሉ መረጃ" },
    { name: "divorceSpouse2NameEn", labelEn: "Name (EN)", labelAm: "Name (EN)" },
    { name: "divorceSpouse2NameAm", labelEn: "ስም", labelAm: "ስም" },
    { name: "divorceSpouse2FatherNameEn", labelEn: "Father's Name (EN)", labelAm: "Father's Name (EN)" },
    { name: "divorceSpouse2FatherNameAm", labelEn: "የአባት ስም", labelAm: "የአባት ስም" },
    { name: "divorceSpouse2GrandfatherNameEn", labelEn: "Grandfather's Name (EN)", labelAm: "Grandfather's Name (EN)" },
    { name: "divorceSpouse2GrandfatherNameAm", labelEn: "የአያት ስም", labelAm: "የአያት ስም" },
    { name: "divorceSpouse2BirthPlaceEn", labelEn: "Place of birth (EN)", labelAm: "place of birth (EN)" },
    { name: "divorceSpouse2BirthPlaceAm", labelEn: "የትውልድ ቦታ", labelAm: "የትውልድ ቦታ" },
    { name: "divorceSpouse2ResidenceEn", labelEn: "Place of Residence (EN)", labelAm: "Place of Residence (EN)" },
    { name: "divorceSpouse2ResidenceAm", labelEn: "መኖሪያ ቦታ", labelAm: "መኖሪያ ቦታ" },
    { name: "divorceSpouse2NationalityAm", labelEn: "Nationality", labelAm: "ዜግነት" },
    { name: "divorceSpouse2IdAm", labelEn: "Identification Card Number", labelAm: "የመታወቂያ ቁጥር" },
    { name: "divorceSpouse2BirthDate", labelEn: "Date of birth", labelAm: "የትውልድ ቀን", type: "ethiopian-date" },
    { name: "divorceSpouse2Ethnicity", labelEn: "Ethnicity", labelAm: "ዘር" },
    { name: "divorceSpouse2ReligionAm", labelEn: "Religion", labelAm: "ሃይማኖት" },
    { name: "divorceSpouse2EducationAm", labelEn: "Educational Status", labelAm: "የትምህርት ደረጃ" },
    { name: "divorceSpouse2JobAm", labelEn: "Job", labelAm: "ሥራ" },
    { name: "divorceSpouse2Photo", labelEn: "Photo of Spouse 2", labelAm: "የወገን 2 ፎቶ", type: "file" },

    // Divorce Information
    { section: "Divorce Information", sectionAm: "የፍቺ መረጃ" },
    { name: "divorceMarriageDate", labelEn: "Date of the marriage", labelAm: "የጋብቻ ቀን", type: "ethiopian-date" },
    { name: "divorceMarriagePlace", labelEn: "Place of marriage", labelAm: "የጋብቻ ቦታ" },
    { name: "divorceReasonAm", labelEn: "Cause of Divorce", labelAm: "የፍቺ ምክንያት" },
    { name: "divorceDate", labelEn: "Date of Divorce", labelAm: "የፍቺ ቀን", type: "ethiopian-date" },
    { name: "divorceCourtNameAm", labelEn: "Court name which Approve Divorce", labelAm: "የፍርድ ቤት ስም" },
    { name: "divorceCourtRegNoAm", labelEn: "Court Registration Number", labelAm: "የፍ/ቤት መ/ቁ" },
    { name: "divorceChildrenCountAm", labelEn: "Number of Childrens", labelAm: "የልጆች ብዛት" },
    { name: "divorceConsentProofAm", labelEn: "Consent Proof (signed by both)", labelAm: "የተፈረመ የፍች ስምምነት ቅጽ", type: "file" },

    // Registrar Information
    { section: "Registrar Information", sectionAm: "የምዝገባ መረጃ" },
    { name: "registrarName", labelEn: "Registrar Name", labelAm: "ስም" },
    { name: "registrarFatherNameAm", labelEn: "Father's Name", labelAm: "የአባት ስም" },
    { name: "registrarGrandNameAm", labelEn: "Grandfather's name", labelAm: "የአያት ስም" },
    { name: "registrarDate", labelEn: "Registration Date", labelAm: "የምዝገባ ቀን", type: "ethiopian-date" },
  ],
};

// Helper function to get all possible field names for an event type
export const getAllFieldNames = (eventType) => {
  const config = MANAGER_FIELD_CONFIG[eventType] || [];
  return config.map(field => field.name);
};

// Helper function to get field label
export const getFieldLabel = (fieldName, eventType, lang = 'en') => {
  const config = MANAGER_FIELD_CONFIG[eventType] || [];
  const field = config.find(f => f.name === fieldName);
  if (field) {
    return lang === 'en' ? field.labelEn : field.labelAm;
  }
  return fieldName; // fallback to field name if not found
};
