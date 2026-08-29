# Phase 1 Implementation Plan — Kerala Doctor Discovery MVP
**For: Claude Code**
**Source: `deep-research-report.md` (validated) — this plan narrows that report into a buildable first slice**

---

## 0. What changed from the original report (and why)

This plan deliberately **cuts scope** from the original research report so there's a working, testable product at the end of Phase 1, instead of a partially-built version of everything. Three corrections from validation are baked in:

1. **No ABHA/UHI integration in Phase 1.** UHI requires formal onboarding as a network participant (HSP/EUA), not a simple API call — that's a partnership/compliance track, not a sprint task. Doctor and patient IDs are plain app accounts for now; ABHA linking is a Phase 3+ item.
2. **No dependency on Google's old "$200/month" Maps credit.** As of March 2025 Google replaced it with small per-SKU free caps (~10,000 events/month on Essentials SKUs like Geocoding). Phase 1 uses **OpenStreetMap + Leaflet** (free, no cap) for the map and geocoding, with Google Maps as a paid swap-in later if needed.
3. **Groq's real constraint is rate/token limits, not just daily requests** (30 RPM / 6,000 TPM on the free 8B model). The triage endpoint is built with a queue-friendly design and a "AI unavailable, browse by specialty instead" fallback from day one, not bolted on later.

Everything else (entities, workflows, fraud-prevention notes, KPIs) carries over from the original report; this document just sequences the build.

---

## 1. Phase 1 scope (the actual deliverable)

**In scope:**
- Doctor signup, profile, one clinic location, "Available Now" toggle
- Patient signup (optional — browsing works without login)
- Map + list search by specialty / distance / availability (OSM + Leaflet)
- Symptom → specialty AI suggestion (Groq), with graceful fallback
- Contact-only "booking" (tap to call/WhatsApp; no payment, no slot management)
- Basic admin screen to verify doctor licenses manually

**Explicitly out of scope for Phase 1** (revisit in Phase 2/3):
- ABHA/UHI integration
- Online payments / transaction fees
- Real appointment scheduling with conflict detection
- SMS/push reminders for doctors who forget to toggle off
- Ratings/reviews

---

## 2. Finalized tech stack

