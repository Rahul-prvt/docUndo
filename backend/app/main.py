"""FastAPI application definition."""

import logging
import time
import uuid
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.logging_config import configure_logging
from app.models.schemas import HealthResponse

configure_logging(settings.log_level)
logger = logging.getLogger(__name__)

if settings.sentry_dsn:
    sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.1, environment=settings.environment)
    logger.info("Sentry monitoring enabled")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application starting environment=%s debug=%s", settings.environment, settings.debug)
    yield
    logger.info("Application shutting down")


app = FastAPI(
    title="DoctorUndo MVP API", description="Kerala Doctor Discovery MVP - Phase 1",
    version="0.1.0", debug=settings.debug, lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware, allow_origins=settings.allowed_origins_list(), allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)


@app.middleware("http")
async def log_request(request: Request, call_next):
    """Log every request once; do not log request bodies or credentials."""
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("Request failed request_id=%s method=%s path=%s", request_id, request.method, request.url.path)
        raise
    elapsed_ms = (time.perf_counter() - started) * 1000
    response.headers["X-Request-ID"] = request_id
    log = logger.warning if response.status_code >= 400 else logger.info
    log("Request complete request_id=%s method=%s path=%s status=%s duration_ms=%.1f client=%s", request_id, request.method, request.url.path, response.status_code, elapsed_ms, request.client.host if request.client else "unknown")
    return response


@app.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK, tags=["Health"])
async def health_check():
    logger.debug("Health check requested")
    return HealthResponse(status="ok", version="0.1.0")


from app.routers import admin, auth, doctors, search, triage  # noqa: E402

app.include_router(auth.router, prefix=settings.api_prefix, tags=["Auth"])
app.include_router(doctors.router, prefix=settings.api_prefix, tags=["Doctors"])
app.include_router(search.router, prefix=settings.api_prefix, tags=["Search"])
app.include_router(triage.router, prefix=settings.api_prefix, tags=["Triage"])
app.include_router(admin.router, prefix=settings.api_prefix, tags=["Admin"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=settings.debug, log_level=settings.log_level.lower())
