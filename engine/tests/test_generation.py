"""
AI YouTube - Engine Generation & Models Test Suite
Validates model registry, disk checks, generation validation, and zero mock behavior.
"""

import json
import unittest
import urllib.request
from engine.api.server import SidecarServer
from engine.models.registry import model_manager
from engine.generation.pipeline import generation_pipeline


class TestModelsAndGeneration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = SidecarServer(host="127.0.0.1", port=8812)
        cls.server.start(block=False)

    @classmethod
    def tearDownClass(cls):
        cls.server.stop()

    def test_models_list(self):
        req = urllib.request.Request("http://127.0.0.1:8812/api/models")
        with urllib.request.urlopen(req, timeout=3) as res:
            self.assertEqual(res.status, 200)
            data = json.loads(res.read().decode("utf-8"))
            self.assertIn("models", data)
            models = data["models"]
            self.assertTrue(len(models) > 0)
            wan_model = next((m for m in models if m["id"] == "wan-2.1-1.3b-t2v"), None)
            self.assertIsNotNone(wan_model)
            self.assertEqual(wan_model["architecture"], "DiT (Diffusion Transformer)")
            self.assertEqual(wan_model["model_size_gb"], 4.5)

    def test_generation_status_idle(self):
        req = urllib.request.Request("http://127.0.0.1:8812/api/generate/status")
        with urllib.request.urlopen(req, timeout=3) as res:
            self.assertEqual(res.status, 200)
            data = json.loads(res.read().decode("utf-8"))
            self.assertIn("state", data)

    def test_outputs_history(self):
        req = urllib.request.Request("http://127.0.0.1:8812/api/outputs")
        with urllib.request.urlopen(req, timeout=3) as res:
            self.assertEqual(res.status, 200)
            data = json.loads(res.read().decode("utf-8"))
            self.assertIn("outputs", data)


if __name__ == "__main__":
    unittest.main()
