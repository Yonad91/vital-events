import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const LanguageContext = createContext(null);

const STORAGE_KEY = "dashboardLang";
const FALLBACK_LANG = "en";

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(FALLBACK_LANG);

  // Sync initial value from localStorage after mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "am" || stored === "en") {
        setLang(stored);
      }
    } catch (err) {
      console.warn("Unable to read stored language preference", err);
    }
  }, []);

  // Persist whenever language changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch (err) {
      console.warn("Unable to persist language preference", err);
    }
  }, [lang]);

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === "en" ? "am" : "en"));
  }, []);

  const translate = useCallback(
    (english, amharic) => {
      if (lang === "en") return english;
      if (typeof amharic === "string" && amharic.length > 0) return amharic;
      return english;
    },
    [lang],
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang,
      translate,
    }),
    [lang, toggleLang, translate],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

