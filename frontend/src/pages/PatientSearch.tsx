import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapView } from '../components/MapView';
import { DoctorCard } from '../components/DoctorCard';
import { Feedback, LoadingState, Modal } from '../components/ui';
import { searchApi } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import { PlaceAutocomplete } from '../components/PlaceAutocomplete';

const specialties = ['General Practitioner', 'Cardiologist', 'Dermatologist', 'Pediatrician', 'Orthopedist', 'Neurologist', 'Gynecologist', 'Psychiatrist', 'ENT Specialist', 'Ophthalmologist', 'Gastroenterologist'];
interface PatientSearchProps { externalSpecialty?: string; onSpecialtyConsumed?: () => void }

export const PatientSearch: React.FC<PatientSearchProps> = ({ externalSpecialty, onSpecialtyConsumed }) => {
  const { t } = useTranslation();
  const [location, setLocation] = useState({ lat: 10.786, lng: 76.6444, address: 'Palakkad, Kerala' });
  const [specialty, setSpecialty] = useState('');
  const [radius, setRadius] = useState(10);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchError, setSearchError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [locating, setLocating] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [mobileView, setMobileView] = useState('list');
  const [searched, setSearched] = useState({ lat: 10.786, lng: 76.6444, address: 'Palakkad, Kerala', specialty: '', radius: 10 });
  const requestId = useRef(0);
  const dirty = location.lat !== searched.lat || location.lng !== searched.lng || specialty !== searched.specialty || radius !== searched.radius;

  const runSearch = useCallback(async (place: typeof location, spec: string, rad: number) => {
    const id = ++requestId.current;
    setLoading(true);
    setSearchError('');
    setSelectedDoctor(null);
    try {
      const response = await searchApi.search(place.lat, place.lng, spec || undefined, rad);
      if (id !== requestId.current) return;
      setDoctors(response.data);
      setSearched({ ...place, specialty: spec, radius: rad });
    } catch {
      if (id === requestId.current) setSearchError(t('search.failed'));
    } finally { if (id === requestId.current) setLoading(false); }
  }, []);

  useEffect(() => { void runSearch({ lat: 10.786, lng: 76.6444, address: 'Palakkad, Kerala' }, '', 10); return () => { requestId.current++; }; }, [runSearch]);
  useEffect(() => {
    if (externalSpecialty) {
      setSpecialty(externalSpecialty);
      void runSearch(location, externalSpecialty, radius);
      onSpecialtyConsumed?.();
    }
  }, [externalSpecialty]);

  const useMyLocation = () => {
    if (!navigator.geolocation) { setLocationError(t('search.location_failed')); return; }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(p => {
      const next = { lat: p.coords.latitude, lng: p.coords.longitude, address: t('search.current_location') };
      setLocation(next);
      setLocating(false);
      void runSearch(next, specialty, radius);
    }, () => { setLocating(false); setLocationError(t('search.location_failed')); }, { timeout: 10000 });
  };
  const handlePlaceSelected = useCallback((place: typeof location) => { setLocation(place); setLocationError(''); }, []);

  return <div className="page-container">
    <section className="mb-7">
      <p className="eyebrow mb-2 text-[#23634e]">{t('search.hero_eyebrow')}</p>
      <h1 className="page-title">{t('search.hero_title')}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#53665e]">{t('search.hero_subtitle')}</p>
    </section>

    <form aria-label={t('search.btn')} onSubmit={e => { e.preventDefault(); void runSearch(location, specialty, radius); }} className="panel p-4 sm:p-5">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.4fr_1.1fr_.7fr_auto] lg:items-start">
        <div className="min-w-0">
          <PlaceAutocomplete id="patient-location" label={t('search.near_you')} initialValue={location.address} onPlaceSelected={handlePlaceSelected} />
        </div>
        <div>
          <label htmlFor="specialty" className="field-label">{t('auth.specialty')}</label>
          <select id="specialty" value={specialty} onChange={e => setSpecialty(e.target.value)} className="field">
            <option value="">{t('search.any_specialty')}</option>
            {[...new Set([...specialties, ...(specialty ? [specialty] : [])])].map(item => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="radius" className="field-label">{t('search.within_km', { radius })}</label>
          <input id="radius" type="range" min={1} max={50} value={radius} aria-valuetext={`${radius} km`} onChange={e => setRadius(+e.target.value)} className="w-full accent-[#23634e]" />
        </div>
        <button type="submit" disabled={loading || locating} className="btn-primary lg:mt-[26px]">{loading ? t('search.searching') : t('search.btn')} <span aria-hidden="true">→</span></button>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 border-t border-[#e5ebe7] pt-2">
        <p className="min-w-0 break-words text-xs text-[#53665e]">{t('search.location_label')}: {location.address}</p>
        <button type="button" onClick={useMyLocation} disabled={locating || loading} className="btn-ghost px-0 text-xs">{locating ? t('search.locating') : t('search.use_location')}</button>
      </div>
      {locationError && <Feedback>{locationError}</Feedback>}
    </form>

    <section className="mt-7" aria-labelledby="results-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="results-title" className="text-xl font-bold">{t('search.care_around_you')}</h2>
          <p className="mt-1 text-sm text-[#53665e]" role="status">{loading ? t('search.searching') : searchError ? '' : dirty ? t('search.filters_changed') : t('search.results_summary', { count: doctors.length, radius: searched.radius })}</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-[#dce3df] bg-white p-1 lg:hidden" aria-label={t('search.result_view')}>
          {['list', 'map'].map(view => <button key={view} type="button" aria-pressed={mobileView === view} onClick={() => setMobileView(view)} className={`btn-ghost px-5 ${mobileView === view ? 'bg-[#edf4f0]' : ''}`}>{t(`search.${view}`)}</button>)}
        </div>
      </div>
      {searchError && !loading && <div className="mb-4"><Feedback>{searchError}<button className="btn-secondary mt-3 block" onClick={() => void runSearch(location, specialty, radius)}>{t('common.retry')}</button></Feedback></div>}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className={`${mobileView === 'list' ? 'block' : 'hidden'} min-w-0 lg:block`} aria-busy={loading}>
          {loading ? <div className="panel"><LoadingState label={t('search.searching')} /></div> : searchError ? null : doctors.length ? <div className="space-y-3">{doctors.map(doctor => <DoctorCard key={doctor.id} doctor={doctor} onClick={setSelectedDoctor} />)}</div> : <div className="panel empty-state">
            <span aria-hidden="true" className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-[#edf4f0] text-xl text-[#23634e]">⌕</span>
            <h3 className="font-bold">{t('search.no_results')}</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#53665e]">{t('search.no_results_hint')}</p>
            <button className="btn-secondary mt-5" onClick={() => { setSpecialty(''); setRadius(50); void runSearch(location, '', 50); }}>{t('search.expand')}</button>
          </div>}
        </div>
        <div className={`${mobileView === 'map' ? 'block' : 'hidden'} panel overflow-hidden lg:sticky lg:top-24 lg:block`}>
          <div className="h-[360px] sm:h-[460px] lg:h-[520px]" aria-label={t('search.map')}><MapView lat={location.lat} lng={location.lng} doctors={searchError || loading ? [] : doctors} onDoctorClick={setSelectedDoctor} onMapClick={(lat, lng) => setLocation({ lat, lng, address: t('search.selected_on_map') })} /></div>
          <p className="border-t border-[#dce3df] px-4 py-3 text-xs leading-5 text-[#53665e]">{t('search.click_map')}</p>
        </div>
      </div>
    </section>
    <Modal open={!!selectedDoctor} onOpenChange={open => { if (!open) setSelectedDoctor(null); }} title={t('doc.view_profile')} description={t('search.contact_guidance')}>
      {selectedDoctor && <DoctorCard doctor={selectedDoctor} isDetailView />}
    </Modal>
  </div>;
};
