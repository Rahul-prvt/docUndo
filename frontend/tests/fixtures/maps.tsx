import React, { useState } from 'react';

// Replace the external SDK only. Real MapView and PlaceAutocomplete still render.
export const APIProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const useApiLoadingStatus = () => (window as any).__mapStatus || 'LOADED';
class PlaceAutocompleteElement extends HTMLElement {
  input = document.createElement('input');
  constructor() {
    super();
    this.input.setAttribute('aria-label', 'Test place input');
    const choose = document.createElement('button');
    choose.type = 'button';
    choose.textContent = 'Select Kochi';
    choose.onclick = () => {
      const event = new Event('gmp-select');
      // Regression: Google exposes placePrediction directly, not event.detail.
      Object.assign(event, { placePrediction: { toPlace: () => ({
        fetchFields: async () => {}, displayName: 'Kochi', formattedAddress: 'Kochi, Kerala',
        location: { lat: () => 9.9312, lng: () => 76.2673 },
      }) } });
      this.dispatchEvent(event);
    };
    this.append(this.input, choose);
  }
  set value(value: string) { this.input.value = value; }
  get value() { return this.input.value; }
  set placeholder(value: string) { this.input.placeholder = value; }
}
if (!customElements.get('gmp-place-autocomplete')) customElements.define('gmp-place-autocomplete', PlaceAutocompleteElement);
const places = { PlaceAutocompleteElement };
export const useMapsLibrary = () => places;

export function Map({ center, defaultZoom, onCenterChanged, onClick, children }: any) {
  const [zoom, setZoom] = useState(defaultZoom);
  return <div data-testid="map" data-lat={center.lat} data-lng={center.lng} data-zoom={zoom}>
    <button type="button" onClick={() => onCenterChanged({ detail: { center: { lat: 12, lng: 77 } } })}>Pan map</button>
    <button type="button" onClick={() => setZoom((value: number) => value + 1)}>Zoom in</button>
    <button type="button" onClick={() => onClick({ detail: { latLng: { lat: 11.2588, lng: 75.7804 } } })}>Select Kozhikode on map</button>
    {children}
  </div>;
}
export const Marker = ({ position, title, icon }: any) => <span data-testid={icon ? 'location-marker' : 'doctor-marker'} data-lat={position.lat} data-lng={position.lng}>{title}</span>;
export const InfoWindow = ({ children }: any) => <div>{children}</div>;
