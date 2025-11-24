"use client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";

const Login = ({ setUser }) => {
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [lang, setLang] = useState("en");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const payload = isSignup
        ? { name, email, password }
        : { email, password };
      const data = await apiFetch(
        isSignup ? "/users/register" : "/users/login",
        {
          method: "POST",
          body: payload,
        }
      );

      if (!isSignup) {
        // Save user info and token
        const u = {
          id: data.user.id,
          name: data.user.name,
          role: data.user.role,
          token: data.token,
        };
        setUser(u);
        localStorage.setItem("user", JSON.stringify(u));

        // Navigate by role
        switch (data.user.role) {
          case "registrant":
            navigate("/registrant", { replace: true });
            break;
          case "hospital":
            navigate("/hospital", { replace: true });
            break;
          case "church":
            navigate("/church", { replace: true });
            break;
          case "mosque":
            navigate("/mosque", { replace: true });
            break;
          case "registrar":
            navigate("/registrar", { replace: true });
            break;
          case "manager":
            navigate("/manager", { replace: true });
            break;
          case "admin":
            navigate("/admin", { replace: true });
            break;
          default:
            navigate("/", { replace: true });
        }
      } else {
        alert(
          lang === "en"
            ? "Signup successful! Please login."
            : "ተመዝግቧል! እባክዎን ይግቡ።"
        );
        setIsSignup(false);
        setName("");
        setPassword("");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Operation failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-6 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {isSignup
              ? lang === "en"
                ? "Sign up"
                : "ተመዝገብ"
              : lang === "en"
              ? "Login"
              : "መግቢያ"}
          </h2>
          <button
            className="text-sm text-blue-500"
            onClick={() => setLang((l) => (l === "en" ? "am" : "en"))}
          >
            {lang === "en" ? "አማርኛ" : "English"}
          </button>
        </div>

        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-sm mb-1">
                {lang === "en" ? "Name" : "ስም"}
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border px-3 py-2 rounded"
              />
            </div>
          )}

          <div>
            <label className="block text-sm mb-1">
              {lang === "en" ? "Email" : "ኢሜይል"}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">
              {lang === "en" ? "Password" : "የሚስጥር ቃል"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            {isSignup
              ? lang === "en"
                ? "Sign up"
                : "ተመዝገብ"
              : lang === "en"
              ? "Login"
              : "ግባ"}
          </button>

          <div className="text-center text-sm text-gray-600">
            {isSignup
              ? lang === "en"
                ? "Already have an account?"
                : "እስከ አሁን ስለ አካውንት አለህ?"
              : lang === "en"
              ? "Don't have an account?"
              : "አካውንት የለህም?"}
            <button
              type="button"
              className="text-blue-500 underline"
              onClick={() => setIsSignup((s) => !s)}
            >
              {isSignup
                ? lang === "en"
                  ? "Login"
                  : "ግባ"
                : lang === "en"
                ? "Sign up"
                : "ተመዝገብ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
