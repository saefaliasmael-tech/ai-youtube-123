@echo off
setlocal enabledelayedexpansion

REM ==============================================================================
REM AI YouTube - Safe Build Artifact & Cache Reset Script
REM Removes ONLY generated build directories, logs, and caches.
REM NEVER deletes source code, configs, or python engine scripts.
REM ==============================================================================

echo.
echo ==============================================================================
echo              AI YOUTUBE - SAFE BUILD RESET SCRIPT
echo ==============================================================================
echo.

if not exist "package.json" (
    echo [ERROR] package.json not found!
    echo Run this script from the project root directory.
    exit /b 1
)

echo The following GENERATED artifacts and temporary caches will be removed:
echo   - dist/                    (Vite build output)
echo   - dist-electron/           (esbuild main/preload bundle)
echo   - release/win-unpacked/    (Packaged Windows directory)
echo   - release/builder-debug.yml
echo   - node-compile-cache/      (V8 compile cache)
echo   - logs/*.log               (Session log files)
echo.
echo Source code (app/, src/, engine/, config/, resources/) will NOT be touched.
echo.

set /p CONFIRM="Proceed with safe reset? (Y/N): "
if /i not "!CONFIRM!"=="Y" (
    echo Reset cancelled by user.
    exit /b 0
)

echo.
echo Terminating running application instances if any...
taskkill /F /IM "AI YouTube.exe" /T >nul 2>nul
taskkill /F /IM "electron.exe" /T >nul 2>nul

echo Cleaning dist...
if exist "dist" rmdir /S /Q "dist"

echo Cleaning dist-electron...
if exist "dist-electron" rmdir /S /Q "dist-electron"

echo Cleaning release\win-unpacked...
if exist "release\win-unpacked" rmdir /S /Q "release\win-unpacked"

if exist "release\builder-debug.yml" del /F /Q "release\builder-debug.yml"

echo Cleaning node-compile-cache...
if exist "node-compile-cache" rmdir /S /Q "node-compile-cache"

echo Cleaning temporary logs...
if exist "logs\app.log" del /F /Q "logs\app.log"
if exist "logs\engine.log" del /F /Q "logs\engine.log"
if exist "logs\error.log" del /F /Q "logs\error.log"

echo.
echo ==============================================================================
echo                    RESET COMPLETED SUCCESSFULLY
echo ==============================================================================
echo To rebuild cleanly, run: REBUILD_AI_YOUTUBE.bat
echo.
exit /b 0
