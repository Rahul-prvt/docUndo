"""Application logging with console and rotating-file output."""

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

LOG_DIRECTORY = Path(__file__).resolve().parents[1] / "logs"


def configure_logging(level: str = "INFO") -> None:
    """Configure logging once for the API process."""
    root = logging.getLogger()
    if getattr(root, "_doctorundo_configured", False):
        return
    LOG_DIRECTORY.mkdir(exist_ok=True)
    formatter = logging.Formatter("%(asctime)s %(levelname)-8s %(name)s | %(message)s", datefmt="%Y-%m-%dT%H:%M:%S")
    console = logging.StreamHandler()
    console.setFormatter(formatter)
    file_handler = RotatingFileHandler(LOG_DIRECTORY / "backend.log", maxBytes=5_000_000, backupCount=5, encoding="utf-8")
    file_handler.setFormatter(formatter)
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    root.addHandler(console)
    root.addHandler(file_handler)
    root._doctorundo_configured = True  # type: ignore[attr-defined]
