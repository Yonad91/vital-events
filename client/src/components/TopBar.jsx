"use client";
import { useNavigate, Link } from "react-router-dom";
import React, { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import { useLanguage } from "@/context/LanguageContext";

export default function TopBar({ user, setUser }) {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const { translate } = useLanguage();

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  return (
    <>
      <nav className="flex justify-between items-center px-6 py-4 bg-white shadow sticky top-0 z-50">
        <div className="flex items-center">
          <Link to="/" className="text-2xl font-bold text-blue-900">
            DBVERS
          </Link>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="space-x-6 text-gray-700">
            <Link to="/" className="hover:text-blue-600">
              {translate("Home", "መነሻ")}
            </Link>
            <a href="#about" className="hover:text-blue-600">
              {translate("About", "ስለ")}
            </a>
            <a href="#services" className="hover:text-blue-600">
              {translate("Services", "አገልግሎቶች")}
            </a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <Link to="/profile" className="text-gray-700 hover:text-blue-600">
              {translate("Profile", "መገለጫ")}
            </Link>
          )}
          {user ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {translate("Logout", "ውጣ")}
            </button>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {translate("Login", "ግባ")}
            </Link>
          )}
        </div>
      </nav>
      <ConfirmDialog
        open={showConfirm}
        title={translate("Confirm Logout", "መውጣትን ያረጋግጡ")}
        message={translate(
          "Are you sure you want to log out?",
          "ለመውጣት እርግጠኛ ነዎት?",
        )}
        confirmText={translate("Logout", "ውጣ")}
        cancelText={translate("Cancel", "ሰርዝ")}
        containerSelector="#dashboard-main"
        onConfirm={() => {
          setShowConfirm(false);
          handleLogout();
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
