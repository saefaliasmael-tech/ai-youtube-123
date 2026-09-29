#!/usr/bin/env python3
"""
AI YouTube - Local Engine Entry Point (Python Sidecar)
Stage 0: Project Foundation

This script is the main entry point for the Python Sidecar process spawned by Electron.
It initializes configuration, establishes logging to logs/engine.log and logs/error.log,
and starts the local loopback HTTP server on 127.0.0.1.
"""

from __future__ import annotations
import argparse
import os
import signal
import sys
from pathlib import Path

# Ensure project root is in sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from engine.config import config, EngineConfig
from engine.logger import setup_logger, logger
from engine.api.server import SidecarServer


def handle_signals(signum, frame, server: SidecarServer):
    signame = signal.Signals(signum).name if hasattr(signal, "Signals") else str(signum)
    logger.info(f"Received system termination signal: {signame} ({signum}). Initiating clean shutdown.")
    server.stop()
    sys.exit(0)


def main():
    parser = argparse.ArgumentParser(description="AI YouTube - Python Engine Sidecar")
    parser.add_argument("--host", default="127.0.0.1", help="Loopback host to bind (enforced to 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8765, help="Port to listen on (default: 8765)")
    parser.add_argument("--config", type=str, default=None, help="Path to custom app_config.json")
    parser.add_argument("--user-data", type=str, default=None, help="Path to writable user data directory (logs, models, outputs)")
    parser.add_argument("--log-level", default="INFO", help="Logging level (DEBUG, INFO, WARNING, ERROR)")

    args = parser.parse_args()

    # Load configuration
    if args.config or args.user_data:
        custom_cfg = EngineConfig(config_path=args.config, user_data_dir=args.user_data)
    else:
        custom_cfg = config

    # Initialize logger
    setup_logger(args.log_level)
    logger.info("==================================================")
    logger.info(f"AI YouTube Engine Sidecar starting (PID: {os.getpid()})")
    logger.info(f"App Version: {custom_cfg.data.get('app_version', '0.1.0')}")
    logger.info(f"Python Version: {sys.version.split()[0]} on {sys.platform}")
    logger.info(f"Models Directory: {custom_cfg.models_dir}")
    logger.info(f"Outputs Directory: {custom_cfg.outputs_dir}")
    logger.info(f"Logs Directory: {custom_cfg.logs_dir}")
    logger.info("Stage 0: Foundation Mode (No fake AI / No mock generation)")
    logger.info("==================================================")

    # Enforce loopback binding
    host = "127.0.0.1"
    port = args.port or custom_cfg.port

    server = SidecarServer(host=host, port=port)

    # Register OS signals
    signal.signal(signal.SIGINT, lambda s, f: handle_signals(s, f, server))
    signal.signal(signal.SIGTERM, lambda s, f: handle_signals(s, f, server))
    if hasattr(signal, "SIGBREAK"):  # Windows Ctrl+Break
        signal.signal(signal.SIGBREAK, lambda s, f: handle_signals(s, f, server))

    # Start loopback server
    try:
        server.start(block=True)
    except Exception as e:
        logger.critical(f"Sidecar server fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
