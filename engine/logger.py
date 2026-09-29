"""
AI YouTube - Engine Logger Module
Stage 0: Project Foundation
Configures application log, engine log, and error log with UTF-8 encoding and human-readable formatting.
"""

from __future__ import annotations
import logging
import sys
from pathlib import Path
from engine.config import config

LOGS_DIR = config.logs_dir
logger = logging.getLogger("AIYouTubeEngine")


def setup_logger(log_level: str = "INFO") -> logging.Logger:
    """Setup multi-target loggers: console, engine.log, and error.log."""
    logs_dir = config.logs_dir
    logs_dir.mkdir(parents=True, exist_ok=True)

    engine_log_file = logs_dir / "engine.log"
    error_log_file = logs_dir / "error.log"

    level = getattr(logging, log_level.upper(), logging.INFO)
    logger.setLevel(level)
    for h in list(logger.handlers):
        try:
            h.close()
        except Exception:
            pass
    logger.handlers.clear()

    formatter = logging.Formatter(
        fmt="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # 1. Console stream handler (stdout)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # 2. General engine file handler
    try:
        engine_file_handler = logging.FileHandler(engine_log_file, encoding="utf-8")
        engine_file_handler.setLevel(level)
        engine_file_handler.setFormatter(formatter)
        logger.addHandler(engine_file_handler)
    except Exception as e:
        sys.stderr.write(f"[Logger Setup Warning] Could not open {engine_log_file}: {e}\n")

    # 3. Error file handler (logs ERROR and CRITICAL only)
    try:
        error_file_handler = logging.FileHandler(error_log_file, encoding="utf-8")
        error_file_handler.setLevel(logging.ERROR)
        error_file_handler.setFormatter(formatter)
        logger.addHandler(error_file_handler)
    except Exception as e:
        sys.stderr.write(f"[Logger Setup Warning] Could not open {error_log_file}: {e}\n")

    return logger
