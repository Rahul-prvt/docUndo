# DoctorUndo Repository Analysis Report

Generated on 2026-08-09 from the current workspace state.

## Executive Summary

DoctorUndo is a Phase 1 doctor discovery MVP with a FastAPI backend, React/Vite frontend, Supabase-oriented persistence, OpenStreetMap/Leaflet mapping, and a Groq-powered AI assistant. Since the previous report (2026-08-01), significant improvements have been made: the Groq integration was re-implemented using the OpenAI-compatible client, a full floating AI chat widget was added to the frontend, the PatientSearch layout was cleaned up, and several TypeScript issues were resolved. The backend test suite now passes consistently (6/6). The last remaining build blocker is duplicate key errors in `src/lib/i18n.ts`.

## Repository Shape

- Root docs and plans: `README.md`, `DEVELOPMENT.md`, `phase1-implementation-plan.md`, `deep-research-report (1).md`.
- Backend: `backend/app` FastAPI app with routers, Pydantic schemas, OpenAI-compatible Groq client, Supabase helpers, in-memory stores, and tests.
- Frontend: `frontend/src` React app with pages/components, Axios API client, Zustand auth store, TailwindCSS, and Leaflet map.
- Database: two schema locations remain: `db/schema.sql` and `backend/db/schema.sql`.
- Deployment: Dockerfiles for both services and a root `docker-compose.yml`.

## What Changed Since 2026-08-01

| Area | Change |
|------|--------|
| `backend/app/services/groq_client.py` | Switched from Groq SDK to OpenAI-compatible client (`openai>=1.30.0` at `https://api.groq.com/openai/v1`). Added `chat(messages)` async method for multi-turn use. |
| `backend/app/routers/triage.py` | Added `/api/v1/chat` endpoint accepting conversation history; system prompt controls medical assistant persona and specialty detection. `/triage` unchanged. |
| `backend/app/models/schemas.py` | Added `ChatMessage`, `ChatRequest`, `ChatResponse` Pydantic models. |
| `backend/requirements.txt` | Replaced `groq==0.4.2` with `openai>=1.30.0`. |
| `frontend/src/components/AiChatWidget.tsx` | **New file.** Floating bubble + pop-up chat panel. Pulsing open button, dark glassmorphism UI, typing indicator, specialty suggestion banner with "Apply filter" action. |
| `frontend/src/App.tsx` | `AiChatWidget` mounted globally; shared `chatSpecialty` state wires the widget to `PatientSearch` across the tree. |
| `frontend/src/pages/PatientSearch.tsx` | Removed sidebar `SymptomChat` panel. Full-width layout. Doctor cards in 3 columns on `lg`. Accepts `externalSpecialty`/`onSpecialtyConsumed` props. Search card overlap with hero fixed (`-mt-5` → `mt-4`). |
| `frontend/src/lib/api.ts` | Added `triageApi.chat(messages)` for the new chat endpoint. Restored clean file after corruption during edit. |
| `frontend/src/vite-env.d.ts` | Exists — resolves the previous `ImportMeta.env` TypeScript error. |

## Current Feature State

### Backend

- Health: `GET /health`.
- Auth: doctor signup and login via in-memory store with plaintext passwords and synthetic `local-token-*` bearer tokens.
- Doctor profile read works for in-memory doctors; update is still a 404 placeholder.
- Clinic creation and availability toggle work against local state with best-effort Supabase upsert.
- Search: location, radius, specialty, and availability filtering via local store.
- **Triage** (`POST /api/v1/triage`): calls Groq via OpenAI-compatible client; falls back to "General Practitioner" on failure.
- **Chat** (`POST /api/v1/chat`): new multi-turn endpoint. Accepts conversation history, prepends a medical assistant system prompt, calls `llama-3.1-8b-instant`, parses a `SPECIALTY_SUGGESTION` marker from the reply, returns `ChatResponse`.
- Admin endpoints: still placeholder-only (pending list always empty; verify echoes input).

### Frontend

- Floating AI chat widget (`AiChatWidget`) visible on every non-auth page via `App.tsx`.
- Patient search: full-width layout, specialty auto-populated from AI chat, map click, 3-col doctor cards on large screens.
- Doctor signup/login/dashboard pages unchanged.
- `triageApi` exposes both `.suggest()` (single-turn triage) and `.chat()` (multi-turn conversation).
- Auth token is read from `localStorage` on every Axios request via interceptor — page-refresh safe.

### Data Model

- `backend/db/schema.sql`: actual SQL with `doctors`, `clinics`, `availability`; plaintext `password` column.
- `db/schema.sql`: Python-formatted content stored with a `.sql` extension; uses `auth_user_id`, RLS, `symptom_logs`, `ll_to_earth`. Not aligned with backend.
- `backend/init_db.py:7` imports `DB_SCHEMA` from `db.schema` — no `db/schema.py` exists; this import will fail at runtime.

## Verified Commands

### Backend Tests

Command:

```powershell
$env:PYTHONPATH='.'; $env:DEBUG='true'; pytest -q tests
```

Result: **6 passed, 1 warning** (5.9 s).

The Pydantic v2 deprecation warning (`class-based Config`) is cosmetic; does not affect correctness.

### Frontend Build

Command:

```powershell
npm run build
```

Result: **still fails** during TypeScript compilation.

Single remaining error source:

- `src/lib/i18n.ts`: 9 instances of TS1117 (duplicate object-literal property names) in both `en` and `ml` locale objects. Duplicated keys: `auth.login_subtitle`, `auth.invalid_credentials`, `auth.logging_in`, `auth.signup_cta`, `auth.signup_title`, `auth.signup_subtitle`, `auth.signup_failed`.

