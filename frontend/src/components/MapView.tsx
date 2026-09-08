import React from "react";
import { InfoWindow, Map, Marker } from "@vis.gl/react-google-maps";

interface MapViewProps {
  lat: number;
  lng: number;
  doctors: any[];
  onDoctorClick?: (doctor: any) => void;
  onMapClick?: (lat: number, lng: number) => void;
}

const isValidCoordinate = (lat?: number, lng?: number) =>
  typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng);

export const MapView: React.FC<MapViewProps> = ({ lat, lng, doctors, onDoctorClick, onMapClick }) => {
  const [selectedDoctor, setSelectedDoctor] = React.useState<any>(null);
  const safeLat = isValidCoordinate(lat, lng) ? lat : 10.786;
  const safeLng = isValidCoordinate(lat, lng) ? lng : 76.6444;
  const doctorsWithClinics = doctors.filter((doctor) => isValidCoordinate(doctor.clinic?.lat, doctor.clinic?.lng));

  React.useEffect(() => setSelectedDoctor(null), [safeLat, safeLng]);

  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return <div className="grid h-full min-h-[260px] place-items-center bg-[#e8ece6] p-6 text-center text-sm text-[#53615c]">Google Maps is not configured.</div>;
  }

  return (
    <Map
      center={{ lat: safeLat, lng: safeLng }}
      defaultZoom={13}
      gestureHandling="greedy"
      onClick={(event) => {
        const position = (event as unknown as { detail: { latLng: google.maps.LatLngLiteral | null } }).detail.latLng;
        if (position) onMapClick?.(position.lat, position.lng);
      }}
      style={{ height: "100%", width: "100%", borderRadius: "inherit" }}
    >
      <Marker position={{ lat: safeLat, lng: safeLng }} title="Your location" label="You" />
      {doctorsWithClinics.map((doctor) => (
        <Marker
          key={doctor.id}
          position={{ lat: doctor.clinic.lat, lng: doctor.clinic.lng }}
          title={`${doctor.name} — ${doctor.specialty}`}
          onClick={() => { setSelectedDoctor(doctor); onDoctorClick?.(doctor); }}
        />
      ))}
      {selectedDoctor?.clinic && (
        <InfoWindow position={{ lat: selectedDoctor.clinic.lat, lng: selectedDoctor.clinic.lng }} onCloseClick={() => setSelectedDoctor(null)}>
          <div className="max-w-[220px] p-1 font-sans text-[#12201e]">
            <strong className="block text-sm">{selectedDoctor.name}</strong>
            <span className="mt-0.5 block text-xs text-[#23634e]">{selectedDoctor.specialty}</span>
            {selectedDoctor.clinic.address && <p className="mb-0 mt-2 text-xs text-[#60706a]">{selectedDoctor.clinic.address}</p>}
            <button type="button" onClick={() => onDoctorClick?.(selectedDoctor)} className="mt-3 rounded-md bg-[#12201e] px-2.5 py-1.5 text-xs font-bold text-white">View profile</button>
          </div>
        </InfoWindow>
      )}
    </Map>
  );
};
