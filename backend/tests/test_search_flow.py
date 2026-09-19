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


def create_doctor(store: FakeSupabaseStore, suffix: str, *, verified: bool, live: bool, specialty: str = "General Practitioner") -> str:
    response = client.post("/api/v1/auth/signup/doctor", json={
        "email": f"dr{suffix}@example.com", "password": "secret123",
        "name": f"Dr. {suffix.title()}", "specialty": specialty,
        "license_no": f"LIC-{suffix}", "consult_fee": 250,
    })
    assert response.status_code == 201
    token = response.json()["access_token"]
    store.doctors[token]["license_verified"] = verified
    clinic = client.post("/api/v1/doctors/me/clinic", headers={"Authorization": f"Bearer {token}"}, json={
        "name": f"{suffix.title()} Clinic", "address": "Palakkad, Kerala",
        "lat": 10.786, "lng": 76.6444, "phone": "+91 99999 99999",
        "opening_hours_schedule": [{"day": day, "is_open": day == "Monday", "start": "09:00" if day == "Monday" else None, "end": "17:00" if day == "Monday" else None} for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]],
    })
    assert clinic.status_code == 201
    if live:
        availability = client.put("/api/v1/doctors/me/availability", headers={"Authorization": f"Bearer {token}"}, json={"available": True})
        assert availability.status_code == 200
    return token


def search(specialty: str = "General"):
    response = client.get("/api/v1/search", params={"lat": 10.786, "lng": 76.6444, "specialty": specialty, "radius_km": 20})
    assert response.status_code == 200
    return response.json()


def test_search_returns_active_live_and_non_live_doctors(fake_supabase):
    create_doctor(fake_supabase, "live", verified=True, live=True)
    create_doctor(fake_supabase, "offline", verified=True, live=False)
    results = search()
    assert [item["name"] for item in results] == ["Dr. Live", "Dr. Offline"]
    assert [item["available"] for item in results] == [True, False]
    assert all(item["active"] for item in results)


def test_search_hides_inactive_doctor(fake_supabase):
    create_doctor(fake_supabase, "active", verified=True, live=False)
    create_doctor(fake_supabase, "inactive", verified=False, live=False)
    assert [item["name"] for item in search()] == ["Dr. Active"]


def test_search_filter_applies_to_all_active_doctors(fake_supabase):
    create_doctor(fake_supabase, "heart", verified=True, live=False, specialty="Cardiologist")
    create_doctor(fake_supabase, "general", verified=True, live=True)
    results = search("Cardio")
    assert len(results) == 1
    assert results[0]["name"] == "Dr. Heart"
    assert results[0]["available"] is False


def test_inactive_doctor_cannot_go_live(fake_supabase):
    token = create_doctor(fake_supabase, "pending", verified=False, live=False)
    response = client.put("/api/v1/doctors/me/availability", headers={"Authorization": f"Bearer {token}"}, json={"available": True})
    assert response.status_code == 409


def test_schedule_round_trip_and_validation(fake_supabase):
    token = create_doctor(fake_supabase, "schedule", verified=True, live=False)
    profile = client.get("/api/v1/doctors/me", headers={"Authorization": f"Bearer {token}"}).json()
    assert profile["clinic"]["opening_hours_schedule"][0] == {"day": "Monday", "is_open": True, "start": "09:00", "end": "17:00"}
    assert profile["clinic"]["opening_hours"] == "Mon 09:00–17:00"
    invalid = client.post("/api/v1/doctors/me/clinic", headers={"Authorization": f"Bearer {token}"}, json={
        "address": "Palakkad, Kerala", "lat": 10.786, "lng": 76.6444,
        "opening_hours_schedule": [{"day": "Monday", "is_open": True, "start": "17:00", "end": "09:00"}],
    })
    assert invalid.status_code == 422
