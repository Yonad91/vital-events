"use client";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { Button } from "@/components/ui/button";

export default function LanguageSwitcher() {
  const { t } = useTranslation();
  const current = i18n.language || "en";
  const toggle = () => {
    const next = current === "en" ? "am" : "en";
    i18n.changeLanguage(next);
    if (typeof window !== "undefined") localStorage.setItem("lang", next);
  };
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {t("app.language")}:
      </span>
      <Button variant="secondary" size="sm" onClick={toggle}>
        {current === "en" ? t("app.amharic") : t("app.english")}
      </Button>
    </div>
  );
}
