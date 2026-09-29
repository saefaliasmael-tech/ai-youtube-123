"""
AI YouTube - Storage Location Test Suite
Validates custom storage root paths, subdirectories creation, and dynamic update via API.
"""

import json
import os
import shutil
import tempfile
import unittest
import urllib.request
from pathlib import Path
from engine.config import config
from engine.api.server import SidecarServer


class TestCustomStorageLocation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = SidecarServer(host="127.0.0.1", port=8833)
        cls.server.start(block=False)

    @classmethod
    def tearDownClass(cls):
        cls.server.stop()

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="ai_youtube_storage_test_")

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_set_storage_root_locally(self):
        custom_path = Path(self.temp_dir) / "CustomDrive_D"
        res = config.set_storage_root(custom_path)
        self.assertTrue(res["success"])
        self.assertEqual(str(config.storage_root), str(custom_path.resolve()))
        self.assertTrue(config.models_dir.exists())
        self.assertTrue(config.outputs_dir.exists())
        self.assertTrue(config.cache_dir.exists())
        self.assertEqual(config.models_dir, custom_path.resolve() / "models")
        self.assertEqual(config.outputs_dir, custom_path.resolve() / "outputs")
        self.assertEqual(config.cache_dir, custom_path.resolve() / "cache")

    def test_set_storage_root_via_api(self):
        custom_path = Path(self.temp_dir) / "CustomDrive_E"
        payload = json.dumps({"storage_root": str(custom_path)}).encode("utf-8")
        req = urllib.request.Request(
            "http://127.0.0.1:8833/api/config/storage",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=3) as res:
            self.assertEqual(res.status, 200)
            data = json.loads(res.read().decode("utf-8"))
            self.assertTrue(data.get("success"))
            self.assertEqual(data.get("storage_root"), str(custom_path.resolve()))

        # Verify GET /api/config reflects the new storage
        req2 = urllib.request.Request("http://127.0.0.1:8833/api/config")
        with urllib.request.urlopen(req2, timeout=3) as res2:
            self.assertEqual(res2.status, 200)
            cfg_data = json.loads(res2.read().decode("utf-8"))
            self.assertEqual(cfg_data.get("storage_root"), str(custom_path.resolve()))
            self.assertEqual(cfg_data.get("paths", {}).get("models_dir"), str(custom_path.resolve() / "models"))


if __name__ == "__main__":
    unittest.main()
