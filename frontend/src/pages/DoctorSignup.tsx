import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { doctorApi } from "../lib/api";
import { useAuthStore } from "../lib/store";
import { useTranslation } from "../lib/i18n";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const LANGS = ["English", "Malayalam", "Hindi", "Tamil", "Arabic", "Urdu"];
const SPECIALTIES = [
  "General Practitioner", "Cardiologist", "Dermatologist", "Pediatrician",
  "Orthopedist", "Neurologist", "Gynecologist", "Psychiatrist",
  "ENT Specialist", "Ophthalmologist", "Gastroenterologist",
];

export const DoctorSignup: React.FC = () => {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<1 | 2>(1); // 2-step form

  const [form, setForm] = useState({
    // Step 1 — account
    email: "",
    password: "",
    name: "",
    specialty: "General Practitioner",
    license_no: "",
    bio: "",
    consult_fee: "",
    // Step 2 — practice
    clinic_name: "",
    opening_hours: "",
    available_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    languages: ["English", "Malayalam"],
  });

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    set(e.target.name, e.target.value);

  const toggleItem = (field: "available_days" | "languages", value: string) => {
    setForm((f) => {
      const curr = f[field];
      return { ...f, [field]: curr.includes(value) ? curr.filter((v) => v !== value) : [...curr, value] };
    });
  };

  useEffect(() => { document.querySelector<HTMLElement>("h1")?.focus(); }, [step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) { setError(""); setStep(2); return; }
    setLoading(true);
    setError("");
    try {
      const response = await doctorApi.signup({
        email: form.email,
        password: form.password,
        name: form.name,
        specialty: form.specialty,
        license_no: form.license_no,
        bio: form.bio || null,
        consult_fee: form.consult_fee ? parseFloat(form.consult_fee) : null,
        clinic_name: form.clinic_name || null,
        opening_hours: form.opening_hours || null,
        available_days: form.available_days,
        languages: form.languages,
      });
      setToken(response.data.access_token, response.data.user_id);
      navigate("/doctor/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || t("auth.signup_failed"));
      setStep(1); // jump back so the user can fix any error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* ── Left panel ─────────────────────────────────────────────────── */}
      <section className="auth-aside">
        <Link to="/" className="flex items-center gap-3">
          <span className="brand-mark">D</span>
          <strong>DoctorUndo</strong>
        </Link>
        <div>
          <p className="eyebrow text-[#d5ff78]">{t("nav.for_doctors")}</p>
          <p className="display mt-4 max-w-md text-4xl leading-tight">
            {t("signup.hero_title")}
          </p>
          <p className="mt-5 max-w-md text-[#c5d1cb]">
            {t("signup.hero_subtitle")}
          </p>
        </div>
        <p className="text-sm text-[#91a59b]">{t("signup.sidebar_caption")}</p>
      </section>

      {/* ── Right panel ─────────────────────────────────────────────────── */}
      <section className="auth-form">
        <div className="w-full max-w-xl">
          {/* Mobile logo */}
          <Link to="/" className="mb-10 flex items-center gap-3 md:hidden">
            <span className="brand-mark">D</span>
            <strong>DoctorUndo</strong>
          </Link>

          {/* Step indicator */}
          <div className="mb-8 flex items-center gap-3">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${step >= s ? "bg-[#23634e] text-white" : "bg-[#e6e8e1] text-[#718079]"}`}>
                  {step > s ? "✓" : s}
                </div>
                {s < 2 && <div className={`h-px w-10 transition-colors ${step > s ? "bg-[#23634e]" : "bg-[#e6e8e1]"}`} />}
              </div>
            ))}
            <p className="ml-2 text-sm text-[#718079]">
              {step === 1 ? t("signup.step1_label") : t("signup.step2_label")}
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* ── Step 1: Account ──────────────────────────────────────── */}
            {step === 1 && (
              <div className="form-grid">
                <div className="full-width">
                  <p className="eyebrow text-[#718079]">{t("signup.step1_indicator")}</p>
                  <h1 tabIndex={-1} className="display mt-1 text-3xl">{t("auth.create_account")}</h1>
                </div>

                <div>
                  <label htmlFor="signup-email" className="field-label">{t("auth.email")}</label>
                  <input className="field mt-1" type="email" id="signup-email" name="email" autoComplete="email" placeholder="you@clinic.com"
                    value={form.email} onChange={handleChange} required />
                </div>

                <div>
                  <label htmlFor="signup-password" className="field-label">{t("auth.password")}</label>
                  <input className="field mt-1" type="password" id="signup-password" name="password" autoComplete="new-password" placeholder="Min. 8 characters"
                    value={form.password} onChange={handleChange} required minLength={8} />
                </div>

                <div>
                  <label htmlFor="signup-name" className="field-label">{t("auth.fullname")}</label>
                  <input className="field mt-1" type="text" id="signup-name" name="name" autoComplete="name" placeholder="Dr. Sarah Johnson"
                    value={form.name} onChange={handleChange} required />
                </div>

                <div>
                  <label htmlFor="signup-specialty" className="field-label">{t("auth.specialty")}</label>
                  <select className="field mt-1" id="signup-specialty" name="specialty" value={form.specialty} onChange={handleChange}>
                    {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="signup-license_no" className="field-label">{t("auth.license")}</label>
                  <input className="field mt-1" type="text" id="signup-license_no" name="license_no" placeholder="MCI/State Council number"
                    value={form.license_no} onChange={handleChange} required />
                </div>

                <div>
                  <label htmlFor="signup-consult_fee" className="field-label">{t("auth.fee")}</label>
                  <input className="field mt-1" type="number" id="signup-consult_fee" name="consult_fee" placeholder="e.g. 500"
                    value={form.consult_fee} onChange={handleChange} min={0} />
                </div>

                <div className="full-width">
                  <label htmlFor="signup-bio" className="field-label">{t("auth.bio")} <span className="text-[#53665e]">{t("dash.optional")}</span></label>
                  <textarea className="field mt-1 resize-none" id="signup-bio" name="bio" rows={3}
                    placeholder="Tell patients about your experience and approach…"
                    value={form.bio} onChange={handleChange} />
                </div>

                <button type="submit" className="btn-primary full-width w-full py-3">
                  {t("signup.next_btn")}
                </button>
              </div>
            )}

            {/* ── Step 2: Practice ─────────────────────────────────────── */}
            {step === 2 && (
              <div className="form-grid">
                <div className="full-width">
                  <p className="eyebrow text-[#718079]">{t("signup.step2_indicator")}</p>
                  <h1 tabIndex={-1} className="display mt-1 text-3xl">{t("signup.step2_heading")}</h1>
                  <p className="mt-1 text-sm text-[#60706a]">{t("signup.step2_subtitle")}</p>
                </div>

                <div>
                  <label htmlFor="signup-clinic_name" className="field-label">{t("dash.clinic_name")} <span className="text-[#53665e]">{t("dash.optional")}</span></label>
                  <input className="field mt-1" type="text" id="signup-clinic_name" name="clinic_name"
                    placeholder="e.g. Sunrise Health Clinic"
                    value={form.clinic_name} onChange={handleChange} />
                </div>

                <div>
                  <label htmlFor="signup-opening_hours" className="field-label">{t("dash.opening_hours")} <span className="text-[#53665e]">{t("dash.optional")}</span></label>
                  <input className="field mt-1" type="text" id="signup-opening_hours" name="opening_hours"
                    placeholder="e.g. Mon–Fri 9 AM – 6 PM"
                    value={form.opening_hours} onChange={handleChange} />
                </div>

                {/* Available days */}
                <fieldset className="full-width"><legend className="field-label">{t("auth.days")}</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DAYS.map((day) => (
                      <button key={day} type="button" aria-pressed={form.available_days.includes(day)} aria-label={day}
                        onClick={() => toggleItem("available_days", day)}
                        className={`min-h-[44px] rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${form.available_days.includes(day) ? "border-[#23634e] bg-[#23634e] text-white" : "border-[#d7dbd3] bg-white text-[#53615c] hover:border-[#23634e]"}`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {/* Languages */}
                <fieldset className="full-width"><legend className="field-label">{t("auth.languages")}</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {LANGS.map((lang) => (
                      <button key={lang} type="button" aria-pressed={form.languages.includes(lang)}
                        onClick={() => toggleItem("languages", lang)}
                        className={`min-h-[44px] rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${form.languages.includes(lang) ? "border-[#23634e] bg-[#23634e] text-white" : "border-[#d7dbd3] bg-white text-[#53615c] hover:border-[#23634e]"}`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="full-width flex flex-wrap gap-3">
                  <button type="button" disabled={loading} onClick={() => setStep(1)} className="btn-secondary flex-1">
                    {t("signup.back_btn")}
                  </button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        {t("signup.creating")}
                      </span>
                    ) : t("auth.create_profile") + " ↗"}
                  </button>
                </div>
              </div>
            )}
          </form>

          <p className="mt-7 text-center text-sm text-[#60706a]">
            {t("auth.has_account")}{" "}
            <Link to="/doctor/login" className="font-bold text-[#12201e] underline underline-offset-4">
              {t("auth.login_link")}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
};
