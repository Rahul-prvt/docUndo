"""Geocoding service using OpenStreetMap Nominatim"""

import logging

import httpx
from typing import Tuple, Optional
import asyncio
import time

logger = logging.getLogger(__name__)


class GeocodingService:
    """Geocoding service using Nominatim (OpenStreetMap)"""
    
    BASE_URL = "https://nominatim.openstreetmap.org"
    USER_AGENT = "DoctorUndo-MVP/0.1.0"
    
    def __init__(self, timeout_seconds: float = 5.0):
        self.timeout = timeout_seconds
        self.last_request_time = 0
        self.min_delay_between_requests = 1.0  # Nominatim rate limit: 1 req/sec
    
    async def geocode(self, address: str) -> Optional[Tuple[float, float]]:
        """
        Geocode an address to (lat, lng) tuple.
        Returns None if geocoding fails.
        Respects Nominatim rate limits.
        """
        logger.info("Geocode requested address_length=%s", len(address))
        # Enforce rate limit
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_delay_between_requests:
            await asyncio.sleep(self.min_delay_between_requests - elapsed)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/search",
                    params={
                        "q": address,
                        "format": "json",
                        "limit": 1
                    },
                    headers={"User-Agent": self.USER_AGENT},
                    timeout=self.timeout
                )
                self.last_request_time = time.time()
                
                if response.status_code == 200:
                    results = response.json()
                    if results and len(results) > 0:
                        result = results[0]
                        logger.info("Geocode completed match_found=true")
                        return (float(result["lat"]), float(result["lon"]))
        except Exception:
            logger.exception("Geocode request failed")
        
        return None
    
    async def reverse_geocode(self, lat: float, lng: float) -> Optional[str]:
        """
        Reverse geocode (lat, lng) to address string.
        Returns None if reverse geocoding fails.
        """
        logger.info("Reverse geocode requested")
        # Enforce rate limit
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_delay_between_requests:
            await asyncio.sleep(self.min_delay_between_requests - elapsed)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/reverse",
                    params={
                        "lat": lat,
                        "lon": lng,
                        "format": "json"
                    },
                    headers={"User-Agent": self.USER_AGENT},
                    timeout=self.timeout
                )
                self.last_request_time = time.time()
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info("Reverse geocode completed")
                    return result.get("address", {}).get("road") or result.get("display_name")
        except Exception:
            logger.exception("Reverse geocode request failed")
        
        return None


# Singleton instance
geocoding_service = GeocodingService()
