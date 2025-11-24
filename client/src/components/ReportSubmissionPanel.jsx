import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

const fallbackTranslate = (lang, en, am) => (lang === "en" ? en : am);

const formatDate = (value, lang) => {
  if (!value) return lang === "en" ? "N/A" : "የለም";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return lang === "en" ? "N/A" : "የለም";
  }
};

const deriveEventLabel = (evt) => {
  if (!evt || typeof evt !== "object") return "-";
  const data = evt.data || {};
  const candidates = [
    data.childNameEn,
    data.childNameAm,
    data.husbandNameEn,
    data.husbandNameAm,
    data.wifeNameEn,
    data.wifeNameAm,
    data.deceasedNameEn,
    data.deceasedNameAm,
    data.requesterName,
    data.registrationNumber,
    data.registrationId,
    evt.registrationId,
  ];
  const match = candidates.find((val) => val && String(val).trim().length > 0);
  return match ? String(match).trim() : "-";
};

const ReportSubmissionPanel = ({
  lang = "en",
  translate = fallbackTranslate,
  user,
  roleKey,
  reportSummary = {},
  filteredEvents = [],
  reportPeriodMeta = { key: "custom", labelEn: "Selected period", labelAm: "የተመረጠ ጊዜ" },
  reportPeriodStart,
}) => {
  const [title, setTitle] = useState("");
  const [titleDirty, setTitleDirty] = useState(false);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ error: "", success: "" });
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const localizedPeriodLabel = useMemo(
    () => translate(lang, reportPeriodMeta?.labelEn || "Selected period", reportPeriodMeta?.labelAm || "የተመረጠ ጊዜ"),
    [lang, reportPeriodMeta?.labelAm, reportPeriodMeta?.labelEn, translate]
  );

  const defaultTitle = useMemo(
    () =>
      translate(
        lang,
        `Operational report (${localizedPeriodLabel})`,
        `የስራ ሪፖርት (${localizedPeriodLabel})`
      ),
    [lang, localizedPeriodLabel, translate]
  );

  useEffect(() => {
    if (!titleDirty) {
      setTitle(defaultTitle);
    }
  }, [defaultTitle, titleDirty]);

  const typeBreakdown = useMemo(() => {
    const breakdown = {};
    filteredEvents.forEach((evt) => {
      const type = evt.type || "other";
      breakdown[type] = (breakdown[type] || 0) + 1;
    });
    return breakdown;
  }, [filteredEvents]);

  const readyToSend = notes.trim().length >= 20;

  const refreshHistory = useCallback(async () => {
    if (!user?.token) return;
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const res = await apiFetch("/users/reports/mine", { token: user.token });
      setHistory(Array.isArray(res) ? res : []);
    } catch (err) {
      setHistory([]);
      setHistoryError(err?.message || translate(lang, "Unable to load previous reports.", "ያለፉትን ሪፖርቶች መመልከት አልተቻለም።"));
    } finally {
      setHistoryLoading(false);
    }
  }, [lang, translate, user?.token]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const handleSend = async () => {
    if (!user?.token) return;
    if (!readyToSend) {
      setStatusMessage({
        error: translate(lang, "Please provide at least a few sentences in the summary.", "ቢያንስ ጥቂት ሐረጎችን በሪፖርቱ ውስጥ ያስገቡ።"),
        success: "",
      });
      return;
    }
    setSending(true);
    setStatusMessage({ error: "", success: "" });
    try {
      const periodStartIso = reportPeriodStart ? new Date(reportPeriodStart).toISOString() : null;
      const payload = {
        title: (title || defaultTitle).trim(),
        summary: notes.trim(),
        metrics: {
          total: reportSummary.total || filteredEvents.length,
          draft: reportSummary.draft || 0,
          pending: reportSummary.pending || 0,
          approved: reportSummary.approved || 0,
          rejected: reportSummary.rejected || 0,
        },
        totalsByType: typeBreakdown,
        period: {
          key: reportPeriodMeta?.key || "custom",
          label: reportPeriodMeta?.labelEn || "custom",
          start: periodStartIso,
          end: new Date().toISOString(),
        },
        // Event details removed - reports should not include event information
        sampleEvents: [],
        insights: [],
        context: {
          lang,
          role: roleKey,
          totalRecordsConsidered: filteredEvents.length,
        },
      };
      // Use the new endpoint with period type support
      await apiFetch("/users/reports/with-period", {
        method: "POST",
        token: user.token,
        body: {
          ...payload,
          periodType: reportPeriodMeta?.key || "custom",
        },
      });
      setStatusMessage({
        success: translate(lang, "Report sent to manager successfully.", "ሪፖርቱ ለማናጀሪ ተልኳል።"),
        error: "",
      });
      setNotes("");
      setTitleDirty(false);
      refreshHistory();
    } catch (err) {
      setStatusMessage({
        error: err?.message || translate(lang, "Unable to send report. Please try again.", "ሪፖርቱን መላክ አልተቻለም። እባክዎ ዳግም ይሞክሩ።"),
        success: "",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-6 border-t pt-4 space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {translate(lang, "Report title", "የሪፖርት ርዕስ")}
        </label>
        <input
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setTitleDirty(true);
          }}
          placeholder={translate(lang, "e.g. Weekly operations update", "ለምሳሌ፡ የሳምንት የስራ ግምገማ")}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {translate(lang, "Key highlights, risks and support needed", "አስፈላጊ ጉዳዮች፣ አደጋዎች እና ያስፈልጉ ድጋፎች")}
        </label>
        <textarea
          className="w-full border rounded-md px-3 py-2 text-sm min-h-[120px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={translate(
            lang,
            "Summarize achievements, blockers, data quality observations, and any support you need from the manager.",
            "ስኬቶችን፣ እንቅፋቶችን፣ የውሂብ ጥራት ግኝቶችን እና ከማናጀሩ የሚያስፈልጉዎትን ድጋፍ ያብራሩ።"
          )}
        />
        <p className="text-xs mt-1 text-gray-500">
          {translate(
            lang,
            "At least two sentences are recommended to help the manager take action.",
            "ለማናጀሩ እርምጃ እንዲወስድ ቢያንስ ሁለት ሐረጎች ያስፈልጋሉ።"
          )}
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm text-gray-600 space-y-1">
          <div>
            <strong>{translate(lang, "Period:", "ጊዜ:")}</strong> {localizedPeriodLabel}
          </div>
          <div>
            <strong>{translate(lang, "Window starts:", "ጊዜው የሚጀምርበት:")}</strong>{" "}
            {formatDate(reportPeriodStart, lang)}
          </div>
          <div>
            <strong>{translate(lang, "Records analyzed:", "የተተነቱ መዝገቦች:")}</strong>{" "}
            {filteredEvents.length}
          </div>
        </div>
        <button
          onClick={handleSend}
          disabled={!readyToSend || sending}
          className={`px-4 py-2 rounded-md text-white ${readyToSend && !sending ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"}`}
        >
          {sending
            ? translate(lang, "Sending...", "በመላክ ላይ...")
            : translate(lang, "Send report to manager", "ሪፖርት ላክ ለማናጀር")}
        </button>
      </div>

      {statusMessage.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {statusMessage.error}
        </div>
      )}
      {statusMessage.success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-sm">
          {statusMessage.success}
        </div>
      )}

      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-800 text-sm">
            {translate(lang, "Previous submissions", "የቀድሞ ሪፖርቶች")}
          </h4>
          {historyLoading && (
            <span className="text-xs text-gray-500">
              {translate(lang, "Refreshing...", "በመታደስ ላይ...")}
            </span>
          )}
        </div>
        {historyError && (
          <div className="text-sm text-red-600 mb-2">{historyError}</div>
        )}
        {history.length === 0 && !historyLoading ? (
          <p className="text-sm text-gray-500">
            {translate(
              lang,
              "No reports have been submitted yet.",
              "እስካሁን ምንም ሪፖርት አልተገኘም።"
            )}
          </p>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 3).map((item) => (
              <div key={item._id} className="bg-white rounded border px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-800 truncate">{item.title}</div>
                  <div className="text-xs text-gray-500">
                    {formatDate(item.createdAt, lang)}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {translate(lang, "Status", "ሁኔታ")}: {item.status || "submitted"} ·{" "}
                  {item.feedback?.length
                    ? translate(
                        lang,
                        `${item.feedback.length} feedback response(s)`,
                        `${item.feedback.length} የአስተያየት መልስ(ዎች)`
                      )
                    : translate(lang, "Awaiting manager feedback", "የማናጀር መልስ በመጠባበቅ ላይ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportSubmissionPanel;

