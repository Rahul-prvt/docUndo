import React from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

interface PlaceAutocompleteProps {
  id: string;
  label: string;
  hint?: string;
  initialValue?: string;
  onPlaceSelected: (place: { address: string; lat: number; lng: number; name?: string }) => void;
}

export const PlaceAutocomplete: React.FC<PlaceAutocompleteProps> = ({ id, label, hint, initialValue, onPlaceSelected }) => {
  const places = useMapsLibrary("places");
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!places || !containerRef.current) return;
    const autocomplete = new places.PlaceAutocompleteElement({ includedRegionCodes: ["in"] });
    autocomplete.id = id;
    autocomplete.placeholder = "Search for a clinic, address, or landmark";
    autocomplete.value = initialValue || "";
    const handleSelect = async (event: Event) => {
      const prediction = (event as CustomEvent<{ placePrediction: google.maps.places.PlacePrediction }>).detail.placePrediction;
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });
      if (!place.location || !place.formattedAddress) return;
      onPlaceSelected({ address: place.formattedAddress, lat: place.location.lat(), lng: place.location.lng(), name: place.displayName || undefined });
    };
    autocomplete.addEventListener("gmp-select", handleSelect);
    containerRef.current.replaceChildren(autocomplete);
    return () => autocomplete.removeEventListener("gmp-select", handleSelect);
  }, [id, initialValue, onPlaceSelected, places]);

  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) return null;
  return <div><label className="field-label" htmlFor={id}>{label}</label><div ref={containerRef} className="google-place-autocomplete mt-1" />{hint && <p className="mt-1 text-xs text-[#a8b3ac]">{hint}</p>}</div>;
};
