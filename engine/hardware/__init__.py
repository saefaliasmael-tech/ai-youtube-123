"""Hardware detection and real system diagnostics package."""
from .scanner import get_hardware_status, run_hardware_scan

__all__ = ["get_hardware_status", "run_hardware_scan"]