All previously failing errors (`App.tsx`, `DoctorCard.tsx`, `MapView.tsx`, `PatientSearch.tsx`, `api.ts`) have been resolved.

## Key Findings

### 1. Frontend build blocked by i18n duplicate keys — HIGH (blocks deploy)

`src/lib/i18n.ts` defines duplicate keys inside both the `en` and `ml` locale objects. TypeScript strict mode rejects these as TS1117.

Affected lines: 133, 143, 144, 149, 150, 152, 153, 154, 286.

Relevant code:
- `frontend/src/lib/i18n.ts:131–154` (en block)
- `frontend/src/lib/i18n.ts:284–286` (ml block)

Impact: `tsc && vite build` fails. Frontend Docker build and production deploy are blocked.

Recommended fix: keep only the canonical version of each duplicated key and delete the redundant ones. At runtime JavaScript uses the last occurrence silently, but TypeScript flags it.

### 2. Authentication is not production-grade — HIGH (security)

Plaintext passwords stored in `doctor_store`. Tokens are synthetic `local-token-{id}` strings with no JWT validation.

Relevant code:
- `backend/app/routers/auth.py:23,32,42,60`
- `backend/app/deps.py:10`

Impact: acceptable for local Phase 1 mock only.

Recommended fix: use Supabase Auth for signup/login; validate Supabase JWTs on protected endpoints; remove plaintext password persistence.

### 3. Groq client switched to OpenAI-compatible interface — RESOLVED

Previously: `groq==0.4.2` SDK caused import-time failures when the package was absent.

Now: `openai>=1.30.0` pointed at `https://api.groq.com/openai/v1`.

Benefits:
- Groq SDK import error eliminated.
- Provider switch (OpenAI, Azure, Mistral) requires only changing `api_key` and `base_url`.
- All Groq interaction is encapsulated in `GroqTriageService`; routers call `groq_service.chat()` or `groq_service.suggest_specialty()` only.

Remaining: `GROQ_API_KEY` must be set in `backend/.env`. Both `/triage` and `/chat` fall back gracefully when it is absent.

### 4. Supabase and local fallback flows still inconsistent — MEDIUM

All profile/clinic/availability logic depends on `doctor_store` membership regardless of whether signup went through Supabase. A Supabase-backed signup can succeed then silently fail on subsequent dashboard calls.

Relevant code:
- `backend/app/routers/doctors.py:30,82,119`

Recommended fix: explicit `RUNTIME_MODE=local|supabase` config; route all protected operations through the chosen store.

### 5. Database schemas conflict — MEDIUM

Two incompatible schema sources remain unresolved:
- `backend/db/schema.sql`: real SQL, email + plaintext password.
- `db/schema.sql`: Python content in `.sql` file, `auth_user_id`, RLS, `symptom_logs`.
- `backend/init_db.py:7`: imports `DB_SCHEMA` from `db.schema` — no such module exists; will raise `ImportError` at runtime.

Recommended fix: one migration directory of real SQL files; remove Python content from `.sql`; fix or delete the broken import in `init_db.py`.

### 6. Clinic geocoding service is unused — MEDIUM

Clinic creation stores hardcoded Palakkad coordinates for every clinic.

Relevant code:
- `backend/app/routers/doctors.py:90,100`
- `backend/app/services/geocode.py`

Impact: map markers and distance results are incorrect for any clinic outside Palakkad.

Recommended fix: call `geocoding_service.geocode(request.address)` at creation time; return a validation error if geocoding fails.

### 7. Admin verification is placeholder-only — LOW

`GET /api/v1/admin/doctors/pending` always returns `[]`. `POST /api/v1/admin/doctors/{id}/verify` echoes the request without modifying state.

Relevant code:
- `backend/app/routers/admin.py:23,38`

Recommended fix: implement pending query and verification state update against the canonical store.

### 8. Auth token Axios initialization — RESOLVED

`api.ts` request interceptor now reads `localStorage` on every call. A page refresh no longer drops the bearer token.

### 9. Sidebar SymptomChat replaced by global floating AI chat — RESOLVED

The old inline `SymptomChat` widget in `PatientSearch`'s sidebar has been removed. `AiChatWidget` is now mounted in `App.tsx`, is available on all non-auth pages, supports full multi-turn conversation via Groq, and can auto-populate the specialty search filter when the AI detects one.

## Recommended Priority Order

1. **Fix `i18n.ts` duplicate keys** — unblocks the entire frontend build with a one-file change.
2. **Set `GROQ_API_KEY`** in `backend/.env` — immediately enables live AI chat and triage.
3. **Fix `backend/init_db.py`** — create `db/schema.py` or remove the broken import.
4. **Choose canonical persistence mode** — Supabase for production, local in-memory behind explicit config for tests.
5. **Replace plaintext password / local-token auth** with Supabase Auth and JWT validation.
6. **Consolidate database schema** into one migration source.
7. **Implement real geocoding** in clinic creation.
8. **Implement doctor profile update and admin verification**.
9. **Expand test suite** — add tests for `/chat` endpoint; mock Supabase store behavior.
10. **Update README/DEVELOPMENT** — document startup path, `GROQ_API_KEY` requirement, OpenAI-compatible client rationale.

## Suggested Near-Term Milestone

Fixing `i18n.ts` (item 1) is the single highest-leverage task: it is a one-file deduplication that unblocks the frontend build and Docker deploy pipeline with no architectural risk. After that, adding `GROQ_API_KEY` to `.env` activates the AI chat and triage features end-to-end with no further code changes required.