| Layer | Choice | Notes |
|---|---|---|
| Backend | FastAPI (Python 3.11+) | Async, auto docs at `/docs` |
| DB / Auth | Supabase (Postgres + Auth) | Free tier: 500MB DB, 50k MAU. **Caveat: free projects pause after 7 days of inactivity** — fine for dev, but before any real pilot user testing, either ping it with a cron/uptime check or upgrade to Pro ($25/mo). |
| Maps | Leaflet.js + OpenStreetMap tiles | No API key, no request cap. Geocoding via Nominatim (rate-limited to 1 req/sec — cache geocoded clinic addresses at signup time, don't re-geocode on search) |
| AI triage | Groq API, `llama-3.1-8b-instant` | Free tier: 30 RPM / 6,000 TPM / 14,400 req/day. Build with a fallback path (see §6) |
| Frontend | React (Vite) | Mobile-responsive, deployed to Vercel/Netlify free tier |
| Hosting (API) | Fly.io or Railway free tier | Docker-based, swap easily |
| Monitoring | Sentry free tier | Wire in from Sprint 0, not as an afterthought |

---

## 3. Repository structure

```
doctor-mvp/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py                # env vars, settings
│   │   ├── db.py                    # Supabase client init
│   │   ├── models/                  # Pydantic schemas
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── doctors.py
│   │   │   ├── clinics.py
│   │   │   ├── search.py
│   │   │   └── triage.py
│   │   ├── services/
│   │   │   ├── groq_client.py
│   │   │   ├── geocode.py
│   │   │   └── distance.py          # haversine
│   │   └── deps.py                  # auth dependency, rate limit guard
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/ (DoctorSignup, DoctorDashboard, PatientSearch, DoctorProfile)
│   │   ├── components/ (MapView, DoctorCard, SymptomChat, AvailabilityToggle)
│   │   └── lib/api.ts
│   └── package.json
├── db/
│   └── schema.sql
└── README.md
```

---

## 4. Database schema (Phase 1 subset)

```sql
create table doctors (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id),
  name text not null,
  specialty text not null,
  license_no text not null,
  license_verified boolean default false,
  bio text,
  consult_fee numeric,
  created_at timestamptz default now()
);

create table clinics (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references doctors(id) on delete cascade,
  name text,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  opening_hours text
);

create table availability (
  doctor_id uuid primary key references doctors(id) on delete cascade,
  available boolean default false,
  updated_at timestamptz default now()
);

create table symptom_logs (
  id uuid primary key default gen_random_uuid(),
  patient_session text,          -- anonymous session id if not logged in
  symptoms_text text not null,
  suggested_specialty text,
  ai_available boolean,          -- false if fallback was used
  created_at timestamptz default now()
);
```

Enable Row-Level Security: doctors can only update their own `doctors`/`clinics`/`availability` rows (`auth.uid() = auth_user_id`). Search endpoints use the service role and are read-only for the public.

---

## 5. API endpoints (Phase 1)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/auth/signup/doctor` | POST | — | Creates Supabase auth user + `doctors` row (unverified) |
| `/auth/login` | POST | — | Standard Supabase auth |
| `/doctors/me` | GET/PUT | doctor | Own profile |
| `/doctors/me/clinic` | POST | doctor | Add clinic (geocodes address server-side via Nominatim, caches lat/lng) |
| `/doctors/me/availability` | PUT | doctor | Toggle available now |
| `/search` | GET | — | `?lat&lng&specialty&radius_km` → haversine filter in SQL, sorted by distance |
| `/triage` | POST | — | `{symptoms}` → Groq call → `{specialty, disclaimer, ai_available}` |
| `/admin/doctors/pending` | GET | admin | List unverified doctors |
| `/admin/doctors/{id}/verify` | POST | admin | Manual verification |

---

## 6. Build order (what Claude Code should do, in sequence)

**Step 1 — Scaffold**
Set up the repo structure above, FastAPI skeleton with health-check route, Supabase project + `.env` template, Sentry wired in. Get `/docs` loading and a `SELECT 1` DB round-trip working before writing any business logic.

**Step 2 — Auth + doctor profile**
Doctor signup/login using Supabase Auth. `doctors` and `clinics` tables with RLS. Geocoding wrapper for Nominatim (respect the 1 req/sec limit — add a small delay/queue if bulk-importing test data).

**Step 3 — Availability + search**
Availability toggle endpoint. `/search` using a haversine SQL query (no PostGIS needed at this scale — 500MB DB and low doctor counts don't need it yet). Return distance-sorted JSON.

**Step 4 — Frontend: doctor side**
Signup form, profile editor, clinic-add form with an address autocomplete (Nominatim search-as-you-type, debounced), availability toggle switch.

**Step 5 — Frontend: patient side**
Leaflet map component, doctor list/card view, specialty filter, distance filter. This should work with zero AI dependency — a patient can filter by specialty manually.

**Step 6 — AI triage, built defensively**
`/triage` endpoint calls Groq with a strict system prompt: return only a specialty label + a one-line non-diagnostic disclaimer, nothing else. Wrap the call with:
- a timeout (e.g. 5s)
- try/except around rate-limit errors (Groq returns 429s at 30 RPM)
- a fallback response (`ai_available: false`) that tells the frontend to show a manual specialty picker instead of blocking the user

Log every triage call to `symptom_logs` regardless of whether the AI call succeeded, so specialty-suggestion accuracy can be reviewed later.

**Step 7 — Admin verification screen**
Simple internal-only page listing unverified doctors with their license number, a "mark verified" button. No public exposure — protect with a hardcoded admin role check for now, not a full RBAC system.

**Step 8 — Testing & hardening**
Unit tests for search (distance math), triage fallback path, and RLS policies (a doctor cannot edit another doctor's row). One end-to-end test: signup → add clinic → toggle available → appears in search.

**Step 9 — Deploy**
Backend to Fly.io/Railway, frontend to Vercel/Netlify, Supabase project promoted from dev to a named project. Add an uptime ping (e.g. a free cron service hitting `/health` every 3 days) so the Supabase free-tier project doesn't auto-pause during pilot testing.

---

## 7. Definition of done for Phase 1

- A doctor can sign up, add a clinic, and toggle availability.
- A patient (no login required) can either browse by specialty/distance or describe symptoms and get a specialty suggestion, and see matching available doctors on a map.
- If Groq is rate-limited or down, the patient still gets a usable manual-filter path — the app never blocks on AI.
- An admin can verify a doctor's license manually.
- The whole flow works end-to-end on the deployed (not just local) environment.

Everything past this point — ABHA linking, payments, real appointment booking, ratings — is Phase 2+ and should be scoped separately once Phase 1 is validated with real doctors in Palakkad/Thrissur.
