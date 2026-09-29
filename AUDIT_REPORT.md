# AI YouTube - Comprehensive Forensic Project Audit Report
**Date:** September 28, 2026  
**Auditor:** AI YouTube Core Engineering Engine  
**Project:** AI YouTube (Local Windows AI Video Generator)  
**Target Environment:** Windows 10/11 x64 | AMD Ryzen 5 PRO 4650G | 16 GB RAM | NVIDIA GeForce RTX 3060 12 GB (CUDA 13.1 Driver) | Offline-first / Local-first

---

## Executive Summary
A complete forensic inspection of every source file, configuration file, packaging script, and build artifact was performed across the workspace. The application was previously assembled through piecemeal hotfixes addressing isolated symptoms (such as `ready-to-show` window visibility, `base: './'` asset paths, and relative `/api` URLs). While individual fixes addressed localized crashes, the overall codebase lacked a unified, production-grade architecture for:
1. **Full-lifecycle local video generation (Wan 2.1 1.3B / small local text-to-video pipeline)**.
2. **Deterministic IPC bridge covering all desktop actions (opening folders, reading logs, managing models, queueing generation jobs)**.
3. **Model management with strict disk/VRAM verification (preventing out-of-memory or out-of-disk crashes)**.
4. **Resilient zero-mock hardware diagnostic reporting that accurately communicates machine state (e.g. RTX 3060 detected, CUDA driver ready, PyTorch not yet installed, FFmpeg not yet installed)**.

This report catalogs all architectural findings and lays out the blueprint for the clean rebuild.

---

## Section A: Current Architecture Overview
The current repository consists of:
1. **Frontend / Renderer:**
   - React 19 + TypeScript + Vite 8 + Tailwind CSS 4.
   - Entry point: `index.html` -> `src/main.tsx` -> `src/App.tsx` -> `app/renderer/App.tsx`.
   - Internationalization (i18n): Custom React Context supporting Arabic (RTL) and English (LTR).
   - Communication: `app/renderer/services/engineApi.ts` combining Electron `window.electronAPI` IPC bridge with direct HTTP fetch fallback.
2. **Desktop Shell:**
   - Electron 44 with Node 20 / Chromium 134.
   - Main process: `app/electron/main.ts` compiled via `esbuild` to `dist-electron/main.cjs`.
   - Preload script: `app/electron/preload.ts` compiled via `esbuild` to `dist-electron/preload.cjs`.
   - Sidecar manager: `app/electron/sidecar.ts` spawning Python runtime from `resources/python` or local venv.
3. **Backend / Engine Sidecar:**
   - Python 3.10 HTTP loopback server strictly bound to `127.0.0.1:8765`.
   - Hardware detection: `engine/hardware/scanner.py` using `winreg`, `wmic`, `ctypes.windll`, `nvidia-smi`, `shutil`, `subprocess`.
   - Model & generation modules: Stubs in `engine/models/`, `engine/jobs/`, `engine/generation/` without active endpoints.
4. **Packaging & Build System:**
   - `electron-builder` producing `release/win-unpacked`, NSIS installer, and Portable executable.
   - Embedded Python 3.10 Windows runtime packaged under `resources/python` via `extraResources`.

---

## Section B: All Detected Bugs & Root Causes

### 1. Hardcoded Linux Paths in Configuration
- **File:** `config/app_config.json` (lines 11–14)
- **Problem:** Paths were hardcoded as:
  ```json
  "paths": {
    "models_dir": "/app/applet/models",
    "outputs_dir": "/app/applet/outputs",
    "logs_dir": "/app/applet/logs",
    "cache_dir": "/app/applet/cache"
  }
  ```
- **Why it is a problem:** On a Windows machine (e.g., `C:\Program Files\AI YouTube`), these Linux paths do not exist. While `engine/config.py` attempted a fallback resolution, if `app_config.json` was copied to the user data directory, the absolute Linux paths caused runtime failures or attempted writes to root directories.
- **Solution:** Use relative path keys (`"models"`, `"outputs"`, `"logs"`, `"cache"`) and have both Electron (`app.getPath('userData')`) and Python resolve them strictly under the writable user data directory or project root.

### 2. Duplicated React Entry Points
- **Files:** `src/App.tsx` and `app/renderer/App.tsx`; `src/main.tsx` and `app/renderer/main.tsx`
- **Problem:** `index.html` referenced `/src/main.tsx`, which imported `src/App.tsx`, which merely re-exported `app/renderer/App.tsx`. Meanwhile, `app/renderer/main.tsx` sat as an unused duplicate entry file.
- **Why it is a problem:** Creates confusion during Vite bundling, dead code, and double-maintenance risk.
- **Solution:** Standardize on a clean, single canonical entry point: `src/main.tsx` pointing to the unified App component.

