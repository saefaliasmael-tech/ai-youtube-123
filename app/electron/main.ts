import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { sidecarManager } from './sidecar';
import { appLogger } from './logger';

/**
 * AI YouTube - Electron Main Process
 * Rebuilt Production Architecture
 * Manages desktop window lifecycle, security boundaries, native OS integration,
 * and IPC communication with the Python Sidecar.
 */

let mainWindow: BrowserWindow | null = null;
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SIDECAR_BASE_URL = 'http://127.0.0.1:8765';

function getPreloadPath(): string {
  const potentialPaths = [
    path.join(__dirname, 'preload.cjs'),
    path.join(__dirname, 'preload.js'),
    path.join(process.resourcesPath, 'dist-electron', 'preload.cjs'),
    path.join(app.getAppPath(), 'dist-electron', 'preload.cjs'),
    path.join(PROJECT_ROOT, 'dist-electron', 'preload.cjs'),
  ];
  for (const p of potentialPaths) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(__dirname, 'preload.cjs');
}

function getIconPath(): string | undefined {
  const candidates = [
    path.join(PROJECT_ROOT, 'build', 'icon.ico'),
    path.join(app.getAppPath(), 'build', 'icon.ico'),
    path.join(process.resourcesPath, 'build', 'icon.ico'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return undefined;
}

function getUserConfigPath(): string {
  const userDataDir = app.getPath('userData');
  const userConfigDir = path.join(userDataDir, 'config');
  const userConfigFile = path.join(userConfigDir, 'app_config.json');

  if (!fs.existsSync(userConfigFile)) {
    try {
      fs.mkdirSync(userConfigDir, { recursive: true });
      const candidates = [
        path.join(PROJECT_ROOT, 'config', 'app_config.json'),
        path.join(app.getAppPath(), 'config', 'app_config.json'),
        path.join(process.resourcesPath, 'config', 'app_config.json'),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) {
          fs.copyFileSync(c, userConfigFile);
          break;
        }
      }
    } catch (e) {
      appLogger.error('Failed to initialize user config file', e);
    }
  }

  return userConfigFile;
}

function getStorageConfig(): { storageRoot: string; modelsDir: string; outputsDir: string; cacheDir: string } {
  const configPath = getUserConfigPath();
  let storageRoot: string | null = null;
  if (fs.existsSync(configPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      storageRoot = data.storage_root || data.paths?.storage_root || null;
    } catch {
      // fallback
    }
  }

  if (!storageRoot || !String(storageRoot).trim()) {
    storageRoot = app.getPath('userData');
  }

  const modelsDir = path.join(storageRoot, 'models');
  const outputsDir = path.join(storageRoot, 'outputs');
  const cacheDir = path.join(storageRoot, 'cache');

  try {
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(outputsDir, { recursive: true });
    fs.mkdirSync(cacheDir, { recursive: true });
  } catch (e) {
    appLogger.error('Failed to create storage directories', e);
  }

  return { storageRoot, modelsDir, outputsDir, cacheDir };
}

function getDirectoryPath(dirKey: 'outputs' | 'models' | 'logs' | 'storage' | 'cache'): string {
  const { storageRoot, modelsDir, outputsDir, cacheDir } = getStorageConfig();
  if (dirKey === 'storage') return storageRoot;
  if (dirKey === 'outputs') return outputsDir;
  if (dirKey === 'models') return modelsDir;
  if (dirKey === 'cache') return cacheDir;

  const logsDir = path.join(app.getPath('userData'), 'logs');
  if (!fs.existsSync(logsDir)) {
    try {
      fs.mkdirSync(logsDir, { recursive: true });
    } catch {
      // Ignore
    }
  }
  return logsDir;
}

/**
 * Universal helper for sidecar HTTP requests with timeouts and error handling
 */
function callSidecarApi(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: any,
  timeoutMs: number = 10000
): Promise<any> {
  return new Promise((resolve) => {
    const url = new URL(endpoint, SIDECAR_BASE_URL);
    const postData = body ? JSON.stringify(body) : undefined;

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        timeout: timeoutMs,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch {
            resolve({ status: 'error', error: 'Invalid JSON response from engine', raw: raw.slice(0, 100) });
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      appLogger.warn(`Sidecar API ${method} ${endpoint} timed out after ${timeoutMs}ms`);
      resolve({ status: 'error', error: `Engine request timed out (${timeoutMs}ms)` });
    });

    req.on('error', (err) => {
      appLogger.warn(`Sidecar API ${method} ${endpoint} error: ${err.message}`);
      resolve({ status: 'error', error: err.message, connected: false });
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function createWindow(): void {
  appLogger.info('createWindow() called');

  const icon = getIconPath();

  mainWindow = new BrowserWindow({
    width: 1260,
    height: 860,
    minWidth: 1020,
    minHeight: 680,
    title: 'AI YouTube - Local AI Video Generator',
    backgroundColor: '#090a0f',
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
    show: false,
  });

  appLogger.info('BrowserWindow created');

  let isWindowVisible = false;
  const wc = mainWindow.webContents;

  wc.on('did-start-loading', () => {
    appLogger.info('webContents: did-start-loading');
  });

  wc.on('did-finish-load', () => {
    appLogger.info('webContents: did-finish-load');
  });

  wc.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    appLogger.error(`webContents: did-fail-load (code: ${errorCode}, desc: ${errorDescription}, url: ${validatedURL}, mainFrame: ${isMainFrame})`);
  });

  wc.on('render-process-gone', (_event, details) => {
    appLogger.error(`webContents: render-process-gone (reason: ${details.reason}, exitCode: ${details.exitCode})`);
  });

  wc.on('unresponsive', () => {
    appLogger.warn('webContents: unresponsive');
  });

  wc.on('responsive', () => {
    appLogger.info('webContents: responsive');
  });

  mainWindow.once('ready-to-show', () => {
    appLogger.info('ready-to-show fired');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      isWindowVisible = true;
      appLogger.info('Window shown');
    }
  });

  // Safe fallback timeout (5 seconds) so window is never indefinitely hidden
  setTimeout(() => {
    if (!isWindowVisible && mainWindow && !mainWindow.isDestroyed()) {
      appLogger.warn('ready-to-show timeout fallback triggered');
      mainWindow.show();
      isWindowVisible = true;
      appLogger.info('Window shown via fallback timeout');
    }
  }, 5000);

  // Determine whether to load dev server or static build
  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production' && !process.env.LOAD_DIST;
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:3000';

  if (isDev) {
    appLogger.info(`Loading development URL: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl).catch((err) => {
      appLogger.error(`Failed to load dev server at ${devServerUrl}, falling back to static build.`, err);
      loadStaticBuild();
    });
  } else {
    loadStaticBuild();
  }

  function loadStaticBuild() {
    const potentialIndexPaths = [
      path.join(PROJECT_ROOT, 'dist', 'index.html'),
      path.join(app.getAppPath(), 'dist', 'index.html'),
      path.join(process.resourcesPath, 'dist', 'index.html'),
      path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html'),
    ];

    appLogger.info(`Checking candidate paths for index.html: ${JSON.stringify(potentialIndexPaths)}`);

    for (const indexPath of potentialIndexPaths) {
      const exists = fs.existsSync(indexPath);
      appLogger.info(`Candidate path [${exists ? 'EXISTS' : 'NOT FOUND'}]: ${indexPath}`);
      if (exists) {
        appLogger.info(`Loading production index: ${indexPath}`);
        mainWindow?.loadFile(indexPath).catch((err) => {
          appLogger.error(`loadFile error on ${indexPath}`, err);
        });
        return;
      }
    }

    appLogger.error(`Production build not found in candidate paths: ${potentialIndexPaths.join(', ')}`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIpc(): void {
  // 1. Engine Control
  ipcMain.handle('engine:get-status', async () => {
    return sidecarManager.getStatus();
  });

  ipcMain.handle('engine:start', async () => {
    return await sidecarManager.start(app.getPath('userData'));
  });

  ipcMain.handle('engine:stop', async () => {
    await sidecarManager.stop();
    return sidecarManager.getStatus();
  });

  // 2. Hardware Diagnostics
  ipcMain.handle('hardware:get-status', async () => {
    return await callSidecarApi('/api/hardware', 'GET', undefined, 5000);
  });

  ipcMain.handle('hardware:scan', async () => {
    appLogger.info('IPC hardware:scan called');
    return await callSidecarApi('/api/hardware/scan', 'POST', undefined, 20000);
  });

  // 3. Configuration & Language
  ipcMain.handle('app:get-config', async () => {
    const configPath = getUserConfigPath();
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(raw);
      } catch (e) {
        appLogger.error('Failed reading app_config.json', e);
      }
    }
    return {};
  });

  ipcMain.handle('app:save-language', async (_event, lang: 'ar' | 'en') => {
    const configPath = getUserConfigPath();
    try {
      let current: any = {};
      if (fs.existsSync(configPath)) {
        current = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
      current.language = lang;
      fs.writeFileSync(configPath, JSON.stringify(current, null, 2), 'utf-8');

      // Sync with sidecar
      await callSidecarApi('/api/config/language', 'POST', { language: lang }, 3000);
      return true;
    } catch (e) {
      appLogger.error('Failed saving language setting', e);
      return false;
    }
  });

  // 4. Models Management
  ipcMain.handle('models:get-list', async () => {
    return await callSidecarApi('/api/models', 'GET', undefined, 5000);
  });

  ipcMain.handle('models:download', async (_event, modelId: string) => {
    appLogger.info(`IPC models:download initiated for ${modelId}`);
    return await callSidecarApi('/api/models/download', 'POST', { model_id: modelId }, 10000);
  });

  // 5. Video Generation Pipeline
  ipcMain.handle('generation:start', async (_event, params: any) => {
    appLogger.info(`IPC generation:start received prompt: '${params?.prompt}'`);
    return await callSidecarApi('/api/generate', 'POST', params, 10000);
  });

  ipcMain.handle('generation:status', async () => {
    return await callSidecarApi('/api/generate/status', 'GET', undefined, 4000);
  });

  ipcMain.handle('generation:cancel', async () => {
    appLogger.info('IPC generation:cancel requested');
    return await callSidecarApi('/api/generate/cancel', 'POST', undefined, 5000);
  });

  // 6. Outputs & History
  ipcMain.handle('outputs:get-list', async () => {
    return await callSidecarApi('/api/outputs', 'GET', undefined, 5000);
  });

  ipcMain.handle('outputs:delete', async (_event, id: string) => {
    return await callSidecarApi(`/api/outputs/${encodeURIComponent(id)}`, 'DELETE', undefined, 5000);
  });

  // 7. Native OS Shell Integration
  ipcMain.handle('shell:open-storage', async () => {
    const storageDir = getDirectoryPath('storage');
    appLogger.info(`Opening storage root directory in Explorer: ${storageDir}`);
    await shell.openPath(storageDir);
    return true;
  });

  ipcMain.handle('shell:open-outputs', async () => {
    const outputsDir = getDirectoryPath('outputs');
    appLogger.info(`Opening outputs directory in Explorer: ${outputsDir}`);
    await shell.openPath(outputsDir);
    return true;
  });

  ipcMain.handle('shell:open-models', async () => {
    const modelsDir = getDirectoryPath('models');
    appLogger.info(`Opening models directory in Explorer: ${modelsDir}`);
    await shell.openPath(modelsDir);
    return true;
  });

  ipcMain.handle('shell:open-path', async (_event, targetPath: string) => {
    if (targetPath && fs.existsSync(targetPath)) {
      appLogger.info(`Opening path via shell: ${targetPath}`);
      await shell.openPath(targetPath);
      return true;
    }
    return false;
  });

  // 8. Custom Storage Location Manager (Folder Picker)
  ipcMain.handle('storage:select-folder', async () => {
    if (!mainWindow) return { success: false, canceled: true };
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose AI YouTube Storage Folder',
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Select Storage Folder',
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const selectedFolder = result.filePaths[0];
    appLogger.info(`User selected custom storage location: ${selectedFolder}`);

    // Create models, outputs, cache in the chosen location
    const modelsDir = path.join(selectedFolder, 'models');
    const outputsDir = path.join(selectedFolder, 'outputs');
    const cacheDir = path.join(selectedFolder, 'cache');
    try {
      fs.mkdirSync(modelsDir, { recursive: true });
      fs.mkdirSync(outputsDir, { recursive: true });
      fs.mkdirSync(cacheDir, { recursive: true });
    } catch (err: any) {
      appLogger.error(`Failed to create subdirectories in ${selectedFolder}:`, err);
      return { success: false, error: err.message };
    }

    // Persist to app_config.json
    const configPath = getUserConfigPath();
    try {
      let current: any = {};
      if (fs.existsSync(configPath)) {
        current = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
      current.storage_root = selectedFolder;
      current.paths = current.paths || {};
      current.paths.storage_root = selectedFolder;
      current.paths.models_dir = modelsDir;
      current.paths.outputs_dir = outputsDir;
      current.paths.cache_dir = cacheDir;
      fs.writeFileSync(configPath, JSON.stringify(current, null, 2), 'utf-8');
    } catch (e: any) {
      appLogger.error('Failed saving storage_root to config file', e);
    }

    // Propagate to Python Sidecar
    const sidecarRes = await callSidecarApi('/api/config/storage', 'POST', { storage_root: selectedFolder }, 5000);
    appLogger.info(`Python sidecar storage update response: ${JSON.stringify(sidecarRes)}`);

    return {
      success: true,
      storageRoot: selectedFolder,
      modelsDir,
      outputsDir,
      cacheDir,
    };
  });

  ipcMain.handle('storage:get-config', async () => {
    return getStorageConfig();
  });

  // 8. Logs Viewer
  ipcMain.handle('logs:get', async () => {
    const res = await callSidecarApi('/api/logs', 'GET', undefined, 3000);
    if (res && Array.isArray(res.logs)) {
      return res.logs;
    }

    // Direct fallback from file
    const logFile = path.join(PROJECT_ROOT, 'logs', 'app.log');
    if (fs.existsSync(logFile)) {
      try {
        const text = fs.readFileSync(logFile, 'utf-8');
        return text.split('\n').filter(Boolean).slice(-60);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Relay status changes to renderer
  sidecarManager.on('status-changed', (state) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('engine:status-changed', state);
    }
  });
}

// Lifecycle Management
app.whenReady().then(async () => {
  appLogger.info('AI YouTube Electron Shell starting...');
  setupIpc();
  createWindow();

  // Automatically start Python Sidecar with writable user data directory
  try {
    await sidecarManager.start(app.getPath('userData'));
  } catch (err) {
    appLogger.error('Automatic Python Sidecar startup failed on launch', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  appLogger.info('All windows closed.');
  if (process.platform !== 'darwin') {
    await sidecarManager.stop();
    app.quit();
  }
});

app.on('before-quit', async () => {
  appLogger.info('Application quitting. Ensuring Python sidecar is stopped...');
  await sidecarManager.stop();
});
