from datetime import datetime, timezone


class FakeSupabaseStore:
    """Test double for the Supabase persistence boundary."""

    def __init__(self) -> None:
        self.doctors: dict[str, dict] = {}
        self.clinics: dict[str, dict] = {}
        self.availability: dict[str, bool] = {}

    def is_configured(self) -> bool:
        return True

    def create_doctor(self, payload: dict) -> dict:
        doctor_id = f"doctor-{len(self.doctors) + 1}"
        doctor = {
            "id": doctor_id,
            "created_at": datetime.now(timezone.utc),
            **payload,
        }
        self.doctors[doctor_id] = doctor
        return doctor

    def get_doctor_by_email(self, email: str) -> dict | None:
        return next(
            (doctor for doctor in self.doctors.values() if doctor["email"] == email),
            None,
        )

    def get_doctor_by_id(self, doctor_id: str) -> dict | None:
        return self.doctors.get(doctor_id)

    def update_doctor(self, doctor_id: str, payload: dict) -> dict | None:
        doctor = self.doctors.get(doctor_id)
        if not doctor:
            return None
        doctor.update(payload)
        return doctor

    def get_clinic_by_doctor_id(self, doctor_id: str) -> dict | None:
        return self.clinics.get(doctor_id)

    def upsert_clinic(self, doctor_id: str, payload: dict) -> dict:
        clinic = {
            "id": f"clinic-{doctor_id}",
            "doctor_id": doctor_id,
            **payload,
        }
        self.clinics[doctor_id] = clinic
        return clinic

    def upsert_availability(self, doctor_id: str, available: bool) -> dict:
        self.availability[doctor_id] = available
        return {"doctor_id": doctor_id, "available": available}

    def search_doctors(
        self,
        lat: float,
        lng: float,
        specialty: str | None = None,
        radius_km: float = 10.0,
    ) -> list[dict]:
        results = []
        specialty_filter = specialty.lower() if specialty else None
        for doctor_id, doctor in self.doctors.items():
            clinic = self.clinics.get(doctor_id)
            available = self.availability.get(doctor_id, False)
            if not clinic or not available:
                continue
            if specialty_filter and specialty_filter not in doctor["specialty"].lower():
                continue
            results.append({
                "id": doctor_id,
                "name": doctor["name"],
                "specialty": doctor["specialty"],
                "consult_fee": doctor.get("consult_fee"),
                "available": available,
                "distance_km": 0.0,
                "clinic": clinic,
            })
        return results
