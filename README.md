# DoctorUndo MVP - Phase 1

## Project Overview

Kerala Doctor Discovery MVP - Fast, accessible doctor search for rural/semi-urban areas.

**Phase 1 Goals:**
- Doctor signup & profile management
- Patient location-based doctor search
- AI symptom → specialty suggestion
- Contact-only booking (call/WhatsApp)
- Admin manual license verification

**Tech Stack:**
- **Backend:** FastAPI (Python 3.11+)
- **Frontend:** React + Vite + TailwindCSS
- **Database:** Supabase (Postgres + Auth)
- **Maps:** OpenStreetMap + Leaflet
- **AI:** Groq (llama-3.1-8b-instant)
- **Hosting:** Fly.io/Railway (backend), Vercel/Netlify (frontend)
- **Python deps:** `requirements.txt` inside a virtual environment

## Quick Start

### Backend

```cmd
cd backend
python -m venv .venv
.venv\Scripts\activate.bat
python -m pip install -r requirements.txt
copy .env.template .env
# Edit .env with your Supabase and Groq API keys
python -m uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

## Project Structure

```
doctor-mvp/
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── models/      # Pydantic schemas
│   │   ├── routers/     # API endpoints
│   │   ├── services/    # Business logic
│   │   ├── config.py    # Settings
│   │   ├── db.py        # Supabase client
│   │   ├── deps.py      # Dependencies
│   │   └── main.py      # App entry
│   ├── tests/
│   ├── requirements.txt # Python dependencies
│   └── Dockerfile
├── frontend/             # React + Vite
│   ├── src/
│   │   ├── pages/       # Full-page components
│   │   ├── components/  # Reusable components
│   │   ├── lib/         # API client, stores
│   │   └── App.tsx
│   └── package.json
├── db/
│   └── schema.sql       # Database schema
└── README.md
```

## API Endpoints (Phase 1)

| Endpoint | Method | Description |
|---|---|---|
| `/auth/signup/doctor` | POST | Doctor registration |
| `/auth/login` | POST | Login (Supabase) |
| `/doctors/me` | GET/PUT | Profile |
| `/doctors/me/clinic` | POST | Add clinic |
| `/doctors/me/availability` | PUT | Toggle available now |
| `/search` | GET | Search doctors by location/specialty |
| `/triage` | POST | AI symptom → specialty suggestion |
| `/admin/doctors/pending` | GET | List unverified doctors |
| `/admin/doctors/{id}/verify` | POST | Verify license |

## Database Schema

- `doctors` - Doctor profiles
- `clinics` - Clinic locations (with geocoding)
- `availability` - "Available Now" status
- `symptom_logs` - Audit trail for AI triage

All tables use Row-Level Security (RLS) for multi-tenancy.

## Development

### Running Tests

```bash
cd backend
pytest
```

### Linting & Formatting

```bash
cd backend
black app/
ruff check app/
mypy app/
```

## Deployment

### Backend

```bash
# Push to Fly.io
flyctl deploy

# Or Railway
railway up
```

### Frontend

```bash
# Build
npm run build

# Deploy to Vercel/Netlify
vercel deploy
```

## Important Notes

**Supabase Free Tier:** Projects auto-pause after 7 days of inactivity. Before pilot user testing, add an uptime check or upgrade to Pro ($25/mo).

**Groq Rate Limits:** 30 RPM / 6,000 TPM on free tier. The `/triage` endpoint gracefully falls back to manual specialty picker if AI is unavailable.

**Nominatim (OSM Geocoding):** 1 request/second limit. Geocoded addresses are cached at clinic signup time, not re-geocoded on search.

## Next Phases

- **Phase 2:** Online appointment booking, SMS reminders
- **Phase 3:** ABHA/UHI integration, ratings & reviews
- **Phase 4:** Payments, transactional emails

## License

MIT
