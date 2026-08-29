"""Search routers"""
import logging

from fastapi import APIRouter, Query, HTTPException
from typing import List
from app.models.schemas import SearchResult
from app.services.supabase_store import supabase_store


router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/search", response_model=List[SearchResult])
async def search_doctors(
    lat: float = Query(..., description="Patient latitude"),
    lng: float = Query(..., description="Patient longitude"),
    specialty: str = Query(None, description="Optional specialty filter"),
    radius_km: float = Query(10.0, ge=1, le=100, description="Search radius in km"),
):
    """
    Search for available doctors by location and specialty.
    Uses Supabase as the only persistence layer.
    """
    if lat is None or lng is None:
        raise HTTPException(status_code=400, detail="Latitude and longitude are required")

    if not supabase_store.is_configured():
        logger.error("Search rejected: Supabase is not configured")
        raise HTTPException(status_code=503, detail="Supabase is not configured")

    logger.info("Doctor search requested specialty=%s radius_km=%s", specialty or "all", radius_km)
    remote_results = supabase_store.search_doctors(lat, lng, specialty, radius_km)
    logger.info("Doctor search completed result_count=%s", len(remote_results))
    return [
        SearchResult(
            id=str(item["id"]),
            name=item["name"],
            specialty=item["specialty"],
            consult_fee=item.get("consult_fee"),
            available=item["available"],
            distance_km=item["distance_km"],
            clinic=item.get("clinic"),
        )
        for item in remote_results
    ]
