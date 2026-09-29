import { contextBridge, ipcRenderer } from 'electron';

/**
 * AI YouTube - Electron Preload Script
 * Production-Grade Secure Context Bridge
 * Exposes strictly typed desktop APIs to the renderer window
 * with contextIsolation: true and nodeIntegration: false.
 */

export interface ElectronAPI {
  isElectron: boolean;
  platform: string;

  // Engine Lifecycle
  getEngineStatus: () => Promise<any>;
  startEngine: () => Promise<any>;
  stopEngine: () => Promise<void>;

  // Hardware Diagnostics
  getHardwareStatus: () => Promise<any>;
  scanHardware: () => Promise<any>;

  // Configuration & Language
  getConfig: () => Promise<any>;
  saveLanguage: (lang: 'ar' | 'en') => Promise<boolean>;

  // Model Management (Wan 2.1)
  getModels: () => Promise<any>;
  downloadModel: (modelId: string) => Promise<any>;

  // Video Generation Pipeline
  startGeneration: (params: any) => Promise<any>;
  getGenerationStatus: () => Promise<any>;
  cancelGeneration: () => Promise<any>;

  // Outputs & History
  getOutputs: () => Promise<any>;
  deleteOutput: (id: string) => Promise<any>;

  // Desktop Native Integration (Windows Explorer)
  openStorageFolder: () => Promise<boolean>;
  openOutputFolder: () => Promise<boolean>;
  openModelsFolder: () => Promise<boolean>;
  openPath: (targetPath: string) => Promise<boolean>;

  // Storage Location Management
  selectStorageFolder: () => Promise<any>;
  getStorageConfig: () => Promise<any>;

  // Logging
  getLogs: () => Promise<string[]>;

  // Real-time Event Subscriptions
  onEngineStatusChanged: (callback: (status: any) => void) => () => void;
  onGenerationProgress: (callback: (status: any) => void) => () => void;
}

const api: ElectronAPI = {
  isElectron: true,
  platform: process.platform,

  // Engine
  getEngineStatus: () => ipcRenderer.invoke('engine:get-status'),
  startEngine: () => ipcRenderer.invoke('engine:start'),
  stopEngine: () => ipcRenderer.invoke('engine:stop'),

  // Hardware
  getHardwareStatus: () => ipcRenderer.invoke('hardware:get-status'),
  scanHardware: () => ipcRenderer.invoke('hardware:scan'),

  // Config
  getConfig: () => ipcRenderer.invoke('app:get-config'),
  saveLanguage: (lang: 'ar' | 'en') => ipcRenderer.invoke('app:save-language', lang),

  // Models
  getModels: () => ipcRenderer.invoke('models:get-list'),
  downloadModel: (modelId: string) => ipcRenderer.invoke('models:download', modelId),

  // Generation
  startGeneration: (params: any) => ipcRenderer.invoke('generation:start', params),
  getGenerationStatus: () => ipcRenderer.invoke('generation:status'),
  cancelGeneration: () => ipcRenderer.invoke('generation:cancel'),

  // Outputs
  getOutputs: () => ipcRenderer.invoke('outputs:get-list'),
  deleteOutput: (id: string) => ipcRenderer.invoke('outputs:delete', id),

  // Native Shell
  openStorageFolder: () => ipcRenderer.invoke('shell:open-storage'),
  openOutputFolder: () => ipcRenderer.invoke('shell:open-outputs'),
  openModelsFolder: () => ipcRenderer.invoke('shell:open-models'),
  openPath: (targetPath: string) => ipcRenderer.invoke('shell:open-path', targetPath),

  // Storage Location
  selectStorageFolder: () => ipcRenderer.invoke('storage:select-folder'),
  getStorageConfig: () => ipcRenderer.invoke('storage:get-config'),

  // Logs
  getLogs: () => ipcRenderer.invoke('logs:get'),

  // Real-time Listeners
  onEngineStatusChanged: (callback: (status: any) => void) => {
    const handler = (_event: unknown, val: any) => callback(val);
    ipcRenderer.on('engine:status-changed', handler);
    return () => {
      ipcRenderer.removeListener('engine:status-changed', handler);
    };
  },

  onGenerationProgress: (callback: (status: any) => void) => {
    const handler = (_event: unknown, val: any) => callback(val);
    ipcRenderer.on('generation:progress', handler);
    return () => {
      ipcRenderer.removeListener('generation:progress', handler);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
