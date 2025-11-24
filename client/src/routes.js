// src/routes.js
import HospitalDashboard from "./pages/HospitalDashboard";
import ChurchDashboard from "./pages/ChurchDashboard";
import MosqueDashboard from "./pages/MosqueDashboard";
import RegistrarDashboard from "./pages/RegistrarDashboard";
import RegistrantDashboard from "./pages/RegistrantDashboard";
import OfficeManagerDashboard from "./pages/OfficeManagerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Home from "./pages/Home";
import Profile from "./pages/Profile";

export const DASHBOARD_ROUTES = {
  home: "/",
  profile: "/profile",
  hospital: "/hospital",
  church: "/church",
  mosque: "/mosque",
  registrar: "/registrar",
  registrant: "/registrant",
  manager: "/manager",
  admin: "/admin",
};

export const DASHBOARD_COMPONENTS = {
  home: Home,
  profile: Profile,
  hospital: HospitalDashboard,
  church: ChurchDashboard,
  mosque: MosqueDashboard,
  registrar: RegistrarDashboard,
  registrant: RegistrantDashboard,
  manager: OfficeManagerDashboard,
  admin: AdminDashboard,
};
