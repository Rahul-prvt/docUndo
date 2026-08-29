import React, { useState } from "react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setError(err.response?.data?.detail || "Signup failed. Please try again.");
      setStep(1); // jump back so the user can fix any error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      {/* ── Left panel ─────────────────────────────────────────────────── */}
      <section className="hidden bg-[#12201e] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="brand-mark">D</span>
          <strong>DoctorUndo</strong>
        </Link>
        <div>
          <p className="eyebrow text-[#d5ff78]">{t("nav.for_doctors")}</p>
          <h1 className="display mt-4 max-w-md text-5xl leading-[1.04]">
            Build a profile patients trust.
          </h1>
          <p className="mt-5 max-w-md text-[#c5d1cb]">
            Set up your practice details once — and let patients find you effortlessly.
          </p>
        </div>
        <p className="text-sm text-[#91a59b]">Care starts with a clear view.</p>
      </section>

      {/* ── Right panel ─────────────────────────────────────────────────── */}
      <section className="flex items-center justify-center bg-[#f0f2ee] px-5 py-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="mb-10 flex items-center gap-3 lg:hidden">
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
              {step === 1 ? "Your account" : "Your practice"}
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* ── Step 1: Account ──────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <p className="eyebrow text-[#718079]">Step 1 of 2</p>
                  <h2 className="display mt-1 text-3xl">{t("auth.create_account")}</h2>
                </div>

                <div>
                  <label className="field-label">{t("auth.email")}</label>
                  <input className="field mt-1" type="email" name="email" placeholder="you@clinic.com"
                    value={form.email} onChange={handleChange} required />
                </div>

                <div>
                  <label className="field-label">{t("auth.password")}</label>
                  <input className="field mt-1" type="password" name="password" placeholder="Min. 8 characters"
                    value={form.password} onChange={handleChange} required minLength={8} />
                </div>

                <div>
                  <label className="field-label">{t("auth.fullname")}</label>
                  <input className="field mt-1" type="text" name="name" placeholder="Dr. Sarah Johnson"
                    value={form.name} onChange={handleChange} required />
                </div>

                <div>
                  <label className="field-label">{t("auth.specialty")}</label>
                  <select className="field mt-1" name="specialty" value={form.specialty} onChange={handleChange}>
                    {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="field-label">{t("auth.license")}</label>
                  <input className="field mt-1" type="text" name="license_no" placeholder="MCI/State Council number"
                    value={form.license_no} onChange={handleChange} required />
                </div>

                <div>
                  <label className="field-label">{t("auth.fee")}</label>
                  <input className="field mt-1" type="number" name="consult_fee" placeholder="e.g. 500"
                    value={form.consult_fee} onChange={handleChange} min={0} />
                </div>

                <div>
                  <label className="field-label">{t("auth.bio")} <span className="text-[#a8b3ac]">{t("dash.optional")}</span></label>
                  <textarea className="field mt-1 resize-none" name="bio" rows={3}
                    placeholder="Tell patients about your experience and approach…"
                    value={form.bio} onChange={handleChange} />
                </div>

                <button type="button" onClick={() => { if (form.email && form.password && form.name && form.license_no) setStep(2); else setError("Please fill in all required fields."); }}
                  className="btn-primary w-full py-3">
                  Next: Practice details →
                </button>
              </div>
            )}

            {/* ── Step 2: Practice ─────────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <p className="eyebrow text-[#718079]">Step 2 of 2</p>
                  <h2 className="display mt-1 text-3xl">Your practice</h2>
                  <p className="mt-1 text-sm text-[#60706a]">This appears on your profile. You can update it later.</p>
                </div>

                <div>
                  <label className="field-label">{t("dash.clinic_name")} <span className="text-[#a8b3ac]">{t("dash.optional")}</span></label>
                  <input className="field mt-1" type="text" name="clinic_name"
                    placeholder="e.g. Sunrise Health Clinic"
                    value={form.clinic_name} onChange={handleChange} />
                </div>

                <div>
                  <label className="field-label">{t("dash.opening_hours")} <span className="text-[#a8b3ac]">{t("dash.optional")}</span></label>
                  <input className="field mt-1" type="text" name="opening_hours"
                    placeholder="e.g. Mon–Fri 9 AM – 6 PM"
                    value={form.opening_hours} onChange={handleChange} />
                </div>

                {/* Available days */}
                <div>
                  <label className="field-label">{t("auth.days")}</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DAYS.map((day) => (
                      <button key={day} type="button"
                        onClick={() => toggleItem("available_days", day)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${form.available_days.includes(day) ? "border-[#23634e] bg-[#23634e] text-white" : "border-[#d7dbd3] bg-white text-[#53615c] hover:border-[#23634e]"}`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <label className="field-label">{t("auth.languages")}</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {LANGS.map((lang) => (
                      <button key={lang} type="button"
                        onClick={() => toggleItem("languages", lang)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${form.languages.includes(lang) ? "border-[#23634e] bg-[#23634e] text-white" : "border-[#d7dbd3] bg-white text-[#53615c] hover:border-[#23634e]"}`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                    ← Back
                  </button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Creating profile…
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
