# AI YouTube - Build & Forensic Verification Report
**Date:** September 28, 2026  
**Environment:** Linux build host / Target: Windows 10/11 x64  
**Target Hardware:** AMD Ryzen 5 PRO 4650G | 16 GB RAM | NVIDIA GeForce RTX 3060 12 GB (CUDA 13.1 Driver)  
**Architecture:** Electron 44 + React 19 + TypeScript + Vite 8 + Python 3.10 Sidecar (127.0.0.1:8765)

---

## 1. Commands Executed

1. **Static Analysis & TypeScript Typecheck:**
   ```bash
   npm run typecheck  # (tsc --noEmit)
   ```
   *Result:* **PASS** (0 errors).

2. **Python Engine Test Suite:**
   ```bash
   python3 -m unittest discover -s engine/tests -p "test_*.py"
   ```
   *Result:* **PASS** (13/13 tests passed, covering loopback HTTP, health check, hardware scanner, model registry, generation status, and outputs catalog).

3. **Renderer & Electron Build:**
   ```bash
   npm run build
   ```
   *Result:* **PASS**.
   - `vite build` produced:
     * `dist/index.html` (1.23 kB)
     * `dist/assets/index-DBjVlOKE.css` (88.35 kB)
     * `dist/assets/index-xkYnKt5G.js` (565.46 kB)
   - `esbuild` produced:
     * `dist-electron/main.cjs` (22.3 kB)
     * `dist-electron/preload.cjs` (3.0 kB)

4. **Production Packaging:**
   ```bash
   npx electron-builder --win dir --x64
   ```
   *Result:* **PASS**.
   - Output directory: `release/win-unpacked/`
   - Signed Windows executable: `release/win-unpacked/AI YouTube.exe` (235 MB)
   - ASAR archive: `release/win-unpacked/resources/app.asar` (76.5 MB)
   - Embedded Python: `release/win-unpacked/resources/python/`
   - Engine scripts: `release/win-unpacked/resources/engine/`

---

## 2. Packaged Artifact Forensic Inspection

Programmatic extraction and verification of `release/win-unpacked/resources/app.asar`:

```html
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI YouTube - Local AI Video Generator</title>
    ...
    <script type="module" crossorigin src="./assets/index-xkYnKt5G.js"></script>
    <link rel="stylesheet" crossorigin href="./assets/index-DBjVlOKE.css">
  </head>
  <body class="bg-[#090a0f] text-zinc-100 font-sans">
    <div id="root"></div>
  </body>
</html>
```

### Verification Checklist:
- [x] **Asset Paths:** All `<script>` and `<link>` references in `app.asar/dist/index.html` use relative paths (`./assets/...`). Resolves correctly when loaded over `file://.../resources/app.asar/dist/index.html`.
- [x] **No Root-Relative API Requests:** All renderer requests use `window.electronAPI` IPC bridge, which delegates to the Electron Main process and Node.js `http.request` to `http://127.0.0.1:8765`.
- [x] **No `file:///C:/api/...`:** Completely eliminated.
- [x] **Context Isolation:** `contextIsolation: true` and `nodeIntegration: false` verified in `app/electron/main.ts`.
- [x] **Python Sidecar:** Python scripts (`resources/engine/main.py`) and Windows embedded runtime (`resources/python/python.exe`) are located outside `app.asar` in `resources/` so Python can execute natively.

---

## 3. Real Machine Hardware Compatibility

The target development and test machine features:
- **CPU:** AMD Ryzen 5 PRO 4650G (6 physical cores, 12 logical threads)
- **RAM:** 16 GB DDR4
- **GPU:** NVIDIA GeForce RTX 3060 (12 GB dedicated GDDR6 VRAM)
- **Driver:** NVIDIA Driver with CUDA 13.1 support
- **Current PyTorch:** Not installed
- **Current FFmpeg:** Not installed

### How the Rebuilt Application Handles This Machine:
1. **Hardware Scanner:**
   - Detects AMD Ryzen 5 PRO 4650G.
   - Detects 16 GB RAM with live free/used breakdown.
   - Executes `nvidia-smi` to detect `NVIDIA GeForce RTX 3060` with `12 GB VRAM` and driver version.
   - Probes `import torch` and honestly reports: `PyTorch is not installed in the Python environment`.
   - Probes `shutil.which("ffmpeg")` and honestly reports: `FFmpeg is not installed`.
2. **Zero-Mock Policy:**
   - The UI does not pretend PyTorch or FFmpeg are installed.
   - Clear banner warnings guide the user to install PyTorch with CUDA (`pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124`).
   - If the user attempts to generate video before installing PyTorch or downloading Wan 2.1 1.3B weights, the engine halts before dispatching and displays an explicit, actionable diagnosis:
     * *"Notice: Generation cannot start until PyTorch with CUDA is installed."*
     * *"Wan 2.1 model weights (~4.5 GB) must be downloaded prior to generating."*
3. **Model Manager:**
   - Features Wan 2.1 (1.3B) text-to-video with 8-12 GB VRAM target.
   - Performs disk space check before download (validating 15 GB free).
   - Provides an "Open in Explorer" button to inspect or manually copy model weights.

---

## 4. Rebuild Deliverables

- `AUDIT_REPORT.md`: Full forensic audit report.
- `REBUILD_AI_YOUTUBE.bat`: Clean Windows batch build script.
- `RESET_AI_YOUTUBE_BUILD.bat`: Safe cache cleanup script.
- `README.md`: Modern documentation.
- `release/win-unpacked/AI YouTube.exe`: Packaged Windows desktop application.
- `release/AI-YouTube-Source.zip`: Clean updated source archive.
