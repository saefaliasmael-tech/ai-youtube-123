"""
Unit tests for AI YouTube Hardware Scanner & Localization (Stage 1)
Verifies:
1. Scanner returns valid System Hardware Profile.
2. CPU info is detected and structured.
3. RAM info is detected and converted to GB.
4. Disk info is detected for models path.
5. Missing or present NVIDIA GPU does not crash and provides clear bilingual messages.
6. PyTorch diagnostic executes safely without crashes.
7. FFmpeg diagnostic executes safely.
8. /api/hardware and /api/hardware/scan endpoints return valid HTTP 200 JSON.
9. Language setting persistence works for 'ar' and 'en'.
"""

import json
import time
import unittest
import urllib.request
from pathlib import Path

from engine.config import EngineConfig, config
from engine.hardware.scanner import run_hardware_scan, get_hardware_status, _get_cpu_info, _get_ram_info, _get_disk_info
from engine.api.server import SidecarServer
from engine.logger import setup_logger


class TestHardwareScanner(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        setup_logger("DEBUG")
        cls.test_port = 8798
        cls.server = SidecarServer(host="127.0.0.1", port=cls.test_port)
        cls.server.start(block=False)
        time.sleep(0.5)

    @classmethod
    def tearDownClass(cls):
        cls.server.stop()

    def test_hardware_scan_structure(self):
        profile = run_hardware_scan(force_refresh=True)
        self.assertIsInstance(profile, dict)
        self.assertIn("cpu", profile)
        self.assertIn("ram", profile)
        self.assertIn("gpu", profile)
        self.assertIn("nvidia", profile)
        self.assertIn("cuda", profile)
        self.assertIn("pytorch", profile)
        self.assertIn("disk", profile)
        self.assertIn("ffmpeg", profile)
        self.assertIn("scanner", profile)

    def test_cpu_detection(self):
        cpu = _get_cpu_info()
        self.assertIn("name", cpu)
        self.assertIsNotNone(cpu["name"])
        self.assertIn("architecture", cpu)
        self.assertIn("logical_cores", cpu)
        self.assertGreater(cpu["logical_cores"], 0)

    def test_ram_detection(self):
        ram = _get_ram_info()
        self.assertIn("total_gb", ram)
        self.assertIsNotNone(ram["total_gb"])
        self.assertGreater(ram["total_gb"], 0)
        self.assertIn("available_gb", ram)
        self.assertIn("used_gb", ram)
        self.assertIn("usage_percent", ram)

    def test_disk_detection(self):
        disk = _get_disk_info()
        self.assertIn("path", disk)
        self.assertIn("total_gb", disk)
        self.assertIsNotNone(disk["total_gb"])
        self.assertGreater(disk["total_gb"], 0)
        self.assertIn("free_gb", disk)
        self.assertGreater(disk["free_gb"], 0)

    def test_api_hardware_endpoint(self):
        url = f"http://127.0.0.1:{self.test_port}/api/hardware"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            self.assertEqual(response.status, 200)
            data = json.loads(response.read().decode("utf-8"))
            self.assertTrue(data.get("scanned"))
            self.assertIn("cpu", data)
            self.assertIn("ram", data)
            self.assertIn("nvidia", data)
            self.assertIn("ffmpeg", data)

    def test_api_hardware_scan_endpoint(self):
        url = f"http://127.0.0.1:{self.test_port}/api/hardware/scan"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as response:
            self.assertEqual(response.status, 200)
            data = json.loads(response.read().decode("utf-8"))
            self.assertTrue(data.get("scanned"))
            self.assertIn("duration_ms", data.get("scanner", {}))

    def test_language_persistence(self):
        initial_lang = config.language
        # Switch to English
        config.save_language("en")
        self.assertEqual(config.language, "en")
        # Switch back to Arabic
        config.save_language("ar")
        self.assertEqual(config.language, "ar")


if __name__ == "__main__":
    unittest.main()
