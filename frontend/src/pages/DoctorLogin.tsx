import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { doctorApi } from "../lib/api";
import { useAuthStore } from "../lib/store";
import { useTranslation } from "../lib/i18n";

export const DoctorLogin: React.FC = () => {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await doctorApi.login(form);
      setToken(response.data.access_token, response.data.user_id);
      navigate("/doctor/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || t("auth.invalid_credentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* Left panel */}
      <section className="auth-aside">
        <Link to="/" className="flex items-center gap-3">
          <span className="brand-mark">D</span>
          <strong>DoctorUndo</strong>
        </Link>
        <div>
          <p className="eyebrow text-[#d5ff78]">{t("login.for_practitioners")}</p>
          <p className="display mt-4 max-w-md text-4xl leading-tight">
            {t("login.hero_title")}
          </p>
          <p className="mt-5 max-w-md text-[#c5d1cb]">
            {t("login.hero_subtitle")}
          </p>
        </div>
        <p className="text-sm text-[#91a59b]">{t("login.sidebar_caption")}</p>
      </section>

      {/* Right panel – login form */}
      <section className="auth-form">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-12 flex items-center gap-3 md:hidden">
            <span className="brand-mark">D</span>
            <strong>DoctorUndo</strong>
          </Link>
          <p className="eyebrow text-[#718079]">{t("auth.welcome_back")}</p>
          <h1 tabIndex={-1} className="display mt-2 text-4xl">{t("auth.login_heading")}</h1>
          <p className="mt-3 text-sm text-[#60706a]">
            {t("auth.login_subtitle")}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="login-email" className="field-label">{t("auth.email")}</label>
              <input
                className="field"
                id="login-email" autoComplete="email" type="email"
                placeholder="you@clinic.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="login-password" className="field-label">{t("auth.password")}</label>
              <input
                className="field"
                id="login-password" autoComplete="current-password" type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
            </div>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button className="btn-primary w-full py-3" disabled={loading}>
              {loading ? t("auth.logging_in") : t("auth.log_in_btn")}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#60706a]">
            {t("auth.no_account")}{" "}
            <Link to="/doctor/signup" className="font-bold text-[#12201e] underline underline-offset-4">
              {t("auth.signup_link")}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
};
