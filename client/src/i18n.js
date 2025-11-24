import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en/translation.json";
import am from "./locales/am/translation.json";

const savedLang =
  typeof window !== "undefined" ? localStorage.getItem("lang") : "en";

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, am: { translation: am } },
  lng: savedLang || "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
