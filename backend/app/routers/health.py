"""Health and diagnostic routers"""

from fastapi import APIRouter, status
from app.models.schemas import HealthResponse


router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(status="ok", version="0.1.0")
