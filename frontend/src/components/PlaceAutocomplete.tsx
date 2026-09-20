import React from 'react';
import { useApiLoadingStatus, useMapsLibrary } from '@vis.gl/react-google-maps';

interface PlaceAutocompleteProps {
  id: string;
  label: string;
  hint?: string;
  initialValue?: string;
  onPlaceSelected: (place: { address: string; lat: number; lng: number; name?: string }) => void;
}

export const PlaceAutocomplete: React.FC<PlaceAutocompleteProps> = ({ id, label, hint, initialValue, onPlaceSelected }) => {
  const places = useMapsLibrary('places');
  const status = useApiLoadingStatus();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const autocompleteRef = React.useRef<google.maps.places.PlaceAutocompleteElement>();
  const callbackRef = React.useRef(onPlaceSelected);
  const [error, setError] = React.useState('');
  const [selecting, setSelecting] = React.useState(false);
  callbackRef.current = onPlaceSelected;

  React.useEffect(() => {
    if (!places || !containerRef.current) return;
    let active = true;
    let selection = 0;
    const autocomplete = new places.PlaceAutocompleteElement({ includedRegionCodes: ['in'] });
    autocomplete.id = id;
    autocomplete.setAttribute('aria-label', label || 'Search location');
    if (hint) autocomplete.setAttribute('aria-describedby', `${id}-hint`);
    autocomplete.placeholder = 'Search for an address or landmark';
    autocompleteRef.current = autocomplete;
    const handleError = () => { if (active) { setSelecting(false); setError('Location search is unavailable. Try again or choose a point on the map.'); } };
    const handleSelect = async (event: google.maps.places.PlacePredictionSelectEvent) => {
      const currentSelection = ++selection;
      setSelecting(true);
      setError('');
      try {
        const place = event.placePrediction.toPlace();
        await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
        if (!active || currentSelection !== selection) return;
        if (!place.location || !place.formattedAddress) { handleError(); return; }
        callbackRef.current({ address: place.formattedAddress, lat: place.location.lat(), lng: place.location.lng(), name: place.displayName || undefined });
      } catch { if (currentSelection === selection) handleError(); }
      finally { if (active && currentSelection === selection) setSelecting(false); }
    };
    autocomplete.addEventListener('gmp-select', handleSelect);
    autocomplete.addEventListener('gmp-error', handleError);
    containerRef.current.replaceChildren(autocomplete);
    return () => { active = false; autocomplete.removeEventListener('gmp-select', handleSelect); autocomplete.removeEventListener('gmp-error', handleError); autocomplete.remove(); };
  }, [id, label, hint, places]);

  React.useEffect(() => { if (autocompleteRef.current) autocompleteRef.current.value = initialValue || ''; }, [initialValue, places, label, hint]);
  return <div className="min-w-0">
    <label className="field-label" htmlFor={id}>{label}</label>
    {!places && <div role="status" className="field text-[#53665e]">{import.meta.env.VITE_GOOGLE_MAPS_API_KEY && status !== 'FAILED' && status !== 'AUTH_FAILURE' ? 'Loading location search…' : 'Location search unavailable'}</div>}
    <div ref={containerRef} className="google-place-autocomplete" />
    {hint && <p id={`${id}-hint`} className="mt-2 text-xs leading-5 text-[#53665e]">{hint}</p>}
    {selecting && <p role="status" className="mt-2 text-xs">Confirming location…</p>}
    {error && <p role="alert" className="mt-2 text-xs leading-5 text-red-700">{error}</p>}
  </div>;
};
