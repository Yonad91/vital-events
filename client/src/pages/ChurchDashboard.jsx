"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import FormSelector from "./forms/FormSelector";
import ProfileSidebar from "../components/ProfileSidebar";
import ReportSubmissionPanel from "../components/ReportSubmissionPanel";
import Pagination from "../components/Pagination";
import { useLanguage } from "@/context/LanguageContext";

// MOCK UI COMPONENTS
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

const Table = ({ children, className }) => (
  <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
    {children}
  </table>
);

const TableHeader = ({ children }) => (
  <thead className="bg-gray-50">{children}</thead>
);

const TableRow = ({ children, className }) => (
  <tr className={className}>{children}</tr>
);

const TableHead = ({ children }) => (
  <th
    scope="col"
    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
  >
    {children}
  </th>
);

const TableBody = ({ children }) => (
  <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>
);

const TableCell = ({ children, className, colSpan }) => (
  <td
    colSpan={colSpan}
    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${className}`}
  >
    {children}
  </td>
);

const ReportSummaryTable = ({ lang, summary }) => (
  <div className="overflow-x-auto my-4">
    <table className="min-w-[480px] text-center border-collapse border border-gray-200 mx-auto bg-white">
      <thead>
        <tr className="bg-gray-50">
          <th className="px-4 py-2 border border-gray-200">{lang === "am" ? "የክስተቶች አይነት" : "Event Type"}</th>
          <th className="px-4 py-2 border border-gray-200">{lang === "am" ? "ብዛት" : "Count"}</th>
        </tr>
      </thead>
      <tbody>
        {[{ type: "marriage", label: lang === "am" ? "ጋብቻ" : "Marriage" },{ type: "birth", label: lang === "am" ? "ትውልድ" : "Birth" },{ type: "death", label: lang === "am" ? "ሞት" : "Death" },{ type: "divorce", label: lang === "am" ? "ፍቺ" : "Divorce" },].map(ev => (
          <tr key={ev.type}>
            <td className="px-4 py-2 border border-gray-200">{ev.label}</td>
            <td className="px-4 py-2 border border-gray-200 font-bold">{summary[ev.type] || 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Helper functions
const translate = (lang, en, am) => (lang === "en" ? en : am);
const formatDate = (v) => (v ? String(v).slice(0, 10) : "");

const reportPeriods = [
  { key: "weekly", labelEn: "Past 7 days", labelAm: "ባለፉት 7 ቀን" },
  { key: "monthly", labelEn: "Past 30 days", labelAm: "ባለፈው ወር" },
  { key: "threeMonths", labelEn: "Past 3 months", labelAm: "ባለፉት 3 ወራት" },
  { key: "sixMonths", labelEn: "Past 6 months", labelAm: "ባለፉት 6 ወራት" },
  { key: "yearly", labelEn: "Past 12 months", labelAm: "ባለፉት 12 ወራት" },
];

const getPeriodStartDate = (periodKey) => {
  const now = new Date();
  const start = new Date(now);
  switch (periodKey) {
    case "weekly":
      start.setDate(start.getDate() - 7);
      break;
    case "monthly":
      start.setMonth(start.getMonth() - 1);
      break;
    case "threeMonths":
      start.setMonth(start.getMonth() - 3);
      break;
    case "sixMonths":
      start.setMonth(start.getMonth() - 6);
      break;
    case "yearly":
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setDate(start.getDate() - 7);
  }
  return start;
};

const ChurchDashboard = ({ user, setUser }) => {
  const { lang, toggleLang } = useLanguage();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('draft');
  const [formType, setFormType] = useState("marriage");
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [searchReg, setSearchReg] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [showEvents, setShowEvents] = useState(true);
  const [currentView, setCurrentView] = useState('search'); // 'search', 'my-events', 'reports'
  const [stats, setStats] = useState({ marriage: 0, death: 0 });
  const [reportPeriod, setReportPeriod] = useState("weekly");
  const [reportEvents, setReportEvents] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportsTab, setReportsTab] = useState("prepare");
  const [currentPage, setCurrentPage] = useState(1);
  const [reportCurrentPage, setReportCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [receivedTemplates, setReceivedTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [letterForm, setLetterForm] = useState({ title: "", content: "" });
  const [sendingLetter, setSendingLetter] = useState(false);

  // Handle hash-based navigation for register new event and dashboard options
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#register/')) {
        const eventType = hash.split('/')[1];
        if (['marriage', 'death'].includes(eventType)) {
          setFormType(eventType);
          setShowForm(true);
          // Clear the hash to prevent re-triggering
          window.history.replaceState(null, null, window.location.pathname);
        }
      } else if (hash === '#my-events') {
        setCurrentView('my-events');
        setShowEvents(true);
        // Clear the hash to prevent re-triggering
        window.history.replaceState(null, null, window.location.pathname);
      } else if (hash === '#reports') {
        setCurrentView('reports');
        window.history.replaceState(null, null, window.location.pathname);
      }
    };

    // Check initial hash
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const res = await apiFetch(`/users/church/events${query}`, {
        token: user.token,
      });
      setEvents(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Load church events error:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user?.token, statusFilter]);

  useEffect(() => {
    if (user?.token) {
      load();
    }
    const interval = setInterval(() => {
      if (user?.token) load();
    }, 10000);
    return () => clearInterval(interval);
  }, [user?.token, load]);

  // Fetch approved stats for cards
  const loadStats = useCallback(async () => {
    if (!user?.token) return;
    try {
      const data = await apiFetch("/users/registrar/event-stats", { token: user.token });
      if (data && typeof data === "object") setStats(data);
    } catch (err) {
      setStats({ marriage: 0, death: 0 });
    }
  }, [user?.token]);

  const loadReportEvents = useCallback(async () => {
    if (!user?.token) return;
    setReportLoading(true);
    setReportError("");
    try {
      const res = await apiFetch(`/users/church/events`, { token: user.token });
      setReportEvents(Array.isArray(res) ? res : []);
    } catch (err) {
      setReportEvents([]);
      setReportError(err?.message || "Unable to load reports");
    } finally {
      setReportLoading(false);
    }
  }, [user?.token]);

  const loadReceivedTemplates = useCallback(async () => {
    if (!user?.token) return;
    setTemplatesLoading(true);
    try {
      const res = await apiFetch("/users/reports/received-templates", { token: user.token });
      setReceivedTemplates(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Failed to load received templates:", err);
      setReceivedTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    if (user?.token && currentView === 'search') loadStats();
    if (user?.token && currentView === 'reports') {
      loadReportEvents();
      if (reportsTab === "received") {
        loadReceivedTemplates();
      }
    }
  }, [user?.token, currentView, reportsTab, loadStats, loadReportEvents, loadReceivedTemplates]);

  const handleSendLetter = async () => {
    if (!letterForm.title.trim() || !letterForm.content.trim()) {
      alert(translate(lang, "Please fill in both title and content", "እባክዎ ርዕስ እና ይዘት ያስገቡ"));
      return;
    }
    setSendingLetter(true);
    try {
      await apiFetch("/users/reports/send-letter", {
        method: "POST",
        token: user.token,
        body: letterForm,
      });
      alert(translate(lang, "Letter sent to manager successfully", "ደብዳቤው ለማናጀር በተሳካ ሁኔታ ተልኳል"));
      setLetterForm({ title: "", content: "" });
    } catch (err) {
      alert(translate(lang, "Failed to send letter", "ደብዳቤ መላክ አልተቻለም"));
      console.error("Send letter error:", err);
    } finally {
      setSendingLetter(false);
    }
  };

  const reportWindowStart = useMemo(() => getPeriodStartDate(reportPeriod), [reportPeriod]);

  const filteredReportEvents = useMemo(() => {
    if (!reportEvents || reportEvents.length === 0) return [];
    const startDate = reportWindowStart;
    return reportEvents.filter((evt) => {
      const createdAt = evt.createdAt || evt.updatedAt || evt.submittedAt || evt.eventDate;
      if (!createdAt) return true;
      const d = new Date(createdAt);
      if (Number.isNaN(d.getTime())) return true;
      return d >= startDate;
    });
  }, [reportEvents, reportWindowStart]);

  const reportSummary = useMemo(() => {
    const summary = {
      total: filteredReportEvents.length,
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    filteredReportEvents.forEach((evt) => {
      const status = evt.status || "draft";
      if (summary[status] !== undefined) summary[status] += 1;
    });
    return summary;
  }, [filteredReportEvents]);

  const reportPeriodMeta = useMemo(
    () => reportPeriods.find((option) => option.key === reportPeriod) || reportPeriods[0],
    [reportPeriod]
  );

  const handleFormSubmit = async (payload) => {
    try {
      if (editingEvent) {
        await apiFetch(`/users/church/events/${editingEvent._id || editingEvent.id}`, {
          method: 'PUT',
          token: user.token,
          ...(payload.isForm ? { body: payload.body, isForm: true } : { body: payload.body }),
        });
        setEditingEvent(null);
      } else {
        const saved = await apiFetch('/users/church/events', {
          method: 'POST',
          token: user.token,
          ...(payload.isForm ? { body: payload.body, isForm: true } : { body: payload.body }),
        });
        if (saved?.event) {
          setEvents((prev) => [saved.event, ...prev]);
          setShowForm(false);
        }
      }
      await load();
    } catch (err) {
      if (err?.status === 409) {
        alert(
          translate(
            lang,
            "Registration ID already exists on the server.",
            "ይህ የመዝገብ መለያ ቁጥር ከፍተኛ ነው።"
          )
        );
      } else {
      console.error("Event register error:", err);
        alert(
          translate(
            lang,
            "Failed to save. Please try again.",
            "ማስቀመጥ አልተሳካም። እባክዎ እንደገና ይሞክሩ."
          )
        );
      }
      throw err;
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormType(event.type);
    setShowForm(true);
  };

  const handleSubmitToManager = async (eventId) => {
    try {
      await apiFetch(`/users/church/events/${eventId}/submit`, {
        method: "PATCH",
        token: user.token,
      });
      await load();
    } catch (err) {
      console.error("Submit to manager error:", err);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    const confirmMessage = lang === 'en' 
      ? 'Are you sure you want to delete this event? This action cannot be undone.'
      : 'ይህን ክስተት ማጥፋት እርግጠኛ ነዎት? ይህ እርምጃ ሊመለስ አይችልም።';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      console.log(`[DELETE] Attempting to delete event ${eventId}`);
      const response = await apiFetch(`/users/church/events/${eventId}`, {
        method: "DELETE",
        token: user.token,
      });
      console.log(`[DELETE] Response:`, response);
      await load();
      alert(translate(lang, "Event deleted successfully", "ክስተቱ በተሳካ ሁኔታ ተሰርዟል"));
    } catch (err) {
      console.error("Delete event error:", err);
      const errorMessage = err?.response?.data?.message || err?.message || translate(lang, "Error deleting event", "ክስተቱን ለመሰረዝ ስህተት ተፈጥሯል");
      alert(errorMessage);
    }
  };

  const handleSubmitAllToManager = async () => {
    try {
      const drafts = events.filter((e) => e.status === "draft");
      if (drafts.length === 0) return;
      for (const ev of drafts) {
        const id = ev._id || ev.id;
        try {
          await apiFetch(`/users/church/events/${id}/submit`, { method: "PATCH", token: user.token });
        } catch (err) {
          console.warn("Failed to submit event", id, err?.message || err);
        }
      }
      await load();
      alert(translate(lang, "Submitted drafts to manager", "ያለዎትን ድርሰቶች ለማነጂ ተልኳል"));
    } catch (err) {
      console.error("Bulk submit error:", err);
      alert(translate(lang, "Error submitting drafts", "የተስተዋድ ላይ ስህተት"));
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchError("");
    setSearchResult(null);
    const id = (searchReg || "").trim();
    if (!id) return;
    try {
      const result = await apiFetch(`/users/records/${id}`, { token: user.token });
      setSearchResult(result);
    } catch (err) {
      setSearchError(err.message || "Not found");
    }
  };

  return (
    <div className="flex min-h-screen">
        <ProfileSidebar user={user} setUser={setUser} />
      <div className="flex-1 p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {translate(lang, "Church Dashboard", "የቤተክርስቲያን ዳሽቦርድ")}
          </h1>
            <Button onClick={toggleLang}>
              {lang === "en" ? "አማርኛ" : "English"}
            </Button>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
              <input
                type="text"
                value={searchReg}
                onChange={(e) => setSearchReg(e.target.value)}
                placeholder={translate(lang, "Enter Registration ID", "የመዝገብ መለያ ቁጥር ያስገቡ")}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button type="submit">
                {translate(lang, "Search", "ፈልግ")}
              </Button>
            </form>
            {searchError && (
              <p className="mt-2 text-red-600">{searchError}</p>
            )}
            {searchResult && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <h3 className="font-semibold text-green-800">
                  {translate(lang, "Record Found", "መዝገብ ተገኝቷል")}
                </h3>
                <pre className="mt-2 text-sm text-green-700">
                  {JSON.stringify(searchResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conditional Content Based on Current View */}
        {currentView === 'search' && (
          <>
            {/* Welcome Section */}
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-800 mb-4">
                    {translate(lang, "Welcome to Church Dashboard", "ወደ ቤተክርስቲያን ዳሽቦርድ እንኳን ደህና መጡ")}
                  </h2>
                  <p className="text-lg text-gray-600 mb-6">
                    {translate(lang, "Manage Christian vital events registration. Register marriages and deaths according to Christian traditions and requirements.", "የክርስትና ጠቃሚ ክስተቶችን ያስተዳድሩ። የጋብቻ እና የሞት ምዝገቦችን በክርስትና ልማዶች እና መስፈርቶች ይመዝግቡ።")}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-pink-50 p-6 rounded-lg">
                      <div className="text-3xl mb-3">💒</div>
                      <h3 className="font-semibold text-pink-800 text-lg">{translate(lang, "Marriage Registration", "የጋብቻ ምዝገብ")}</h3>
                      <div className="font-bold text-4xl text-pink-700 my-1">{stats.marriage}</div>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <div className="text-3xl mb-3">⚰️</div>
                      <h3 className="font-semibold text-gray-800 text-lg">{translate(lang, "Death Registration", "የሞት ምዝገብ")}</h3>
                      <div className="font-bold text-4xl text-gray-700 my-1">{stats.death}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </>
        )}

        {currentView === 'my-events' && (
          /* Events List */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {translate(lang, "My Events", "የእኔ ክስተቶች")}
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="inline-flex gap-2">
                  {[
                    { key: 'draft', labelEn: 'Draft', labelAm: 'ድርሰት' },
                    { key: 'pending', labelEn: 'Pending', labelAm: 'በመጠበቅ ላይ' },
                    { key: 'approved', labelEn: 'Approved', labelAm: 'ተጸድቋል' },
                    { key: 'rejected', labelEn: 'Rejected', labelAm: 'ተተውቷል' },
                  ].map(({ key, labelEn, labelAm }) => (
                    <button
                      key={key}
                      className={`px-3 py-1 rounded-full text-xs border ${statusFilter===key? 'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 hover:bg-gray-50'}`}
                      onClick={() => setStatusFilter(key)}
                    >
                      {translate(lang, labelEn, labelAm)}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={handleSubmitAllToManager}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {translate(lang, "Submit All Drafts", "ሁሉንም ድርሰቶች አስገባ")}
                </Button>
                <button
                  className={`px-3 py-1 rounded-md border text-xs ${showEvents ? 'bg-white' : 'bg-white'} hover:bg-gray-50`}
                  onClick={() => {
                    setShowEvents(false);
                    setCurrentView('search');
                  }}
                >
                  {translate(lang, 'Close', 'ዝጋ')}
                </button>
              </div>
            </div>
          </CardHeader>
          {showEvents && (
          <CardContent>
            {loading ? (
              <p>{translate(lang, "Loading...", "በመጫን ላይ...")}</p>
            ) : events.length === 0 ? (
              <p>{translate(lang, "No events found", "ክስተት አልተገኘም")}</p>
            ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                      <TableHead>
                        {translate(lang, "Registration ID", "የመዝገብ መለያ")}
                      </TableHead>
                      <TableHead>
                        {translate(lang, "Type", "አይነት")}
                      </TableHead>
                      <TableHead>
                        {translate(lang, "Status", "ሁኔታ")}
                      </TableHead>
                      <TableHead>
                        {translate(lang, "Date", "ቀን")}
                      </TableHead>
                      <TableHead>
                        {translate(lang, "Actions", "ድርጊቶች")}
                      </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {(() => {
                      const totalPages = Math.ceil(events.length / itemsPerPage);
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedEvents = events.slice(startIndex, endIndex);
                      return paginatedEvents.map((event) => (
                      <TableRow key={event._id || event.id}>
                        <TableCell>{event.registrationId}</TableCell>
                        <TableCell>
                          {translate(lang, event.type, event.type)}
                      </TableCell>
                          <TableCell>
                            <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              event.status === "approved"
                                  ? "bg-green-100 text-green-800"
                                : event.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : event.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                              }`}
                            >
                            {translate(lang, event.status, event.status)}
                            </span>
                          </TableCell>
                          <TableCell>
                          {formatDate(event.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                              <Button
                              onClick={() => handleEdit(event)}
                              disabled={event.status === "pending" || event.status === "approved"}
                              className={`text-xs px-2 py-1 ${
                                event.status === "pending" || event.status === "approved"
                                  ? "bg-gray-400 cursor-not-allowed"
                                  : "bg-blue-600 hover:bg-blue-700"
                              }`}
                              title={
                                event.status === "pending" 
                                  ? translate(lang, "Cannot edit while pending manager review", "በማነጂ ግምገማ ላይ አርትዖት አይቻልም")
                                  : event.status === "approved"
                                  ? translate(lang, "Cannot edit approved events", "የተጸድቁ ክስተቶችን አርትዖት አይቻልም")
                                  : translate(lang, "Edit event", "ክስተቱን አርትዖት")
                              }
                              >
                              {translate(lang, "Edit", "አርትዖት")}
                              </Button>
                            {event.status === "draft" && (
                              <Button
                                onClick={() =>
                                  handleSubmitToManager(event._id || event.id)
                                }
                                className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1"
                              >
                                {translate(lang, "Submit", "አስገባ")}
                              </Button>
                            )}
                            {event.status === "rejected" && (
                              <Button
                                onClick={() =>
                                  handleSubmitToManager(event._id || event.id)
                                }
                                className="bg-orange-600 hover:bg-orange-700 text-xs px-2 py-1"
                              >
                                {translate(lang, "Resubmit", "እንደገና አስገባ")}
                              </Button>
                            )}
                            {(event.status === "draft" || event.status === "rejected") && (
                              <Button
                                onClick={() =>
                                  handleDeleteEvent(event._id || event.id)
                                }
                                className="bg-red-600 hover:bg-red-700 text-xs px-2 py-1"
                              >
                                {translate(lang, "Delete", "ሰርዝ")}
                              </Button>
                            )}
                          </div>
                          </TableCell>
                          </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
                )}
                {events.length > 0 && (() => {
                  const totalPages = Math.ceil(events.length / itemsPerPage);
                  return (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      itemsPerPage={itemsPerPage}
                      totalItems={events.length}
                      lang={lang}
                    />
                  );
                })()}
            </CardContent>
            )}
          </Card>
        )}

        {currentView === 'reports' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {translate(lang, "Reports", "ሪፖርቶች")}
                </CardTitle>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                  title={translate(lang, "Close", "ዝጋ")}
                  onClick={() => setCurrentView('search')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Tab Navigation */}
              <div className="flex border-b mb-4">
                <button
                  onClick={() => {
                    setReportsTab("received");
                    if (receivedTemplates.length === 0) loadReceivedTemplates();
                  }}
                  className={`px-4 py-2 font-medium text-sm ${
                    reportsTab === "received"
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {translate(lang, "Received Reports", "የተቀበሉ ሪፖርቶች")}
                </button>
                <button
                  onClick={() => setReportsTab("prepare")}
                  className={`px-4 py-2 font-medium text-sm ${
                    reportsTab === "prepare"
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {translate(lang, "Prepare Report", "ሪፖርት ዝግጁ ያድርጉ")}
                </button>
              </div>

              {reportsTab === "received" ? (
                /* Received Reports Section */
                <div className="space-y-4">
                  {templatesLoading ? (
                    <p>{translate(lang, "Loading templates...", "መለጠፊያዎች በመጫን ላይ...")}</p>
                  ) : receivedTemplates.length === 0 ? (
                    <p className="text-gray-500">
                      {translate(lang, "No templates received yet.", "ገና ምንም መለጠፊያ አልተቀበለም።")}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {receivedTemplates.map((item) => (
                        <div key={item._id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold">{item.template?.title || "Template"}</h4>
                              <p className="text-xs text-gray-500">
                                {translate(lang, "From:", "ከ:")} {item.sentBy?.name || translate(lang, "Manager", "ማናጀር")}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(item.sentAt).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs capitalize">
                              {item.template?.type || "message"}
                            </span>
                          </div>
                          <div className="mt-3 p-3 bg-white rounded border">
                            <p className="text-sm whitespace-pre-line">
                              {item.template?.content || ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Prepare Report Section */
                <div className="space-y-6">
                  {/* Period Selection and Table Form Report */}
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">
                      {translate(lang, "Submit Table Form Report", "የጠረጴዛ ፎርም ሪፖርት ያስገቡ")}
                    </h3>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">
                        {translate(lang, "Report Period", "የሪፖርት ጊዜ")}
                      </label>
                      <select
                        value={reportPeriod}
                        onChange={(e) => setReportPeriod(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                      >
                        {reportPeriods.map((option) => (
                          <option key={option.key} value={option.key}>
                            {translate(lang, option.labelEn, option.labelAm)}
                          </option>
                        ))}
                      </select>
                    </div>
              {reportError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">
                  {reportError}
                </div>
              )}
              {reportLoading ? (
                <p>{translate(lang, "Preparing report...", "ሪፖርት በማቀናበር ላይ...")}</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    {[
                      { key: "total", labelEn: "Total", labelAm: "ጠቅላላ", color: "text-blue-600" },
                      { key: "draft", labelEn: "Draft", labelAm: "ድርሰት", color: "text-gray-600" },
                      { key: "pending", labelEn: "Pending", labelAm: "በመጠበቅ ላይ", color: "text-yellow-600" },
                      { key: "approved", labelEn: "Approved", labelAm: "ተጸድቋል", color: "text-green-600" },
                      { key: "rejected", labelEn: "Rejected", labelAm: "ተተውቷል", color: "text-red-600" },
                    ].map((metric) => (
                      <div key={metric.key} className="p-4 bg-gray-50 rounded-lg border text-center">
                        <div className="text-sm text-gray-500">
                          {translate(lang, metric.labelEn, metric.labelAm)}
                        </div>
                        <div className={`text-2xl font-bold ${metric.color}`}>
                          {reportSummary[metric.key]}
                        </div>
                      </div>
                    ))}
                  </div>
                  {filteredReportEvents.length !== 0 && (
                    <ReportSummaryTable
                      lang={lang}
                      summary={filteredReportEvents.reduce(
                        (acc, evt) => {
                          acc[evt.type] = (acc[evt.type] || 0) + 1;
                          return acc;
                        }, { marriage: 0, birth: 0, death: 0, divorce: 0 }
                      )}
                    />
                  )}
                  {filteredReportEvents.length === 0 ? (
                    <p className="text-gray-500">
                      {translate(
                        lang,
                        "No events found in this reporting window.",
                        "በዚህ የሪፖርት ጊዜ ሰፈር ውስጥ ክስተቶች አልተገኙም።"
                      )}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{translate(lang, "Registration ID", "የመዝገብ መለያ")}</TableHead>
                            <TableHead>{translate(lang, "Type", "አይነት")}</TableHead>
                            <TableHead>{translate(lang, "Status", "ሁኔታ")}</TableHead>
                            <TableHead>{translate(lang, "Date", "ቀን")}</TableHead>
                            <TableHead>{translate(lang, "Actions", "ድርጊቶች")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            const totalPages = Math.ceil(filteredReportEvents.length / itemsPerPage);
                            const startIndex = (reportCurrentPage - 1) * itemsPerPage;
                            const endIndex = startIndex + itemsPerPage;
                            const paginatedReportEvents = filteredReportEvents.slice(startIndex, endIndex);
                            return paginatedReportEvents.map((event) => (
                            <TableRow key={event._id || event.id}>
                              <TableCell>{event.registrationId || translate(lang, "N/A", "አይታወቅም")}</TableCell>
                              <TableCell>{translate(lang, event.type || "-", event.type || "-")}</TableCell>
                              <TableCell>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    event.status === "approved"
                                      ? "bg-green-100 text-green-800"
                                      : event.status === "rejected"
                                      ? "bg-red-100 text-red-800"
                                      : event.status === "pending"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {translate(lang, event.status || "draft", event.status || "draft")}
                                </span>
                              </TableCell>
                              <TableCell>{formatDate(event.createdAt)}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleEdit(event)}
                                    disabled={event.status === "pending" || event.status === "approved"}
                                    className={`text-xs px-2 py-1 ${
                                      event.status === "pending" || event.status === "approved"
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-700"
                                    }`}
                                  >
                                    {translate(lang, "Edit", "አርትዖት")}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            ));
                          })()}
                        </TableBody>
                      </Table>
                      {filteredReportEvents.length > 0 && (() => {
                        const totalPages = Math.ceil(filteredReportEvents.length / itemsPerPage);
                        return (
                          <Pagination
                            currentPage={reportCurrentPage}
                            totalPages={totalPages}
                            onPageChange={setReportCurrentPage}
                            itemsPerPage={itemsPerPage}
                            totalItems={filteredReportEvents.length}
                            lang={lang}
                          />
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
                    <ReportSubmissionPanel
                      lang={lang}
                      translate={translate}
                      user={user}
                      roleKey={user?.role}
                      reportSummary={reportSummary}
                      filteredEvents={filteredReportEvents}
                      reportPeriodMeta={reportPeriodMeta}
                      reportPeriodStart={reportWindowStart}
                    />
                  </div>

                  {/* Send Letter to Manager */}
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">
                      {translate(lang, "Send Letter to Manager", "ለማናጀር ደብዳቤ ላክ")}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {translate(lang, "Title", "ርዕስ")}
                        </label>
                        <input
                          type="text"
                          className="w-full border rounded px-3 py-2"
                          value={letterForm.title}
                          onChange={(e) => setLetterForm({ ...letterForm, title: e.target.value })}
                          placeholder={translate(lang, "Letter title", "የደብዳቤ ርዕስ")}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {translate(lang, "Content", "ይዘት")}
                        </label>
                        <textarea
                          className="w-full border rounded px-3 py-2"
                          rows={6}
                          value={letterForm.content}
                          onChange={(e) => setLetterForm({ ...letterForm, content: e.target.value })}
                          placeholder={translate(lang, "Enter your letter content...", "የደብዳቤዎን ይዘት ያስገቡ...")}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          onClick={handleSendLetter}
                          disabled={sendingLetter || !letterForm.title.trim() || !letterForm.content.trim()}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {sendingLetter
                            ? translate(lang, "Sending...", "በመላክ ላይ...")
                            : translate(lang, "Send Letter", "ደብዳቤ ላክ")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {translate(
  lang,
                    `${formType.charAt(0).toUpperCase() + formType.slice(1)} Registration Form`,
                    `${formType} የመዝገብ ቅፅ`
                  )}
                </h2>
                <Button
                  onClick={() => {
                    setShowForm(false);
                    setEditingEvent(null);
                  }}
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  {translate(lang, "Close", "ዝጋ")}
                </Button>
      </div>
              <div className="p-4">
                <FormSelector
                  user={user}
                  setUser={setUser}
                  formType={formType}
                  onSubmit={handleFormSubmit}
                  onEdit={handleEdit}
                  editingEvent={editingEvent}
                />
      </div>
        </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChurchDashboard;