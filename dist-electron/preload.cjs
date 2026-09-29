var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// app/electron/preload.ts
var preload_exports = {};
module.exports = __toCommonJS(preload_exports);
var import_electron = require("electron");
var api = {
  isElectron: true,
  platform: process.platform,
  // Engine
  getEngineStatus: () => import_electron.ipcRenderer.invoke("engine:get-status"),
  startEngine: () => import_electron.ipcRenderer.invoke("engine:start"),
  stopEngine: () => import_electron.ipcRenderer.invoke("engine:stop"),
  // Hardware
  getHardwareStatus: () => import_electron.ipcRenderer.invoke("hardware:get-status"),
  scanHardware: () => import_electron.ipcRenderer.invoke("hardware:scan"),
  // Config
  getConfig: () => import_electron.ipcRenderer.invoke("app:get-config"),
  saveLanguage: (lang) => import_electron.ipcRenderer.invoke("app:save-language", lang),
  // Models
  getModels: () => import_electron.ipcRenderer.invoke("models:get-list"),
  downloadModel: (modelId) => import_electron.ipcRenderer.invoke("models:download", modelId),
  // Generation
  startGeneration: (params) => import_electron.ipcRenderer.invoke("generation:start", params),
  getGenerationStatus: () => import_electron.ipcRenderer.invoke("generation:status"),
  cancelGeneration: () => import_electron.ipcRenderer.invoke("generation:cancel"),
  // Outputs
  getOutputs: () => import_electron.ipcRenderer.invoke("outputs:get-list"),
  deleteOutput: (id) => import_electron.ipcRenderer.invoke("outputs:delete", id),
  // Native Shell
  openStorageFolder: () => import_electron.ipcRenderer.invoke("shell:open-storage"),
  openOutputFolder: () => import_electron.ipcRenderer.invoke("shell:open-outputs"),
  openModelsFolder: () => import_electron.ipcRenderer.invoke("shell:open-models"),
  openPath: (targetPath) => import_electron.ipcRenderer.invoke("shell:open-path", targetPath),
  // Storage Location
  selectStorageFolder: () => import_electron.ipcRenderer.invoke("storage:select-folder"),
  getStorageConfig: () => import_electron.ipcRenderer.invoke("storage:get-config"),
  // Logs
  getLogs: () => import_electron.ipcRenderer.invoke("logs:get"),
  // Real-time Listeners
  onEngineStatusChanged: (callback) => {
    const handler = (_event, val) => callback(val);
    import_electron.ipcRenderer.on("engine:status-changed", handler);
    return () => {
      import_electron.ipcRenderer.removeListener("engine:status-changed", handler);
    };
  },
  onGenerationProgress: (callback) => {
    const handler = (_event, val) => callback(val);
    import_electron.ipcRenderer.on("generation:progress", handler);
    return () => {
      import_electron.ipcRenderer.removeListener("generation:progress", handler);
    };
  }
};
import_electron.contextBridge.exposeInMainWorld("electronAPI", api);