### 3. Missing Generator & Model Endpoints in Python Sidecar
- **File:** `engine/api/server.py`
- **Problem:** The Python HTTP server only implemented `/api/health`, `/api/status`, `/api/config`, `/api/hardware`, `/api/hardware/scan`, `/api/config/language`, and `/api/shutdown`. It had zero endpoints for model listing, model downloading, video generation job dispatch, generation status polling, job cancellation, or output listing.
- **Why it is a problem:** The application could not fulfill its primary mission (local video generation) or manage Wan 2.1 1.3B models.
- **Solution:** Implement `/api/models`, `/api/models/download`, `/api/generate`, `/api/generate/status`, `/api/generate/cancel`, `/api/outputs`, and `/api/logs` in the Python sidecar.

### 4. Incomplete Preload IPC Bridge
- **File:** `app/electron/preload.ts` & `app/electron/main.ts`
- **Problem:** The IPC bridge only exposed 7 methods (`getEngineStatus`, `startEngine`, `stopEngine`, `getAppConfig`, `getHardwareStatus`, `scanHardware`, `saveConfig`). Desktop capabilities such as opening the native Windows Explorer outputs folder (`shell.openPath`), reading application logs, listing model files, and cancelling generations were completely missing from the bridge.
- **Why it is a problem:** Forced the renderer to either attempt unsafe direct actions or left UI features completely unimplemented.
- **Solution:** Rebuild `preload.ts` and `main.ts` with a comprehensive, strongly-typed Electron API supporting full generation, folder opening, log viewing, and model control.

---

## Section C: Risky & Fragile Code Patterns

1. **Direct Renderer `fetch()` Fallbacks:**
   - Any fallback in the renderer that does `fetch('/api/...')` will fail immediately with `net::ERR_FILE_NOT_FOUND` in production because packaged Electron runs on `file://`.
   - **Resolution:** All renderer calls MUST go through `window.electronAPI` IPC bridge first. Any secondary HTTP fallback must explicitly target `http://127.0.0.1:8765`.
2. **Unbounded Child Process Spawns:**
   - In `app/electron/sidecar.ts`, if Python failed to start or hung during boot, polling timeouts were fragile.
   - **Resolution:** Add strict process PID tracking, handshake token detection (`AI_YOUTUBE_SIDECAR_READY`), and graceful kill tree logic on Windows (`taskkill /F /T /PID`).
3. **CORS Headers in Loopback Server:**
   - `engine/api/server.py` originally hardcoded `Access-Control-Allow-Origin: http://127.0.0.1:3000`. When accessed directly from `file://` or other loopback ports, browser fetch calls would fail with CORS errors.
   - **Resolution:** Set `Access-Control-Allow-Origin: *` for local loopback requests since the server strictly binds to `127.0.0.1`.

---

