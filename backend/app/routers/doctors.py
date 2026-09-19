"""Doctor profile and clinic routers"""
import json
import logging

from datetime import datetime, timezone
from fastapi import APIRouter, status, Depends, HTTPException
from app.models.schemas import (
    DoctorProfileUpdate,
    ClinicLocationCreate,
    ClinicLocationResponse,
    DoctorWithClinicResponse,
    AvailabilityToggle,
    OpeningHoursDay,
)
from app.deps import get_current_doctor_id
from app.services.supabase_store import supabase_store
from app.services.geocode import geocoding_service


router = APIRouter()
logger = logging.getLogger(__name__)


def require_supabase() -> None:
    """Reject doctor requests when Supabase is not configured."""
    if not supabase_store.is_configured():
        logger.error("Doctor request rejected: Supabase is not configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase is not configured",
        )


def parse_opening_hours(value: str | None) -> tuple[str | None, list[OpeningHoursDay] | None]:
    """Read structured schedules stored in the legacy text column."""
    if not value:
        return value, None
    try:
        raw = json.loads(value)
        schedule = [OpeningHoursDay.model_validate(item) for item in raw]
    except (json.JSONDecodeError, TypeError, ValueError):
        return value, None
    parts = [f"{item.day[:3]} {item.start}–{item.end}" for item in schedule if item.is_open]
    return (", ".join(parts) if parts else "Closed"), schedule


def build_doctor_response(
    doctor: dict,
    clinic: dict | None = None,
    available: bool = False,
) -> DoctorWithClinicResponse:
    clinic_response = None
    if clinic:
        opening_hours, schedule = parse_opening_hours(clinic.get("opening_hours"))
        clinic_response = ClinicLocationResponse(
            id=str(clinic["id"]),
            doctor_id=str(clinic["doctor_id"]),
            name=clinic.get("name"),
            address=clinic.get("address"),
            lat=clinic.get("lat"),
            lng=clinic.get("lng"),
            opening_hours=opening_hours,
            opening_hours_schedule=schedule,
            phone=clinic.get("phone"),
        )
    return DoctorWithClinicResponse(
        id=str(doctor["id"]),
        email=doctor["email"],
        name=doctor["name"],
        specialty=doctor["specialty"],
        license_no=doctor["license_no"],
        license_verified=doctor.get("license_verified", False),
        bio=doctor.get("bio"),
        consult_fee=doctor.get("consult_fee"),
        available_days=doctor.get("available_days") or [],
        languages=doctor.get("languages") or [],
        active=bool(doctor.get("license_verified", False)),
        available=available,
        clinic=clinic_response,
        created_at=doctor.get("created_at") or datetime.now(timezone.utc),
    )



@router.get("/doctors/me", response_model=DoctorWithClinicResponse)
async def get_doctor_profile(doctor_id: str = Depends(get_current_doctor_id)):
    """Get the current doctor's profile from Supabase."""
    require_supabase()
    logger.info("Doctor profile requested doctor_id=%s", doctor_id)
    doctor = supabase_store.get_doctor_by_id(doctor_id)
    if not doctor:
        logger.warning("Doctor profile not found doctor_id=%s", doctor_id)
        raise HTTPException(status_code=404, detail="Doctor not found")

    clinic = supabase_store.get_clinic_by_doctor_id(doctor_id)
    availability = supabase_store.get_availability_by_doctor_id(doctor_id)
    return build_doctor_response(doctor, clinic, bool(availability and availability.get("available")))


@router.put("/doctors/me", response_model=DoctorWithClinicResponse)
async def update_doctor_profile(
    request: DoctorProfileUpdate,
    doctor_id: str = Depends(get_current_doctor_id)
):
    """Update current doctor's profile in Supabase."""
    require_supabase()
    update_payload = request.model_dump(exclude_unset=True)
    logger.info("Doctor profile update requested doctor_id=%s fields=%s", doctor_id, sorted(update_payload.keys()))
    doctor = supabase_store.update_doctor(doctor_id, update_payload)
    if not doctor:
        logger.warning("Doctor profile update not found doctor_id=%s", doctor_id)
        raise HTTPException(status_code=404, detail="Doctor not found")
    clinic = supabase_store.get_clinic_by_doctor_id(doctor_id)
    availability = supabase_store.get_availability_by_doctor_id(doctor_id)
    return build_doctor_response(doctor, clinic, bool(availability and availability.get("available")))


@router.post(
    "/doctors/me/clinic",
    response_model=ClinicLocationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_clinic(
    request: ClinicLocationCreate,
    doctor_id: str = Depends(get_current_doctor_id)
):
    """Add or update clinic location for the current doctor in Supabase."""
    require_supabase()
    logger.info("Clinic upsert requested doctor_id=%s address=%s", doctor_id, request.address)
    doctor = supabase_store.get_doctor_by_id(doctor_id)
    if not doctor:
        logger.warning("Clinic upsert doctor not found doctor_id=%s", doctor_id)
        raise HTTPException(status_code=404, detail="Doctor not found")

    lat, lng = request.lat, request.lng
    if lat is None or lng is None:
        coords = await geocoding_service.geocode(request.address)
        if coords is None:
            logger.warning(
                "Clinic upsert geocoding failed doctor_id=%s address=%s", doctor_id, request.address
            )
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not geocode address. Try a more specific address (e.g. include city and state).",
            )
        lat, lng = coords
        logger.info("Clinic upsert geocoding succeeded lat=%s lng=%s", lat, lng)
    else:
        logger.info("Clinic upsert using provided coordinates lat=%s lng=%s", lat, lng)

    opening_hours = request.opening_hours
    if request.opening_hours_schedule is not None:
        opening_hours = json.dumps(
            [item.model_dump() for item in request.opening_hours_schedule],
            separators=(",", ":"),
        )
    return supabase_store.upsert_clinic(doctor_id, {
        "name": request.name,
        "address": request.address,
        "lat": lat,
        "lng": lng,
        "opening_hours": opening_hours,
        "phone": request.phone,
    })


@router.put("/doctors/me/availability", response_model=dict)
async def toggle_availability(
    request: AvailabilityToggle,
    doctor_id: str = Depends(get_current_doctor_id)
):
    """Toggle doctor's availability status in Supabase."""
    require_supabase()
    logger.info("Availability update requested doctor_id=%s available=%s", doctor_id, request.available)
    doctor = supabase_store.get_doctor_by_id(doctor_id)
    if not doctor:
        logger.warning("Availability update doctor not found doctor_id=%s", doctor_id)
        raise HTTPException(status_code=404, detail="Doctor not found")

    if request.available and not doctor.get("license_verified", False):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Your account must be verified before you can go live.",
        )

    supabase_store.upsert_availability(doctor_id, request.available)
    return {"available": request.available}
