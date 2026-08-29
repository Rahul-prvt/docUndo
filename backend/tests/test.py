import os
from dotenv import load_dotenv
from supabase import create_client
from uuid import uuid4

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE = os.getenv("SUPABASE_SERVICE_ROLE")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE:
    raise ValueError("SUPABASE_URL or SUPABASE_SERVICE_ROLE missing in .env")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

email = f"test_{uuid4().hex[:8]}@example.com"
password = "Test@123456"

print("=" * 60)
print("Testing Supabase Authentication")
print("=" * 60)

try:
    auth_response = supabase.auth.admin.create_user(
        {
            "email": email,
            "password": password,
            "email_confirm": True,
        }
    )

    user = auth_response.user
    print("✅ Auth user created")
    print(f"User ID : {user.id}")
    print(f"Email   : {user.email}")

except Exception as e:
    print("❌ Auth creation failed")
    print(e)
    exit(1)

print("\n" + "=" * 60)
print("Testing doctors table insert")
print("=" * 60)

doctor = {
    "id": user.id,
    "name": "Test Doctor",
    "email": email,
    "password":"123456",
    "specialty": "General Physician",
    "license_no": f"TEST-{uuid4().hex[:6]}",
    "bio": "Testing Supabase connection",
    "consult_fee": 500,
}

try:
    result = (
        supabase
        .table("doctors")
        .insert(doctor)
        .execute()
    )

    print("✅ Doctor inserted successfully")
    print(result.data)

except Exception as e:
    print("❌ Failed inserting doctor")
    print(e)

print("\n" + "=" * 60)
print("Testing read")
print("=" * 60)

try:
    doctors = (
        supabase
        .table("doctors")
        .select("*")
        .limit(5)
        .execute()
    )

    print(f"✅ Found {len(doctors.data)} doctor(s)")
    for d in doctors.data:
        print(d)

except Exception as e:
    print("❌ Read failed")
    print(e)