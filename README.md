# AI YouTube — Local AI Video Generator for Windows

[![Target](https://img.shields.io/badge/Target-Windows%2010%2F11%20x64-blue.svg)](https://microsoft.com/windows)
[![GPU](https://img.shields.io/badge/GPU-NVIDIA%20RTX%203060%2012GB-76B900.svg)](https://nvidia.com)
[![Model](https://img.shields.io/badge/Model-Wan%202.1%201.3B%20DiT-rose.svg)](https://github.com/Wan-AI/Wan2.1)
[![Architecture](https://img.shields.io/badge/Architecture-Electron%20%2B%20React%20%2B%20Python%20Sidecar-purple.svg)]()
[![Zero-Mock](https://img.shields.io/badge/Policy-Zero--Mock%20Strict-emerald.svg)]()

AI YouTube is an offline-first Windows desktop workstation for local AI video generation. It runs diffusion transformer models (specifically **Wan 2.1 1.3B Text-to-Video**) directly on your local NVIDIA GPU (optimized for **RTX 3060 12 GB**) without any paid cloud APIs, subscriptions, or telemetry.

---

## Key Features

- **Local & Offline-First:** Generates 480p AI video directly on your GPU. No cloud accounts, no API tokens, no monthly charges.
- **Hardware-Targeted Optimization:** Designed around the hardware footprint of the **NVIDIA GeForce RTX 3060 (12 GB VRAM)**, **16 GB RAM**, and modern multi-core CPUs.
- **Genuine Hardware Diagnostics:** Live interrogation of system hardware via Windows kernel APIs and `nvidia-smi`. Real CPU cores, memory utilization, VRAM stats, CUDA driver version, PyTorch status, and FFmpeg detection. **Zero mock data**.
- **Model Registry (Wan 2.1 1.3B):** Local model manager with disk-space verification before weight downloads, local directory inspection, and offline manual weight placement support.
- **Desktop Studio UI:** Modern dark workstation featuring:
  - **Dashboard:** System telemetry and engine status.
  - **Hardware:** Complete diagnostic scanner with live re-test button.
  - **Models:** Model weights manager for Wan 2.1.
  - **Generate:** Text-to-video studio with prompt control, resolution presets, duration (3–5s), inference steps, seed, and guidance.
  - **History:** Output gallery of generated MP4 videos with native "Open in Explorer" buttons.
  - **Logs:** Live console log stream with component filters (`[Electron]`, `[Engine]`, `[Hardware]`, `[Generation]`).
  - **Settings:** Storage paths, engine port, and Arabic (RTL) / English (LTR) language switching.
- **Production IPC Architecture:** The React renderer communicates with desktop features strictly through a typed Electron IPC bridge, eliminating `file:///` path corruption in packaged builds.

---

## Architecture

```
                    +------------------------------------+
                    |       Electron Main Process        |
                    |        (app/electron/main.ts)      |
                    |  - Sandboxed Window (ready-to-show)|
                    |  - Native Shell (shell.openPath)   |
                    |  - IPC Bridge Handlers             |
                    |  - Sidecar Process Supervisor      |
                    +-----------------+------------------+
                                      |
         Typed IPC Channels           | Process Spawn / Loopback HTTP
        (getHardwareStatus,           | (http://127.0.0.1:8765)
         startGeneration,             |
         openOutputFolder...)         |
                                      |
+--------------------------------+    |    +------------------------------------+
|         React Renderer         |    |    |           Python Sidecar           |
|     (Vite + Tailwind CSS)      |<---+--->|           (engine/main.py)         |
|  - Arabic & English UI         |         |  - Loopback Server (127.0.0.1)     |
|  - Dashboard & Monitor         |         |  - Real Hardware Scanner (WMI/SMI) |
|  - Model Manager (Wan 2.1)     |         |  - Model Registry & Disk Check     |
|  - Generation Studio (480p)    |         |  - Video Generation Pipeline       |
|  - Output Video Gallery        |         |  - Output Metadata Store           |
|  - Live Log Console            |         |  - Structured Logging              |
+--------------------------------+         +------------------------------------+
```

---

## Machine Prerequisites

| Component | Recommended / Tested Spec |
|---|---|
| **Operating System** | Windows 10 or 11 (64-bit) |
| **GPU** | NVIDIA GeForce RTX 3060 (12 GB dedicated VRAM) |
| **GPU Driver** | NVIDIA Studio or Game Ready Driver with CUDA 12+ / 13+ support |
| **System RAM** | 16 GB DDR4/DDR5 |
| **CPU** | AMD Ryzen 5 PRO 4650G / Intel Core i5 or better |
| **Free Disk Space** | 20 GB free on SSD (models & output storage) |
| **Python** | Python 3.10+ (bundled with release or local venv) |
| **PyTorch** | PyTorch with CUDA support (`pip install torch torchvision`) |
| **FFmpeg** | Required in system PATH for MP4 encoding |

---

## Quick Start on Windows

### Option 1: Using the Master Rebuild Script
Double-click or run from Command Prompt:
```cmd
REBUILD_AI_YOUTUBE.bat
```
This script will:
1. Stop any stale instances.
2. Clean generated build folders (`dist/`, `dist-electron/`, `release/win-unpacked/`).
3. Run `npm run typecheck` (`tsc --noEmit`).
4. Run Python engine regression tests.
5. Compile the Vite frontend with relative asset paths (`base: './'`).
6. Compile the Electron Main & Preload scripts via `esbuild`.
7. Package the Windows release via `electron-builder`.
8. Verify that `AI YouTube.exe` and `app.asar` exist.

### Option 2: Running from Source (Development)
```bash
# 1. Install dependencies
npm install

# 2. Typecheck
npm run typecheck

# 3. Launch Development Server (Web + Express Proxy)
npm run dev

# 4. In a separate terminal, launch Electron in Dev Mode
npm run dev:electron
```

### Option 3: Launching the Packaged Application
```cmd
release\win-unpacked\"AI YouTube.exe" --auto-open-devtools-for-tabs
```

---

## Safe Build Reset
To clean build artifacts without touching your source code or configurations:
```cmd
RESET_AI_YOUTUBE_BUILD.bat
```

---

## Verification & Forensic Audit
For in-depth analysis of the codebase inspection and verification checks, refer to:
- [`AUDIT_REPORT.md`](./AUDIT_REPORT.md) — Complete forensic audit of bugs, architecture, and solutions.
- [`BUILD_REPORT.md`](./BUILD_REPORT.md) — Build logs, ASAR inspection, and test results.

---

## License
AI YouTube is open-source software built for local personal and workstation deployment.
