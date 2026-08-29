import React from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface MapViewProps {
  lat: number;
  lng: number;
  doctors: any[];
  onDoctorClick?: (doctor: any) => void;
  onMapClick?: (lat: number, lng: number) => void;
}

const isValidCoordinate = (lat?: number, lng?: number) =>
  typeof lat === "number" &&
  typeof lng === "number" &&
  Number.isFinite(lat) &&
  Number.isFinite(lng);

// ── Custom SVG icons ──────────────────────────────────────────────────────────
function makeSvgIcon(svgContent: string, size: [number, number], anchor: [number, number]) {
  return L.divIcon({
    html: svgContent,
    iconSize: size,
    iconAnchor: anchor,
    popupAnchor: [0, -anchor[1]],
    className: "",
  });
}

const userIcon = makeSvgIcon(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 52" width="36" height="52">
    <filter id="shadow" x="-30%" y="-10%" width="160%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#12201e" flood-opacity="0.25"/>
    </filter>
    <g filter="url(#shadow)">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 34 18 34S36 31.5 36 18C36 8.06 27.94 0 18 0z" fill="#12201e"/>
      <circle cx="18" cy="18" r="9" fill="#caff67"/>
    </g>
  </svg>`,
  [36, 52],
  [18, 52]
);

const doctorIcon = makeSvgIcon(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 52" width="36" height="52">
    <filter id="shadow2" x="-30%" y="-10%" width="160%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#23634e" flood-opacity="0.3"/>
    </filter>
    <g filter="url(#shadow2)">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 34 18 34S36 31.5 36 18C36 8.06 27.94 0 18 0z" fill="#23634e"/>
      <text x="18" y="24" text-anchor="middle" font-size="15" font-weight="bold" fill="white" font-family="system-ui">+</text>
    </g>
  </svg>`,
  [36, 52],
  [18, 52]
);

// ── Map re-centre helper ──────────────────────────────────────────────────────
const RecenterMap: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  React.useEffect(() => {
    if (isValidCoordinate(lat, lng)) {
      map.setView([lat, lng], map.getZoom(), { animate: true });
    }
  }, [lat, lng, map]);
  return null;
};

// ── Doctor popup card ─────────────────────────────────────────────────────────
const DoctorPopup: React.FC<{ doctor: any; onViewProfile?: (d: any) => void }> = ({
  doctor,
  onViewProfile,
}) => {
  const initial = (doctor?.name || "D").replace("Dr. ", "").charAt(0).toUpperCase();
  const phone = doctor?.clinic?.phone;
  return (
    <div style={{ width: 210, fontFamily: "system-ui, sans-serif" }}>
      {/* header */}
      <div
        style={{
          background: "linear-gradient(135deg,#12201e 0%,#1f3830 100%)",
          borderRadius: "10px 10px 0 0",
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: "#caff67",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 18,
            color: "#12201e",
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: "#fff",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {doctor?.name || "Doctor"}
          </div>
          <div style={{ fontSize: 11, color: "#8fcbb8", marginTop: 1 }}>
            {doctor?.specialty || "General Care"}
          </div>
        </div>
        {/* available badge */}
        <div
          style={{
            marginLeft: "auto",
            background: "#caff67",
            borderRadius: 20,
            padding: "2px 7px",
            fontSize: 9,
            fontWeight: 800,
            color: "#12201e",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            flexShrink: 0,
          }}
        >
          Available
        </div>
      </div>

      {/* body */}
      <div
        style={{
          background: "#fffefa",
          padding: "10px 14px",
          borderRadius: "0 0 10px 10px",
          border: "1px solid #dce0d9",
          borderTop: "none",
        }}
      >
        {/* distance + fee row */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 7 }}>
          <span style={{ color: "#60706a" }}>
            📍 {doctor?.distance_km != null ? `${doctor.distance_km.toFixed(1)} km away` : "Nearby"}
          </span>
          {doctor?.consult_fee != null && (
            <span style={{ fontWeight: 700, color: "#23634e" }}>₹{doctor.consult_fee}</span>
          )}
        </div>

        {/* address */}
        {doctor?.clinic?.address && (
          <div
            style={{
              fontSize: 11,
              color: "#718079",
              marginBottom: 9,
              lineHeight: 1.4,
              borderTop: "1px solid #e6e8e1",
              paddingTop: 7,
            }}
          >
            {doctor.clinic.address}
          </div>
        )}

        {/* opening hours */}
        {doctor?.clinic?.opening_hours && (
          <div style={{ fontSize: 11, color: "#718079", marginBottom: 9 }}>
            🕐 {doctor.clinic.opening_hours}
          </div>
        )}

        {/* action buttons */}
        <div style={{ display: "flex", gap: 6 }}>
          {phone && (
            <a
              href={`https://wa.me/${phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                background: "#25d366",
                color: "#fff",
                borderRadius: 7,
                padding: "5px 0",
                textAlign: "center",
                fontSize: 11,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              WhatsApp
            </a>
          )}
          {onViewProfile && (
            <button
              onClick={() => onViewProfile(doctor)}
              style={{
                flex: 1,
                background: "#12201e",
                color: "#fff",
                borderRadius: 7,
                padding: "5px 0",
                fontSize: 11,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
              }}
            >
              View profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Map click handler ─────────────────────────────────────────────────────────
const MapEventHandler: React.FC<{ onMapClick?: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// ── Main MapView ──────────────────────────────────────────────────────────────
export const MapView: React.FC<MapViewProps> = ({ lat, lng, doctors, onDoctorClick, onMapClick }) => {
  const safeLat = isValidCoordinate(lat, lng) ? lat : 10.786;
  const safeLng = isValidCoordinate(lat, lng) ? lng : 76.6444;
  const doctorsWithClinics = doctors.filter((d) =>
    isValidCoordinate(d.clinic?.lat, d.clinic?.lng)
  );

  return (
    <MapContainer
      center={[safeLat, safeLng]}
      zoom={13}
      style={{ height: "100%", width: "100%", borderRadius: "inherit" }}
      scrollWheelZoom={false}
    >
      <RecenterMap lat={safeLat} lng={safeLng} />
      <MapEventHandler onMapClick={onMapClick} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* User location marker */}
      <Marker position={[safeLat, safeLng]} icon={userIcon}>
        <Popup>
          <div
            style={{
              textAlign: "center",
              fontFamily: "system-ui,sans-serif",
              padding: "4px 6px",
            }}
          >
            <strong style={{ fontSize: 13 }}>Your Location</strong>
            <p style={{ fontSize: 11, color: "#718079", margin: "3px 0 0" }}>
              Where you are now
            </p>
          </div>
        </Popup>
      </Marker>

      {/* Doctor markers */}
      {doctorsWithClinics.map((doctor) => (
        <Marker
          key={doctor.id}
          position={[doctor.clinic.lat, doctor.clinic.lng]}
          icon={doctorIcon}
          eventHandlers={{ click: () => onDoctorClick?.(doctor) }}
        >
          <Popup minWidth={210} maxWidth={220}>
            <DoctorPopup doctor={doctor} onViewProfile={onDoctorClick} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};
