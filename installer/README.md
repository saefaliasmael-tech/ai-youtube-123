# Windows Installer Specification (Stage 0)

This directory will hold packaging scripts and assets for Windows 10/11 standalone desktop distributions.

## Target Distribution Strategy
- **Packaging Framework**: `electron-builder` (NSIS target)
- **Target OS**: Windows 10 / Windows 11 (64-bit x86_64)
- **Bundled Engine**: Embedded Python environment (Sidecar) bundled in `resources/engine`
- **Installation Path**: `%LOCALAPPDATA%\Programs\AI-YouTube` (No admin privileges required for standard user installs)
- **Data & Models Path**: `%USERPROFILE%\AI-YouTube` or configurable disk path with fast NVMe support.
