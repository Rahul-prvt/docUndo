"""Run the DoctorUndo backend with ``python main.py``.

This file is intentionally kept at the backend root so it works both from
``backend/`` and from the repository root via ``python backend/main.py``.
"""

import os
from pathlib import Path

import uvicorn


BACKEND_DIR = Path(__file__).resolve().parent


def run() -> None:
    """Start the complete FastAPI application in development mode."""
    # Settings uses a .env file, so make its lookup independent of where the
    # command was launched from.
    os.chdir(BACKEND_DIR)

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload_enabled = os.getenv("RELOAD", "true").lower() in {"1", "true", "yes"}

    print(f"Starting DoctorUndo API at http://localhost:{port}")
    print(f"Interactive docs: http://localhost:{port}/docs")
    server_options = {
        "host": host,
        "port": port,
        "reload": reload_enabled,
        "log_level": "info",
    }
    if reload_enabled:
        server_options["reload_dirs"] = [str(BACKEND_DIR)]

    uvicorn.run("app.main:app", **server_options)


if __name__ == "__main__":
    run()
