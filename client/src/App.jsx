"use client";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import TopBar from "./components/TopBar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import RegistrantDashboard from "./pages/RegistrantDashboard";
import HospitalDashboard from "./pages/HospitalDashboard";
import ChurchDashboard from "./pages/ChurchDashboard";
import MosqueDashboard from "./pages/MosqueDashboard";
import RegistrarDashboard from "./pages/RegistrarDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CertificateVerification from "./pages/CertificateVerification";
import { useState, useEffect } from "react";

export default function App() {
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  // Optional: persist login using localStorage / token
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    if (location?.pathname === "/" && user) {
      setUser(null);
      localStorage.removeItem("user");
    }
  }, [location?.pathname, user]);

  useEffect(() => {
    if (!user) return;
    let timerId;
    const resetTimer = () => {
      clearTimeout(timerId);
      timerId = setTimeout(() => {
        setUser(null);
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
      }, INACTIVITY_TIMEOUT);
    };

    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timerId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
  {location?.pathname !== "/" && <TopBar user={user} setUser={setUser} />}
      <main id="dashboard-main" className="relative max-w-7xl mx-auto p-4">
        <Routes>
          
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/signup" element={<Signup />} />
          {user && (
            <Route path="/profile" element={<Profile user={user} setUser={setUser} />} />
          )}

          {user && user.role === "registrant" && (
            <Route
              path="/registrant"
              element={<RegistrantDashboard user={user} />}
            />
          )}
          {user && user.role === "hospital" && (
            <Route
              path="/hospital"
              element={<HospitalDashboard user={user} />}
            />
          )}
          {user && user.role === "church" && (
            <Route path="/church" element={<ChurchDashboard user={user} />} />
          )}
          {user && user.role === "mosque" && (
            <Route path="/mosque" element={<MosqueDashboard user={user} />} />
          )}
          {user && user.role === "registrar" && (
            <Route
              path="/registrar"
              element={<RegistrarDashboard user={user} />}
            />
          )}
          {user && user.role === "manager" && (
            <Route
              path="/manager"
              element={<ManagerDashboard user={user} />}
            />
          )}
          {user && user.role === "admin" && (
            <Route path="/admin" element={<AdminDashboard user={user} />} />
          )}

          {/* Public certificate verification route */}
          <Route path="/verify/:certificateId" element={<CertificateVerification />} />

          {/* Redirect unknown routes */}
          <Route
            path="*"
            element={<Navigate to={user ? `/${user.role}` : "/login"} replace />}
          />
        </Routes>
      </main>
    </div>
  );
}
