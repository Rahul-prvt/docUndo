"""Dependency injections for FastAPI"""
import logging

from fastapi import Depends, HTTPException, status, Header
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


async def verify_admin(x_admin_key: Optional[str] = Header(None)) -> str:
    """Verify admin token from X-Admin-Key header"""
    if not x_admin_key or x_admin_key != settings.admin_secret_key:
        logger.warning("Admin authentication rejected")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing admin key"
        )
    logger.info("Admin authentication accepted")
    return x_admin_key


async def get_current_doctor_id(authorization: Optional[str] = Header(None)) -> str:
    """Extract the current Supabase doctor id from the bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        logger.warning("Doctor authentication rejected: missing or malformed bearer token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    token = authorization[7:].strip()
    if not token:
        logger.warning("Doctor authentication rejected: empty bearer token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    logger.debug("Doctor authentication accepted")
    return token
