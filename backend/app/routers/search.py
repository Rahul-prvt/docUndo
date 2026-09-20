"""Search routers"""
import logging

from fastapi import APIRouter, Query, HTTPException
from typing import List
from httpx import HTTPError
from postgrest.exceptions import APIError
from app.models.schemas import SearchResult, ClinicLocationResponse
from app.routers.doctors import parse_opening_hours
from app.services.supabase_store import supabase_store, normalize_specialty


router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/search", response_model=List[SearchResult],
            response_model_exclude={"__all__": {"clinic": {"opening_hours_schedule"}}})
def search_doctors(
    lat: float = Query(..., ge=-90, le=90, description="Patient latitude"),
    lng: float = Query(..., ge=-180, le=180, description="Patient longitude"),
    specialty: str = Query(None, max_length=100, description="Optional specialty filter"),
    radius_km: float = Query(10.0, ge=1, le=100, description="Search radius in km"),
):
    """
    Search active doctors, including offline doctors, by location and specialty.
    Run synchronous Supabase I/O in FastAPI's worker pool, not the event loop.
    """
    if lat is None or lng is None:
        raise HTTPException(status_code=400, detail="Latitude and longitude are required")

    if not supabase_store.is_configured():
        logger.error("Search rejected: Supabase is not configured")
        raise HTTPException(status_code=503, detail="Supabase is not configured")

    specialty = normalize_specialty(specialty)
    logger.info("Doctor search requested specialty=%s radius_km=%s", specialty or "all", radius_km)
    try:
        remote_results = supabase_store.search_doctors(lat, lng, specialty, radius_km)
    except (HTTPError, APIError) as error:
        logger.warning("Search store unavailable error_type=%s", type(error).__name__)
        raise HTTPException(status_code=503, detail="Doctor search is temporarily unavailable") from error
    logger.info("Doctor search completed result_count=%s", len(remote_results))
    return [
        SearchResult(
            id=str(item["id"]),
            name=item["name"],
            specialty=item["specialty"],
            consult_fee=item.get("consult_fee"),
            available=item["available"],
            active=True,
            distance_km=item["distance_km"],
            clinic=_clinic_response(item.get("clinic")),
        )
        for item in remote_results
    ]


def _clinic_response(clinic: dict | None) -> ClinicLocationResponse | None:
    if not clinic:
        return None
    display_hours, schedule = parse_opening_hours(clinic.get("opening_hours"))
    return ClinicLocationResponse(
        id=str(clinic["id"]),
        doctor_id=str(clinic["doctor_id"]),
        name=clinic.get("name"),
        address=clinic.get("address"),
        lat=clinic.get("lat"),
        lng=clinic.get("lng"),
        opening_hours=display_hours,
        opening_hours_schedule=schedule,
        phone=clinic.get("phone"),
    )
