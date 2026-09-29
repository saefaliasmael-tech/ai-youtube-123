/**
 * AI YouTube - Engine Client Service
 * Production Rebuilt Architecture
 * Handles communication with the Python Sidecar and native OS features
 * primarily via the secure Electron IPC bridge, with safe loopback HTTP fallback.
 */

export interface GpuDetails {
  index: number;
  name: string;
  driver_version?: string;
  total_vram_gb: number;
  used_vram_gb: number;
  free_vram_gb: number;
  gpu_utilization_percent: number;
}

export interface HardwareProfile {
  status: 'Ready' | 'Warning' | 'Error' | 'Unavailable' | string;
  scanned: boolean;
  overall_status: string;
  cpu: {
    status: string;
    name: string;
    architecture: string;
    physical_cores: number | null;
    logical_cores: number | null;
    frequency_mhz: number | null;
  };
  ram: {
    status: string;
    total_gb: number | null;
    available_gb: number | null;
    used_gb: number | null;
    usage_percent: number | null;
  };
  gpu: {
    name: string | null;
    count: number;
    total_vram_gb: number | null;
    used_vram_gb: number | null;
    free_vram_gb: number | null;
    gpu_utilization_percent: number | null;
    all_gpus: GpuDetails[];
    status: string;
  };
  nvidia: {
    status: string;
    nvidia_available: boolean;
    nvidia_smi_found: boolean;
    smi_path?: string;
    gpu_count: number;
    gpus: GpuDetails[];
    primary_gpu?: string;
    driver_version?: string;
    total_vram_gb?: number;
    used_vram_gb?: number;
    free_vram_gb?: number;
    gpu_utilization_percent?: number;
    message_ar: string;
    message_en: string;
  };
  cuda: {
    status: string;
    cuda_available: boolean;
    driver_cuda_version: string | null;
    message_ar: string;
    message_en: string;
  };
  pytorch: {
    status: string;
    pytorch_installed: boolean;
    version: string | null;
    cuda_available: boolean;
    torch_cuda_version: string | null;
    cudnn_version: string | null;
    gpu_count: number;
    gpu_names: string[];
    message_ar: string;
    message_en: string;
  };
  disk: {
    status: string;
    path: string;
    total_gb: number | null;
    used_gb: number | null;
    free_gb: number | null;
    usage_percent: number | null;
    low_space_warning: boolean;
  };
  ffmpeg: {
    status: string;
    ffmpeg_available: boolean;
    version: string | null;
    path?: string;
    message_ar: string;
    message_en: string;
  };
  scanner: {
    timestamp: string;
    duration_ms: number;
    platform: string;
    python_version?: string;
  };
  error?: string;
}

export interface EngineStatusData {
  appName: string;
  status: 'Application Ready' | string;
  engine: {
    name: string;
    status: 'Connected' | 'Starting' | 'Not Connected' | 'Stopped';
    host?: string;
    port?: number;
    pid?: number;
    uptimeSeconds?: number;
  };
  hardware: string;
  language?: string;
  lastError?: string;
  generation?: {
    state: string;
    progress: number;
    message: string;
  };
}

export interface AppConfigData {
  app_name: string;
  app_version: string;
  environment: string;
  language?: string;
  storage_root?: string | null;
  paths: {
    storage_root?: string;
    models_dir: string;
    outputs_dir: string;
    logs_dir: string;
    cache_dir: string;
  };
  hardware_status: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  version: string;
  parameters: string;
  architecture: string;
  target_vram_gb: number;
  min_vram_gb: number;
  model_size_gb: number;
  required_disk_gb: number;
  default_resolution: string;
  supported_resolutions: string[];
  default_duration_sec: number;
  supported_durations_sec: number[];
  default_steps: number;
  default_guidance: number;
  huggingface_repo: string;
  local_subdir: string;
  description_en: string;
  description_ar: string;
  status: 'not_installed' | 'downloading' | 'ready';
  installed_path?: string | null;
  download_progress?: number | null;
}

export interface GenerationParams {
  prompt: string;
  model_id?: string;
  resolution?: string;
  duration?: number;
  seed?: number;
  steps?: number;
  guidance?: number;
}

export interface OutputRecord {
  id: string;
  timestamp: string;
  prompt: string;
  model: string;
  settings: {
    resolution: string;
    duration_seconds: number;
    seed: number;
    steps: number;
    guidance_scale: number;
    format: string;
  };
  status: 'completed' | 'failed' | 'cancelled' | string;
  status_message: string;
  output_path?: string | null;
  generation_time_sec?: number | null;
  error?: string | null;
  file_exists?: boolean;
}

export const SIDECAR_ORIGIN = 'http://127.0.0.1:8765';

/**
 * Robust URL resolver.
 * When running packaged over file:// or without host, returns absolute loopback URL.
 */
export function getApiUrl(endpoint: string): string {
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (typeof window !== 'undefined' && (window.location.protocol === 'file:' || !window.location.host)) {
    return `${SIDECAR_ORIGIN}${cleanPath}`;
  }
  return cleanPath;
}

