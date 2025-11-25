"use client";

import React from "react";
import { apiFetch, uploadsBaseUrl, API_BASE_URL } from "@/lib/api";
import { MANAGER_FIELD_CONFIG as FORM_FIELD_CONFIG } from "./ManagerFieldConfig.js";
import ProfileSidebar from "../components/ProfileSidebar";
import Pagination from "../components/Pagination";
import { useLanguage } from "@/context/LanguageContext";

const RegistrantDashboard = ({ user, setUser }) => {
  const { lang, translate, toggleLang } = useLanguage();
  const t = translate;

  // anchors for sidebar quick actions (left intentionally empty)
  const myRecordsRef = React.useRef(null);
  const requestCertRef = React.useRef(null);
  const myCertificatesRef = React.useRef(null);

  // type picker state
  const [showTypePicker, setShowTypePicker] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState(null); // 'view' | 'request'
  const [selectedType, setSelectedType] = React.useState("birth");
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [authSubmitting, setAuthSubmitting] = React.useState(false);
  const [authForm, setAuthForm] = React.useState({});
  const [toast, setToast] = React.useState(null);
  const [viewRecordEvent, setViewRecordEvent] = React.useState(null);
  const [showCorrection, setShowCorrection] = React.useState(false);
  const [correctionText, setCorrectionText] = React.useState("");
  const [submittingCorrection, setSubmittingCorrection] = React.useState(false);
  const [myCerts, setMyCerts] = React.useState([]);
  const [loadingCerts, setLoadingCerts] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState('dashboard');
  const autoFillCacheRef = React.useRef({});
  const lastProcessedKeyRef = React.useRef(null);
  const autoFillStatusRef = React.useRef('idle');
  const [autoFillMeta, setAutoFillMeta] = React.useState({ key: null, status: 'idle', message: null });

  const fetchMyCertificates = React.useCallback(async () => {
    if (!user?.token) return;
    setLoadingCerts(true);
    try {
      // Prefer role-agnostic /me/certificates; fall back if needed
      let rows;
      try {
        rows = await apiFetch('/users/me/certificates', { token: user.token });
      } catch {
        rows = await apiFetch('/users/registrant/certificates', { token: user.token });
      }
      setMyCerts(Array.isArray(rows) ? rows : []);
    } catch {
      const errorMsg = lang === 'en' ? 'Failed to load certificates' : 'ምስክር ወረቀቶች መጫን አልተሳካም';
      setToast({ type: 'error', msg: errorMsg });
    } finally {
      setLoadingCerts(false);
    }
  }, [user?.token, lang]);

  React.useEffect(() => {
    if (user?.token) {
      fetchMyCertificates();
    }
    // Only fetch once when token is available, not on every fetchMyCertificates change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token]);

  // Schema for authentication fields per event type
  const authSchemas = React.useMemo(() => ({
    birth: [
      { name: 'registrationNumber', labelEn: 'Registration Number', labelAm: 'የመመዝገቢያ ቁጥር' },
      { name: 'childIdNumberAm', labelEn: 'Identification Card Number', labelAm: 'የመታወቂያ ቁጥር' },
      { name: 'childNameEn', labelEn: 'Child Name (EN)', labelAm: 'የልጅ ስም (EN)' },
      { name: 'fatherNameEn', labelEn: "Father's Name (EN)", labelAm: 'የአባት ስም (EN)' },
      { name: 'childGrandfatherNameEn', labelEn: "Grandfather's Name (EN)", labelAm: 'የአያት ስም (EN)' },
      { name: 'sex', labelEn: 'Sex', labelAm: 'ፆታ', type: 'select', options: [
        { value: 'male', labelEn: 'Male', labelAm: 'ወንድ' },
        { value: 'female', labelEn: 'Female', labelAm: 'ሴት' },
      ] },
      { name: 'motherFatherNameEn', labelEn: "Mother's Father Name (EN)", labelAm: 'የእናት የአባት ስም (EN)' },
      { name: 'motherFullNameEn', labelEn: "Mother's Full Name (EN)", labelAm: 'የእናት ሙሉ ስም (EN)' },
    ],
    death: [
      { name: 'registrationNumber', labelEn: 'Registration Number', labelAm: 'የመመዝገቢያ ቁጥር' },
      { name: 'deceasedIdNumberAm', labelEn: 'Deceased ID Number', labelAm: 'የሞተው የመታወቂያ ቁጥር' },
      { name: 'deceasedNameEn', labelEn: 'Deceased Name (EN)', labelAm: 'የሞተው ስም (EN)' },
      { name: 'deceasedFatherEn', labelEn: "Deceased Father's Name (EN)", labelAm: 'የሞተው የአባት ስም (EN)' },
      { name: 'deceasedGrandfatherEn', labelEn: "Deceased Grandfather's Name (EN)", labelAm: 'የሞተው የአያት ስም (EN)' },
      { name: 'deceasedSex', labelEn: 'Sex', labelAm: 'ፆታ', type: 'select', options: [
        { value: 'male', labelEn: 'Male', labelAm: 'ወንድ' },
        { value: 'female', labelEn: 'Female', labelAm: 'ሴት' },
      ] },
      { name: 'deathDate', labelEn: 'Date of Death', labelAm: 'የሞት ቀን', type: 'ethiopian-date' },
      { section: 'Registration Requester', sectionAm: 'የመዝገብ ጠያቂ' },
      { name: 'requesterName', labelEn: 'Name', labelAm: 'ስም' },
      { name: 'requesterFather', labelEn: "Father's Name", labelAm: 'የአባት ስም' },
      { name: 'requesterGrand', labelEn: "Grandfather's Name", labelAm: 'የአያት ስም' },
      { name: 'requesterRegistrationDate', labelEn: 'Registration Date', labelAm: 'የምዝገባ ቀን', type: 'ethiopian-date' },
      { name: 'requesterRelation', labelEn: 'Relation with Deceased', labelAm: 'ግንኙነት' },
      { name: 'requesterIdNumber', labelEn: 'Identification Card Number', labelAm: 'የመታወቂያ ቁጥር' },
    ],
    marriage: [
      { name: 'registrationNumber', labelEn: 'Registration Number', labelAm: 'የመመዝገቢያ ቁጥር' },
      { name: 'wifeIdNumberAm', labelEn: 'Wife ID Number', labelAm: 'የሚስት የመታወቂያ ቁጥር' },
      { name: 'husbandIdNumberAm', labelEn: 'Husband ID Number', labelAm: 'የባል የመታወቂያ ቁጥር' },
      { name: 'wifeName', labelEn: 'Wife Name', labelAm: 'የሚስት ስም' },
      { name: 'wifeFather', labelEn: "Wife Father's Name", labelAm: 'የሚስት የአባት ስም' },
      { name: 'wifeGrandfather', labelEn: "Wife Grandfather's Name", labelAm: 'የሚስት የአያት ስም' },
      { name: 'husbandName', labelEn: 'Husband Name', labelAm: 'የእመቤት ስም' },
      { name: 'husbandFather', labelEn: "Husband Father's Name", labelAm: 'የባል የአባት ስም' },
      { name: 'husbandGrandfather', labelEn: "Husband Grandfather's Name", labelAm: 'የባል የአያት ስም' },
      { section: 'Marriage Information', sectionAm: 'የጋብቻ መረጃ' },
      { name: 'marriageDate', labelEn: 'Date', labelAm: 'ቀን', type: 'ethiopian-date' },
      { name: 'marriagePlaceName', labelEn: 'Place of Marriage', labelAm: 'የጋብቻ ቦታ' },
    ],
    divorce: [
      { name: 'registrationNumber', labelEn: 'Registration Number', labelAm: 'የመመዝገቢያ ቁጥር' },
      { name: 'divorceSpouse1IdAm', labelEn: 'Identification Card Number', labelAm: 'የመታወቂያ ቁጥር' },
      { name: 'divorceSpouse2IdAm', labelEn: 'Identification Card Number', labelAm: 'የመታወቂያ ቁጥር' },
      { section: 'Full Information of the Spouse 1', sectionAm: 'የወገን 1 ሙሉ መረጃ' },
      { name: 'divorceSpouse1NameEn', labelEn: 'Name (EN)', labelAm: 'Name (EN)' },
      { name: 'divorceSpouse1FatherNameEn', labelEn: "Father's Name (EN)", labelAm: "Father's Name (EN)" },
      { name: 'divorceSpouse1GrandfatherNameEn', labelEn: "Grandfather's Name (EN)", labelAm: "Grandfather's Name (EN)" },
      { section: 'Full Information of Spouse 2', sectionAm: 'የወገን 2 ሙሉ መረጃ' },
      { name: 'divorceSpouse2NameEn', labelEn: 'Name (EN)', labelAm: 'Name (EN)' },
      { name: 'divorceSpouse2FatherNameEn', labelEn: "Father's Name (EN)", labelAm: "Father's Name (EN)" },
      { name: 'divorceSpouse2GrandfatherNameEn', labelEn: "Grandfather's Name (EN)", labelAm: "Grandfather's Name (EN)" },
      { section: 'Divorce Information', sectionAm: 'የፍቺ መረጃ' },
      { name: 'divorceMarriageDate', labelEn: 'Date of the marriage', labelAm: 'የጋብቻ ቀን', type: 'ethiopian-date' },
      { name: 'divorceMarriagePlace', labelEn: 'Place of marriage', labelAm: 'የጋብቻ ቦታ' },
    ],
  }), []);

  // Early return check after all hooks
  if (!user || !user.token) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">{t("Please log in to access the Registrant Dashboard.", "እባክዎን ወደ የተመዘገበ ዳሽቦርድ ለመድረስ ይግቡ።")}</h2>
        <p className="text-gray-600">{t("You must be authenticated to view this page.", "ይህን ገጽ ለማየት መለያ መረጃዎ ያስፈልጋል።")}</p>
      </div>
    );
  }

  const openTypePicker = (action) => {
    setPendingAction(action);
    setShowTypePicker(true);
  };

  const proceedWithType = () => {
    setShowTypePicker(false);
    // Initialize auth form fields for selected type
    const schema = authSchemas[selectedType] || [];
    const next = {};
    schema.forEach(f => { if (f.name) next[f.name] = ''; });
    setAuthForm(next);
    setShowAuthModal(true);
  };

  const handleAuthChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setAuthForm((p) => ({ ...p, image: files && files[0] ? files[0] : null }));
    } else {
      setAuthForm((p) => ({ ...p, [name]: value }));
    }
  };

  const fieldMatchKeys = {
    birth: ['childNameEn', 'fatherNameEn', 'childGrandfatherNameEn', 'childIdNumberAm', 'sex', 'motherFatherNameEn', 'motherFullNameEn'],
    death: ['deceasedNameEn', 'deceasedFatherEn', 'deceasedGrandfatherEn', 'deceasedIdNumberAm', 'deceasedSex', 'deathDate', 'requesterName', 'requesterFather', 'requesterGrand', 'requesterRegistrationDate', 'requesterRelation', 'requesterIdNumber'],
    marriage: ['wifeName', 'wifeFather', 'wifeGrandfather', 'wifeIdNumberAm', 'husbandName', 'husbandFather', 'husbandGrandfather', 'husbandIdNumberAm', 'marriageDate', 'marriagePlaceName'],
    divorce: ['divorceSpouse1NameEn', 'divorceSpouse1FatherNameEn', 'divorceSpouse1GrandfatherNameEn', 'divorceSpouse1IdAm', 'divorceSpouse2NameEn', 'divorceSpouse2FatherNameEn', 'divorceSpouse2GrandfatherNameEn', 'divorceSpouse2IdAm', 'divorceMarriageDate', 'divorceMarriagePlace'],
  };

  const autoFillIdFields = React.useMemo(() => ({
    birth: ['childIdNumberAm'],
    death: ['deceasedIdNumberAm', 'requesterIdNumber'],
    marriage: ['wifeIdNumberAm', 'husbandIdNumberAm'],
    divorce: ['divorceSpouse1IdAm', 'divorceSpouse2IdAm'],
  }), []);

  // Allow logical auth inputs to match multiple underlying stored fields (e.g., EN/AM variants)
  const fieldAliasMap = React.useMemo(() => ({
    marriage: {
      wifeName: ['wifeNameEn', 'wifeNameAm'],
      wifeFather: ['wifeFatherEn', 'wifeFatherAm'],
      wifeGrandfather: ['wifeGrandfatherEn', 'wifeGrandfatherAm'],
      husbandName: ['husbandNameEn', 'husbandNameAm'],
      husbandFather: ['husbandFatherEn', 'husbandFatherAm'],
      husbandGrandfather: ['husbandGrandfatherEn', 'husbandGrandfatherAm'],
    },
    divorce: {
      divorceSpouse1NameEn: ['divorceSpouse1NameEn', 'divorceSpouse1NameAm'],
      divorceSpouse1FatherNameEn: ['divorceSpouse1FatherNameEn', 'divorceSpouse1FatherNameAm'],
      divorceSpouse1GrandfatherNameEn: ['divorceSpouse1GrandfatherNameEn', 'divorceSpouse1GrandfatherNameAm'],
      divorceSpouse2NameEn: ['divorceSpouse2NameEn', 'divorceSpouse2NameAm'],
      divorceSpouse2FatherNameEn: ['divorceSpouse2FatherNameEn', 'divorceSpouse2FatherNameAm'],
      divorceSpouse2GrandfatherNameEn: ['divorceSpouse2GrandfatherNameEn', 'divorceSpouse2GrandfatherNameAm'],
    },
  }), []);

  const normalizeValue = React.useCallback((value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim().toLowerCase();
  }, []);

  const getEventFieldValue = React.useCallback((eventData, fieldName, typeKey) => {
    if (!eventData) return undefined;
    const eventFields = (eventData.data && typeof eventData.data === 'object') ? eventData.data : {};
    const aliases = new Set([fieldName]);
    if (typeKey && fieldAliasMap[typeKey] && fieldAliasMap[typeKey][fieldName]) {
      fieldAliasMap[typeKey][fieldName].forEach((alias) => aliases.add(alias));
    }
    for (const key of aliases) {
      const v = eventFields?.[key];
      if (v !== null && v !== undefined && `${v}` !== '') return v;
    }
    for (const key of aliases) {
      const v = eventData?.[key];
      if (v !== null && v !== undefined && `${v}` !== '') return v;
    }
    return undefined;
  }, [fieldAliasMap]);

  const applyAutoFillFromEvent = React.useCallback((eventData, { idFieldName, idValue, registrationValue, typeKey }) => {
    if (!eventData) return;
    const schema = authSchemas[typeKey] || [];
    setAuthForm((prev) => {
      const next = { ...prev };
      schema.forEach((field) => {
        if (!field?.name) return;
        if (field.type === 'file') return;
        if (field.name === 'registrationNumber' || field.name === 'registrationId') return;
        if (field.name === idFieldName) return;
        const currentVal = next[field.name];
        const hasExisting = currentVal !== undefined && currentVal !== null && String(currentVal).trim() !== '';
        if (hasExisting) return;
        const fetched = getEventFieldValue(eventData, field.name, typeKey);
        if (fetched !== undefined) {
          next[field.name] = fetched;
        }
      });
      if (registrationValue) {
        if (next.registrationNumber !== undefined) next.registrationNumber = registrationValue;
        if (next.registrationId !== undefined) next.registrationId = registrationValue;
      }
      if (idFieldName && idValue !== undefined) {
        next[idFieldName] = idValue;
      }
      return next;
    });
  }, [authSchemas, getEventFieldValue]);

  React.useEffect(() => {
    if (!showAuthModal) {
      autoFillCacheRef.current = {};
      lastProcessedKeyRef.current = null;
      autoFillStatusRef.current = 'idle';
      setAutoFillMeta({ key: null, status: 'idle', message: null });
      return;
    }
    // Reset when modal opens or type changes
    lastProcessedKeyRef.current = null;
    autoFillStatusRef.current = 'idle';
    setAutoFillMeta({ key: null, status: 'idle', message: null });
  }, [showAuthModal, selectedType]);

  // Auto-fill effect: triggers when registration number and ID card number are both entered
  React.useEffect(() => {
    if (!showAuthModal || !user?.token) return;
    
    const registrationValue = (authForm.registrationNumber || authForm.registrationId || '').trim();
    if (!registrationValue) return;
    
    const candidateIdFields = autoFillIdFields[selectedType] || [];
    const idFieldName = candidateIdFields.find((field) => {
      const raw = authForm[field];
      return raw !== undefined && raw !== null && String(raw).trim() !== '';
    });
    if (!idFieldName) return;
    
    const idValue = (authForm[idFieldName] || '').toString().trim();
    if (!idValue) return;
    
    const key = `${selectedType}|${registrationValue}|${idFieldName}|${idValue}`.toLowerCase();
    
    // Skip if we're already processing this exact combination
    const isCurrentlyProcessing = lastProcessedKeyRef.current === key && autoFillStatusRef.current === 'loading';
    if (isCurrentlyProcessing) {
      return;
    }
    
    // Mark as processing
    lastProcessedKeyRef.current = key;
    
    // Check cache first
    const cached = autoFillCacheRef.current[key];
    if (cached) {
      applyAutoFillFromEvent(cached, { idFieldName, idValue, registrationValue, typeKey: selectedType });
      autoFillStatusRef.current = 'success';
      setAutoFillMeta({
        key,
        status: 'success',
        message: lang === 'en' ? 'Details auto-filled from your record.' : 'መረጃዎች ከመዝገብዎ ተሞልተዋል።',
      });
      return;
    }
    
    // Fetch from API
    let isActive = true;
    autoFillStatusRef.current = 'loading';
    setAutoFillMeta({
      key,
      status: 'loading',
      message: lang === 'en' ? 'Fetching record details…' : 'የመዝገብ ዝርዝሮችን በመመልከት ላይ…',
    });
    
    (async () => {
      try {
        const eventData = await apiFetch(`/users/records/${encodeURIComponent(registrationValue)}?ts=${Date.now()}`, {
          method: 'GET',
          token: user.token,
        });
        
        if (!isActive) return;
        
        if (!eventData) {
          autoFillStatusRef.current = 'error';
          setAutoFillMeta({
            key,
            status: 'error',
            message: lang === 'en' ? 'Record not found for this registration ID.' : 'ለዚህ የመመዝገቢያ መለያ መዝገብ አልተገኘም።',
          });
          return;
        }
        
        const eventType = (eventData.type || '').toLowerCase();
        if (eventType && eventType !== selectedType) {
          autoFillStatusRef.current = 'error';
          setAutoFillMeta({
            key,
            status: 'error',
            message: lang === 'en'
              ? 'The registration ID belongs to a different event type.'
              : 'ይህ የመመዝገቢያ መለያ ለተለየ የክስተት አይነት ነው።',
          });
          return;
        }
        
        // Validate ID card number matches
        const storedIdValue = getEventFieldValue(eventData, idFieldName, selectedType);
        if (storedIdValue) {
          const provided = normalizeValue(idValue);
          const stored = normalizeValue(storedIdValue);
          if (stored && provided && stored !== provided) {
            autoFillStatusRef.current = 'error';
            setAutoFillMeta({
              key,
              status: 'error',
              message: lang === 'en'
                ? 'ID card number does not match the record.'
                : 'የመታወቂያ ቁጥሩ ከመዝገቡ ጋር አይዛመድም።',
            });
            return;
          }
        }
        
        // Cache and apply auto-fill
        autoFillCacheRef.current[key] = eventData;
        applyAutoFillFromEvent(eventData, { idFieldName, idValue, registrationValue, typeKey: selectedType });
        autoFillStatusRef.current = 'success';
        setAutoFillMeta({
          key,
          status: 'success',
          message: lang === 'en' ? 'Details auto-filled from your record.' : 'መረጃዎች ከመዝገብዎ ተሞልተዋል።',
        });
      } catch (err) {
        if (!isActive) return;
        autoFillStatusRef.current = 'error';
        setAutoFillMeta({
          key,
          status: 'error',
          message: lang === 'en'
            ? 'Auto-fill failed. Please continue manually.'
            : 'ማስሞላት አልተሳካም። እባክዎን በእጅ ይቀጥሉ።',
        });
      }
    })();
    
    return () => {
      isActive = false;
    };
  }, [
    showAuthModal,
    user?.token,
    authForm.registrationNumber,
    authForm.registrationId,
    authForm.childIdNumberAm,
    authForm.deceasedIdNumberAm,
    authForm.requesterIdNumber,
    authForm.wifeIdNumberAm,
    authForm.husbandIdNumberAm,
    authForm.divorceSpouse1IdAm,
    authForm.divorceSpouse2IdAm,
    selectedType,
    autoFillIdFields,
    applyAutoFillFromEvent,
    getEventFieldValue,
    normalizeValue,
    lang,
  ]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setToast(null);

    if (pendingAction === 'view') {
      // Use registrationNumber or registrationId key
      const regNum = authForm.registrationNumber || authForm.registrationId;
      if (!regNum) {
        setToast({ type: 'error', msg: t('Registration number is required', 'የመመዝገቢያ ቁጥር ያስፈልጋል') });
        setAuthSubmitting(false);
        return;
      }
      try {
        // Use centralized API client to avoid dev server origin issues
        let eventData;
        try {
          eventData = await apiFetch(`/users/records/${encodeURIComponent(regNum)}?ts=${Date.now()}`, {
            method: 'GET',
            token: user?.token,
          });
        } catch (err) {
          // Surface detailed status text from apiFetch error
          setToast({ type: 'error', msg: err?.message || t('Unexpected error. Try again.', 'ያልተጠበቀ ስህተት። እንደገና ይሞክሩ።') });
          setAuthSubmitting(false);
          return;
        }
        if (!eventData) {
          setToast({ type: 'error', msg: t('Event not found', 'መዝገቡ አልተገኘም') });
          setAuthSubmitting(false);
          return;
        }
        // mimic old code path
        const res = { ok: true };
        if (res && res.status === 404) {
          setToast({ type: 'error', msg: t('Event not found', 'መዝገቡ አልተገኘም') });
          setAuthSubmitting(false);
          return;
        }
        if (res && !res.ok) {
          let errorMsg = `${res.status} ${res.statusText}`;
          try {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
            const errorBody = await res.json();
            if (errorBody && errorBody.message) errorMsg = errorBody.message;
            } else {
              const text = await res.text();
              if (text) errorMsg = text;
            }
          } catch {
            // Ignore parsing errors
          }
          setToast({ type: 'error', msg: errorMsg || t('Unexpected error. Try again.', 'ያልተጠበቀ ስህተት። እንደገና ይሞክሩ።') });
          setAuthSubmitting(false);
          return;
        }
        // normalize top or .data structure
        const eventFields = (eventData.data && typeof eventData.data === 'object') ? eventData.data : eventData;
        // compare required fields for event type (support aliases per type)
        const keys = fieldMatchKeys[selectedType] || [];
        let allMatch = true;
        for (let key of keys) {
          const inputVal = (authForm[key] || '').trim().toLowerCase();
          if (!inputVal) { allMatch = false; break; }
          const aliases = (fieldAliasMap[selectedType] && fieldAliasMap[selectedType][key]) || [key];
          const dbVals = aliases.map((k) => ((eventFields[k] || '') + '').trim().toLowerCase()).filter(Boolean);
          const anyMatch = dbVals.some((v) => v === inputVal);
          if (!anyMatch) { allMatch = false; break; }
        }
        if (!allMatch) {
          setToast({ type: 'error', msg: t('Authentication failed, please re-enter correct data', 'ማረጋገጫ አልተሳካም፡ እባክዎን ትክክለኛውን መረጃ ይስጡ') });
          setAuthSubmitting(false);
          return;
        }
        // Merge important top-level metadata for a more complete view
        const mergedForView = {
          registrationId: eventData.registrationId,
          type: eventData.type,
          status: eventData.status,
          approvedBy: eventData.approvedBy?.name || eventData.approvedBy || '',
          rejectedBy: eventData.rejectedBy?.name || eventData.rejectedBy || '',
          registrarId: eventData.registrarId?.name || eventData.registrarId || '',
          updatedAt: eventData.updatedAt,
          submittedAt: eventData.submittedAt,
          _id: eventData._id,
          ...eventFields,
        };
        setShowAuthModal(false);
        setViewRecordEvent(mergedForView);
      } catch(e) {
        setToast({ type: 'error', msg: t('Network or server error', 'የአውታረመረብ ወይም የአገልግሎት ስህተት') });
      }
      setAuthSubmitting(false);
      return;
    }
    // Handle certificate request submission
    if (pendingAction === 'request') {
      try {
        const regNum = authForm.registrationNumber || authForm.registrationId;
        if (!regNum) {
          setToast({ type: 'error', msg: t('Registration number is required', 'የመመዝገቢያ ቁጥር ያስፈልጋል') });
          setAuthSubmitting(false);
          return;
        }
        // First resolve event by registrationId to get eventId
        let eventData;
        try {
          eventData = await apiFetch(`/users/records/${encodeURIComponent(regNum)}?ts=${Date.now()}`, {
            method: 'GET',
            token: user?.token,
          });
        } catch (err) {
          setToast({ type: 'error', msg: err?.message || t('Record lookup failed', 'መዝገብ መፈለግ አልተሳካም') });
          setAuthSubmitting(false);
          return;
        }
        const eventId = eventData?._id || eventData?.id;
        if (!eventId) {
          setToast({ type: 'error', msg: t('Could not resolve event ID', 'የክስተት መለያ ማግኘት አልተቻለም') });
          setAuthSubmitting(false);
          return;
        }
        // Build form-data for certificate request
        const fd = new FormData();
        fd.append('name', authForm.childNameEn || authForm.husbandName || authForm.wifeName || authForm.deceasedNameEn || '');
        fd.append('fatherName', authForm.fatherNameEn || authForm.husbandFather || authForm.wifeFather || authForm.deceasedFatherEn || '');
        fd.append('grandfatherName', authForm.childGrandfatherNameEn || authForm.husbandGrandfather || authForm.wifeGrandfather || authForm.deceasedGrandfatherEn || '');
        fd.append('type', selectedType);
        if (authForm.image) fd.append('image', authForm.image);

        try {
          await apiFetch(`/users/registrant/events/${encodeURIComponent(eventId)}/request-certificate`, {
            method: 'POST',
            token: user?.token,
            body: fd,
            isForm: true,
          });
        } catch (err) {
          setToast({ type: 'error', msg: err?.message || t('Certificate request failed', 'የማረጋገጫ ጥያቄ አልተሳካም') });
          setAuthSubmitting(false);
          return;
        }
        setToast({ type: 'success', msg: t('Certificate request submitted', 'የማረጋገጫ ጥያቄ ተልኳል') });
      } catch(e) {
        setToast({ type: 'error', msg: t('Network or server error', 'የአውታረመረብ ወይም የአገልግሎት ስህተት') });
      }
      setShowAuthModal(false);
      setAuthSubmitting(false);
      return;
    }

    // Fallback
    setShowAuthModal(false);
    setAuthSubmitting(false);
  };

  return (
    <div className="flex min-h-screen">
      <div className="h-screen sticky top-0" style={{ width: "20rem", margin: 0, padding: 0, left: 0 }}>
        <ProfileSidebar
          user={user}
          setUser={setUser}
          onNavigateToMyRecords={() => openTypePicker('view')}
          onNavigateToRequestCertificate={() => openTypePicker('request')}
          onNavigateToMyCertificates={() => {
            setActiveSection('certificates');
          }}
        />
      </div>
      <div className="flex-1 p-4 space-y-6">
        {/* Conditional content based on active section */}
        {activeSection === 'dashboard' && (
          <>
            {/* Welcome / Hero */}
            <section className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-extrabold text-gray-900">{t("Welcome to your Registrant Dashboard", "ወደ የተመዘገበ ዳሽቦርድዎ እንኳን በደህና መጡ")}</h1>
              <p className="mt-2 text-gray-600">
                {t(
                  "Manage your vital events in one place. Track your registration status, view your event records, and securely access your digital certificates.",
                  "የእርስዎን አስፈላጊ ክስተቶች በአንድ ቦታ ያቀናጁ። የመመዝገብ ሁኔታዎን ክትትሉ፣ የክስተት መዝገቦችዎን ይመልከቱ እና የዲጂታል ሰነዶችን በደህንነት ይድረሱ።"
                )}
              </p>
              </div>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 border hover:bg-gray-200"
                onClick={toggleLang}
                title={t("Switch language", "ቋንቋ ለውጥ")}
              >
                {lang === "en" ? "አማርኛ" : "English"}
              </button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <div className="text-xl font-semibold text-gray-900">{t("View Registration Status", "የመመዝገብ ሁኔታ ይመልከቱ")}</div>
            <p className="mt-2 text-gray-600">{t("Check whether your submitted registrations are draft, pending, approved, or rejected.", "ያቀረቡት መመዝገብ የተዘጋጀ ነው ወይስ በመጠበቅ ላይ፣ ተጸድቋል ወይስ ተተውቷል እንደሆነ ይመልከቱ።")}</p>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <div className="text-xl font-semibold text-gray-900">{t("View Your Event Records", "የክስተት መዝገቦችዎን ይመልከቱ")}</div>
            <p className="mt-2 text-gray-600">{t("Quickly access records for births, marriages, deaths, and more—kept securely for you.", "ልደት፣ ጋብቻ፣ ሞት እና ሌሎች መዝገቦችን በፍጥነት እና በደህንነት ይድረሱ።")}</p>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <div className="text-xl font-semibold text-gray-900">{t("Access Digital Certificates", "ዲጂታል ሰነዶችን ይድረሱ")}</div>
            <p className="mt-2 text-gray-600">{t("Request and download official digital certificates once your events are approved.", "ክስተቶችዎ ከተጸደቁ በኋላ መስመራዊ ዲጂታል ሰነዶችን ይጠይቁ እና ያውርዱ።")}</p>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <div className="text-xl font-semibold text-gray-900">{t("Request Corrections", "ማስተካከያ ይጠይቁ")}</div>
            <p className="mt-2 text-gray-600">{t("Found an issue? Submit a correction request to update an existing record.", "ችግኝ አግኝተዋል? ነባር መዝገብን ለማዘመን የማስተካከያ ጥያቄ ያቀርቡ።")}</p>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <div className="text-xl font-semibold text-gray-900">{t("Notifications", "ማሳወቂያዎች")}</div>
            <p className="mt-2 text-gray-600">{t("Stay informed with real-time updates about approvals, rejections, and certificate readiness.", "ስለ ማጽደቅ፣ ስለ መተው እና ስለ የሰነድ ዝግጁነት በእውነተኛ ጊዜ ዝማኔዎችን ይቀበሉ።")}</p>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <div className="text-xl font-semibold text-gray-900">{t("Secure & Private", "ደህንነታማ እና ግላዊ")}</div>
            <p className="mt-2 text-gray-600">{t("Your data is protected. Only you can view and manage your vital event information.", "ውሂብዎ ይጠበቃል። የእርስዎን አስፈላጊ መረጃ ለማየት እና ለአስተዳደር የሚችሉት እርስዎ ብቻ ነው።")}</p>
          </div>
        </section>

        {/* Quick links to anchors (placeholders kept for future content) */}
        <section className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900">{t("Get started", "መጀመር")}</h2>
          <p className="mt-2 text-gray-600">{t("Use the quick links below to jump to common tasks.", "ወደ ተደጋጋሚ ስራዎች ለመዝለል ከታች ያሉትን ፈጣን አገናኞች ይጠቀሙ።")}</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
            <a
              className="w-full px-4 py-3 rounded-md bg-yellow-50 text-yellow-900 border border-yellow-200 hover:bg-yellow-100 text-left"
              href="#"
              onClick={(e) => { e.preventDefault(); alert("Open correction request from your records."); }}
            >
              {t("Request a correction", "ማስተካከያ ይጠይቁ")}
            </a>
            <a
              className="w-full px-4 py-3 rounded-md bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100 text-left"
              href="#"
              onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              {t("Check notifications", "ማሳወቂያዎችን ይመልከቱ")}
            </a>
          </div>
        </section>
          </>
        )}

        {/* Invisible anchors retained for sidebar navigation */}
        <div ref={requestCertRef} />
        <div ref={myRecordsRef} />
        <div ref={myCertificatesRef} />

        {/* My Certificates - show in main area when active */}
        {activeSection === 'certificates' && (
          <section className="bg-white rounded-xl border shadow-sm p-6" id="my-certificates">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveSection('dashboard')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  ← {t('Back to Dashboard', 'ወደ ዳሽቦርድ ተመለስ')}
                </button>
                <h2 className="text-2xl font-bold text-gray-900">{t('My Certificates', 'የእኔ ምስክር ወረቀቶች')}</h2>
              </div>
              <button className="text-sm px-3 py-1 rounded border bg-white hover:bg-gray-50" onClick={() => fetchMyCertificates() }>
                {t('Refresh', 'አድስ')}
              </button>
            </div>
            <MyCertificatesList
              rows={myCerts}
              loading={loadingCerts}
              lang={lang}
              token={user?.token}
            />
          </section>
        )}

        {/* Event Type Picker Modal */}
        {showTypePicker && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {t("Select event type", "የክስተት አይነት ይምረጡ")}
                </h2>
                <button
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                  onClick={() => setShowTypePicker(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {t(
                  "Choose the event type to continue.",
                  "ለመቀጠል የክስተት አይነትን ይምረጡ።"
                )}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { key: 'birth', labelEn: 'Birth', labelAm: 'ትውልድ' },
                  { key: 'death', labelEn: 'Death', labelAm: 'ሞት' },
                  { key: 'marriage', labelEn: 'Marriage', labelAm: 'ጋብቻ' },
                  { key: 'divorce', labelEn: 'Divorce', labelAm: 'ፍቺ' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    className={`px-4 py-3 rounded-md border text-left ${selectedType === opt.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 hover:bg-gray-50 border-gray-200'}`}
                    onClick={() => setSelectedType(opt.key)}
                  >
                    {t(opt.labelEn, opt.labelAm)}
                  </button>
                ))}
                </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  className="px-4 py-2 rounded-md border bg-white text-gray-800 hover:bg-gray-50"
                  onClick={() => setShowTypePicker(false)}
                >
                  {t("Cancel", "ሰርዝ")}
                </button>
                <button
                  className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  onClick={proceedWithType}
                >
                  {pendingAction === 'view' ? t("View", "ተመልከት") : t("Continue", "ቀጥል")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Authentication Form Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
              <div className="flex items-center justify-between px-6 py-4 bg-blue-50 rounded-t-2xl border-b">
                <h2 className="text-2xl font-bold text-blue-900">
                  {pendingAction === 'view'
                    ? t("Authenticate to view records", "መዝገቦችን ለማየት ይረጋገጡ")
                    : t("Authenticate to request certificate", "ማረጋገጫ ለመጠየቅ ይረጋገጡ")}
                </h2>
                <button
                  className="text-gray-500 hover:text-gray-700 text-3xl leading-none ml-6"
                  onClick={() => setShowAuthModal(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              {/* SCROLLABLE FORM BODY: limits height and allow internal scroll */}
              <form className="px-6 py-5 max-h-[80vh] overflow-y-auto" onSubmit={handleAuthSubmit}>
                <p className="mb-3 text-gray-600 text-sm">
                  {t(
                    "Provide the details below for verification.",
                    "ለማረጋገጥ ዝርዝሮቹን ያስገቡ።"
                  )}
                </p>
                {autoFillMeta.status === 'loading' && (
                  <div className="mb-4 px-3 py-2 rounded-md border border-blue-200 bg-blue-50 text-blue-800 text-sm">
                    {autoFillMeta.message || t("Fetching record details…", "የመዝገብ ዝርዝሮችን በመመልከት ላይ…")}
                  </div>
                )}
                {autoFillMeta.status === 'success' && (
                  <div className="mb-4 px-3 py-2 rounded-md border border-green-200 bg-green-50 text-green-800 text-sm">
                    {autoFillMeta.message || t("Details auto-filled from your record.", "መረጃዎች ከመዝገብዎ ተሞልተዋል።")}
                  </div>
                )}
                {autoFillMeta.status === 'error' && (
                  <div className="mb-4 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-800 text-sm">
                    {autoFillMeta.message || t("Auto-fill failed. Please continue manually.", "ማስሞላት አልተሳካም። እባክዎን በእጅ ይቀጥሉ።")}
                  </div>
                )}
                {(authSchemas[selectedType] || []).map((field, idx) => {
                  // Render section header
                  if (field.section) {
                    return (
                      <div key={`sec-${idx}`} className="col-span-full my-3">
                        <div className="px-3 py-1 bg-gray-50 text-lg font-semibold rounded border text-gray-800 mb-2">
                          {t(field.section, field.sectionAm)}
              </div>
              </div>
                    );
                  }
                  // File and date inputs take full width (next row)
                  const onePerRow = field.type === 'file' || field.type === 'ethiopian-date';
                  // Make certain fields appear side-by-side
                  let fieldClass = 'mb-3';
                  if (!onePerRow) fieldClass += ' sm:col-span-1';
                  else fieldClass += ' col-span-full';
                  // Main render
                  if (field.type === 'select') {
                    return (
                      <div key={field.name} className={fieldClass}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t(field.labelEn, field.labelAm)}</label>
                        <select
                          name={field.name} value={authForm[field.name] || ''}
                          onChange={handleAuthChange}
                          className="w-full border rounded px-3 py-2 focus:ring-blue-400 focus:border-blue-500 bg-white" required>
                          <option value="" disabled>{t('Select...', 'ይምረጡ...')}</option>
                          {(field.options || []).map(opt => (
                            <option key={opt.value} value={opt.value}>{t(opt.labelEn, opt.labelAm)}</option>
                          ))}
                </select>
              </div>
                    );
                  }
                  if (field.type === 'file') {
                    return (
                      <div key={field.name} className="mb-3 col-span-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t(field.labelEn, field.labelAm)}</label>
                        <input type="file" name={field.name} accept="image/*" onChange={handleAuthChange} className="w-full border rounded px-3 py-2 bg-white" required />
                      </div>
                    );
                  }
                  // Date as special type
                  if (field.type === 'ethiopian-date') {
                    return (
                      <div key={field.name} className="mb-3 col-span-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t(field.labelEn, field.labelAm)}</label>
                        <input name={field.name} value={authForm[field.name] || ''} onChange={handleAuthChange} placeholder={t('YYYY-MM-DD (Ethiopian)', 'YYYY-MM-DD (ኢትዮጵያዊ)')} className="w-full border rounded px-3 py-2" required />
              </div>
                    );
                  }
                  // Default input (two column)
                  return (
                    <div key={field.name} className={fieldClass}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t(field.labelEn, field.labelAm)}</label>
                      <input name={field.name} value={authForm[field.name] || ''} onChange={handleAuthChange} className="w-full border rounded px-3 py-2" required />
                </div>
                  );
                })}
                <div className="mt-4 flex justify-end gap-3 pb-1">
                  <button type="button" className="px-6 py-2 rounded-lg border bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-300 outline-none" onClick={() => setShowAuthModal(false)}>
                    {t("Cancel", "ሰርዝ")}
                  </button>
                  <button type="submit" disabled={authSubmitting}
                    className="px-6 py-2 rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 outline-none text-base font-semibold">
                    {authSubmitting
                      ? t("Processing...", "በማስኬድ ላይ...")
                      : (pendingAction === 'view'
                        ? t("View my record", "መዝገቤን ይመልከቱ")
                        : t("Request certificate", "ማረጋገጫ ይጠይቁ"))}
                  </button>
                </div>
              </form>
            </div>
              </div>
        )}
        {/* Toast notification */}
        {toast && (
          <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] font-medium px-5 py-3 rounded-xl shadow bg-${toast.type === 'error' ? 'red' : 'blue'}-600 text-white whitespace-nowrap animate-slide-fade-in-out`}>
            {toast.msg}
              </div>
        )}
        {/* VERIFICATION & EVENT DISPLAY MODAL */}
        {viewRecordEvent && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[999] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative">
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b rounded-t-2xl bg-white">
                <h2 className="text-xl md:text-2xl font-bold text-blue-900">{t('Event Record', 'የክስተት መዝገብ')}</h2>
                <button className="text-2xl text-gray-400 hover:text-gray-600" onClick={() => setViewRecordEvent(null)} aria-label="Close">&times;</button>
              </div>
              {/* Content */}
              <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                <div className="p-4 border rounded-xl bg-gray-50">
                {(() => {
                  const eventType = (viewRecordEvent.type || '').toLowerCase();
                  const config = FORM_FIELD_CONFIG[eventType] || [];

                  const getValue = (obj, path) => {
                    if (!path) return undefined;
                    return path.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
                  };
                  const buildImageUrl = (p) => {
                    try {
                      if (!p) return null;
                      const isAbsolute = /^https?:\/\//i.test(p);
                      if (isAbsolute) return p;
                      const base = uploadsBaseUrl();
                      return `${base}/${String(p).replace(/^\/+/, '')}`;
                    } catch { return null; }
                  };
                  const renderValue = (v, type, key) => {
                    if (v === null || v === undefined || v === '' || v === 'null' || v === 'undefined') return <span className="text-gray-400">-</span>;
                    const looksLikeImage = typeof v === 'string' && /(\.png|\.jpg|\.jpeg|\.gif|\.webp)$/i.test(v);
                    const isImageType = type === 'file' || /photo|image|picture|avatar/i.test(key || '');
                    if ((looksLikeImage || isImageType) && typeof v === 'string') {
                      const src = buildImageUrl(v);
                      if (src) {
                        return (
                          <div className="inline-flex items-center gap-2">
                            <img src={src} alt={key || 'image'} className="w-24 h-24 object-cover rounded border" />
                            <a href={src} target="_blank" rel="noreferrer" className="text-blue-600 text-xs underline">{t('Open', 'ክፈት')}</a>
                          </div>
                        );
                      }
                    }
                    if (typeof v === 'boolean') return <span>{v ? (lang === 'en' ? 'Yes' : 'አዎ') : (lang === 'en' ? 'No' : 'አይ')}</span>;
                    if (typeof v === 'object') {
                      try { 
                        return <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-48">{JSON.stringify(v, null, 2)}</pre>; 
                      } catch {
                        return <span className="text-gray-500">[Object]</span>;
                      }
                    }
                    return <span className="text-sm text-gray-900 break-words">{String(v)}</span>;
                  };

                  const sections = [];
                  let current = { titleEn: lang === 'en' ? 'Event Details' : 'የክስተት ዝርዝር', items: [] };
                    config.forEach((f) => {
                    if (f.section) {
                      if (current.items.length) sections.push(current);
                      current = { titleEn: f.section, titleAm: f.sectionAm, items: [] };
                    } else if (f.name) {
                      const label = lang === 'en' ? (f.labelEn || f.name) : (f.labelAm || f.labelEn || f.name);
                      const value = getValue(viewRecordEvent, f.name) ?? getValue(viewRecordEvent, `data.${f.name}`);
                        current.items.push({ key: f.name, label, value, type: f.type });
                    }
                  });
                  if (current.items.length) sections.push(current);

                  return (
                    <div className="space-y-6">
                      {/* meta header */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-white rounded-lg border p-3"><div className="text-[12px] text-gray-600">{lang==='en'?'Registration ID':'የመዝገቢያ መለያ'}</div><div className="font-medium">{viewRecordEvent.registrationId || '-'}</div></div>
                        <div className="bg-white rounded-lg border p-3"><div className="text-[12px] text-gray-600">{lang==='en'?'Type':'አይነት'}</div><div className="font-medium capitalize">{viewRecordEvent.type || '-'}</div></div>
                        <div className="bg-white rounded-lg border p-3"><div className="text-[12px] text-gray-600">{lang==='en'?'Status':'ሁኔታ'}</div><div className="font-medium capitalize">{viewRecordEvent.status || '-'}</div></div>
                      </div>

                      {sections.map((sec, idx) => (
                        <div key={idx}>
                          <div className="text-sm font-semibold text-blue-700 mb-2">{lang==='en' ? sec.titleEn : (sec.titleAm || sec.titleEn)}</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sec.items.map(({ key, label, value, type }) => (
                              <div key={key} className="bg-white rounded-lg border shadow-sm p-3">
                                <div className="text-[13px] font-semibold text-gray-600 mb-1">{label}</div>
                                <div>{renderValue(value, type, key)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                </div>
              </div>
              {/* Footer */}
              <div className="px-6 py-4 border-t rounded-b-2xl bg-white flex flex-col gap-3">
                {/* Inline correction form toggle */}
                {showCorrection && (
                  <div className="bg-white rounded-xl border shadow-sm p-4">
                    <div className="text-sm font-semibold text-blue-700 mb-2">{t('Request a correction', 'ማስተካከያ ይጠይቁ')}</div>
                    <textarea
                      value={correctionText}
                      onChange={(e) => setCorrectionText(e.target.value)}
                      className="w-full border rounded-md p-2 min-h-28"
                      placeholder={t('Describe what needs to be corrected...', 'ሊታረስ የሚፈልጉትን ይግለጹ...')}
                    />
                    <div className="mt-3 flex justify-end gap-2">
                      <button className="px-3 py-2 rounded-md border bg-white hover:bg-gray-50" onClick={() => { setShowCorrection(false); setCorrectionText(''); }}>
                        {t('Cancel', 'ሰርዝ')}
                      </button>
                      <button
                        className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                        disabled={submittingCorrection || !correctionText.trim()}
                        onClick={async () => {
                          try {
                            setSubmittingCorrection(true);
                            const eventId = viewRecordEvent?._id;
                            if (!eventId) throw new Error('Missing event id');
                            await apiFetch(`/users/registrant/events/${encodeURIComponent(eventId)}/request-correction`, {
                              method: 'POST',
                              token: user?.token,
                              body: { details: correctionText.trim() },
                            });
                            setToast({ type: 'success', msg: t('Correction request submitted', 'የማስተካከያ ጥያቄ ተልኳል') });
                            setShowCorrection(false);
                            setCorrectionText('');
                          } catch (err) {
                            setToast({ type: 'error', msg: err?.message || t('Failed to submit correction request', 'የማስተካከያ ጥያቄ መላክ አልተሳካም') });
                          } finally {
                            setSubmittingCorrection(false);
                          }
                        }}
                      >
                        {submittingCorrection ? t('Submitting...', 'በመላክ ላይ...') : t('Submit request', 'ጥያቄ ላክ')}
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <button className="px-4 py-2 rounded-md border bg-white text-gray-800 hover:bg-gray-50" onClick={() => setViewRecordEvent(null)}>
                    {t('Close', 'ዝጋ')}
                  </button>
                  <button className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setShowCorrection(true)}>
                    {t('Request correction', 'ማስተካከያ ይጠይቁ')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrantDashboard;

// Inline list component to render certificates
const MyCertificatesList = ({ rows, loading, lang, token }) => {
  const t = (en, am) => (lang === 'en' ? en : am);
  const [items, setItems] = React.useState(rows || []);
  const [previews, setPreviews] = React.useState({}); // { [requestId]: { url, type } }
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage] = React.useState(3);
  
  // Update items when rows change and reset to page 1
  React.useEffect(() => { 
    setItems(rows || []); 
    setCurrentPage(1); // Reset to first page when items change
  }, [rows]);
  const revokePreview = (requestId) => {
    try {
      const prev = previews[requestId];
      if (prev?.url) URL.revokeObjectURL(prev.url);
    } catch {
      // Ignore URL revocation errors
    }
    setPreviews((p) => {
      const next = { ...p };
      delete next[requestId];
      return next;
    });
  };
  const downloadWithAuth = async (path) => {
    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Determine file extension based on content type
      const contentType = res.headers.get('content-type');
      const fileExtension = contentType?.includes('pdf') ? 'pdf' : 'html';
      a.download = `certificate.${fileExtension}`;
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(t('Failed to download certificate', 'ሰነዱን መውረድ አልተሳካም'));
    }
  };
  const previewWithAuth = async (row) => {
    try {
      if (!row?.downloadPath) return;
      // clean up existing for this requestId
      revokePreview(row.requestId);
      const res = await fetch(`${API_BASE_URL}${row.downloadPath}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const contentType = res.headers.get('content-type') || blob.type || '';
      const type = contentType.includes('pdf') ? 'pdf' : contentType.includes('html') ? 'html' : 'other';
      setPreviews((p) => ({ ...p, [row.requestId]: { url, type } }));
    } catch (e) {
      alert(t('Failed to preview certificate', 'ሰነዱን መመልከት አልተሳካም'));
    }
  };

  const generateCertificate = async (eventId, requestId) => {
    try {
      const result = await apiFetch('/users/certificates/generate', {
        method: 'POST',
        token,
        body: { eventId, requestId },
      });
      return result;
    } catch (e) {
      console.error('Certificate generation error:', e);
      throw e;
    }
  };
  if (loading) {
    return <div className="text-gray-500">{t('Loading...', 'በመጫን ላይ...')}</div>;
  }
  if (!items || items.length === 0) {
    return <div className="text-gray-500">{t('No certificate requests yet.', 'እስካሁን ምንም የሰነድ ጥያቄ የለም።')}</div>;
  }
  
  // Calculate pagination
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);
  
  return (
    <div className="space-y-4">
      {paginatedItems.map((r) => (
        <div key={`${r.eventId}-${r.requestId}`} className="bg-gray-50 rounded-lg p-4 border">
          <div className="flex flex-col">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  r.status === 'approved' ? 'bg-green-100 text-green-800' :
                  r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {r.status === 'approved' ? t('Approved', 'የተፀድቀ') :
                   r.status === 'pending' ? t('Pending', 'በመጠባበቅ ላይ') :
                   t('Rejected', 'የተቀባ')}
                </span>
                {r.certificateId && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {t('Digital Certificate Available', 'ዲጂታል ምስክር ወረቀት ይገኛል')}
                  </span>
                )}
              </div>
              
              <div className="text-sm text-gray-700 mb-1">
                <strong>{t('Registration', 'የመመዝገቢያ')}:</strong> {r.registrationId}
              </div>
              <div className="text-sm text-gray-700 mb-1">
                <strong>{t('Type', 'አይነት')}:</strong> {r.eventType}
              </div>
              <div className="text-sm text-gray-700 mb-1">
                <strong>{t('Requested', 'የተጠየቀ')}:</strong> {new Date(r.requestedAt).toLocaleDateString()}
              </div>
              {r.approvedAt && (
                <div className="text-sm text-gray-700 mb-1">
                  <strong>{t('Approved', 'የተፀድቀ')}:</strong> {new Date(r.approvedAt).toLocaleDateString()}
                </div>
              )}
              {r.certificateId && (
                <div className="text-sm text-gray-700 mb-1">
                  <strong>{t('Certificate ID', 'የምስክር ወረቀት ID')}:</strong> {r.certificateId}
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {r.certificateId && r.downloadPath && (
                <>
                  <button
                    onClick={() => downloadWithAuth(r.downloadPath)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-medium shadow-sm"
                  >
                    {t('Download', 'ያውርዱ')}
                  </button>
                  <button
                    onClick={() => previewWithAuth(r)}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-xs font-medium shadow-sm"
                  >
                    {t('Preview', 'ቅድመ እይታ')}
                  </button>
                  <a
                    href={`/verify/${r.certificateId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs font-medium text-center shadow-sm"
                  >
                    {t('Verify', 'ያረጋግጡ')}
                  </a>
                </>
              )}
              {!r.certificateId && r.status === 'approved' && (
                <button
                  onClick={async () => {
                    try {
                      const result = await generateCertificate(r.eventId, r.requestId);
                      if (result.success) {
                        const message = result.hasPdf 
                          ? t('Certificate generated successfully as PDF!', 'ምስክር ወረቀት በ PDF በተሳካ ሁኔታ ተፈጥሯል!')
                          : t('Certificate generated successfully!', 'ምስክር ወረቀት በተሳካ ሁኔታ ተፈጥሯል!');
                        alert(message);
                        // Refresh this item locally
                        setItems((prev) => prev.map((it) => it.requestId === r.requestId ? { ...it, certificateId: result.certificateId, downloadPath: `/users/certificates/${result.certificateId}/download`, approvedAt: new Date().toISOString(), status: 'approved' } : it));
                      }
                    } catch (error) {
                      alert(t('Failed to generate certificate: ', 'ምስክር ወረቀት መፍጠር አልተሳካም: ') + error.message);
                    }
                  }}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs font-medium shadow-sm"
                >
                  {t('Generate', 'ይፍጠሩ')}
                </button>
              )}
              {r.status === 'pending' && (
                <div className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-md text-xs text-center border border-yellow-200">
                  {t('Pending Approval', 'በመጠባበቅ ላይ')}
                </div>
              )}
              {r.status === 'rejected' && (
                <div className="px-3 py-1.5 bg-red-100 text-red-800 rounded-md text-xs text-center border border-red-200">
                  {t('Rejected', 'ተቀባይነት አላገኘም')}
                </div>
              )}
              {r.certificateId && (
                <button
                  className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs font-medium shadow-sm"
                  onClick={async () => {
                    if (!window.confirm(t('Are you sure you want to delete this certificate?', 'ይህን ምስክር ወረቀት ማጥፋት እርግጠኛ ነዎት?'))) return;
                    try {
                      await apiFetch(`/users/registrant/events/${encodeURIComponent(r.eventId)}/certificates/${encodeURIComponent(r.requestId)}`, {
                        method: 'DELETE',
                        token,
                      });
                      // Optimistically remove from list
                      setItems((prev) => prev.filter((it) => !(it.eventId === r.eventId && it.requestId === r.requestId)));
                      alert(t('Certificate deleted', 'ምስክር ወረቀቱ ተሰርዟል'));
                    } catch (e) {
                      let msg = e?.message || '';
                      try {
                        if (e?.response) {
                          const ct = e.response.headers.get('content-type') || '';
                          if (ct.includes('application/json')) {
                            const body = await e.response.json();
                            msg = body?.message || msg;
                          } else {
                            msg = (await e.response.text()) || msg;
                          }
                        }
                      } catch {
                        // Ignore parsing errors
                      }
                      alert(t('Failed to delete certificate', 'ምስክር ወረቀት ማጥፋት አልተሳካም') + (msg ? `: ${msg}` : ''));
                    }
                  }}
                >
                  {t('Delete Certificate', 'ምስክር ወረቀት ይሰርዙ')}
                </button>
              )}
            </div>
            {previews[r.requestId]?.url && (
              <div className="mt-2 border rounded-md bg-white shadow-sm overflow-hidden w-full max-w-md">
                <div className="flex items-center justify-between px-2 py-1 border-b bg-gray-50">
                  <div className="text-[11px] text-gray-600 truncate">{t('Certificate preview', 'የምስክር ወረቀት ቅድመ እይታ')}</div>
                  <button
                    className="text-[11px] text-blue-600 hover:text-blue-800"
                    onClick={() => revokePreview(r.requestId)}
                  >
                    {t('Close', 'ዝጋ')}
                  </button>
                </div>
                <iframe
                  title={`preview-${r.requestId}`}
                  src={previews[r.requestId].url}
                  className="w-[320px] h-[220px]"
                />
              </div>
            )}
          </div>
        </div>
      ))}
      {items.length > 3 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={items.length}
          lang={lang}
        />
      )}
    </div>
  );
};
