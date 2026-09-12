import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Feedback, LoadingState } from "../components/ui";
import { doctorApi } from "../lib/api";
import { useAuthStore } from "../lib/store";
import { useTranslation } from "../lib/i18n";
import { AvailabilityToggle } from "../components/AvailabilityToggle";
import { MapView } from "../components/MapView";
import { PlaceAutocomplete } from "../components/PlaceAutocomplete";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ClinicForm {
  name: string;
  address: string;
  opening_hours: string;
  phone: string;
  lat?: number;
  lng?: number;
}

const EMPTY_CLINIC: ClinicForm = { name: "", address: "", opening_hours: "", phone: "" };

// ── Component ─────────────────────────────────────────────────────────────────
export const DoctorDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user_id } = useAuthStore((s) => ({
    user_id: s.userId,
  }));

  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<any>(null);
  const [error, setError] = useState("");

  // clinic form state
  const [clinicForm, setClinicForm] = useState<ClinicForm>(EMPTY_CLINIC);
  const [clinicSaving, setClinicSaving] = useState(false);
  const [clinicError, setClinicError] = useState("");
  const [clinicSuccess, setClinicSuccess] = useState("");

  const handlePlaceSelected = React.useCallback((place: { address: string; lat: number; lng: number; name?: string }) => {
    setClinicForm((form) => ({
      ...form,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      name: form.name || place.name || "",
    }));
  }, []);

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
          phone: res.data.clinic.phone || "",
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
      setClinicSuccess("Clinic details saved. Set your availability above when you are ready to see patients.");
      // Refresh to get geocoded lat/lng back
      const res = await doctorApi.getProfile();
      setDoctor(res.data);
      setClinicForm({ ...EMPTY_CLINIC, ...res.data.clinic });
    } catch (err: any) {
      setClinicError(
        err.response?.data?.detail ||
        "Could not save clinic. Check the address and try again."
      );
    } finally {
      setClinicSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (!user_id) return <Navigate to="/doctor/login" replace />;

  if (loading) {
    return (
      <LoadingState label="Loading your practice…" />
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-10">
        <Feedback>{error}<button onClick={() => void loadDoctorData()} className="btn-secondary mt-3 block">Try again</button></Feedback>
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
    <div className="page-container">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-[#718079]">{t("dash.overview")}</p>
          <h1 className="page-title mt-1">
            {t("dash.welcome")} <span className="text-[#23634e]">{doctor?.name?.replace(/^Dr\.?\s+/i, '').split(" ")[0] ?? "Doctor"}.</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {doctor && <AvailabilityToggle doctorId={user_id!} initialAvailable={doctor?.availability?.available ?? false} />}
        </div>
      </div>

      <div className="mb-6 grid divide-y divide-[#dce3df] rounded-xl border border-[#dce3df] bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[{ label: "Clinic location", value: hasClinic ? "Location saved" : "Setup needed" },
          { label: "License verification", value: doctor?.license_verified ? "Verified" : "Pending review" },
          { label: "Consultation fee", value: doctor?.consult_fee != null ? `₹${doctor.consult_fee}` : "Not provided" }].map(item => (
          <div key={item.label} className="flex items-center justify-between gap-3 p-4 sm:block sm:p-5"><p className="text-xs font-medium text-[#53665e]">{item.label}</p><p className="text-sm font-semibold sm:mt-2 sm:text-lg">{item.value}</p></div>
        ))}
      </div>

      {/* ── Clinic setup ────────────────────────────────────────────────────── */}
      <div className="panel overflow-hidden">
        {/* section header */}
        <div className="flex flex-wrap gap-3 items-center justify-between border-b border-[#e6e8e1] px-6 py-4">
          <div>
            <p className="eyebrow text-[#718079]">{t("dash.clinic_location")}</p>
            <h2 className="mt-0.5 text-lg font-bold">
              {hasClinic ? t("dash.clinic_on_map") : hasClinicRecord ? "Complete your clinic setup" : t("dash.add_clinic")}
            </h2>
          </div>
          {hasClinic && (
            <span className="badge badge-success">
            {t("dash.listed")}
            </span>
          )}
        </div>

        <div className="grid lg:grid-cols-[1fr_1.4fr]">
          {/* ── Form column ─────────────────────────────────────────────────── */}
          <form onSubmit={handleClinicSave} onChange={() => { setClinicSuccess(''); setClinicError(''); }} className="space-y-4 border-b border-[#e6e8e1] p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <div>
              <label htmlFor="clinic-name" className="field-label">{t("dash.clinic_name")} <span className="text-[#53665e]">{t("dash.optional")}</span></label>
              <input
                id="clinic-name"
                className="field mt-1 w-full"
                placeholder="e.g. Sunrise Health Clinic"
                value={clinicForm.name}
                onChange={(e) => setClinicForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <PlaceAutocomplete
              id="clinic-address"
              label={`${t("dash.full_address")} *`}
              hint={`${t("dash.address_hint")} Select a result to confirm the location.`}
              initialValue={clinicForm.address}
              onPlaceSelected={handlePlaceSelected}
            />
            <label htmlFor="manual-address" className="field-label">Confirm full address</label>
            <textarea
              id="manual-address"
              className="field w-full resize-none"
              rows={2}
              placeholder="Selected address (or enter a manual address)"
              value={clinicForm.address}
              required
              onChange={(e) => setClinicForm((form) => ({ ...form, address: e.target.value, lat: undefined, lng: undefined }))}
            />

            <div>
              <label htmlFor="clinic-hours" className="field-label">{t("dash.opening_hours")} <span className="text-[#53665e]">{t("dash.optional")}</span></label>
              <input
                id="clinic-hours"
                className="field mt-1 w-full"
                placeholder="e.g. Mon–Sat 9 AM – 6 PM"
                value={clinicForm.opening_hours}
                onChange={(e) => setClinicForm((f) => ({ ...f, opening_hours: e.target.value }))}
              />
            </div>

            <div>
              <label htmlFor="clinic-phone" className="field-label">Phone Number <span className="text-[#53665e]">{t("dash.optional")}</span></label>
              <input
                id="clinic-phone"
                className="field mt-1 w-full"
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={clinicForm.phone}
                onChange={(e) => setClinicForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <p className="mt-1 text-xs text-[#53665e]">Patients will see a "Call clinic" button on your profile.</p>
            </div>

            {clinicError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {clinicError}
              </div>
            )}
            {clinicSuccess && (
              <div role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
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
              <p className="text-center text-xs text-[#53665e]">
                📍 {t("dash.pinned_at", { lat: clinicForm.lat.toFixed(4), lng: clinicForm.lng.toFixed(4) })}
              </p>
            ) : hasClinic ? (
              <p className="text-center text-xs text-[#53665e]">
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
                <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex flex-col items-center justify-center rounded-lg border border-[#dce3df] bg-white p-4 text-center">
                  <div className="mb-2 grid h-9 w-9 place-items-center rounded-lg bg-[#dceee7] text-lg">
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
