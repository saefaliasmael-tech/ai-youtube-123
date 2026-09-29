@echo off
setlocal enabledelayedexpansion

REM ==============================================================================
REM AI YouTube - Master Windows Clean Rebuild Script
REM Stage 2 & Beyond: Local Video Generation Architecture
REM Target: Windows 10/11 x64 | NVIDIA RTX 3060 12GB | Offline-First Workstation
REM ==============================================================================

echo.
echo ==============================================================================
echo        AI YOUTUBE - PRODUCTION CLEAN REBUILD PIPELINE
echo ==============================================================================
echo.

REM 1. Verify Project Root
if not exist "package.json" (
    echo [ERROR] package.json not found!
    echo This script must be executed directly from the AI YouTube project root directory.
    goto :BUILD_FAILED
)

if not exist "engine\main.py" (
    echo [ERROR] engine\main.py not found!
    echo Please verify you are in the repository root.
    goto :BUILD_FAILED
)

echo [OK] Project root verified: %CD%

REM 2. Check Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js v20+ LTS from https://nodejs.org/
    goto :BUILD_FAILED
)
for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
echo [OK] Node.js detected: %NODE_VER%

REM 3. Check npm
where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm is not found in PATH!
    goto :BUILD_FAILED
)
for /f "tokens=*" %%v in ('npm -v') do set "NPM_VER=%%v"
echo [OK] npm detected: %NPM_VER%

REM 4. Check Python (System or Virtual Environment)
set "SYS_PYTHON="
where python >nul 2>nul
if not errorlevel 1 (
    set "SYS_PYTHON=python"
) else (
    where py >nul 2>nul
    if not errorlevel 1 (
        set "SYS_PYTHON=py -3"
    )
)

if defined SYS_PYTHON (
    for /f "tokens=*" %%v in ('!SYS_PYTHON! --version 2^>^&1') do set "PY_VER=%%v"
    echo [OK] System Python detected: !PY_VER!
) else (
    echo [WARN] System Python not in PATH. Packaged builds will utilize bundled Python runtime.
)

REM 5. Terminate Old Application & Sidecar Processes
echo.
echo [1/8] Terminating any stale AI YouTube and Sidecar processes...
taskkill /F /IM "AI YouTube.exe" /T >nul 2>nul
taskkill /F /IM "electron.exe" /T >nul 2>nul

REM Kill any stale processes on port 8765
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8765 ^| findstr LISTENING') do (
    if not "%%a"=="" (
        echo Terminating lingering process on port 8765 [PID: %%a]...
        taskkill /F /PID %%a >nul 2>nul
    )
)
echo [OK] Process cleanup complete.

REM 6. Remove Generated Build Artifacts Only
echo.
echo [2/8] Removing stale generated build artifacts...
if exist "dist" (
    echo Removing dist...
    rmdir /S /Q "dist"
)
if exist "dist-electron" (
    echo Removing dist-electron...
    rmdir /S /Q "dist-electron"
)
if exist "release\win-unpacked" (
    echo Removing release\win-unpacked...
    rmdir /S /Q "release\win-unpacked"
)
if exist "release\builder-debug.yml" (
    del /F /Q "release\builder-debug.yml"
)
echo [OK] Build directories cleaned safely. Source files strictly preserved.

REM 7. Dependency Installation Verification
echo.
echo [3/8] Verifying Node modules...
if not exist "node_modules" (
    echo Running npm install...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed!
        goto :BUILD_FAILED
    )
) else (
    echo [OK] node_modules present.
)

REM 8. TypeScript Typecheck
echo.
echo [4/8] Running TypeScript typecheck (tsc --noEmit)...
call npm run typecheck
if errorlevel 1 (
    echo [ERROR] TypeScript compilation failed! Review errors above.
    goto :BUILD_FAILED
)
echo [OK] TypeScript check passed with 0 errors.

REM 9. Python Engine Tests
echo.
echo [5/8] Running Python sidecar regression tests...
set "PY_TEST_CMD="
where python >nul 2>nul
if not errorlevel 1 (
    set "PY_TEST_CMD=python"
) else (
    where py >nul 2>nul
    if not errorlevel 1 (
        set "PY_TEST_CMD=py -3"
    ) else (
        where python3 >nul 2>nul
        if not errorlevel 1 (
            set "PY_TEST_CMD=python3"
        )
    )
)

if defined PY_TEST_CMD (
    echo Using Python test runner: !PY_TEST_CMD!
    !PY_TEST_CMD! -m unittest discover -s engine/tests -p "test_*.py"
    if errorlevel 1 (
        echo [ERROR] Python sidecar regression tests failed!
        goto :BUILD_FAILED
    )
    echo [OK] Python engine unittests passed.
) else (
    echo [WARN] Python executable not found in PATH. Skipping local regression tests.
)

REM 10. Build Renderer and Electron Main
echo.
echo [6/8] Building Vite React Renderer and Electron Main Process...
call npm run build
if errorlevel 1 (
    echo [ERROR] Build step failed!
    goto :BUILD_FAILED
)

if not exist "dist\index.html" (
    echo [ERROR] dist\index.html was not generated!
    goto :BUILD_FAILED
)
if not exist "dist-electron\main.cjs" (
    echo [ERROR] dist-electron\main.cjs was not generated!
    goto :BUILD_FAILED
)
echo [OK] Renderer and Electron bundles built successfully.

REM 11. Run electron-builder
echo.
echo [7/8] Packaging Windows distribution (electron-builder)...
call npx electron-builder --win dir --x64
if errorlevel 1 (
    echo [ERROR] electron-builder failed!
    goto :BUILD_FAILED
)

REM 12. Strict Verification of Output Files
echo.
echo [8/8] Performing forensic validation on packaged release...

if not exist "release\win-unpacked\AI YouTube.exe" (
    echo [ERROR] release\win-unpacked\AI YouTube.exe is missing!
    goto :BUILD_FAILED
)

if not exist "release\win-unpacked\resources\app.asar" (
    echo [ERROR] release\win-unpacked\resources\app.asar is missing!
    goto :BUILD_FAILED
)

if not exist "release\win-unpacked\resources\engine\main.py" (
    echo [ERROR] release\win-unpacked\resources\engine\main.py is missing!
    goto :BUILD_FAILED
)

echo.
echo ==============================================================================
echo                       AI YOUTUBE BUILD SUCCESS
echo ==============================================================================
echo.
echo Executable:     release\win-unpacked\AI YouTube.exe
echo ASAR Bundle:    release\win-unpacked\resources\app.asar
echo Engine Sidecar: release\win-unpacked\resources\engine\main.py
echo Mode:           Local-First / Production Offline Workstation
echo.
echo To launch the packaged application with DevTools:
echo   release\win-unpacked\"AI YouTube.exe" --auto-open-devtools-for-tabs
echo.
exit /b 0

:BUILD_FAILED
echo.
echo ==============================================================================
echo                       AI YOUTUBE BUILD FAILED
echo ==============================================================================
echo.
echo Please review the error message above and fix the reported issue.
echo.
exit /b 1
