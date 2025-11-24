// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Load geo data before rendering app
async function startApp() {
  if (typeof window !== "undefined" && !window.ETH_GEO_DATA) {
    try {
      const res = await fetch("/geo/ethiopia-admin.json");
      if (res.ok) {
        const geoData = await res.json();
        // Transform flat list to nested region->zone->woreda structure
        if (Array.isArray(geoData.basic_woreda_towns)) {
          const nested = {};
          for (const item of geoData.basic_woreda_towns) {
            const region = item.subcity_zone?.region_city?.name || "Unknown Region";
            const zone = item.subcity_zone?.name || "Unknown Zone";
            const woreda = item.name || "Unknown Woreda";
            if (!nested[region]) nested[region] = { zones: {} };
            if (!nested[region].zones[zone]) nested[region].zones[zone] = { woredas: [] };
            if (!nested[region].zones[zone].woredas.includes(woreda)) {
              nested[region].zones[zone].woredas.push(woreda);
            }
          }
          window.ETH_GEO_DATA = nested;
        } else {
          window.ETH_GEO_DATA = geoData.ETH_GEO || geoData;
        }
      }
    } catch (e) {
      // Fallback to default subset
      console.warn("Could not load full geo data, using fallback.", e);
    }
  }
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

startApp();
