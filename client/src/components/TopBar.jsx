"use client";
import { useNavigate, Link } from "react-router-dom";
import React, { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

export default function TopBar({ user, setUser }) {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  return (
    <>
      <header className="bg-white shadow py-3 px-6 flex justify-between items-center sticky top-0 z-30 mx-4" style={{marginLeft: 0, marginRight: 0}}>
        <div className="flex flex-col items-start gap-1">
          <Link to="/" className="text-xl font-bold leading-tight">
            Debre Berhan Vital Events Registration System<br />
            <span className="text-lg font-semibold text-gray-700">የደብረ ብርሀን ወሳኝ ኩነት ምዝገባ ስርዓት</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                to="/profile"
                className="text-blue-600 hover:underline text-sm"
              >
                Profile
              </Link>
              <button
                onClick={() => setShowConfirm(true)}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Login
            </Link>
          )}
        </div>
      </header>
      <ConfirmDialog
        open={showConfirm}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        confirmText="Logout"
        cancelText="Cancel"
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
