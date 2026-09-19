import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers import auth as auth_router, doctors as doctors_router
from tests.fake_supabase import FakeSupabaseStore


@pytest.fixture(autouse=True)
def fake_supabase(monkeypatch):
    store = FakeSupabaseStore()
    monkeypatch.setattr(auth_router, "supabase_store", store)
    monkeypatch.setattr(doctors_router, "supabase_store", store)
    return store


client = TestClient(app)


def test_doctor_signup_and_profile_flow():
    signup_response = client.post(
        "/api/v1/auth/signup/doctor",
        json={
            "email": "dr@example.com",
            "password": "secret123",
            "name": "Dr. Ramesh",
            "specialty": "General Practitioner",
            "license_no": "LIC123",
            "bio": "Experienced physician",
            "consult_fee": 300,
        },
    )

    assert signup_response.status_code == 201
    body = signup_response.json()
    assert body["user_id"]
    assert body["access_token"]

    profile_response = client.get(
        "/api/v1/doctors/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )

    assert profile_response.status_code == 200
    profile = profile_response.json()
    assert profile["name"] == "Dr. Ramesh"
    assert profile["specialty"] == "General Practitioner"


def test_doctor_login_works():
    client.post(
        "/api/v1/auth/signup/doctor",
        json={
            "email": "dr2@example.com",
            "password": "secret123",
            "name": "Dr. Priya",
            "specialty": "Pediatrician",
            "license_no": "LIC456",
        },
    )

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "dr2@example.com",
            "password": "secret123",
        },
    )

    assert login_response.status_code == 200
    assert login_response.json()["user_id"]


def test_dashboard_profile_fields_load_and_persist(fake_supabase):
    signup = client.post(
        "/api/v1/auth/signup/doctor",
        json={
            "email": "editable@example.com", "password": "secret123",
            "name": "Dr. Editable", "specialty": "Pediatrician",
            "license_no": "EDIT-1", "bio": "Original bio", "consult_fee": 300,
            "available_days": ["Monday"], "languages": ["English"],
            "clinic_name": "Original Clinic",
            "opening_hours_schedule": [{"day": "Monday", "is_open": True, "start": "09:00", "end": "17:00"}],
        },
    )
    token = signup.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    loaded = client.get("/api/v1/doctors/me", headers=headers)
    assert loaded.status_code == 200
    assert loaded.json()["clinic"]["name"] == "Original Clinic"
    assert loaded.json()["available_days"] == ["Monday"]

    updated = client.put("/api/v1/doctors/me", headers=headers, json={
        "name": "Dr. Updated", "bio": "Updated bio", "consult_fee": 450,
        "available_days": ["Monday", "Tuesday"], "languages": ["English", "Hindi"],
    })
    assert updated.status_code == 200
    reloaded = client.get("/api/v1/doctors/me", headers=headers).json()
    assert reloaded["name"] == "Dr. Updated"
    assert reloaded["consult_fee"] == 450
    assert reloaded["available_days"] == ["Monday", "Tuesday"]
    assert reloaded["languages"] == ["English", "Hindi"]
