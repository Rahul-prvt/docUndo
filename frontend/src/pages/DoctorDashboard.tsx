import React, { useEffect, useState } from "react";
import { doctorApi } from "../lib/api";
import { useAuthStore } from "../lib/store";
import { useTranslation } from "../lib/i18n";
import { AvailabilityToggle } from "../components/AvailabilityToggle";
import { MapView } from "../components/MapView";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ClinicForm {
  name: string;
  address: string;
  opening_hours: string;
  lat?: number;
  lng?: number;
}

const EMPTY_CLINIC: ClinicForm = { name: "", address: "", opening_hours: "" };

// ── Component ─────────────────────────────────────────────────────────────────
export const DoctorDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user_id, clearToken } = useAuthStore((s) => ({
    user_id: s.userId,
    clearToken: s.clearToken,
  }));

  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<any>(null);
  const [error, setError] = useState("");

  // clinic form state
  const [clinicForm, setClinicForm] = useState<ClinicForm>(EMPTY_CLINIC);
  const [clinicSaving, setClinicSaving] = useState(false);
  const [clinicError, setClinicError] = useState("");
  const [clinicSuccess, setClinicSuccess] = useState("");

  // ── Load doctor profile ──────────────────────────────────────────────────
  const loadDoctorData = async () => {
    if (!user_id) { setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const res = await doctorApi.getProfile();
      setDoctor(res.data);
      if (res.data?.clinic) {
        setClinicForm({
          name: res.data.clinic.name || "",
          address: res.data.clinic.address || "",
          opening_hours: res.data.clinic.opening_hours || "",
          lat: res.data.clinic.lat,
          lng: res.data.clinic.lng,
        });
      }
    } catch (err: any) {
      setError(err.message || "Unable to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadDoctorData(); }, [user_id]);

  // ── Save clinic ──────────────────────────────────────────────────────────
  const handleClinicSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicForm.address.trim()) {
      setClinicError("Address is required.");
      return;
    }
    setClinicSaving(true);
    setClinicError("");
    setClinicSuccess("");
    try {
      await doctorApi.addClinic(clinicForm);
      setClinicSuccess("Clinic location saved! It will appear on the patient map.");
      // Refresh to get geocoded lat/lng back
      const res = await doctorApi.getProfile();
      setDoctor(res.data);
    } catch (err: any) {
      setClinicError(
        err.response?.data?.detail ||
        "Could not save clinic. Check the address and try again."
      );
    } finally {
      setClinicSaving(false);
    }
  };

  const handleLogout = () => { clearToken(); window.location.assign("/"); };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#23634e] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  const clinic = doctor?.clinic;
  // Stub clinic = exists in DB but has no coordinates yet (created at signup)
  const hasClinicRecord = !!clinic;
  const hasClinic = hasClinicRecord && typeof clinic.lat === "number" && typeof clinic.lng === "number";

  const displayLat = clinicForm.lat ?? clinic?.lat;
  const displayLng = clinicForm.lng ?? clinic?.lng;
  const hasLocation = typeof displayLat === "number" && typeof displayLng === "number";

  // Fake doctor object for the map — formatted as a search result would be
  const fakeMapDoctor = hasLocation
    ? [{ id: "me", name: doctor.name, specialty: doctor.specialty, consult_fee: doctor.consult_fee, distance_km: 0, available: true, clinic: { ...clinic, lat: displayLat, lng: displayLng } }]
    : [];

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-[#718079]">{t("dash.overview")}</p>
          <h1 className="display mt-1 text-4xl">
            {t("dash.welcome")} <span className="text-[#23634e]">{doctor?.name?.split(" ")[0] ?? "Doctor"}.</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {doctor && <AvailabilityToggle doctorId={user_id!} initialAvailable={doctor?.availability?.available ?? false} />}
          <button onClick={handleLogout} className="btn-secondary text-xs">{t("dash.signout")}</button>
        </div>
      </div>

      {/* ── Stats row (placeholder) ─────────────────────────────────────────── */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: t("dash.appts_today"), value: "—" },
          { label: t("dash.patients_week"), value: "—" },
          { label: t("dash.followups"), value: "—" },
        ].map(({ label, value }) => (
          <div key={label} className="panel p-6">
            <p className="eyebrow text-[#718079]">{label}</p>
            <p className="display mt-2 text-4xl text-[#12201e]">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Clinic setup ────────────────────────────────────────────────────── */}
      <div className="panel overflow-hidden">
        {/* section header */}
        <div className="flex items-center justify-between border-b border-[#e6e8e1] px-6 py-4">
          <div>
            <p className="eyebrow text-[#718079]">{t("dash.clinic_location")}</p>
            <h2 className="mt-0.5 text-lg font-bold">
              {hasClinic ? t("dash.clinic_on_map") : hasClinicRecord ? "Complete your clinic setup" : t("dash.add_clinic")}
            </h2>
          </div>
          {hasClinic && (
            <span className="rounded-full bg-[#e5f5c4] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#355b22]">
            {t("dash.listed")}
            </span>
          )}
        </div>

        <div className="grid lg:grid-cols-[1fr_1.4fr]">
          {/* ── Form column ─────────────────────────────────────────────────── */}
          <form onSubmit={handleClinicSave} className="space-y-4 border-b border-[#e6e8e1] p-6 lg:border-b-0 lg:border-r">
            <div>
              <label className="field-label">{t("dash.clinic_name")} <span className="text-[#a8b3ac]">{t("dash.optional")}</span></label>
              <input
                id="clinic-name"
                className="field mt-1 w-full"
                placeholder="e.g. Sunrise Health Clinic"
                value={clinicForm.name}
                onChange={(e) => setClinicForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="field-label">
                {t("dash.full_address")} <span className="text-red-500">*</span>
              </label>
              <textarea
                id="clinic-address"
                className="field mt-1 w-full resize-none"
                rows={3}
                placeholder="e.g. 24 Gandhi Road, Palakkad, Kerala 678001"
                value={clinicForm.address}
                required
                onChange={(e) => setClinicForm((f) => ({ ...f, address: e.target.value }))}
              />
              <p className="mt-1 text-xs text-[#a8b3ac]">{t("dash.address_hint")}</p>
            </div>

            <div>
              <label className="field-label">{t("dash.opening_hours")} <span className="text-[#a8b3ac]">{t("dash.optional")}</span></label>
              <input
                id="clinic-hours"
                className="field mt-1 w-full"
                placeholder="e.g. Mon–Sat 9 AM – 6 PM"
                value={clinicForm.opening_hours}
                onChange={(e) => setClinicForm((f) => ({ ...f, opening_hours: e.target.value }))}
              />
            </div>

            {clinicError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {clinicError}
              </div>
            )}
            {clinicSuccess && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {clinicSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={clinicSaving}
              className="btn-primary w-full"
              id="save-clinic-btn"
            >
              {clinicSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  {t("dash.geocoding")}
                </span>
              ) : hasClinic ? t("dash.update_btn") : t("dash.save_btn")}
            </button>

            {(clinicForm.lat != null && clinicForm.lng != null) ? (
              <p className="text-center text-xs text-[#a8b3ac]">
                📍 {t("dash.pinned_at", { lat: clinicForm.lat.toFixed(4), lng: clinicForm.lng.toFixed(4) })}
              </p>
            ) : hasClinic ? (
              <p className="text-center text-xs text-[#a8b3ac]">
                📍 {clinic.lat.toFixed(4)}, {clinic.lng.toFixed(4)}
              </p>
            ) : null}
          </form>

          {/* ── Map preview column ───────────────────────────────────────────── */}
          <div className="relative min-h-[300px] lg:min-h-[380px]">
            {hasLocation ? (
              <MapView
                lat={displayLat}
                lng={displayLng}
                doctors={fakeMapDoctor}
                onMapClick={(lat, lng) => setClinicForm(f => ({ ...f, lat, lng }))}
              />
            ) : (
              <div className="relative h-full min-h-[300px]">
                <MapView
                  lat={10.786}
                  lng={76.6444}
                  doctors={[]}
                  onMapClick={(lat, lng) => setClinicForm(f => ({ ...f, lat, lng }))}
                />
                <div className="pointer-events-none absolute inset-0 z-[1000] flex flex-col items-center justify-center bg-[#f0f2ee]/80 text-center backdrop-blur-sm">
                  <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#dceee7] text-3xl">
                    📍
                  </div>
                  <p className="font-semibold text-[#12201e]">{t("dash.no_location")}</p>
                  <p className="mt-1 px-6 text-sm text-[#718079]">{t("dash.map_hint")}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Profile summary strip ────────────────────────────────────────────── */}
      {doctor && (
        <div className="mt-6 panel flex flex-wrap items-center gap-4 p-5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#dceee7] text-lg font-bold text-[#23634e]">
            {(doctor.name || "D").replace("Dr. ", "").charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold">{doctor.name}</p>
            <p className="text-sm text-[#60706a]">{doctor.specialty}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {doctor.consult_fee != null && (
              <span className="rounded-full border border-[#d7dbd3] bg-[#f0f2ee] px-3 py-1 font-semibold">
                ₹{doctor.consult_fee} consult fee
              </span>
            )}
            <span
              className={`rounded-full px-3 py-1 font-bold ${
                doctor.license_verified
                  ? "bg-[#e5f5c4] text-[#355b22]"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {doctor.license_verified ? "✓ Verified" : "⏳ Verification pending"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
