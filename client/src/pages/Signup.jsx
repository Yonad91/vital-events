import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com)$/;

const Signup = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { lang, toggleLang, translate } = useLanguage();
  const t = translate;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = form.email.trim();
    if (!email || !emailRegex.test(email)) {
      setError(t("Email must end with @gmail.com or @yahoo.com", "ኢሜይሉ በ @gmail.com ወይም @yahoo.com መያት አለበት"));
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/users/register", {
        method: "POST",
        body: { ...form, email },
      });
      if (res?.user) {
        setSuccess(t("Registration successful!", "መመዝገቡ ተሳክቷል!"));
        setForm({ name: "", email: "", password: "" });
      } else {
        setError(res?.message || t("Registration failed", "መመዝገቡ አልተሳካም"));
      }
    } catch (err) {
      setError(t("Registration error", "የመመዝገብ ስህተት"));
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{t("Sign Up", "ተመዝገብ")}</h2>
        <button className="text-sm text-blue-500" onClick={toggleLang}>
          {lang === "en" ? "አማርኛ" : "English"}
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder={t("Name", "ስም")}
          value={form.name}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
          required
        />
        <input
          type="email"
          name="email"
          placeholder={t("Email (@gmail.com or @yahoo.com)", "ኢሜይል (@gmail.com ወይም @yahoo.com)")}
          value={form.email}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
          required
        />
        <input
          type="password"
          name="password"
          placeholder={t("Password", "የሚስጥር ቃል")}
          value={form.password}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
          required
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("Signing up...", "በመመዝገብ ላይ...") : t("Sign Up", "ተመዝገብ")}
        </Button>
        {error && <div className="text-red-600 mt-2">{error}</div>}
        {success && <div className="text-green-600 mt-2">{success}</div>}
      </form>
    </div>
  );
};

export default Signup;
