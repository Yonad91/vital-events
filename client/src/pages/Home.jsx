"use client";

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, Heart, Baby, FileText } from "lucide-react";
import { motion } from "framer-motion"; // 👈 animations

export default function Home() {
  const [lang, setLang] = useState("en");

  const texts = {
    en: {
      title: "Debre Berhan Vital Events Registration System",
      subtitle:
        "Register and manage Birth, Marriage, and Death records digitally.",
      register: "Register Now",
      status: "Check Status",
      servicesTitle: "Our Services",
      aboutTitle: "About DBVERS",
      aboutText:
        "The Debre Berhan Vital Events Registration System (DVERS) provides a secure, efficient, and transparent digital platform to manage vital events such as births, deaths, and marriages. It ensures accurate records for both citizens and government offices.",
      statsTitle: "Statistics",
      footer:
        "© " + new Date().getFullYear() + " Debre Berhan Vital Events Office",
    },
    am: {
      title: "የደብረ ብርሃን ወሳኝ ኩነት መመዝገቢያ ስርዓት",
      subtitle: "የልደት፣ የጋብቻ፣ እና የሞት መዝገቦችን ዲጂታል በመስመር ላይ ያስተዳድሩ።",
      register: "አሁን ይመዝገቡ",
      status: "ሁኔታ ያረጋግጡ",
      servicesTitle: "አገልግሎቶቻችን",
      aboutTitle: "ስለ DBVERS",
      aboutText:
        "የደብረ ብርሃን ወሳኝ ኩነት መመዝገቢያ ስርዓት (DVERS) የልደት፣ የሞት፣ እና የጋብቻ ዝርዝሮችን የሚያስተዳድር ደህንነቱ የተጠበቀ እና ውጤታማ ዲጂታል መድረክ ነው። ለዜጎችና ለመንግስት ቢሮዎች ትክክለኛ መዝገብ ያረጋግጣል።",
      statsTitle: "ስታቲስቲክስ",
      footer: "© " + new Date().getFullYear() + " የደብረ ብርሃን ወሳኝ ኩነት ጽ/ቤት",
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 py-4 bg-white shadow sticky top-0 z-50">
        <h1 className="text-2xl font-bold text-blue-900">DVERS</h1>
        <div className="space-x-6 text-gray-700">
          <a href="/" className="hover:text-blue-600">
            Home
          </a>
          <a href="#about" className="hover:text-blue-600">
            About
          </a>
          <a href="#services" className="hover:text-blue-600">
            Services
          </a>
          <Link
            to="/login"
            className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Login
          </Link>
        </div>
        <button
          onClick={() => setLang(lang === "en" ? "am" : "en")}
          className="ml-4 border px-3 py-1 rounded text-sm hover:bg-gray-100"
        >
          {lang === "en" ? "አማ" : "EN"}
        </button>
      </nav>

      {/* Hero Section */}
      <section className="text-center py-20 bg-gradient-to-r from-blue-900 to-emerald-600 text-white">
        <motion.h2
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-4xl font-extrabold mb-4 bg-gradient-to-r from-yellow-300 to-white bg-clip-text text-transparent"
        >
          {texts[lang].title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="mb-6 text-lg"
        >
          {texts[lang].subtitle}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-x-4"
        >
          <Link
            to="/signup"
            className="px-6 py-3 bg-yellow-400 text-blue-900 rounded-lg font-semibold hover:bg-yellow-300 transition transform hover:scale-105 inline-block"
          >
            {texts[lang].register}
          </Link>
          <Link
            to="/login"
            className="px-6 py-3 border border-white rounded-lg font-semibold hover:bg-white hover:text-blue-900 transition transform hover:scale-105 inline-block"
          >
            {texts[lang].status}
          </Link>
        </motion.div>
      </section>

      {/* Services Section */}
      <section id="services" className="max-w-6xl mx-auto py-16 px-6">
        <h3 className="text-3xl font-bold text-center mb-10">
          {texts[lang].servicesTitle}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Baby,
              title: "Birth Registration",
              desc: "Register newborns securely and access birth certificates online.",
              color: "text-blue-600",
            },
            {
              icon: Heart,
              title: "Marriage Registration",
              desc: "Digitally manage marriage certificates with ease.",
              color: "text-emerald-600",
            },
            {
              icon: Users,
              title: "Death Registration",
              desc: "Efficient death registration and secure record keeping.",
              color: "text-red-600",
            },
          ].map((s, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              className="bg-white shadow-lg rounded-xl p-6 text-center hover:shadow-2xl transition"
            >
              <s.icon className={`w-12 h-12 ${s.color} mx-auto mb-4`} />
              <h4 className="font-semibold text-lg mb-2">{s.title}</h4>
              <p className="text-gray-600">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="bg-gray-100 py-16 px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto text-center"
        >
          <h3 className="text-3xl font-bold mb-6">{texts[lang].aboutTitle}</h3>
          <p className="text-gray-700 text-lg">{texts[lang].aboutText}</p>
        </motion.div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 max-w-5xl mx-auto px-6 text-center">
        <h3 className="text-3xl font-bold mb-10">{texts[lang].statsTitle}</h3>
        <StatsCards lang={lang} />
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-gray-500 border-t">
        {texts[lang].footer}
      </footer>
    </div>
  );
}

// 🔹 Stats Section with animation
function StatsCards({ lang }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/stats");
        if (!res.ok) throw new Error("Failed to load stats");
        const json = await res.json();
        if (!cancelled) setStats(json);
      } catch (err) {
        console.warn("Stats fetch failed:", err.message || err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => (cancelled = true);
  }, []);

  const fallback = { birth: 12345, marriage: 5412, death: 2341, divorce: 0 };
  const birth = stats?.events?.birth ?? fallback.birth;
  const marriage = stats?.events?.marriage ?? fallback.marriage;
  const death = stats?.events?.death ?? fallback.death;
  const divorce = stats?.events?.divorce ?? fallback.divorce;

  const items = [
    {
      value: birth,
      labelEn: "Births Registered",
      labelAm: "የልደት ምዝገቦች",
      color: "text-blue-900",
    },
    {
      value: marriage,
      labelEn: "Marriages Registered",
      labelAm: "የጋብቻ ምዝገቦች",
      color: "text-emerald-600",
    },
    {
      value: death,
      labelEn: "Deaths Registered",
      labelAm: "የሞት ምዝገቦች",
      color: "text-red-600",
    },
    {
      value: divorce,
      labelEn: "Divorces Registered",
      labelAm: "የፍቺ ምዝገቦች",
      color: "text-pink-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
      {items.map((stat, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: i * 0.2 }}
          className="bg-white shadow rounded-xl p-6"
        >
          <h4 className={`text-3xl font-bold ${stat.color}`}>
            {loading ? "..." : stat.value.toLocaleString()}
          </h4>
          <p className="text-gray-600">
            {lang === "en" ? stat.labelEn : stat.labelAm}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
