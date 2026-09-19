"""Pydantic models for request/response schemas"""

from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional, List, Literal
from datetime import datetime
from uuid import UUID


# Auth Models
class OpeningHoursDay(BaseModel):
    """A single day in a clinic's weekly schedule."""
    day: Literal["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    is_open: bool
    start: Optional[str] = None
    end: Optional[str] = None

    @model_validator(mode="after")
    def validate_period(self):
        if not self.is_open:
            self.start = None
            self.end = None
            return self
        if not self.start or not self.end:
            raise ValueError("Open days require a start and end time")
        if self.start >= self.end:
            raise ValueError("Opening time must be before closing time")
        return self


class DoctorSignupRequest(BaseModel):
    """Doctor signup request"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str
    specialty: str
    license_no: str
    bio: Optional[str] = None
    consult_fee: Optional[float] = None
    languages: Optional[List[str]] = None
    clinic_name: Optional[str] = None
    opening_hours: Optional[str] = None
    opening_hours_schedule: Optional[List["OpeningHoursDay"]] = None


class DoctorLoginRequest(BaseModel):
    """Doctor login request"""
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    """Auth response with token"""
    access_token: str
    token_type: str = "bearer"
    user_id: str


# Doctor Models
class DoctorProfileUpdate(BaseModel):
    """Update doctor profile"""
    name: Optional[str] = None
    bio: Optional[str] = None
    specialty: Optional[str] = None
    consult_fee: Optional[float] = None
    languages: Optional[List[str]] = None


class ClinicLocationCreate(BaseModel):
    """Create clinic location"""
    name: Optional[str] = None
    address: str
    opening_hours: Optional[str] = None
    opening_hours_schedule: Optional[List[OpeningHoursDay]] = None
    phone: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class ClinicLocationResponse(BaseModel):
    """Clinic location response"""
    id: str
    doctor_id: str
    name: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    opening_hours: Optional[str] = None
    opening_hours_schedule: Optional[List[OpeningHoursDay]] = None
    phone: Optional[str] = None


class DoctorProfileResponse(BaseModel):
    """Doctor profile response"""
    id: str
    email: EmailStr
    name: str
    specialty: str
    license_no: str
    license_verified: bool
    bio: Optional[str]
    consult_fee: Optional[float]
    available_days: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)
    active: bool
    available: bool
    created_at: datetime


class DoctorWithClinicResponse(DoctorProfileResponse):
    """Doctor profile with clinic location"""
    clinic: Optional[ClinicLocationResponse] = None


class AvailabilityToggle(BaseModel):
    """Toggle doctor availability"""
    available: bool


# Search Models
class SearchQuery(BaseModel):
    """Search query parameters"""
    lat: float
    lng: float
    specialty: Optional[str] = None
    radius_km: float = 10.0


class SearchResult(BaseModel):
    """Individual search result"""
    id: str
    name: str
    specialty: str
    consult_fee: Optional[float]
    available: bool
    active: bool = True
    distance_km: float
    clinic: Optional[ClinicLocationResponse]


# AI Triage Models
class TriageRequest(BaseModel):
    """Triage request with symptoms"""
    symptoms: str = Field(..., min_length=10)
    patient_session_id: Optional[str] = None


class TriageResponse(BaseModel):
    """Triage response with suggested specialty"""
    suggested_specialty: str
    disclaimer: str
    ai_available: bool
    alternatives: List[str] = []


class ChatMessage(BaseModel):
    """A single message in a chat conversation"""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Multi-turn chat request"""
    messages: List[ChatMessage]


class ChatResponse(BaseModel):
    """Chat response from AI assistant"""
    reply: str
    suggested_specialty: Optional[str] = None
    ai_available: bool


# Admin Models
class PendingDoctorResponse(BaseModel):
    """Pending doctor for admin verification"""
    id: str
    name: str
    specialty: str
    license_no: str
    email: str
    created_at: datetime


class DoctorVerificationRequest(BaseModel):
    """Verify doctor license"""
    verified: bool
    admin_notes: Optional[str] = None


# Health check
class HealthResponse(BaseModel):
    """Health check response"""
    status: str = "ok"
    version: str = "0.1.0"
