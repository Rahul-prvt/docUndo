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
  const request = useRef<AbortController | null>(null);
  const initialReading = useRef<Promise<Coordinates> | null>(null);

  const updateFilters = useCallback((patch: Partial<Filters>) => {
    filtersRef.current = { ...filtersRef.current, ...patch };
    filtersRef.current.specialty = filtersRef.current.specialty.trim().replace(/\s+/g, ' ');
    setFilters(filtersRef.current);
  }, []);

  const performSearch = useCallback(async (options: { initial?: boolean; refresh?: boolean } = {}) => {
    // While GPS resolves, it will apply the latest draft filters. Once HTTP is
    // in flight, an AI filter can supersede it without requesting GPS again.
    if (busyRef.current && !(options.refresh === false && request.current)) return;
    request.current?.abort();
    request.current = null;
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
          ? (initialReading.current ??= getCurrentUserLocation({ initial: true }))
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
      request.current = new AbortController();
      const response = await searchApi.search(next.lat, next.lng, appliedFilters.specialty || undefined, appliedFilters.radius, request.current.signal);
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
    } finally {
      if (id === operation.current) { busyRef.current = false; request.current = null; }
    }
  }, []);

  useEffect(() => {
    void performSearch({ initial: true });
    return () => { operation.current++; busyRef.current = false; request.current?.abort(); request.current = null; };
  }, [performSearch]);

  const changeMode = useCallback((next: 'device' | 'manual') => {
    operation.current++;
    request.current?.abort();
    request.current = null;
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
    request.current?.abort();
    request.current = null;
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
