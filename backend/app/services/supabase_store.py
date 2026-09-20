"""Supabase-backed persistence helpers for doctors, clinics, and availability."""

import logging
import math
from threading import Lock

from typing import Any, Optional

from app.config import settings
from app.db import get_supabase_client

logger = logging.getLogger(__name__)

SEARCH_FIELDS = (
    "id,name,specialty,consult_fee,license_verified,"
    "clinics!inner(id,doctor_id,name,address,lat,lng,opening_hours,phone),"
    "availability(available)"
)


def search_bounds(lat: float, lng: float, radius_km: float) -> tuple[float, float, float | None, float | None]:
    """Conservative spherical bounds, including poles and the antimeridian."""
    angle = radius_km / 6371.0
    latitude = math.radians(lat)
    south, north = max(-90.0, lat - math.degrees(angle)), min(90.0, lat + math.degrees(angle))
    if south <= -90 or north >= 90:
        return south, north, None, None
    delta = math.degrees(math.asin(min(1.0, math.sin(angle) / math.cos(latitude))))
    return south, north, (lng - delta + 180) % 360 - 180, (lng + delta + 180) % 360 - 180


def normalize_specialty(value: Optional[str]) -> Optional[str]:
    return " ".join((value or "").split()) or None


def _first_related(value: Any) -> Optional[dict[str, Any]]:
    if isinstance(value, list):
        return value[0] if value else None
    if isinstance(value, dict):
        return value
    return None


