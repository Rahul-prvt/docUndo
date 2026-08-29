# DoctorUndo MVP Backend

## Setup

### Install dependencies

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate.bat
python -m pip install -r requirements.txt
```

### Environment setup

```bash
copy .env.template .env
# Edit .env with your Supabase and Groq keys
```

### Run

```bash
python main.py
```

`main.py` starts the entire FastAPI backend (all routers, CORS, and API docs).
It also works from the repository root:

```bash
python backend/main.py
```

If your terminal is not using the project virtual environment, activate it and
install the dependencies first:

```bash
..\.venv\Scripts\activate
python -m pip install -r requirements.txt
```

API docs at: http://localhost:8000/docs

### Logs

Requests, backend operations, and handled errors are written to the terminal and
to `backend/logs/backend.log`. Log files rotate automatically at 5 MB, retaining
the five most recent archives. Set `LOG_LEVEL=DEBUG` in `.env` for verbose logs.

### Database schema

1. Create a Supabase project
2. Run the SQL from `db/schema.sql` in the Supabase SQL editor
3. Update `.env` with your Supabase URL and keys

## Project Structure

- `app/` - FastAPI application
  - `models/` - Pydantic schemas
  - `routers/` - API endpoints
  - `services/` - Business logic (geocoding, Groq, distance calc)
  - `config.py` - Settings from environment
  - `db.py` - Supabase client
  - `deps.py` - FastAPI dependencies
  - `main.py` - FastAPI app definition

- `tests/` - Unit tests
- `db/` - Database schema
- `requirements.txt` - Python dependencies
- `main.py` - simple entrypoint for running the backend
