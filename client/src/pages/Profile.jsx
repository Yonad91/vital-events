"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function Profile({ user, setUser }) {
  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const save = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("/users/me/profile", { method: "PUT", token: user.token, body: { name } });
      setUser({ ...user, name });
      setMessage("Saved");
    } catch (err) {
      setMessage("Error saving");
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("/users/me/password", { method: "PUT", token: user.token, body: { password } });
      setPassword("");
      setMessage("Password updated");
    } catch (err) {
      setMessage("Error updating password");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      {message && <div className="text-sm text-gray-600">{message}</div>}
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input className="w-full border px-3 py-2 rounded" value={name} onChange={(e)=>setName(e.target.value)} />
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
      </form>

      <form onSubmit={changePassword} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">New Password</label>
          <input type="password" className="w-full border px-3 py-2 rounded" value={password} onChange={(e)=>setPassword(e.target.value)} />
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded">Change Password</button>
      </form>
    </div>
  );
}


