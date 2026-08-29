"""Pydantic models for request/response schemas"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# Auth Models
class DoctorSignupRequest(BaseModel):
    """Doctor signup request"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str
    specialty: str
    license_no: str
    bio: Optional[str] = None
    consult_fee: Optional[float] = None
    available_days: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    clinic_name: Optional[str] = None
    opening_hours: Optional[str] = None


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


class ClinicLocationCreate(BaseModel):
    """Create clinic location"""
    name: Optional[str] = None
    address: str
    opening_hours: Optional[str] = None
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


class DoctorProfileResponse(BaseModel):
    """Doctor profile response"""
    id: str
    name: str
    specialty: str
    license_no: str
    license_verified: bool
    bio: Optional[str]
    consult_fee: Optional[float]
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
