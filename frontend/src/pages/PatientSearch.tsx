import React, { useEffect, useState } from 'react';
import { MapView } from '../components/MapView';
import { DoctorCard } from '../components/DoctorCard';
import { Feedback, LoadingState, Modal } from '../components/ui';
import { useDoctorSearch } from '../lib/useDoctorSearch';
import { useTranslation } from '../lib/i18n';
import { PlaceAutocomplete } from '../components/PlaceAutocomplete';

const specialties = ['General Practitioner', 'Cardiologist', 'Dermatologist', 'Pediatrician', 'Orthopedist', 'Neurologist', 'Gynecologist', 'Psychiatrist', 'ENT Specialist', 'Ophthalmologist', 'Gastroenterologist'];
interface PatientSearchProps { externalSpecialty?: string; onSpecialtyConsumed?: () => void }

export const PatientSearch: React.FC<PatientSearchProps> = ({ externalSpecialty, onSpecialtyConsumed }) => {
  const { t } = useTranslation();
  const { filters, updateFilters, mode, changeMode, place, selectPlace, results,
    phase, locationFailure, dirty, busy, performSearch } = useDoctorSearch();
  const { specialty, radius } = filters;
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [mobileView, setMobileView] = useState('list');
  const doctors = results?.doctors || [];
  const statusLabel = phase === 'locating' ? t('search.locating') : t('search.searching');
  const placeLabel = place?.source === 'device' ? t('search.current_location') : place?.address;

  useEffect(() => {
    if (!externalSpecialty) return;
    updateFilters({ specialty: externalSpecialty });
    // Applying an AI filter reuses a resolved location, never prompts for GPS.
    void performSearch({ refresh: false });
    onSpecialtyConsumed?.();
  }, [externalSpecialty, onSpecialtyConsumed, performSearch, updateFilters]);

  useEffect(() => { setSelectedDoctor(null); }, [results]);

  return <div className="page-container">
    <section className="mb-7">
      <p className="eyebrow mb-2 text-[#23634e]">{t('search.hero_eyebrow')}</p>
      <h1 className="page-title">{t('search.hero_title')}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#53665e]">{t('search.hero_subtitle')}</p>
    </section>

    <form aria-label={t('search.btn')} onSubmit={e => { e.preventDefault(); void performSearch(); }} className="panel p-4 sm:p-5">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.4fr_1.1fr_.7fr_auto] lg:items-start">
        <div className="min-w-0">
          <label htmlFor="location-source" className="field-label">{t('search.near_you')}</label>
          <select id="location-source" className="field" value={mode} onChange={e => changeMode(e.target.value as 'device' | 'manual')}>
            <option value="device">{t('search.device_location')}</option>
            <option value="manual">{t('search.manual_location')}</option>
          </select>
          {mode === 'manual' && <div className="mt-3"><PlaceAutocomplete id="patient-location" label={t('search.choose_area')} initialValue={place?.address || ''} onPlaceSelected={selectPlace} /></div>}
        </div>
        <div>
          <label htmlFor="specialty" className="field-label">{t('auth.specialty')}</label>
          <select id="specialty" value={specialty} onChange={e => updateFilters({ specialty: e.target.value })} className="field">
            <option value="">{t('search.any_specialty')}</option>
            {[...new Set([...specialties, ...(specialty ? [specialty] : [])])].map(item => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="radius" className="field-label">{t('search.within_km', { radius })}</label>
          <input id="radius" type="range" min={1} max={50} value={radius} aria-valuetext={`${radius} km`} onChange={e => updateFilters({ radius: +e.target.value })} className="w-full accent-[#23634e]" />
        </div>
        <button type="submit" disabled={busy} className="btn-primary lg:mt-[26px]">{busy ? statusLabel : t('search.btn')} <span aria-hidden="true">→</span></button>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 border-t border-[#e5ebe7] pt-2">
        <p className="min-w-0 break-words text-xs text-[#53665e]">{placeLabel ? `${t('search.location_label')}: ${placeLabel}` : mode === 'device' ? t('search.refresh_hint') : t('search.manual_hint')}</p>

      </div>
      {locationFailure && <Feedback>{t(`search.location_${locationFailure}`)} {t('search.manual_hint')}</Feedback>}
    </form>

    <section className="mt-7" aria-labelledby="results-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="results-title" className="text-xl font-bold">{results?.place.source === 'device' ? t('search.near_device') : results ? t('search.near_place', { place: results.place.address }) : t('search.care_around_you')}</h2>
          <p className="mt-1 text-sm text-[#53665e]" role="status">{busy ? statusLabel : phase === 'search-error' ? '' : locationFailure && results ? t('search.previous_results') : dirty ? t('search.filters_changed') : results ? t('search.results_summary', { count: doctors.length, radius: results.filters.radius }) : t('search.waiting_location')}</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-[#dce3df] bg-white p-1 lg:hidden" aria-label={t('search.result_view')}>
          {['list', 'map'].map(view => <button key={view} type="button" aria-pressed={mobileView === view} onClick={() => setMobileView(view)} className={`btn-ghost px-5 ${mobileView === view ? 'bg-[#edf4f0]' : ''}`}>{t(`search.${view}`)}</button>)}
        </div>
      </div>
      {phase === 'search-error' && <div className="mb-4"><Feedback>{t('search.failed')}<button className="btn-secondary mt-3 block" onClick={() => void performSearch()}>{t('common.retry')}</button></Feedback></div>}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className={`${mobileView === 'list' ? 'block' : 'hidden'} min-w-0 lg:block`} aria-busy={busy}>
          {busy ? <div className="panel"><LoadingState label={statusLabel} /></div> : phase === 'search-error' ? null : !results ? <div className="panel empty-state"><h3 className="font-bold">{t('search.waiting_location')}</h3><p className="mt-2 text-sm text-[#53665e]">{mode === 'manual' ? t('search.manual_hint') : t('search.refresh_hint')}</p></div> : doctors.length ? <div className="space-y-3">{doctors.map(doctor => <DoctorCard key={doctor.id} doctor={doctor} onClick={setSelectedDoctor} />)}</div> : <div className="panel empty-state">
            <span aria-hidden="true" className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-[#edf4f0] text-xl text-[#23634e]">⌕</span>
            <h3 className="font-bold">{t('search.no_results')}</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#53665e]">{t('search.no_results_hint')}</p>
            <button className="btn-secondary mt-5" onClick={() => { updateFilters({ specialty: '', radius: 50 }); void performSearch(); }}>{t('search.expand')}</button>
          </div>}
        </div>
        <div className={`${mobileView === 'map' ? 'block' : 'hidden'} panel overflow-hidden lg:sticky lg:top-24 lg:block`}>
          <div className="h-[360px] sm:h-[460px] lg:h-[520px]" aria-label={t('search.map')}>
            {results ? <MapView lat={results.place.lat} lng={results.place.lng} doctors={doctors} onDoctorClick={setSelectedDoctor} onMapClick={(lat, lng) => selectPlace({ lat, lng, address: t('search.selected_on_map') })} locationLabel={results.place.source === 'device' ? t('search.current_location') : results.place.address} /> : <div className="grid h-full place-items-center bg-[#eef3f0] p-6 text-center text-sm text-[#53665e]">{busy ? statusLabel : t('search.waiting_location')}</div>}
          </div>
          <p className="border-t border-[#dce3df] px-4 py-3 text-xs leading-5 text-[#53665e]">{t('search.click_map')}</p>
        </div>
      </div>
    </section>
    <Modal open={!!selectedDoctor} onOpenChange={open => { if (!open) setSelectedDoctor(null); }} title={t('doc.view_profile')} description={t('search.contact_guidance')}>
      {selectedDoctor && <DoctorCard doctor={selectedDoctor} isDetailView />}
    </Modal>
  </div>;
};