class SupabaseStore:
    def __init__(self) -> None:
        self._client: Any | None = None
        self._client_lock = Lock()

    def is_configured(self) -> bool:
        return bool(settings.supabase_url and settings.supabase_service_role)

    @property
    def client(self) -> Any:
        if not self.is_configured():
            raise RuntimeError("Supabase is not configured")
        if self._client is None:
            with self._client_lock:
                if self._client is None:
                    logger.info("Creating Supabase client")
                    self._client = get_supabase_client()
        return self._client

    def create_doctor(self, payload: dict[str, Any]) -> dict[str, Any]:
        logger.info("Supabase create doctor specialty=%s", payload.get("specialty"))
        response = self.client.table("doctors").insert(payload).execute()
        if response.data:
            return response.data[0]
        raise RuntimeError("Failed to create doctor")

    def get_doctor_by_email(self, email: str) -> Optional[dict[str, Any]]:
        logger.debug("Supabase lookup doctor by email")
        response = self.client.table("doctors").select("*").eq("email", email).execute()
        if response.data:
            return response.data[0]
        return None

    def get_doctor_by_id(self, doctor_id: str) -> Optional[dict[str, Any]]:
        logger.debug("Supabase lookup doctor doctor_id=%s", doctor_id)
        response = self.client.table("doctors").select("*").eq("id", doctor_id).execute()
        if response.data:
            return response.data[0]
        return None

    def update_doctor(self, doctor_id: str, payload: dict[str, Any]) -> Optional[dict[str, Any]]:
        logger.info("Supabase update doctor doctor_id=%s fields=%s", doctor_id, sorted(payload.keys()))
        response = self.client.table("doctors").update(payload).eq("id", doctor_id).execute()
        if response.data:
            return response.data[0]
        return None

    def get_clinic_by_doctor_id(self, doctor_id: str) -> Optional[dict[str, Any]]:
        response = self.client.table("clinics").select("*").eq("doctor_id", doctor_id).execute()
        if response.data:
            return response.data[0]
        return None

    def get_availability_by_doctor_id(self, doctor_id: str) -> Optional[dict[str, Any]]:
        response = self.client.table("availability").select("*").eq("doctor_id", doctor_id).execute()
        return response.data[0] if response.data else None

    def upsert_clinic(self, doctor_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        logger.info("Supabase upsert clinic doctor_id=%s", doctor_id)
        existing = self.client.table("clinics").select("*").eq("doctor_id", doctor_id).execute()
        if existing.data:
            response = self.client.table("clinics").update(payload).eq("doctor_id", doctor_id).execute()
            return response.data[0] if response.data else payload
        response = self.client.table("clinics").insert({"doctor_id": doctor_id, **payload}).execute()
        return response.data[0] if response.data else payload

    def upsert_clinic_stub(self, doctor_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Insert a clinic with only name/hours (no coordinates) — used at signup."""
        logger.info("Supabase upsert clinic stub doctor_id=%s", doctor_id)
        existing = self.client.table("clinics").select("*").eq("doctor_id", doctor_id).execute()
        if existing.data:
            # Only update non-coordinate fields so we don't overwrite a placed pin
            safe_payload = {k: v for k, v in payload.items() if k not in ("lat", "lng", "address")}
            response = self.client.table("clinics").update(safe_payload).eq("doctor_id", doctor_id).execute()
            return response.data[0] if response.data else payload
        # Insert without lat/lng — they'll be filled when the doctor places the pin
        response = self.client.table("clinics").insert({"doctor_id": doctor_id, **payload}).execute()
        return response.data[0] if response.data else payload

    def upsert_availability(self, doctor_id: str, available: bool) -> dict[str, Any]:
        logger.info("Supabase upsert availability doctor_id=%s available=%s", doctor_id, available)
        existing = self.client.table("availability").select("*").eq("doctor_id", doctor_id).execute()
        if existing.data:
            response = self.client.table("availability").update({"available": available}).eq("doctor_id", doctor_id).execute()
            return response.data[0] if response.data else {"doctor_id": doctor_id, "available": available}
        response = self.client.table("availability").insert({"doctor_id": doctor_id, "available": available}).execute()
        return response.data[0] if response.data else {"doctor_id": doctor_id, "available": available}

    def search_doctors(self, lat: float, lng: float, specialty: Optional[str] = None, radius_km: float = 10.0) -> list[dict[str, Any]]:
        logger.info("Supabase search doctors specialty=%s radius_km=%s", specialty or "all", radius_km)
        specialty = normalize_specialty(specialty)
        south, north, west, east = search_bounds(lat, lng, radius_km)
        # Keep pages below Supabase's default 1000-row cap. Filter candidates in
        # the database before accurate distance/ranking; never limit final matches
        # before computing distance. No availability constraint: offline is active.
        candidates = []
        page_size = 200
        offset = 0
        while True:
            query = (self.client.table("doctors").select(SEARCH_FIELDS)
                     .eq("license_verified", True)
                     .gte("clinics.lat", south).lte("clinics.lat", north)
                     .order("id").range(offset, offset + page_size - 1))
            if west is not None and east is not None:
                if west > east:
                    query = query.or_(f"lng.gte.{west},lng.lte.{east}", reference_table="clinics")
                else:
                    query = query.gte("clinics.lng", west).lte("clinics.lng", east)
            if specialty:
                # Preserve case-insensitive partial matching, treating SQL wildcards
                # as literal input. The product uses a specialty selector, not SQL.
                literal = specialty.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
                query = query.ilike("specialty", f"%{literal}%")
            rows = query.execute().data or []
            candidates.extend(rows)
            if len(rows) < page_size:
                break
            offset += len(rows)
        results: list[dict[str, Any]] = []
        for doctor in candidates:
            availability = _first_related(doctor.get("availability"))
            if not doctor.get("license_verified", False):
                continue
            clinics = doctor.get("clinics") or []
            if isinstance(clinics, dict):
                clinics = [clinics]
            located = []
            for clinic in clinics:
                if clinic.get("lat") is None or clinic.get("lng") is None:
                    continue
                distance = self._haversine_distance(lat, lng, clinic["lat"], clinic["lng"])
                if distance <= radius_km:
                    located.append((distance, str(clinic["id"]), clinic))
            if not located:
                continue
            distance_km, _, clinic = min(located, key=lambda item: (item[0], item[1]))
            results.append({
                "id": doctor["id"],
                "name": doctor["name"],
                "specialty": doctor["specialty"],
                "consult_fee": doctor.get("consult_fee"),
                "available": bool(availability and availability.get("available", False)),
                "distance_km": distance_km,
                "clinic": clinic,
            })

        # Nearby search prioritizes distance; live status breaks distance ties.
        # A final ID tie-breaker keeps cards stable across identical refreshes.
        results.sort(key=lambda item: (item["distance_km"], not item["available"], str(item["id"])))
        for item in results:
            item["distance_km"] = round(item["distance_km"], 2)
        logger.info("Supabase search doctors completed result_count=%s", len(results))
        return results

    def list_unverified_doctors(self) -> list[dict[str, Any]]:
        """Return all doctors whose license has not yet been verified."""
        logger.info("Supabase list unverified doctors")
        response = (
            self.client.table("doctors")
            .select("id, name, specialty, license_no, email, created_at")
            .eq("license_verified", False)
            .order("created_at", desc=False)
            .execute()
        )
        return response.data or []

    def set_license_verified(self, doctor_id: str, verified: bool, admin_notes: Optional[str] = None) -> Optional[dict[str, Any]]:
        """Set license_verified flag (and optionally store admin notes) for a doctor."""
        logger.info("Supabase set license_verified doctor_id=%s verified=%s", doctor_id, verified)
        payload: dict[str, Any] = {"license_verified": verified}
        if admin_notes is not None:
            payload["admin_notes"] = admin_notes
        response = (
            self.client.table("doctors")
            .update(payload)
            .eq("id", doctor_id)
            .execute()
        )
        return response.data[0] if response.data else None

    def _haversine_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        radius = 6371.0
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lng = math.radians(lng2 - lng1)
        a = (
            math.sin(delta_lat / 2) ** 2
            + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
        )
        a = min(1.0, max(0.0, a))
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return radius * c


supabase_store = SupabaseStore()
