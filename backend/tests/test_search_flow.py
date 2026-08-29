import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers import auth as auth_router, doctors as doctors_router, search as search_router
from tests.fake_supabase import FakeSupabaseStore


@pytest.fixture(autouse=True)
def fake_supabase(monkeypatch):
    store = FakeSupabaseStore()
    monkeypatch.setattr(auth_router, "supabase_store", store)
    monkeypatch.setattr(doctors_router, "supabase_store", store)
    monkeypatch.setattr(search_router, "supabase_store", store)
    return store


client = TestClient(app)


def test_search_returns_available_doctor_with_clinic():
    signup_response = client.post(
        "/api/v1/auth/signup/doctor",
        json={
            "email": "drsearch@example.com",
            "password": "secret123",
            "name": "Dr. Search",
            "specialty": "General Practitioner",
            "license_no": "LIC789",
            "bio": "Search test doctor",
            "consult_fee": 250,
        },
    )
    assert signup_response.status_code == 201
    token = signup_response.json()["access_token"]

    clinic_response = client.post(
        "/api/v1/doctors/me/clinic",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Palakkad Clinic",
            "address": "Palakkad, Kerala",
            "opening_hours": "9am - 6pm",
        },
    )
    assert clinic_response.status_code == 201

    availability_response = client.put(
        "/api/v1/doctors/me/availability",
        headers={"Authorization": f"Bearer {token}"},
        json={"available": True},
    )
    assert availability_response.status_code == 200
    assert availability_response.json()["available"] is True

    search_response = client.get(
        "/api/v1/search",
        params={
            "lat": 10.7860,
            "lng": 76.6444,
            "specialty": "General",
            "radius_km": 20,
        },
    )
    assert search_response.status_code == 200
    results = search_response.json()
    assert len(results) == 1
    assert results[0]["name"] == "Dr. Search"
    assert results[0]["available"] is True
    assert results[0]["clinic"]["address"] == "Palakkad, Kerala"