## Section D: Electron Analysis & Hardening
- **Security:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true` are enabled and must be strictly maintained.
- **Window Lifecycle:** In `app/electron/main.ts`, the window creation lifecycle now includes explicit `ready-to-show` handlers and a 5-second fallback timeout to prevent blank/hidden windows on slow system boots.
- **Native Desktop Integration:** Adding `shell.openPath` allows users to click "Open Output Folder" and "Open Models Folder" to open the actual Windows File Explorer directly to the designated directories.

---

## Section E: Renderer Analysis & UI Redesign
- **Current State:** A single-page dashboard displaying the hardware card and status card.
- **Required Production Architecture:**
  - Modern, clean, dark-themed responsive layout with Arabic (RTL) and English (LTR) language switching.
  - Multi-tab or modular navigation:
    1. **Dashboard:** High-level system overview, engine health, quick actions.
    2. **Hardware:** Full real-time diagnostic card (CPU, RAM, RTX 3060 12GB VRAM, CUDA, PyTorch, FFmpeg, Disk). Zero mock data.
    3. **Models:** Model Manager for Wan 2.1 1.3B (weight info, VRAM footprint, disk requirement, download trigger with disk verification).
    4. **Generate:** Text-to-video workstation (prompt, resolution, duration 3-5s, seed, steps, guidance scale, model selector, real generation status progression, no fake percentages).
    5. **History & Outputs:** Video gallery, video playback modal, timestamp, metadata, "Open in Explorer", delete.
    6. **Logs:** Live console log stream with filtering by component tags (`[Electron]`, `[Renderer]`, `[Python]`, `[Engine]`, `[Hardware]`, `[Generation]`).
    7. **Settings:** Storage paths, language switch, engine port, auto-start toggle.

---

## Section F: Python Sidecar Architecture
- **Process Model:** Standard Python subprocess spawned by Electron Main.
- **Communication:** Standard loopback HTTP (127.0.0.1) on port 8765.
- **Clean Shutdown:** Electron sends `POST /api/shutdown` on app quit, followed by OS signal termination if unresponsive after 1000ms.
- **Real Execution Pipeline:**
  - When PyTorch and model weights are present, execution is dispatched to the torch pipeline.
  - When PyTorch or weights are absent, the engine reports the exact missing dependency (e.g. `PyTorch is not installed in the Python environment`, `Wan 2.1 model weights (1.3B) are not downloaded`). It **never** fabricates a generated video or simulates progress.

---

## Section G: Hardware Scanner Verification
The hardware scanner in `engine/hardware/scanner.py` adheres to the strict "No Mocks" mandate:
- **CPU:** Real physical cores, logical threads, frequency, and architecture via Windows WMIC / registry / `/proc/cpuinfo`.
- **RAM:** Accurate total, available, used, and percentage using Windows API `GlobalMemoryStatusEx` and `/proc/meminfo`.
- **NVIDIA GPU & VRAM:** Scans via `nvidia-smi` CLI: retrieves device name, driver version, total MB, used MB, free MB, utilization %. For the test machine, accurately surfaces `NVIDIA GeForce RTX 3060` with `12 GB VRAM`.
- **CUDA:** Driver CUDA version parsed from `nvidia-smi`.
- **PyTorch:** Probes real Python environment. Accurately reports `Not Installed` if torch is absent.
- **FFmpeg:** Probes PATH and standard directories. Accurately reports `Not Found` if ffmpeg binary is absent.
- **Disk:** Queries real disk usage via `shutil.disk_usage` for the designated models/outputs directory.

---

## Section H: Build & Release Packaging
- **`electron-builder`:** Generates `win-unpacked`, `AI-YouTube-Setup-x64.exe` (NSIS), and `AI-YouTube-Portable-x64.exe`.
- **Packaging Verification:** `app.asar` contains `dist/` with relative asset links (`./assets/...`). Python runtime and engine scripts are packaged in `resources/` outside `app.asar` so Python can execute them directly.
- **Build Scripts:** `package.json` must provide standardized scripts:
  - `npm run dev`: full-stack development with Vite + Express proxy.
  - `npm run dev:electron`: launch Electron in development mode.
  - `npm run build`: compile renderer (Vite) and Electron (esbuild).
  - `npm run package:win`: full build + electron-builder win unpacked.
  - `npm run package:installer`: NSIS + portable packaging.
  - `npm run typecheck`: TypeScript verification with zero errors.
  - `npm run clean`: wipe generated dist and release folders.

---

## Section I: Files to Delete, Replace, and Retain

| Action | File | Reason |
|---|---|---|
| **Retain & Enhance** | `engine/hardware/scanner.py` | Proven real-world hardware scanner logic; enhance with structured typing and fast query cache. |
| **Replace** | `config/app_config.json` | Remove hardcoded Linux container paths; use clean relative paths resolved by runtime. |
| **Replace** | `app/electron/main.ts` | Expand with comprehensive typed IPC handlers (shell open, models, logs, generation). |
| **Replace** | `app/electron/preload.ts` | Fully type and expose complete desktop API. |
| **Replace** | `engine/api/server.py` | Implement full endpoints for models, generation queue, output files, logs, and CORS. |
| **Replace** | `app/renderer/services/engineApi.ts` | Route all desktop operations through the IPC bridge with fallback. |
| **Replace** | `app/renderer/App.tsx` | Upgrade from basic stage 1 dashboard to full modular workstation (Dashboard, Hardware, Models, Generate, History, Logs, Settings). |
| **Delete** | `app/renderer/main.tsx` | Unused duplicate of `src/main.tsx`. |
| **Create** | `REBUILD_AI_YOUTUBE.bat` | Complete Windows batch rebuild script with process termination, clean artifact wipe, typecheck, build, and package verification. |
| **Create** | `RESET_AI_YOUTUBE_BUILD.bat` | Safe cleanup script for generated build artifacts without deleting source code. |
| **Create** | `BUILD_REPORT.md` | Verification log of build execution, tests, package verification, and runtime diagnostics. |

---

## Section J: Recommended Clean Architecture
```
                         +-----------------------------------+
                         |          Electron Main            |
                         |   (app/electron/main.ts)          |
                         |  - Window lifecycle & sandbox     |
                         |  - Native OS integration          |
                         |  - IPC Main Handlers              |
                         |  - Sidecar Process Supervisor     |
                         +-----------------+-----------------+
                                           |
                 IPC Channels              |  Process Spawn / Loopback HTTP
        (getHardwareStatus, scanHardware,  |  (http://127.0.0.1:8765)
         startGeneration, openFolder...)   |
                                           |
+-----------------------------------+      |      +-----------------------------------+
|          React Renderer           |      |      |          Python Sidecar           |
|    (src/main.tsx, App.tsx)        |<-----+----->|      (engine/main.py, api/)       |
|  - Modern Dark UI (Arabic/English)|             |  - Loopback API (127.0.0.1:8765)  |
|  - Dashboard & System Monitor     |             |  - Real Hardware Scanner          |
|  - Hardware Diagnostics           |             |  - Wan 2.1 Model Registry         |
|  - Model Management (Wan 2.1)     |             |  - Generation Pipeline / Job Queue|
|  - Text-to-Video Studio           |             |  - Output Video Store & Metadata  |
|  - Output Video Gallery & Player  |             |  - Structured Logging             |
|  - Real-time Log Stream Viewer    |             +-----------------------------------+
+-----------------------------------+
```

With this audit established, the clean rebuild commences according to the detailed steps.
