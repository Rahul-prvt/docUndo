"""Supabase database client initialization."""

import logging

from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)


def get_supabase_client() -> Any:
    """Initialize and return Supabase client with service role key for backend operations."""
    if not settings.supabase_url or not settings.supabase_service_role:
        logger.error("Supabase service-role client requested without configuration")
        raise RuntimeError("Supabase URL and service role key are required")
    from supabase import create_client

    logger.info("Initializing Supabase service-role client")
    return create_client(
        supabase_url=settings.supabase_url,
        supabase_key=settings.supabase_service_role
    )


def get_supabase_anon_client() -> Any:
    """Initialize and return Supabase client with anon key for user operations."""
    if not settings.supabase_url or not settings.supabase_key:
        logger.error("Supabase anon client requested without configuration")
        raise RuntimeError("Supabase URL and anon key are required")
    from supabase import create_client

    logger.info("Initializing Supabase anon client")
    return create_client(
        supabase_url=settings.supabase_url,
        supabase_key=settings.supabase_key
    )
