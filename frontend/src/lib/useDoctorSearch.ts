import { useCallback, useEffect, useRef, useState } from 'react';
import { searchApi } from './api';
import { Coordinates, getCurrentUserLocation, LocationError, LocationFailure } from './location';

export interface SearchPlace extends Coordinates { address: string; source: 'device' | 'manual' }
type Filters = { specialty: string; radius: number };
type Phase = 'locating' | 'searching' | 'ready' | 'needs-location' | 'search-error';
interface Results { place: SearchPlace; filters: Filters; doctors: any[] }

export function useDoctorSearch() {
  const [filters, setFilters] = useState<Filters>({ specialty: '', radius: 10 });
  const [mode, setMode] = useState<'device' | 'manual'>('device');
  const [place, setPlace] = useState<SearchPlace | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [phase, setPhase] = useState<Phase>('locating');
  const [locationFailure, setLocationFailure] = useState<LocationFailure | null>(null);
  const filtersRef = useRef(filters);
  const modeRef = useRef(mode);
  const placeRef = useRef(place);
  const operation = useRef(0);
  const busyRef = useRef(false);
  const initialReading = useRef<Promise<Coordinates> | null>(null);

  const updateFilters = useCallback((patch: Partial<Filters>) => {
    filtersRef.current = { ...filtersRef.current, ...patch };
    setFilters(filtersRef.current);
  }, []);

  const performSearch = useCallback(async (options: { initial?: boolean; refresh?: boolean } = {}) => {
    if (busyRef.current) return;
    busyRef.current = true;
    const id = ++operation.current;
    setLocationFailure(null);
    let next = placeRef.current;
    try {
      if (modeRef.current === 'device' && options.refresh !== false) {
        setPhase('locating');
        // StrictMode replays mount effects. Both effect runs share the reading;
        // only the current operation is allowed to issue the doctor request.
        const reading = options.initial
          ? (initialReading.current ??= getCurrentUserLocation())
          : getCurrentUserLocation();
        const coordinates = await reading;
        if (id !== operation.current) return;
        next = { ...coordinates, address: '', source: 'device' };
      }
      if (id !== operation.current) return;
      if (!next || next.source !== modeRef.current) { setPhase('needs-location'); return; }
      placeRef.current = next;
      setPlace(next);
      setPhase('searching');
      const appliedFilters = { ...filtersRef.current };
      const response = await searchApi.search(next.lat, next.lng, appliedFilters.specialty || undefined, appliedFilters.radius);
      if (id !== operation.current) return;
      // Commit the location, filters and doctor results as one snapshot.
      setResults({ place: next, filters: appliedFilters, doctors: response.data });
      setPhase('ready');
    } catch (error) {
      if (id !== operation.current) return;
      if (error instanceof LocationError) {
        setLocationFailure(error.reason);
        setPhase('needs-location');
        // No automatic retry or silent fallback to the previous device position.
        modeRef.current = 'manual';
        setMode('manual');
        placeRef.current = null;
        setPlace(null);
      } else setPhase('search-error');
    } finally { if (id === operation.current) busyRef.current = false; }
  }, []);

  useEffect(() => {
    void performSearch({ initial: true });
    return () => { operation.current++; busyRef.current = false; };
  }, [performSearch]);

  const changeMode = useCallback((next: 'device' | 'manual') => {
    operation.current++;
    busyRef.current = false;
    modeRef.current = next;
    setMode(next);
    placeRef.current = null;
    setPlace(null);
    setLocationFailure(null);
    setPhase('needs-location');
  }, []);

  const selectPlace = useCallback((next: Coordinates & { address: string }) => {
    // An intentional manual choice supersedes any pending GPS/API response.
    operation.current++;
    busyRef.current = false;
    modeRef.current = 'manual';
    setMode('manual');
    placeRef.current = { ...next, source: 'manual' };
    setPlace(placeRef.current);
    setLocationFailure(null);
    setPhase('needs-location');
  }, []);

  const dirty = !!results && (place?.lat !== results.place.lat || place?.lng !== results.place.lng ||
    mode !== results.place.source || filters.specialty !== results.filters.specialty || filters.radius !== results.filters.radius);

  return { filters, updateFilters, mode, changeMode, place, selectPlace, results, phase,
    locationFailure, dirty, busy: phase === 'locating' || phase === 'searching', performSearch };
}
