"""
AI YouTube - Engine Configuration Module
Stage 0 & 1 & Production Packaging
Handles path resolution, Windows-safe paths, Unicode paths, and validates configurations.
Separates read-only Application Resources from writable User Data directories.
"""

from __future__ import annotations
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict

# Root directory of the AI YouTube project (read-only resources)
ENGINE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = ENGINE_DIR.parent

DEFAULT_CONFIG_PATH = PROJECT_ROOT / "config" / "app_config.json"


class EngineConfig:
    def __init__(self, config_path: Path | str | None = None, user_data_dir: Path | str | None = None):
        if user_data_dir:
            self.user_data_dir = Path(user_data_dir)
        elif os.environ.get("AI_YOUTUBE_USER_DATA"):
            self.user_data_dir = Path(os.environ["AI_YOUTUBE_USER_DATA"])
        else:
            self.user_data_dir = PROJECT_ROOT

        if config_path:
            self.config_path = Path(config_path)
        else:
            user_cfg = self.user_data_dir / "config" / "app_config.json"
            if user_cfg.exists():
                self.config_path = user_cfg
            elif DEFAULT_CONFIG_PATH.exists():
                self.config_path = DEFAULT_CONFIG_PATH
            else:
                self.config_path = user_cfg

        self.data: Dict[str, Any] = {}
        self.load()

    def load(self) -> None:
        """Load configuration from JSON file with safe fallbacks and UTF-8 encoding."""
        if self.config_path.exists():
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    self.data = json.load(f)
            except Exception as e:
                sys.stderr.write(f"[Config Error] Failed to read {self.config_path}: {e}\n")
                self.data = self._default_config()
        else:
            self.data = self._default_config()

        self._validate_and_sanitize()

    def _default_config(self) -> Dict[str, Any]:
        return {
            "app_name": "AI YouTube",
            "app_version": "0.1.0",
            "environment": "development",
            "storage_root": None,
            "sidecar": {
                "host": "127.0.0.1",
                "port": 8765,
                "startup_timeout_seconds": 15
            },
            "paths": {
                "storage_root": None,
                "models_dir": "models",
                "outputs_dir": "outputs",
                "logs_dir": "logs",
                "cache_dir": "cache"
            },
            "hardware": {
                "selected_gpu": None,
                "status": "Not Scanned Yet"
            },
            "settings": {
                "preset": "standard",
                "auto_start_sidecar": True,
                "log_level": "INFO",
                "language": "ar"
            },
            "language": "ar"
        }

    def _validate_and_sanitize(self) -> None:
        """Security validation: force localhost binding and safe path resolution."""
        # Security: strictly bind to loopback address (127.0.0.1)
        sidecar = self.data.setdefault("sidecar", {})
        sidecar["host"] = "127.0.0.1"
        try:
            port = int(sidecar.get("port", 8765))
            if port < 1024 or port > 65535:
                port = 8765
        except (ValueError, TypeError):
            port = 8765
        sidecar["port"] = port

        # Path resolution: Support user-selected custom storage root on any disk
        custom_root = self.data.get("storage_root") or self.data.get("paths", {}).get("storage_root")
        if custom_root and str(custom_root).strip():
            root_dir = Path(custom_root).resolve()
        else:
            root_dir = self.user_data_dir.resolve()

        try:
            root_dir.mkdir(parents=True, exist_ok=True)
        except Exception:
            pass

        models_dir = (root_dir / "models").resolve()
        outputs_dir = (root_dir / "outputs").resolve()
        cache_dir = (root_dir / "cache").resolve()
        logs_dir = (self.user_data_dir / "logs").resolve()

        for d in [models_dir, outputs_dir, cache_dir, logs_dir]:
            try:
                d.mkdir(parents=True, exist_ok=True)
            except Exception:
                pass

        paths = self.data.setdefault("paths", {})
        self.data["storage_root"] = str(root_dir)
        paths["storage_root"] = str(root_dir)
        paths["models_dir"] = str(models_dir)
        paths["outputs_dir"] = str(outputs_dir)
        paths["cache_dir"] = str(cache_dir)
        paths["logs_dir"] = str(logs_dir)

    @property
    def host(self) -> str:
        return "127.0.0.1"

    @property
    def port(self) -> int:
        return int(self.data.get("sidecar", {}).get("port", 8765))

    @property
    def storage_root(self) -> Path:
        val = self.data.get("storage_root") or self.data.get("paths", {}).get("storage_root")
        if val:
            return Path(val)
        return self.user_data_dir

    @property
    def logs_dir(self) -> Path:
        return Path(self.data["paths"]["logs_dir"])

    @property
    def outputs_dir(self) -> Path:
        return Path(self.data["paths"]["outputs_dir"])

    @property
    def models_dir(self) -> Path:
        return Path(self.data["paths"]["models_dir"])

    @property
    def cache_dir(self) -> Path:
        return Path(self.data["paths"]["cache_dir"])

    def set_storage_root(self, new_root: str | Path) -> Dict[str, Any]:
        """
        Dynamically updates the root storage path to any custom user-selected folder on any drive.
        Creates subdirectories: <new_root>/models, <new_root>/outputs, <new_root>/cache.
        Does NOT delete or move old files.
        Persists change into app_config.json.
        """
        resolved_root = Path(new_root).resolve()
        resolved_root.mkdir(parents=True, exist_ok=True)

        models_path = (resolved_root / "models").resolve()
        outputs_path = (resolved_root / "outputs").resolve()
        cache_path = (resolved_root / "cache").resolve()

        models_path.mkdir(parents=True, exist_ok=True)
        outputs_path.mkdir(parents=True, exist_ok=True)
        cache_path.mkdir(parents=True, exist_ok=True)

        self.data["storage_root"] = str(resolved_root)
        paths = self.data.setdefault("paths", {})
        paths["storage_root"] = str(resolved_root)
        paths["models_dir"] = str(models_path)
        paths["outputs_dir"] = str(outputs_path)
        paths["cache_dir"] = str(cache_path)

        # Persist to JSON
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(self.data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            sys.stderr.write(f"[Config Error] Failed to write storage_root to {self.config_path}: {e}\n")

        # Notify model manager and generation pipeline
        try:
            from engine.models.registry import model_manager
            model_manager.set_models_dir(models_path)
        except Exception:
            pass

        try:
            from engine.generation.pipeline import generation_pipeline
            generation_pipeline.set_outputs_dir(outputs_path)
        except Exception:
            pass

        return {
            "success": True,
            "storage_root": str(resolved_root),
            "models_dir": str(models_path),
            "outputs_dir": str(outputs_path),
            "cache_dir": str(cache_path)
        }

    @property
    def language(self) -> str:
        lang = self.data.get("language") or self.data.get("settings", {}).get("language", "ar")
        return lang if lang in ("ar", "en") else "ar"

    def save_language(self, lang: str) -> None:
        """Safely saves selected language ('ar' or 'en') to app_config.json."""
        if lang not in ("ar", "en"):
            return
        self.data["language"] = lang
        self.data.setdefault("settings", {})["language"] = lang
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(self.data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            sys.stderr.write(f"[Config Error] Failed to write language to {self.config_path}: {e}\n")

    def to_dict(self) -> Dict[str, Any]:
        return self.data


# Singleton instance
config = EngineConfig()
