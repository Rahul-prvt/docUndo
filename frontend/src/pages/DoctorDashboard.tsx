import React, { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { AvailabilityToggle } from "../components/AvailabilityToggle";
import { MapView } from "../components/MapView";
import { OpeningHoursEditor, defaultSchedule, scheduleErrors, type OpeningHoursDay } from "../components/OpeningHoursEditor";
import { PlaceAutocomplete } from "../components/PlaceAutocomplete";
import { Feedback, LoadingState } from "../components/ui";
import { doctorApi } from "../lib/api";
import { useAuthStore } from "../lib/store";

const SPECIALTIES = ["General Practitioner", "Cardiologist", "Dermatologist", "Pediatrician", "Orthopedist", "Neurologist", "Gynecologist", "Psychiatrist", "ENT Specialist", "Ophthalmologist", "Gastroenterologist"];
const LANGUAGES = ["English", "Malayalam", "Hindi", "Tamil", "Arabic", "Urdu"];

interface ProfileForm { name: string; specialty: string; bio: string; consult_fee: string; available_days: string[]; languages: string[]; }
interface ClinicForm { name: string; address: string; phone: string; lat?: number; lng?: number; opening_hours_schedule: OpeningHoursDay[]; }

const emptyProfile: ProfileForm = { name: "", specialty: "General Practitioner", bio: "", consult_fee: "", available_days: [], languages: [] };
const emptyClinic = (): ClinicForm => ({ name: "", address: "", phone: "", opening_hours_schedule: defaultSchedule() });
const apiError = (error: any, fallback: string) => error?.response?.data?.detail || error?.message || fallback;

export const DoctorDashboard: React.FC = () => {
  const userId = useAuthStore((state) => state.userId);
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [clinic, setClinic] = useState<ClinicForm>(emptyClinic);
  const [profileSaving, setProfileSaving] = useState(false);
  const [clinicSaving, setClinicSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [clinicFeedback, setClinicFeedback] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [hoursErrors, setHoursErrors] = useState<Record<string, string>>({});

  const populate = (data: any) => {
    setDoctor(data);
    setProfile({ name: data.name || "", specialty: data.specialty || "General Practitioner", bio: data.bio || "", consult_fee: data.consult_fee == null ? "" : String(data.consult_fee), available_days: data.available_days || [], languages: data.languages || [] });
    setClinic({ name: data.clinic?.name || "", address: data.clinic?.address || "", phone: data.clinic?.phone || "", lat: data.clinic?.lat, lng: data.clinic?.lng, opening_hours_schedule: data.clinic?.opening_hours_schedule || defaultSchedule() });
  };

  const load = async () => {
    if (!userId) return;
    setLoading(true); setLoadError("");
    try { populate((await doctorApi.getProfile()).data); }
    catch (error: any) { setLoadError(apiError(error, "Unable to load your practice.")); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [userId]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (profileSaving) return;
    setProfileSaving(true); setProfileFeedback(null);
    try {
      const response = await doctorApi.updateProfile({ ...profile, consult_fee: profile.consult_fee === "" ? null : Number(profile.consult_fee) });
      populate(response.data);
      setProfileFeedback({ tone: "success", text: "Professional information saved." });
    } catch (error: any) { setProfileFeedback({ tone: "error", text: apiError(error, "Unable to update professional information. Please try again.") }); }
    finally { setProfileSaving(false); }
  };

  const saveClinic = async (event: React.FormEvent) => {
    event.preventDefault();
    if (clinicSaving) return;
    const errors = scheduleErrors(clinic.opening_hours_schedule);
    setHoursErrors(errors);
    if (!clinic.address.trim()) { setClinicFeedback({ tone: "error", text: "Practice address is required." }); return; }
    if (Object.keys(errors).length) { setClinicFeedback({ tone: "error", text: "Check the highlighted opening hours before saving." }); return; }
    setClinicSaving(true); setClinicFeedback(null);
    try {
      await doctorApi.addClinic(clinic);
      populate((await doctorApi.getProfile()).data);
      setClinicFeedback({ tone: "success", text: "Practice details and opening hours saved." });
    } catch (error: any) { setClinicFeedback({ tone: "error", text: apiError(error, "Unable to update practice details. Please try again.") }); }
    finally { setClinicSaving(false); }
  };

  const completion = useMemo(() => {
    if (!doctor) return { percent: 0, missing: "" };
    const fields = [profile.name, profile.specialty, profile.bio, profile.consult_fee, clinic.name, clinic.address, clinic.phone, clinic.opening_hours_schedule.some((day) => day.is_open)];
    const percent = Math.round(fields.filter(Boolean).length / fields.length * 100);
    const missing = !clinic.address ? "Add your practice address." : !clinic.opening_hours_schedule.some((day) => day.is_open) ? "Add opening hours." : !profile.bio ? "Add a short biography." : "Your essential profile details are complete.";
    return { percent, missing };
  }, [doctor, profile, clinic]);

  if (!userId) return <Navigate to="/doctor/login" replace />;
  if (loading) return <LoadingState label="Loading your practice…" />;
  if (loadError) return <div className="page-container"><Feedback>{loadError}<button className="btn-secondary mt-3 block" onClick={() => void load()}>Try again</button></Feedback></div>;

  const hasLocation = typeof clinic.lat === "number" && typeof clinic.lng === "number";
  const mapDoctors = hasLocation ? [{ id: doctor.id, name: doctor.name, specialty: doctor.specialty, available: doctor.available, clinic: { ...doctor.clinic, ...clinic }, distance_km: 0 }] : [];

  return <main className="page-container">
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div><p className="eyebrow text-[#718079]">Doctor dashboard</p><h1 className="page-title mt-1">Welcome, {doctor.name.replace(/^Dr\.?\s+/i, "").split(" ")[0]}.</h1><p className="mt-2 text-sm text-[#60706a]">Manage what patients see and when you are available.</p></div>
      <AvailabilityToggle initialAvailable={doctor.available} active={doctor.active} onChange={(available) => setDoctor((current: any) => ({ ...current, available }))} />
    </header>

    {!doctor.active && <div className="mb-6"><Feedback>Your license is pending review. You can complete your profile now, but you cannot go live or appear in patient search until verified.</Feedback></div>}

    <section className="mb-6 grid gap-3 sm:grid-cols-3" aria-label="Practice overview">
      <div className="panel p-4"><p className="text-xs font-semibold text-[#60706a]">Profile completeness</p><p className="mt-1 text-xl font-bold">{completion.percent}%</p><p className="mt-1 text-xs text-[#60706a]">{completion.missing}</p></div>
      <div className="panel p-4"><p className="text-xs font-semibold text-[#60706a]">Account status</p><p className="mt-1 text-lg font-bold">{doctor.active ? "Active" : "Pending verification"}</p><p className="mt-1 text-xs text-[#60706a]">{doctor.active ? "Visible in patient search" : "Hidden from patient search"}</p></div>
      <div className="panel p-4"><p className="text-xs font-semibold text-[#60706a]">Live status</p><p className="mt-1 text-lg font-bold">{doctor.available ? "Live now" : "Not live"}</p><p className="mt-1 text-xs text-[#60706a]">Active doctors remain searchable when not live.</p></div>
    </section>

    <nav className="mb-6 flex gap-2 overflow-x-auto" aria-label="Dashboard sections"><a className="btn-secondary whitespace-nowrap" href="#professional">Professional details</a><a className="btn-secondary whitespace-nowrap" href="#practice">Practice details</a><a className="btn-secondary whitespace-nowrap" href="#hours">Opening hours</a></nav>

    <form id="professional" className="panel mb-6 scroll-mt-24 p-5 sm:p-6" onSubmit={saveProfile} onChange={() => setProfileFeedback(null)}>
      <div className="mb-5 border-b border-[#e6e8e1] pb-4"><p className="eyebrow text-[#718079]">Profile</p><h2 className="mt-1 text-xl font-bold">Professional information</h2><p className="mt-1 text-sm text-[#60706a]">Your email and registration number are locked because they identify your account and verification record.</p></div>
      <div className="form-grid">
        <div><label className="field-label" htmlFor="doctor-name">Display name</label><input id="doctor-name" required className="field" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></div>
        <div><label className="field-label" htmlFor="specialty">Specialty</label><select id="specialty" className="field" value={profile.specialty} onChange={(event) => setProfile({ ...profile, specialty: event.target.value })}>{SPECIALTIES.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div><label className="field-label" htmlFor="email">Account email</label><input id="email" className="field bg-[#f3f5f3]" value={doctor.email} disabled /></div>
        <div><label className="field-label" htmlFor="license">Registration number</label><input id="license" className="field bg-[#f3f5f3]" value={doctor.license_no} disabled /></div>
        <div><label className="field-label" htmlFor="fee">Consultation fee (₹)</label><input id="fee" className="field" type="number" min="0" step="1" value={profile.consult_fee} onChange={(event) => setProfile({ ...profile, consult_fee: event.target.value })} /></div>
        <div className="full-width"><label className="field-label" htmlFor="bio">Biography</label><textarea id="bio" className="field resize-y" rows={4} value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} /></div>
        <fieldset className="full-width"><legend className="field-label">Consultation days</legend><div className="flex flex-wrap gap-2">{defaultSchedule().map(({ day }) => <button type="button" key={day} aria-pressed={profile.available_days.includes(day)} className={profile.available_days.includes(day) ? "btn-primary" : "btn-secondary"} onClick={() => setProfile({ ...profile, available_days: profile.available_days.includes(day) ? profile.available_days.filter((item) => item !== day) : [...profile.available_days, day] })}>{day.slice(0, 3)}</button>)}</div></fieldset>
        <fieldset className="full-width"><legend className="field-label">Languages</legend><div className="flex flex-wrap gap-2">{LANGUAGES.map((language) => <button type="button" key={language} aria-pressed={profile.languages.includes(language)} className={profile.languages.includes(language) ? "btn-primary" : "btn-secondary"} onClick={() => setProfile({ ...profile, languages: profile.languages.includes(language) ? profile.languages.filter((item) => item !== language) : [...profile.languages, language] })}>{language}</button>)}</div></fieldset>
        {profileFeedback && <div className="full-width"><Feedback tone={profileFeedback.tone}>{profileFeedback.text}</Feedback></div>}
        <div className="full-width flex justify-end"><button className="btn-primary min-w-36" disabled={profileSaving}>{profileSaving ? "Saving…" : "Save profile"}</button></div>
      </div>
    </form>

    <form id="practice" className="panel scroll-mt-24 overflow-hidden" onSubmit={saveClinic} onChange={() => setClinicFeedback(null)}>
      <div className="border-b border-[#e6e8e1] p-5 sm:p-6"><p className="eyebrow text-[#718079]">Practice</p><h2 className="mt-1 text-xl font-bold">Practice details</h2><p className="mt-1 text-sm text-[#60706a]">These details appear on your patient-facing profile.</p></div>
      <div className="grid lg:grid-cols-[1fr_1.05fr]">
        <div className="space-y-5 p-5 sm:p-6 lg:border-r lg:border-[#e6e8e1]">
          <div><label className="field-label" htmlFor="clinic-name">Practice or clinic name</label><input id="clinic-name" className="field" value={clinic.name} onChange={(event) => setClinic({ ...clinic, name: event.target.value })} /></div>
          <PlaceAutocomplete id="clinic-address-search" label="Find practice address" hint="Select a result to preserve accurate map coordinates." initialValue={clinic.address} onPlaceSelected={(place) => setClinic({ ...clinic, name: clinic.name || place.name || "", address: place.address, lat: place.lat, lng: place.lng })} />
          <div><label className="field-label" htmlFor="clinic-address">Confirmed full address *</label><textarea id="clinic-address" required rows={3} className="field resize-y" value={clinic.address} onChange={(event) => setClinic({ ...clinic, address: event.target.value, lat: undefined, lng: undefined })} /></div>
          <div><label className="field-label" htmlFor="clinic-phone">Practice phone</label><input id="clinic-phone" className="field" type="tel" value={clinic.phone} onChange={(event) => setClinic({ ...clinic, phone: event.target.value })} /></div>
        </div>
        <div className="min-h-[320px] border-t border-[#e6e8e1] lg:border-t-0"><MapView lat={clinic.lat ?? 10.786} lng={clinic.lng ?? 76.6444} doctors={mapDoctors} onMapClick={(lat, lng) => setClinic({ ...clinic, lat, lng })} /></div>
      </div>
      <div id="hours" className="scroll-mt-24 border-t border-[#e6e8e1] p-5 sm:p-6">
        <OpeningHoursEditor value={clinic.opening_hours_schedule} errors={hoursErrors} onChange={(opening_hours_schedule) => { setClinic({ ...clinic, opening_hours_schedule }); setHoursErrors({}); }} />
        {doctor.clinic?.opening_hours && !doctor.clinic?.opening_hours_schedule && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Legacy hours: {doctor.clinic.opening_hours}. Choose structured hours above to replace this text safely.</p>}
        {clinicFeedback && <div className="mt-4"><Feedback tone={clinicFeedback.tone}>{clinicFeedback.text}</Feedback></div>}
        <div className="mt-5 flex justify-end"><button className="btn-primary min-w-44" disabled={clinicSaving}>{clinicSaving ? "Saving…" : "Save practice details"}</button></div>
      </div>
    </form>
  </main>;
};
