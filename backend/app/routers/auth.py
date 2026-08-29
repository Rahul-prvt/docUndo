"""Authentication routers"""
import logging

from fastapi import APIRouter, status, HTTPException
from app.models.schemas import DoctorSignupRequest, DoctorLoginRequest, AuthResponse
from app.services.supabase_store import supabase_store


router = APIRouter()
logger = logging.getLogger(__name__)


def require_supabase() -> None:
    """Reject auth requests when Supabase is not configured."""
    if not supabase_store.is_configured():
        logger.error("Auth request rejected: Supabase is not configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase is not configured",
        )


@router.post(
    "/auth/signup/doctor",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
async def signup_doctor(request: DoctorSignupRequest):
    """Create a doctor account in Supabase."""
    require_supabase()
    logger.info("Doctor signup requested email=%s specialty=%s", request.email, request.specialty)
    try:
        doctor = supabase_store.create_doctor({
            "email": str(request.email),
            "password": request.password,
            "name": request.name,
            "specialty": request.specialty,
            "license_no": request.license_no,
            "bio": request.bio,
            "consult_fee": request.consult_fee,
            "available_days": request.available_days or [],
            "languages": request.languages or ["English"],
            "license_verified": False,
        })
    except Exception as exc:
        logger.exception("Doctor signup failed email=%s", request.email)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create doctor account",
        ) from exc

    user_id = str(doctor["id"])
    logger.info("Doctor signup succeeded doctor_id=%s", user_id)

    # Seed availability row (offline by default) so doctor is in the search index
    try:
        supabase_store.upsert_availability(user_id, available=False)
        logger.info("Seeded availability row doctor_id=%s", user_id)
    except Exception:
        logger.warning("Failed to seed availability row doctor_id=%s", user_id)

    # Seed clinic stub if any clinic info was provided at signup
    if request.clinic_name or request.opening_hours:
        try:
            supabase_store.upsert_clinic_stub(user_id, {
                "name": request.clinic_name or "",
                "opening_hours": request.opening_hours or "",
            })
            logger.info("Seeded clinic stub doctor_id=%s", user_id)
        except Exception:
            logger.warning("Failed to seed clinic stub doctor_id=%s", user_id)

    return AuthResponse(access_token=user_id, token_type="bearer", user_id=user_id)


@router.post("/auth/login", response_model=AuthResponse)
async def login(request: DoctorLoginRequest):
    """Authenticate a doctor account against Supabase."""
    require_supabase()
    logger.info("Doctor login requested email=%s", request.email)
    doctor = supabase_store.get_doctor_by_email(str(request.email))
    if doctor and doctor.get("password") == request.password:
        user_id = str(doctor["id"])
        logger.info("Doctor login succeeded doctor_id=%s", user_id)
        return AuthResponse(access_token=user_id, token_type="bearer", user_id=user_id)

    logger.warning("Doctor login rejected email=%s", request.email)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
