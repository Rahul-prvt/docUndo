"""Admin routers"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from app.models.schemas import PendingDoctorResponse, DoctorVerificationRequest
from app.deps import verify_admin
from app.services.supabase_store import supabase_store


router = APIRouter()
logger = logging.getLogger(__name__)


def require_supabase() -> None:
    """Reject admin requests when Supabase is not configured."""
    if not supabase_store.is_configured():
        logger.error("Admin request rejected: Supabase is not configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase is not configured",
        )


@router.get(
    "/admin/doctors/pending",
    response_model=list[PendingDoctorResponse],
    dependencies=[Depends(verify_admin)],
)
async def list_pending_doctors():
    """
    List doctors pending license verification.
    Admin-only endpoint (verified via X-Admin-Key header).
    """
    require_supabase()
    logger.info("Admin requested pending doctor list")
    doctors = supabase_store.list_unverified_doctors()
    logger.info("Admin pending doctor list returned count=%s", len(doctors))
    return [
        PendingDoctorResponse(
            id=str(d["id"]),
            name=d["name"],
            specialty=d["specialty"],
            license_no=d["license_no"],
            email=d.get("email", ""),
            created_at=d["created_at"],
        )
        for d in doctors
    ]


@router.post(
    "/admin/doctors/{doctor_id}/verify",
    response_model=dict,
    dependencies=[Depends(verify_admin)],
)
async def verify_doctor(doctor_id: str, request: DoctorVerificationRequest):
    """
    Manually verify or reject a doctor's license.
    Admin-only endpoint (verified via X-Admin-Key header).
    """
    require_supabase()
    logger.warning(
        "Admin verification requested doctor_id=%s verified=%s",
        doctor_id,
        request.verified,
    )
    updated = supabase_store.set_license_verified(
        doctor_id, request.verified, request.admin_notes
    )
    if updated is None:
        logger.warning("Admin verification target not found doctor_id=%s", doctor_id)
        raise HTTPException(status_code=404, detail="Doctor not found")

    logger.info("Admin verification complete doctor_id=%s verified=%s", doctor_id, request.verified)
    return {
        "doctor_id": doctor_id,
        "verified": request.verified,
        "admin_notes": request.admin_notes,
    }
