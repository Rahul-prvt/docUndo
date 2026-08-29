# DoctorUndo MVP - Development Setup Guide

## Prerequisites

- Python 3.11+
- Node.js 18+
- Git
- Docker (optional, for deployment)
- Windows cmd for the backend examples below

## Supabase Setup

1. Go to https://supabase.com and create a free account
2. Create a new project
3. Go to **Settings → API** and copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE`

4. Go to **SQL Editor** and run the schema from `db/schema.sql`

## Groq API Setup

1. Go to https://console.groq.com and sign up
2. Copy your API key → `GROQ_API_KEY`

## Backend Setup

```cmd
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate.bat

# Copy environment template
copy .env.template .env

# Edit .env with your keys
# SUPABASE_URL=...
# SUPABASE_KEY=...
# SUPABASE_SERVICE_ROLE=...
# GROQ_API_KEY=...

# Install dependencies
python -m pip install -r requirements.txt

# Run development server
python -m uvicorn app.main:app --reload

# API docs: http://localhost:8000/docs
```

### Running Tests

```cmd
cd backend
.venv\Scripts\activate.bat
pytest -v
```

### Linting & Formatting

```cmd
cd backend
.venv\Scripts\activate.bat

# Format code
black app/ tests/

# Lint
ruff check app/ tests/

# Type check
mypy app/
```

## Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Frontend: http://localhost:5173
```

### Building

```bash
cd frontend

# Build for production
npm run build

# Type check
npm run type-check

# Lint
npm run lint
```

## Running Both Together (Docker Compose)

```cmd
# Create .env file in backend/ first
cd backend
copy .env.template .env
# Edit .env with your credentials

# Go back to root
cd ..

# Start both services
docker-compose up

# Backend: http://localhost:8000
# Frontend: http://localhost:3000
# API docs: http://localhost:8000/docs
```

## Environment Variables Checklist

### Backend (backend/.env)

- [ ] `SUPABASE_URL` - Supabase project URL
- [ ] `SUPABASE_KEY` - Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE` - Supabase service role key
- [ ] `GROQ_API_KEY` - Groq API key
- [ ] `ENVIRONMENT` - Set to `development`
- [ ] `DEBUG` - Set to `true`
- [ ] `ADMIN_SECRET_KEY` - Change from template

### Frontend (frontend/.env.local)

```
VITE_API_URL=http://localhost:8000/api/v1
```

## Database Schema

Key tables:
- `doctors` - Doctor profiles
- `clinics` - Clinic locations (with geocoding)
- `availability` - "Available Now" toggle
- `symptom_logs` - AI triage audit trail

All tables use Row-Level Security (RLS).

## API Endpoints Quick Reference

| Endpoint | Method | Auth | Status |
|---|---|---|---|
| `/health` | GET | ❌ | ✅ Working |
| `/auth/signup/doctor` | POST | ❌ | 🚧 TODO |
| `/auth/login` | POST | ❌ | 🚧 TODO |
| `/doctors/me` | GET/PUT | ✅ | 🚧 TODO |
| `/doctors/me/clinic` | POST | ✅ | 🚧 TODO |
| `/doctors/me/availability` | PUT | ✅ | 🚧 TODO |
| `/search` | GET | ❌ | 🚧 TODO |
| `/triage` | POST | ❌ | ✅ Fallback ready |
| `/admin/doctors/pending` | GET | ✅ | 🚧 TODO |
| `/admin/doctors/{id}/verify` | POST | ✅ | 🚧 TODO |

## Development Workflow

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/doctor-signup
   ```

2. **Make changes** to backend/frontend

3. **Run tests:**
   ```bash
   cd backend
   .venv\Scripts\activate.bat
   pytest
   ```

4. **Format & lint:**
   ```bash
   cd backend
   .venv\Scripts\activate.bat
   black app/
   ruff check app/
   ```

5. **Commit changes:**
   ```bash
   git add .
   git commit -m "feat: add doctor signup endpoint"
   ```

6. **Push & create PR:**
   ```bash
   git push origin feature/doctor-signup
   ```

## Troubleshooting

**Q: `ModuleNotFoundError` when running backend**
A: Make sure `.venv` is activated and `python -m pip install -r requirements.txt` completed successfully.

**Q: Supabase project auto-pausing in development**
A: Free tier projects pause after 7 days of inactivity. Add an uptime check or upgrade to Pro ($25/mo) before pilot testing.

**Q: CORS errors from frontend to backend**
A: Make sure `ALLOWED_ORIGINS` in `backend/.env` includes your frontend URL.

**Q: Nominatim geocoding is slow**
A: Geocoded addresses are cached at clinic signup. Don't re-geocode on every search.

**Q: Groq API rate limits being hit**
A: Free tier is 30 RPM / 6,000 TPM. The `/triage` endpoint falls back to manual picker if AI is unavailable.

## Next Steps

See `phase1-implementation-plan.md` for the detailed build order:

1. ✅ Scaffold (you're here!)
2. 🚧 Auth + doctor profile
3. 🚧 Availability + search
4. 🚧 Frontend: doctor side
5. 🚧 Frontend: patient side
6. 🚧 AI triage (defensively built)
7. 🚧 Admin verification
8. 🚧 Testing & hardening
9. 🚧 Deploy

## Resources

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
- [Groq API](https://console.groq.com/docs)
