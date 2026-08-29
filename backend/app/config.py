from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional, List


class Settings(BaseSettings):
    """Application settings from environment variables"""
    
    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_role: str = ""
    
    # Groq API
    groq_api_key: str = ""
    
    # FastAPI
    environment: str = "development"
    debug: bool = True
    log_level: str = "INFO"
    api_prefix: str = "/api/v1"
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"
    
    # Sentry
    sentry_dsn: Optional[str] = None
    
    # Admin
    admin_secret_key: str = "change-me-in-production"
    
    # Rate limiting
    groq_rate_limit_rpm: int = 30  # requests per minute
    groq_rate_limit_tpm: int = 6000  # tokens per minute
    
    # Nominatim (OSM geocoding)
    nominatim_timeout_seconds: float = 5.0
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"

    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


settings = Settings()
