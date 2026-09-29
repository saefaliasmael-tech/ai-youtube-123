"""
AI YouTube - Hardware Scanner Module
Stage 1: Hardware Scanner + Real Windows/Linux Hardware Diagnostics
Extracts genuine CPU, RAM, NVIDIA GPU, VRAM, CUDA, PyTorch, FFmpeg, and Disk metrics.
Zero mock data. Safe error isolation for every component.
"""

from __future__ import annotations
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from engine.config import config
from engine.logger import logger


def _get_cpu_info() -> Dict[str, Any]:
    """Scan CPU real metrics (Name, physical/logical cores, architecture, frequency)."""
    cpu_name = "Unknown"
    physical_cores = None
    logical_cores = os.cpu_count()
    architecture = platform.machine()
    frequency_mhz = None

    # Try Windows Registry / WMIC
    if sys.platform == "win32":
        try:
            import winreg
            key = winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"HARDWARE\DESCRIPTION\System\CentralProcessor\0"
            )
            val, _ = winreg.QueryValueEx(key, "ProcessorNameString")
            if val:
                cpu_name = str(val).strip()
            winreg.CloseKey(key)
        except Exception:
            pass

        if cpu_name == "Unknown":
            try:
                out = subprocess.run(
                    ["wmic", "cpu", "get", "name"],
                    capture_output=True,
                    text=True,
                    timeout=3
                )
                if out.returncode == 0:
                    lines = [l.strip() for l in out.stdout.splitlines() if l.strip() and "Name" not in l]
                    if lines:
                        cpu_name = lines[0]
            except Exception:
                pass

    # Try Linux /proc/cpuinfo
    elif sys.platform.startswith("linux"):
        vendor_id = ""
        cpu_family = ""
        cpu_model = ""
        try:
            if os.path.exists("/proc/cpuinfo"):
                with open("/proc/cpuinfo", "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        l = line.strip().lower()
                        if l.startswith("model name"):
                            parsed_name = line.split(":", 1)[1].strip()
                            if parsed_name and parsed_name.lower() != "unknown":
                                cpu_name = parsed_name
                        elif l.startswith("vendor_id"):
                            vendor_id = line.split(":", 1)[1].strip()
                        elif l.startswith("cpu family"):
                            cpu_family = line.split(":", 1)[1].strip()
                        elif l.startswith("model") and not l.startswith("model name"):
                            cpu_model = line.split(":", 1)[1].strip()
                        elif "cpu mhz" in l and frequency_mhz is None:
                            try:
                                frequency_mhz = round(float(line.split(":", 1)[1].strip()), 1)
                            except Exception:
                                pass
            if cpu_name in ("Unknown", "unknown", "") and vendor_id:
                details = f" Family {cpu_family} Model {cpu_model}" if cpu_family and cpu_model else ""
                cpu_name = f"{vendor_id}{details} ({architecture})"
        except Exception:
            pass

    # Fallback to platform.processor()
    if cpu_name == "Unknown" or not cpu_name:
        proc = platform.processor()
        if proc:
            cpu_name = proc

    # Physical core estimation
    try:
        if sys.platform.startswith("linux") and os.path.exists("/proc/cpuinfo"):
            core_ids = set()
            with open("/proc/cpuinfo", "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    if line.lower().startswith("core id"):
                        core_ids.add(line.split(":", 1)[1].strip())
            if core_ids:
                physical_cores = len(core_ids)
    except Exception:
        pass

    if physical_cores is None and logical_cores:
        # If hyperthreading is typical 2 threads per core, or default to logical
        physical_cores = max(1, logical_cores // 2) if logical_cores > 1 else 1

    return {
        "status": "Ready",
        "name": cpu_name,
        "architecture": architecture,
        "physical_cores": physical_cores,
        "logical_cores": logical_cores,
        "frequency_mhz": frequency_mhz
    }


def _get_ram_info() -> Dict[str, Any]:
    """Scan RAM real metrics in GB and percentage."""
    total_bytes = None
    free_bytes = None

    if sys.platform == "win32":
        try:
            import ctypes
            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [
                    ("dwLength", ctypes.c_ulong),
                    ("dwMemoryLoad", ctypes.c_ulong),
                    ("ullTotalPhys", ctypes.c_ulonglong),
                    ("ullAvailPhys", ctypes.c_ulonglong),
                    ("ullTotalPageFile", ctypes.c_ulonglong),
                    ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong),
                    ("ullAvailVirtual", ctypes.c_ulonglong),
                    ("sullAvailExtendedVirtual", ctypes.c_ulonglong),
                ]
            stat = MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
                total_bytes = int(stat.ullTotalPhys)
                free_bytes = int(stat.ullAvailPhys)
        except Exception:
            pass

    elif sys.platform.startswith("linux"):
        try:
            if os.path.exists("/proc/meminfo"):
                mem = {}
                with open("/proc/meminfo", "r", encoding="utf-8") as f:
                    for line in f:
                        parts = line.split(":", 1)
                        if len(parts) == 2:
                            val = parts[1].strip().split()[0]
                            mem[parts[0].strip()] = int(val) * 1024
                if "MemTotal" in mem:
                    total_bytes = mem["MemTotal"]
                    # Prefer MemAvailable if present, else Free + Buffers + Cached
                    free_bytes = mem.get("MemAvailable", mem.get("MemFree", 0) + mem.get("Buffers", 0) + mem.get("Cached", 0))
        except Exception:
            pass

    if total_bytes is None or total_bytes <= 0:
        return {
            "status": "Warning",
            "total_gb": None,
            "available_gb": None,
            "used_gb": None,
            "usage_percent": None
        }

    free_bytes = free_bytes or 0
    used_bytes = max(0, total_bytes - free_bytes)
    total_gb = round(total_bytes / (1024 ** 3), 2)
    available_gb = round(free_bytes / (1024 ** 3), 2)
    used_gb = round(used_bytes / (1024 ** 3), 2)
    usage_percent = round((used_bytes / total_bytes) * 100, 1)

    return {
        "status": "Ready",
        "total_gb": total_gb,
        "available_gb": available_gb,
        "used_gb": used_gb,
        "usage_percent": usage_percent
    }


def _find_nvidia_smi() -> Optional[str]:
    """Find nvidia-smi executable on Windows or Linux."""
    # 1. Search in PATH
    which_path = shutil.which("nvidia-smi")
    if which_path and os.path.isfile(which_path):
        return which_path

    # 2. Search Windows standard locations
    if sys.platform == "win32":
        candidates = [
            r"C:\Windows\System32\nvidia-smi.exe",
            r"C:\Program Files\NVIDIA Corporation\NVSMI\nvidia-smi.exe",
            os.path.join(os.environ.get("SystemRoot", r"C:\Windows"), "System32", "nvidia-smi.exe"),
            os.path.join(os.environ.get("ProgramFiles", r"C:\Program Files"), "NVIDIA Corporation", "NVSMI", "nvidia-smi.exe"),
        ]
        for c in candidates:
            if os.path.isfile(c):
                return c

    return None


def _get_nvidia_and_cuda_info() -> tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Scans for NVIDIA GPU via nvidia-smi and evaluates CUDA diagnostic.
    Returns: (nvidia_dict, cuda_dict)
    """
    smi_path = _find_nvidia_smi()

    if not smi_path:
        nvidia_res = {
            "status": "Unavailable",
            "nvidia_available": False,
            "nvidia_smi_found": False,
            "gpu_count": 0,
            "gpus": [],
            "driver_version": None,
            "message_ar": "لم يتم العثور على بطاقة NVIDIA.",
            "message_en": "NVIDIA GPU not detected."
        }
        cuda_res = {
            "status": "Unavailable",
            "cuda_available": False,
            "driver_cuda_version": None,
            "message_ar": "CUDA غير متاح.",
            "message_en": "CUDA not available."
        }
        return nvidia_res, cuda_res

    # Query detailed GPU info
    try:
        cmd = [
            smi_path,
            "--query-gpu=index,name,driver_version,memory.total,memory.used,memory.free,utilization.gpu",
            "--format=csv,noheader,nounits"
        ]
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        if out.returncode != 0:
            raise RuntimeError(f"nvidia-smi returned exit code {out.returncode}: {out.stderr.strip()}")

        gpus: List[Dict[str, Any]] = []
        driver_ver: Optional[str] = None

        lines = [l.strip() for l in out.stdout.splitlines() if l.strip()]
        for line in lines:
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 7:
                idx = int(parts[0]) if parts[0].isdigit() else 0
                name = parts[1]
                driver_ver = parts[2]
                total_mb = float(parts[3])
                used_mb = float(parts[4])
                free_mb = float(parts[5])
                util_gpu = float(parts[6].replace("%", "").strip()) if parts[6] else 0.0

                gpus.append({
                    "index": idx,
                    "name": name,
                    "driver_version": driver_ver,
                    "total_vram_gb": round(total_mb / 1024, 2),
                    "used_vram_gb": round(used_mb / 1024, 2),
                    "free_vram_gb": round(free_mb / 1024, 2),
                    "gpu_utilization_percent": util_gpu
                })

        # Query driver CUDA version from header
        driver_cuda_version = None
        try:
            head_out = subprocess.run([smi_path], capture_output=True, text=True, timeout=4)
            if head_out.returncode == 0:
                match = re.search(r"CUDA Version:\s*([0-9.]+)", head_out.stdout)
                if match:
                    driver_cuda_version = match.group(1)
        except Exception:
            pass

        gpu_count = len(gpus)
        nvidia_available = gpu_count > 0

        # Aggregated raw VRAM
        total_vram_all = round(sum(g["total_vram_gb"] for g in gpus), 2) if gpus else 0.0
        used_vram_all = round(sum(g["used_vram_gb"] for g in gpus), 2) if gpus else 0.0
        free_vram_all = round(sum(g["free_vram_gb"] for g in gpus), 2) if gpus else 0.0
        avg_util = round(sum(g["gpu_utilization_percent"] for g in gpus) / gpu_count, 1) if gpu_count > 0 else 0.0

        nvidia_res = {
            "status": "Ready" if nvidia_available else "Unavailable",
            "nvidia_available": nvidia_available,
            "nvidia_smi_found": True,
            "smi_path": smi_path,
            "gpu_count": gpu_count,
            "gpus": gpus,
            "primary_gpu": gpus[0]["name"] if gpus else None,
            "driver_version": driver_ver,
            "total_vram_gb": total_vram_all,
            "used_vram_gb": used_vram_all,
            "free_vram_gb": free_vram_all,
            "gpu_utilization_percent": avg_util,
            "message_ar": f"تم العثور على {gpu_count} بطاقة NVIDIA ({gpus[0]['name']})" if gpus else "لم يتم العثور على بطاقات نشطة.",
            "message_en": f"Found {gpu_count} NVIDIA GPU(s) ({gpus[0]['name']})" if gpus else "No active NVIDIA GPUs found."
        }

        cuda_res = {
            "status": "Ready" if driver_cuda_version else "Available",
            "cuda_available": True,
            "driver_cuda_version": driver_cuda_version,
            "message_ar": f"CUDA متاح (إصدار المشغل: {driver_cuda_version})" if driver_cuda_version else "CUDA متاح عبر تعريف NVIDIA.",
            "message_en": f"CUDA available (Driver CUDA: {driver_cuda_version})" if driver_cuda_version else "CUDA available via NVIDIA Driver."
        }

        return nvidia_res, cuda_res

    except Exception as e:
        logger.warning(f"Error querying nvidia-smi: {e}")
        return {
            "status": "Error",
            "nvidia_available": False,
            "nvidia_smi_found": True,
            "gpu_count": 0,
            "gpus": [],
            "driver_version": None,
            "message_ar": f"تعذر قراءة معلومات بطاقة الرسوميات: {e}",
            "message_en": f"Unable to read GPU information: {e}"
        }, {
            "status": "Unavailable",
            "cuda_available": False,
            "driver_cuda_version": None,
            "message_ar": "CUDA غير متاح.",
            "message_en": "CUDA not available."
        }


def _get_pytorch_info() -> Dict[str, Any]:
    """Scan PyTorch installation safely without causing application crashes."""
    try:
        import torch  # type: ignore
        torch_ver = getattr(torch, "__version__", "Unknown")
        cuda_avail = bool(torch.cuda.is_available())
        torch_cuda_ver = getattr(getattr(torch, "version", None), "cuda", None)
        cudnn_ver = None
        try:
            cudnn_ver = str(torch.backends.cudnn.version()) if torch.backends.cudnn.is_available() else None
        except Exception:
            pass

        gpu_count = torch.cuda.device_count() if cuda_avail else 0
        gpu_names = [torch.cuda.get_device_name(i) for i in range(gpu_count)] if cuda_avail else []

        status = "Ready" if cuda_avail else "Warning"
        msg_ar = f"PyTorch مثبت (إصدار {torch_ver}) مع دعم CUDA." if cuda_avail else f"PyTorch مثبت (إصدار {torch_ver}) بدون دعم CUDA."
        msg_en = f"PyTorch installed (v{torch_ver}) with CUDA." if cuda_avail else f"PyTorch installed (v{torch_ver}) without CUDA."

        return {
            "status": status,
            "pytorch_installed": True,
            "version": torch_ver,
            "cuda_available": cuda_avail,
            "torch_cuda_version": torch_cuda_ver,
            "cudnn_version": cudnn_ver,
            "gpu_count": gpu_count,
            "gpu_names": gpu_names,
            "message_ar": msg_ar,
            "message_en": msg_en
        }
    except ImportError:
        return {
            "status": "Not Installed",
            "pytorch_installed": False,
            "version": None,
            "cuda_available": False,
            "torch_cuda_version": None,
            "cudnn_version": None,
            "gpu_count": 0,
            "gpu_names": [],
            "message_ar": "PyTorch غير مثبت.",
            "message_en": "PyTorch not installed."
        }
    except Exception as e:
        return {
            "status": "Error",
            "pytorch_installed": False,
            "version": None,
            "cuda_available": False,
            "error": str(e),
            "message_ar": f"خطأ في فحص PyTorch: {e}",
            "message_en": f"Error scanning PyTorch: {e}"
        }


def _get_disk_info() -> Dict[str, Any]:
    """Scan disk containing application models and outputs."""
    target_path = config.models_dir
    target_path.mkdir(parents=True, exist_ok=True)

    try:
        total, used, free = shutil.disk_usage(str(target_path))
        total_gb = round(total / (1024 ** 3), 2)
        used_gb = round(used / (1024 ** 3), 2)
        free_gb = round(free / (1024 ** 3), 2)
        usage_percent = round((used / total) * 100, 1) if total > 0 else 0.0

        status = "Ready" if free_gb >= 15.0 else "Warning"
        return {
            "status": status,
            "path": str(target_path),
            "total_gb": total_gb,
            "used_gb": used_gb,
            "free_gb": free_gb,
            "usage_percent": usage_percent,
            "low_space_warning": free_gb < 15.0
        }
    except Exception as e:
        return {
            "status": "Error",
            "path": str(target_path),
            "total_gb": None,
            "used_gb": None,
            "free_gb": None,
            "usage_percent": None,
            "error": str(e)
        }


def _get_ffmpeg_info() -> Dict[str, Any]:
    """Scan if FFmpeg is installed and executable."""
    ffmpeg_path = shutil.which("ffmpeg")

    # On Windows, check common local locations if not in PATH
    if not ffmpeg_path and sys.platform == "win32":
        candidates = [
            r"C:\ffmpeg\bin\ffmpeg.exe",
            os.path.join(str(config.config_path.parent.parent), "tools", "ffmpeg", "bin", "ffmpeg.exe"),
        ]
        for c in candidates:
            if os.path.isfile(c):
                ffmpeg_path = c
                break

    if not ffmpeg_path:
        return {
            "status": "Not Found",
            "ffmpeg_available": False,
            "version": None,
            "path": None,
            "message_ar": "FFmpeg غير موجود.",
            "message_en": "FFmpeg not found."
        }

    try:
        out = subprocess.run([ffmpeg_path, "-version"], capture_output=True, text=True, timeout=4)
        if out.returncode == 0:
            first_line = out.stdout.splitlines()[0] if out.stdout else "ffmpeg version unknown"
            # Extract version like 6.1.1 or 4.4
            ver_match = re.search(r"version\s+([^\s]+)", first_line)
            version_str = ver_match.group(1) if ver_match else first_line

            return {
                "status": "Ready",
                "ffmpeg_available": True,
                "version": version_str,
                "path": ffmpeg_path,
                "message_ar": f"FFmpeg متاح ({version_str})",
                "message_en": f"FFmpeg available ({version_str})"
            }
        else:
            return {
                "status": "Warning",
                "ffmpeg_available": False,
                "version": None,
                "path": ffmpeg_path,
                "message_ar": "FFmpeg موجود لكنه أعاد خطأ أثناء الفحص.",
                "message_en": "FFmpeg is present but returned an error on check."
            }
    except Exception as e:
        return {
            "status": "Error",
            "ffmpeg_available": False,
            "version": None,
            "path": ffmpeg_path,
            "error": str(e),
            "message_ar": f"خطأ في فحص FFmpeg: {e}",
            "message_en": f"Error scanning FFmpeg: {e}"
        }


# Cache for fast re-reads without hammering WMI/OS
_last_scan_profile: Optional[Dict[str, Any]] = None


def run_hardware_scan(force_refresh: bool = True) -> Dict[str, Any]:
    """
    Executes a complete, real hardware scan on the system.
    Returns unified System Hardware Profile JSON.
    """
    global _last_scan_profile
    if not force_refresh and _last_scan_profile is not None:
        return _last_scan_profile

    start_time = time.time()
    logger.info(">>> Starting Hardware Scan (Stage 1)...")

    # 1. CPU
    cpu = _get_cpu_info()
    logger.info(f"Hardware Scanner: CPU detected: {cpu['name']} ({cpu['logical_cores']} threads, {cpu['architecture']})")

    # 2. RAM
    ram = _get_ram_info()
    logger.info(f"Hardware Scanner: RAM detected: {ram['total_gb']} GB (Available: {ram['available_gb']} GB, {ram['usage_percent']}%)")

    # 3. NVIDIA & CUDA
    nvidia, cuda = _get_nvidia_and_cuda_info()
    if nvidia["nvidia_available"]:
        logger.info(f"Hardware Scanner: NVIDIA detected: {nvidia['primary_gpu']} (Driver: {nvidia['driver_version']}, VRAM: {nvidia['total_vram_gb']} GB)")
    else:
        logger.info(f"Hardware Scanner: {nvidia['message_en']}")

    # 4. PyTorch
    pytorch = _get_pytorch_info()
    logger.info(f"Hardware Scanner: PyTorch: {pytorch['message_en']}")

    # 5. FFmpeg
    ffmpeg = _get_ffmpeg_info()
    logger.info(f"Hardware Scanner: FFmpeg: {ffmpeg['message_en']}")

    # 6. Disk
    disk = _get_disk_info()
    logger.info(f"Hardware Scanner: Disk at {disk.get('path')}: {disk.get('free_gb')} GB free of {disk.get('total_gb')} GB")

    duration_ms = round((time.time() - start_time) * 1000, 1)
    logger.info(f"<<< Hardware Scan completed in {duration_ms} ms.")

    # Determine overall status
    overall_status = "Ready"
    if not nvidia["nvidia_available"]:
        overall_status = "Warning"

    profile: Dict[str, Any] = {
        "status": "Ready",
        "scanned": True,
        "overall_status": overall_status,
        "cpu": cpu,
        "ram": ram,
        "gpu": {
            "name": nvidia.get("primary_gpu"),
            "count": nvidia.get("gpu_count", 0),
            "total_vram_gb": nvidia.get("total_vram_gb"),
            "used_vram_gb": nvidia.get("used_vram_gb"),
            "free_vram_gb": nvidia.get("free_vram_gb"),
            "gpu_utilization_percent": nvidia.get("gpu_utilization_percent"),
            "all_gpus": nvidia.get("gpus", []),
            "status": nvidia.get("status")
        },
        "nvidia": nvidia,
        "cuda": cuda,
        "pytorch": pytorch,
        "disk": disk,
        "ffmpeg": ffmpeg,
        "scanner": {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "duration_ms": duration_ms,
            "platform": "Windows" if sys.platform == "win32" else sys.platform.capitalize(),
            "python_version": platform.python_version()
        }
    }

    _last_scan_profile = profile
    return profile


def get_hardware_status() -> Dict[str, Any]:
    """
    Returns current hardware status for Stage 1.
    If already scanned, returns cached profile; otherwise performs initial scan.
    """
    global _last_scan_profile
    if _last_scan_profile is None:
        return run_hardware_scan(force_refresh=True)
    return _last_scan_profile