export const engineApi = {
  isElectron(): boolean {
    return Boolean(window.electronAPI?.isElectron);
  },

  async getStatus(): Promise<EngineStatusData> {
    // 1. Electron IPC Bridge
    if (window.electronAPI?.getEngineStatus) {
      try {
        const sidecarState = await window.electronAPI.getEngineStatus();
        let engineStatusText: 'Connected' | 'Starting' | 'Not Connected' | 'Stopped' = 'Not Connected';

        if (sidecarState.status === 'connected') engineStatusText = 'Connected';
        else if (sidecarState.status === 'starting') engineStatusText = 'Starting';
        else if (sidecarState.status === 'stopped') engineStatusText = 'Stopped';

        return {
          appName: 'AI YouTube',
          status: 'Application Ready',
          engine: {
            name: 'Python Sidecar',
            status: engineStatusText,
            host: sidecarState.host,
            port: sidecarState.port,
            pid: sidecarState.pid,
            uptimeSeconds: sidecarState.uptimeSeconds,
          },
          hardware: sidecarState.hardwareStatus || 'Not Scanned Yet',
          lastError: sidecarState.lastError,
        };
      } catch (err) {
        return {
          appName: 'AI YouTube',
          status: 'Application Ready',
          engine: {
            name: 'Python Sidecar',
            status: 'Not Connected',
          },
          hardware: 'Not Scanned Yet',
          lastError: String(err),
        };
      }
    }

    // 2. HTTP Fallback
    try {
      const res = await fetch(getApiUrl('/api/status'), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        let engStatus: 'Connected' | 'Starting' | 'Not Connected' | 'Stopped' = 'Not Connected';
        if (json.engine?.status === 'Connected') engStatus = 'Connected';
        else if (json.engine?.status === 'Starting') engStatus = 'Starting';
        else if (json.engine?.status === 'Stopped') engStatus = 'Stopped';

        return {
          appName: json.app_name || 'AI YouTube',
          status: json.status || 'Application Ready',
          engine: {
            name: json.engine?.name || 'Python Sidecar',
            status: engStatus,
            host: json.engine?.host || '127.0.0.1',
            port: json.engine?.port || 8765,
            pid: json.engine?.pid,
            uptimeSeconds: json.engine?.uptime_seconds,
          },
          hardware: json.hardware || 'Not Scanned Yet',
          language: json.language,
          lastError: json.last_error,
          generation: json.generation,
        };
      }
    } catch {
      // Ignored
    }

    return {
      appName: 'AI YouTube',
      status: 'Application Ready',
      engine: {
        name: 'Python Sidecar',
        status: 'Not Connected',
      },
      hardware: 'Not Scanned Yet',
    };
  },

  async startEngine(): Promise<void> {
    if (window.electronAPI?.startEngine) {
      await window.electronAPI.startEngine();
      return;
    }
    try {
      await fetch(getApiUrl('/api/engine/start'), { method: 'POST' });
    } catch {
      // Ignored
    }
  },

  async stopEngine(): Promise<void> {
    if (window.electronAPI?.stopEngine) {
      await window.electronAPI.stopEngine();
      return;
    }
    try {
      await fetch(getApiUrl('/api/engine/stop'), { method: 'POST' });
    } catch {
      // Ignored
    }
  },

  async getConfig(): Promise<AppConfigData | null> {
    if (window.electronAPI?.getConfig) {
      try {
        return await window.electronAPI.getConfig();
      } catch {
        return null;
      }
    }
    try {
      const res = await fetch(getApiUrl('/api/config'));
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return null;
  },

  async saveLanguage(lang: 'ar' | 'en'): Promise<boolean> {
    if (window.electronAPI?.saveLanguage) {
      try {
        return await window.electronAPI.saveLanguage(lang);
      } catch (err) {
        console.warn('IPC saveLanguage error:', err);
      }
    }
    try {
      const res = await fetch(getApiUrl('/api/config/language'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getHardwareProfile(): Promise<HardwareProfile | null> {
    if (window.electronAPI?.getHardwareStatus) {
      try {
        const res = await window.electronAPI.getHardwareStatus();
        if (res && (res.scanned || res.cpu)) {
          return res as HardwareProfile;
        }
      } catch (err) {
        console.warn('IPC getHardwareStatus error, falling back to HTTP:', err);
      }
    }

    try {
      const res = await fetch(getApiUrl('/api/hardware'), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn(`Failed to fetch hardware from ${getApiUrl('/api/hardware')}:`, e);
    }
    return null;
  },

  async scanHardware(): Promise<HardwareProfile | null> {
    if (window.electronAPI?.scanHardware) {
      try {
        const res = await window.electronAPI.scanHardware();
        if (res && (res.scanned || res.cpu)) {
          return res as HardwareProfile;
        }
        if (res && res.status === 'Error') {
          return {
            status: 'Error',
            scanned: false,
            overall_status: 'Error',
            error: res.error,
          } as any;
        }
      } catch (err) {
        console.warn('IPC scanHardware error, falling back to HTTP:', err);
      }
    }

    try {
      const url = getApiUrl('/api/hardware/scan');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        return await res.json();
      }
      const errText = await res.text().catch(() => '');
      return {
        status: 'Error',
        scanned: false,
        overall_status: 'Unavailable',
        error: `HTTP ${res.status}: ${errText || 'Sidecar unavailable'}`,
      } as any;
    } catch (e: any) {
      return {
        status: 'Error',
        scanned: false,
        overall_status: 'Unavailable',
        error: e?.message || 'Connection to Python Sidecar failed',
      } as any;
    }
  },

  async getModels(): Promise<ModelInfo[]> {
    if (window.electronAPI?.getModels) {
      try {
        const res = await window.electronAPI.getModels();
        if (res && Array.isArray(res.models)) {
          return res.models;
        }
      } catch (err) {
        console.warn('IPC getModels error:', err);
      }
    }
    try {
      const res = await fetch(getApiUrl('/api/models'));
      if (res.ok) {
        const data = await res.json();
        return data.models || [];
      }
    } catch {
      // Ignored
    }
    return [];
  },

  async downloadModel(modelId: string): Promise<any> {
    if (window.electronAPI?.downloadModel) {
      try {
        return await window.electronAPI.downloadModel(modelId);
      } catch (err) {
        return { status: 'error', error: String(err) };
      }
    }
    try {
      const res = await fetch(getApiUrl('/api/models/download'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelId }),
      });
      return await res.json();
    } catch (e: any) {
      return { status: 'error', error: e.message };
    }
  },

  async startGeneration(params: GenerationParams): Promise<any> {
    if (window.electronAPI?.startGeneration) {
      try {
        return await window.electronAPI.startGeneration(params);
      } catch (err) {
        return { success: false, error: String(err) };
      }
    }
    try {
      const res = await fetch(getApiUrl('/api/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async getGenerationStatus(): Promise<any> {
    if (window.electronAPI?.getGenerationStatus) {
      try {
        return await window.electronAPI.getGenerationStatus();
      } catch {
        // Fallback
      }
    }
    try {
      const res = await fetch(getApiUrl('/api/generate/status'));
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return { state: 'idle', progress: 0 };
  },

  async cancelGeneration(): Promise<boolean> {
    if (window.electronAPI?.cancelGeneration) {
      try {
        const res = await window.electronAPI.cancelGeneration();
        return Boolean(res?.success);
      } catch {
        return false;
      }
    }
    try {
      const res = await fetch(getApiUrl('/api/generate/cancel'), { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getOutputs(): Promise<OutputRecord[]> {
    if (window.electronAPI?.getOutputs) {
      try {
        const res = await window.electronAPI.getOutputs();
        if (res && Array.isArray(res.outputs)) {
          return res.outputs;
        }
      } catch (err) {
        console.warn('IPC getOutputs error:', err);
      }
    }
    try {
      const res = await fetch(getApiUrl('/api/outputs'));
      if (res.ok) {
        const data = await res.json();
        return data.outputs || [];
      }
    } catch {
      // Fallback
    }
    return [];
  },

  async deleteOutput(id: string): Promise<boolean> {
    if (window.electronAPI?.deleteOutput) {
      try {
        const res = await window.electronAPI.deleteOutput(id);
        return Boolean(res?.success);
      } catch {
        return false;
      }
    }
    try {
      const res = await fetch(getApiUrl(`/api/outputs/${encodeURIComponent(id)}`), { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  },

  async openStorageFolder(): Promise<boolean> {
    if (window.electronAPI?.openStorageFolder) {
      return await window.electronAPI.openStorageFolder();
    }
    return false;
  },

  async openOutputFolder(): Promise<boolean> {
    if (window.electronAPI?.openOutputFolder) {
      return await window.electronAPI.openOutputFolder();
    }
    return false;
  },

  async openModelsFolder(): Promise<boolean> {
    if (window.electronAPI?.openModelsFolder) {
      return await window.electronAPI.openModelsFolder();
    }
    return false;
  },

  async selectStorageFolder(): Promise<{
    success: boolean;
    storageRoot?: string;
    modelsDir?: string;
    outputsDir?: string;
    canceled?: boolean;
    error?: string;
  }> {
    if (window.electronAPI?.selectStorageFolder) {
      try {
        return await window.electronAPI.selectStorageFolder();
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return { success: false, error: 'Folder picker is available in the desktop application.' };
  },

  async setStorageFolder(folderPath: string): Promise<any> {
    try {
      const res = await fetch(getApiUrl('/api/config/storage'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storage_root: folderPath }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async openPath(targetPath: string): Promise<boolean> {
    if (window.electronAPI?.openPath) {
      return await window.electronAPI.openPath(targetPath);
    }
    return false;
  },

  async getLogs(): Promise<string[]> {
    if (window.electronAPI?.getLogs) {
      try {
        return await window.electronAPI.getLogs();
      } catch {
        // Fallback
      }
    }
    try {
      const res = await fetch(getApiUrl('/api/logs'));
      if (res.ok) {
        const data = await res.json();
        return data.logs || [];
      }
    } catch {
      // Fallback
    }
    return [];
  },
};
