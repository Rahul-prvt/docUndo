import React, { useEffect, useState } from "react";
import { MapView } from "../components/MapView";
import { DoctorCard } from "../components/DoctorCard";
import { searchApi } from "../lib/api";
import { useTranslation } from "../lib/i18n";

const specialties = ["General Practitioner", "Cardiologist", "Dermatologist", "Pediatrician", "Orthopedist", "Neurologist", "Gynecologist"];

interface PatientSearchProps {
  externalSpecialty?: string;
  onSpecialtyConsumed?: () => void;
}

export const PatientSearch: React.FC<PatientSearchProps> = ({ externalSpecialty, onSpecialtyConsumed }) => {
  const { t } = useTranslation();
  const [userLat, setUserLat] = useState(10.786);
  const [userLng, setUserLng] = useState(76.6444);
  const [locationName, setLocationName] = useState("Palakkad, Kerala");
  const [specialty, setSpecialty] = useState("");
  const [radius, setRadius] = useState(10);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.786, 76.6444]);

  // Consume specialty pushed from the AI chat widget
  useEffect(() => {
    if (externalSpecialty) {
      setSpecialty(externalSpecialty);
      onSpecialtyConsumed?.();
    }
  }, [externalSpecialty]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => {
        setUserLat(p.coords.latitude);
        setUserLng(p.coords.longitude);
        setMapCenter([p.coords.latitude, p.coords.longitude]);
        setLocationName(t("search.current_location"));
      },
      () => {
        setLocationName(t("search.default_location"));
      }
    );
  }, []);

  const handleMapClick = (lat: number, lng: number) => {
    setUserLat(lat);
    setUserLng(lng);
    setMapCenter([lat, lng]);
    setLocationName(t("search.selected_on_map"));
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await searchApi.search(userLat, userLng, specialty || undefined, radius);
      setDoctors(response.data);
      setSelectedDoctor(null);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 pb-16 pt-8 lg:px-8 lg:pt-14">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[1.75rem] bg-[#12201e] px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-14">
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-[#caff67] opacity-90 blur-[1px]" />
        <div className="absolute bottom-0 right-44 h-24 w-24 rounded-full border-[18px] border-[#5eaa98] opacity-50" />
        <div className="relative max-w-2xl">
          <p className="eyebrow mb-4 text-[#d5ff78]">{t("search.hero_eyebrow")}</p>
          <h1 className="display text-4xl leading-[1.03] sm:text-5xl lg:text-6xl">{t("search.hero_title")}</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#c5d1cb]">{t("search.hero_subtitle")}</p>
        </div>
        <div className="relative mt-9 grid max-w-2xl grid-cols-3 gap-4 border-t border-white/15 pt-5">
          <div><strong className="block text-lg">{t("search.feature1_title")}</strong><span className="text-xs text-[#aebeb6]">{t("search.feature1_desc")}</span></div>
          <div><strong className="block text-lg">{t("search.feature2_title")}</strong><span className="text-xs text-[#aebeb6]">{t("search.feature2_desc")}</span></div>
          <div><strong className="block text-lg">{t("search.feature3_title")}</strong><span className="text-xs text-[#aebeb6]">{t("search.feature3_desc")}</span></div>
        </div>
      </section>

      {/* ── Search bar ───────────────────────────────────────────────────── */}
      <section className="panel relative z-10 mt-4 mx-2 p-4 sm:mx-6 sm:p-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.1fr_1.3fr_1fr_auto] lg:items-end">
          <div>
            <label className="field-label">{t("search.near_you")}</label>
            <div className="field flex items-center gap-2 text-[#53615c]">
              <span className="text-[#58947d]">●</span>
              <span>{locationName}</span>
            </div>
          </div>
          <div>
            <label className="field-label">{t("search.i_need_a")}</label>
            <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="field">
              <option value="">{t("search.any_specialty")}</option>
              {specialties.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label flex justify-between">
              <span>{t("search.within_km", { radius })}</span>
              <span className="text-[#12201e]">{radius} km</span>
            </label>
            <input type="range" min={1} max={50} value={radius} onChange={(e) => setRadius(+e.target.value)} className="h-2 w-full cursor-pointer accent-[#12201e]" />
          </div>
          <button onClick={handleSearch} disabled={loading} className="btn-primary min-h-[43px] whitespace-nowrap">
            {loading ? t("search.searching") : <>{t("search.btn")} <span>→</span></>}
          </button>
        </div>
      </section>

      {/* ── Results (full width now — sidebar removed) ────────────────────── */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="eyebrow text-[#718079]">{t("search.explore_nearby")}</p>
            <h2 className="display mt-1 text-3xl">
              {doctors.length ? t("search.care_options", { count: doctors.length }) : t("search.care_around_you")}
            </h2>
          </div>
          {selectedDoctor && (
            <button onClick={() => setSelectedDoctor(null)} className="text-sm font-bold underline underline-offset-4">
              {t("search.all_results")}
            </button>
          )}
        </div>

        {selectedDoctor ? (
          <div className="space-y-5">
            <DoctorCard doctor={selectedDoctor} onClick={() => undefined} isDetailView />
            <div className="panel p-5">
              <p className="eyebrow text-[#718079]">{t("search.next_available")}</p>
              <h3 className="mt-1 text-xl font-bold">{t("search.choose_time")}</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button className="rounded-xl border border-[#d7dbd3] bg-[#fffefa] p-4 text-left transition hover:border-[#12201e]">
                  <strong>{t("search.today")}</strong>
                  <span className="mt-1 block text-sm text-[#60706a]">9:00 AM · 15 min</span>
                </button>
                <button className="rounded-xl border border-[#d7dbd3] bg-[#fffefa] p-4 text-left transition hover:border-[#12201e]">
                  <strong>{t("search.tomorrow")}</strong>
                  <span className="mt-1 block text-sm text-[#60706a]">2:00 PM · 15 min</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-[1.25rem] border border-[#d7dbd3] bg-[#e8ece6] p-2" style={{ height: 370 }}>
              <MapView lat={mapCenter[0]} lng={mapCenter[1]} doctors={doctors} onDoctorClick={setSelectedDoctor} onMapClick={handleMapClick} />
              <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-[1000] flex justify-center">
                <div className="rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-sm backdrop-blur-sm">
                  {t("search.click_map")}
                </div>
              </div>
            </div>
            {doctors.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {doctors.map((doctor) => <DoctorCard key={doctor.id} doctor={doctor} onClick={() => setSelectedDoctor(doctor)} />)}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-[#cbd3c9] px-6 py-12 text-center">
                <p className="text-2xl mb-2">🩺</p>
                <p className="font-semibold">{t("search.start_with_search")}</p>
                <p className="mt-1 text-sm text-[#718079]">{t("search.start_with_search_desc")}</p>
                <p className="mt-3 text-xs text-[#5eaa98]">Tip: use the AI assistant button at the bottom-right to describe symptoms</p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
