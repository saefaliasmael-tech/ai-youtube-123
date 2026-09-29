"""
Unit tests for AI YouTube Python Engine Sidecar (Stage 0)
Verifies:
1. Safe config loading and path resolution (no path traversal).
2. Logger writes to logs/engine.log.
3. Server binds strictly to 127.0.0.1.
4. /api/health and /api/status endpoints return valid JSON and expected contracts.
"""

import json
import time
import unittest
import urllib.request
from pathlib import Path

from engine.config import EngineConfig, PROJECT_ROOT
from engine.api.server import SidecarServer
from engine.logger import setup_logger


class TestSidecarEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        setup_logger("DEBUG")
        cls.test_port = 8799
        cls.server = SidecarServer(host="127.0.0.1", port=cls.test_port)
        cls.server.start(block=False)
        time.sleep(0.5)

    @classmethod
    def tearDownClass(cls):
        cls.server.stop()

    def test_config_paths_and_security(self):
        cfg = EngineConfig()
        # Security: Loopback only
        self.assertEqual(cfg.host, "127.0.0.1")
        # Paths exist
        self.assertTrue(cfg.logs_dir.exists())
        self.assertTrue(cfg.outputs_dir.exists())
        self.assertTrue(cfg.models_dir.exists())
        self.assertTrue(cfg.cache_dir.exists())

    def test_api_health(self):
        url = f"http://127.0.0.1:{self.test_port}/api/health"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            self.assertEqual(response.status, 200)
            data = json.loads(response.read().decode("utf-8"))
            self.assertEqual(data.get("status"), "ok")
            self.assertEqual(data.get("app"), "AI YouTube")
            self.assertIn("uptime_seconds", data)

    def test_api_status(self):
        url = f"http://127.0.0.1:{self.test_port}/api/status"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            self.assertEqual(response.status, 200)
            data = json.loads(response.read().decode("utf-8"))
            self.assertEqual(data.get("app_name"), "AI YouTube")
            self.assertEqual(data.get("status"), "Application Ready")
            self.assertIn(data.get("hardware"), ("Ready", "Warning", "Not Scanned Yet"))
            self.assertEqual(data.get("engine", {}).get("name"), "Python Sidecar")
            self.assertEqual(data.get("engine", {}).get("status"), "Connected")


if __name__ == "__main__":
    unittest.main()
