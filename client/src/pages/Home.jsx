"use client";

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, Heart, Baby } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";

export default function Home() {
  const { lang, toggleLang, translate } = useLanguage();

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
        "The Debre Berhan Vital Events Registration System (DBVERS) provides a secure, efficient, and transparent digital platform to manage vital events such as births, deaths, and marriages. It ensures accurate records for both citizens and government offices.",
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
    <div className="min-h-screen bg-gradient-to-r from-blue-900 to-emerald-600 flex flex-col">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 py-4 bg-white shadow sticky top-0 z-50">
        <h1 className="text-2xl font-bold text-blue-900">DBVERS</h1>

        <div className="space-x-6 text-gray-700">
          <a href="/" className="hover:text-blue-600">
            {translate("Home", "መነሻ")}
          </a>
          <a href="#about" className="hover:text-blue-600">
            {translate("About", "ስለ እኛ")}
          </a>
          <a href="#services" className="hover:text-blue-600">
            {translate("Services", "አገልግሎቶች")}
          </a>
          <Link
            to="/login"
            className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            {translate("Login", "ግባ")}
          </Link>
        </div>

        <button
          onClick={toggleLang}
          className="ml-4 border px-3 py-1 rounded text-sm hover:bg-gray-100"
        >
          {lang === "en" ? "አማ" : "EN"}
        </button>
      </nav>

      {/* Hero Section */}
      <section className="text-center py-15 md:py-25 lg:py-20 text-white flex flex-col justify-center items-center">
        <motion.h2
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-4 max-w-4xl mx-auto tracking-tight leading-snug"
        >
          <span className="bg-gradient-to-r from-yellow-300 to-white bg-clip-text text-transparent">
            {texts[lang].title}
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="mb-10 text-xl md:text-2xl max-w-3xl mx-auto px-4 font-light text-blue-50"
        >
          {texts[lang].subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
          className="flex space-x-4"
        >
          <Link
            to="/signup"
            className="px-8 py-3 bg-yellow-400 text-blue-900 rounded-full font-bold text-lg hover:bg-yellow-300 transition transform hover:scale-105 shadow-xl shadow-yellow-500/30"
          >
            {texts[lang].register}
          </Link>

          <Link
            to="/login"
            className="px-8 py-3 border-2 border-white text-white rounded-full font-bold text-lg hover:bg-white hover:text-blue-900 transition transform hover:scale-105"
          >
            {texts[lang].status}
          </Link>
        </motion.div>
      </section>

      {/* Services Section */}
      <section id="services" className="max-w-7xl mx-auto py-16 w-full px-6">
        <h3 className="text-3xl font-bold text-center mb-10 text-white">
          {texts[lang].servicesTitle}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Baby,
              title: "Birth Registration",
              desc: "Register newborns securely and access birth certificates online.",
              color: "text-blue-300",
            },
            {
              icon: Heart,
              title: "Marriage Registration",
              desc: "Digitally manage marriage certificates with ease.",
              color: "text-emerald-300",
            },
            {
              icon: Users,
              title: "Death Registration",
              desc: "Efficient death registration and secure record keeping.",
              color: "text-red-300",
            },
          ].map((s, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              className="rounded-xl p-6 text-center border border-white/30 text-white"
            >
              <s.icon className={`w-12 h-12 ${s.color} mx-auto mb-4`} />

              <h4 className="font-semibold text-xl mb-2">{s.title}</h4>
              <p className="text-gray-200">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto text-center"
        >
          <h3 className="text-3xl font-bold mb-6 text-white">
            {texts[lang].aboutTitle}
          </h3>
          <p className="text-white text-lg">{texts[lang].aboutText}</p>
        </motion.div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 w-full max-w-7xl mx-auto px-6 text-center">
        <h3 className="text-3xl font-bold mb-10 text-white">
          {texts[lang].statsTitle}
        </h3>
        <StatsCards lang={lang} />
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-white border-t border-white/20">
        {texts[lang].footer}
      </footer>
    </div>
  );
}

/* ---------------------- STATS COMPONENT ---------------------- */

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

  const fallback = { birth: 0, marriage: 0, death: 0, divorce: 0 };

  const birth = stats?.events?.birth ?? fallback.birth;
  const marriage = stats?.events?.marriage ?? fallback.marriage;
  const death = stats?.events?.death ?? fallback.death;
  const divorce = stats?.events?.divorce ?? fallback.divorce;

  const items = [
    {
      value: birth,
      labelEn: "Births",
      labelAm: "ልደት",
      color: "text-yellow-400",
    },
    {
      value: marriage,
      labelEn: "Marriages",
      labelAm: "ጋብቻ",
      color: "text-emerald-400",
    },
    { value: death, labelEn: "Deaths", labelAm: "ሞት", color: "text-red-400" },
    {
      value: divorce,
      labelEn: "Divorces",
      labelAm: "የፍቺ",
      color: "text-pink-400",
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
          className="rounded-xl p-6 border border-white/30"
        >
          <h4 className={`text-4xl font-bold ${stat.color}`}>
            {loading ? "..." : stat.value.toLocaleString()}
          </h4>

          <p className="text-gray-200 mt-2">
            {lang === "en" ? stat.labelEn : stat.labelAm}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
