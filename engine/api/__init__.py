"""Local loopback API for communication between Electron shell and Python Sidecar."""
from .server import start_api_server, stop_api_server

__all__ = ["start_api_server", "stop_api_server"]
