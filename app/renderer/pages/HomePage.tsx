import React, { useState, useEffect, useCallback } from 'react';
import { Header, NavTab } from '../components/Header';
import { StatusCard } from '../components/StatusCard';
import { HardwareCard } from '../components/HardwareCard';
import { ModelsView } from '../components/ModelsView';
import { GenerateView } from '../components/GenerateView';
import { HistoryView } from '../components/HistoryView';
import { LogsViewer } from '../components/LogsViewer';
import { SettingsView } from '../components/SettingsView';
import { DiagnosticsPanel } from '../components/DiagnosticsPanel';
import {
  engineApi,
  EngineStatusData,
  AppConfigData,
  HardwareProfile,
  ModelInfo,
  OutputRecord,
} from '../services/engineApi';
import { useTranslation } from '../i18n';

export interface HomePageProps {
  initialTab?: NavTab;
  activeTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  initialTab = 'dashboard',
  activeTab: externalActiveTab,
  onSelectTab: externalOnSelectTab,
}) => {
  const { strings, isRtl, language } = useTranslation();
  const tBanner = strings.banner;
  const tFooter = strings.footer;

  // Real navigation tab state (supports both internal state and controlled external state)
  const [internalActiveTab, setInternalActiveTab] = useState<NavTab>(initialTab);
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const onSelectTab = externalOnSelectTab || setInternalActiveTab;

  // Application & Engine Telemetry States
  const [statusData, setStatusData] = useState<EngineStatusData>({
    appName: 'AI YouTube',
    status: 'Application Ready',
    engine: {
      name: 'Python Sidecar',
      status: 'Not Connected',
    },
    hardware: 'Not Scanned Yet',
  });

  const [hardwareProfile, setHardwareProfile] = useState<HardwareProfile | null>(null);
  const [isScanningHardware, setIsScanningHardware] = useState<boolean>(false);
  const [hardwareError, setHardwareError] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfigData | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [outputs, setOutputs] = useState<OutputRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isElectron = engineApi.isElectron();
  const platform = window.electronAPI?.platform || 'desktop';

  // 1. Refresh Status & Config
  const refreshStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await engineApi.getStatus();
      setStatusData(data);
      const cfg = await engineApi.getConfig();
      if (cfg) setConfig(cfg);
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2. Hardware Scan
  const handleRescanHardware = useCallback(async () => {
    setIsScanningHardware(true);
    setHardwareError(null);
    try {
      const profile = await engineApi.scanHardware();
      if (profile && (profile.scanned || profile.cpu)) {
        setHardwareProfile(profile);
        setHardwareError(null);
        setStatusData((prev) => ({
          ...prev,
          hardware: profile.overall_status || 'Ready',
        }));
      } else {
        const errorMsg =
          (profile as any)?.error ||
          (language === 'ar'
            ? 'فشل الاتصال بمحرك بايثون لإجراء الفحص.'
            : 'Failed to connect to Python Sidecar for hardware scan.');
        setHardwareError(errorMsg);
      }
    } catch (err: any) {
      console.error('Failed to scan hardware:', err);
      setHardwareError(
        err?.message ||
          (language === 'ar' ? 'حدث خطأ أثناء فحص العتاد.' : 'An error occurred during hardware scan.')
      );
    } finally {
      setIsScanningHardware(false);
    }
  }, [language]);

  const loadHardwareProfile = useCallback(async () => {
    try {
      const profile = await engineApi.getHardwareProfile();
      if (profile && (profile.scanned || profile.cpu)) {
        setHardwareProfile(profile);
        setHardwareError(null);
      } else {
        handleRescanHardware();
      }
    } catch (err) {
      console.error('Failed to load hardware profile:', err);
    }
  }, [handleRescanHardware]);

  // 3. Models & Outputs Loaders
  const refreshModels = useCallback(async () => {
    try {
      const list = await engineApi.getModels();
      setModels(list);
    } catch (err) {
      console.error('Failed to load models:', err);
    }
  }, []);

  const refreshOutputs = useCallback(async () => {
    try {
      const list = await engineApi.getOutputs();
      setOutputs(list);
    } catch (err) {
      console.error('Failed to load outputs:', err);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    loadHardwareProfile();
    refreshModels();
    refreshOutputs();

    // Listen to real-time status changes if running in Electron
    if (window.electronAPI?.onEngineStatusChanged) {
      const unsubscribe = window.electronAPI.onEngineStatusChanged((state: any) => {
        let engineStatusText: 'Connected' | 'Starting' | 'Not Connected' | 'Stopped' = 'Not Connected';
        if (state.status === 'connected') engineStatusText = 'Connected';
        else if (state.status === 'starting') engineStatusText = 'Starting';
        else if (state.status === 'stopped') engineStatusText = 'Stopped';

        setStatusData((prev) => ({
          ...prev,
          engine: {
            ...prev.engine,
            status: engineStatusText,
            host: state.host,
            port: state.port,
            pid: state.pid,
            uptimeSeconds: state.uptimeSeconds,
          },
          lastError: state.lastError,
        }));
      });

      return () => {
        unsubscribe();
      };
    }

    const interval = setInterval(refreshStatus, 4000);
    return () => clearInterval(interval);
  }, [refreshStatus, loadHardwareProfile, refreshModels, refreshOutputs]);

  const handleStartEngine = async () => {
    setIsLoading(true);
    try {
      await engineApi.startEngine();
      await refreshStatus();
      await loadHardwareProfile();
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopEngine = async () => {
    setIsLoading(true);
    try {
      await engineApi.stopEngine();
      await refreshStatus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col font-sans selection:bg-rose-500/30 ${
        isRtl ? 'font-arabic' : ''
      }`}
    >
      {/* Header with all required props correctly passed */}
      <Header
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        isElectron={isElectron}
        platform={platform}
        engineStatus={statusData.engine.status}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Banner */}
            <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 max-w-3xl">
                <span className="text-xs uppercase tracking-widest font-mono text-rose-400 font-semibold">
                  {tBanner.badge}
                </span>
                <h2 className="text-2xl font-bold text-white mt-1">{tBanner.title}</h2>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{tBanner.description}</p>
              </div>
            </div>

            {/* Engine & Application Status */}
            <StatusCard
              data={statusData}
              isLoading={isLoading}
              onRefresh={refreshStatus}
              onStartEngine={handleStartEngine}
              onStopEngine={handleStopEngine}
              isElectron={isElectron}
            />

            {/* Hardware Summary Card */}
            <HardwareCard
              profile={hardwareProfile}
              isScanning={isScanningHardware}
              onRescan={handleRescanHardware}
              error={hardwareError}
            />

            {/* Storage Boundaries & Diagnostics */}
            <DiagnosticsPanel config={config} />
          </div>
        )}

        {/* Tab 2: Hardware */}
        {activeTab === 'hardware' && (
          <div className="space-y-6">
            <HardwareCard
              profile={hardwareProfile}
              isScanning={isScanningHardware}
              onRescan={handleRescanHardware}
              error={hardwareError}
            />
          </div>
        )}

        {/* Tab 3: Models */}
        {activeTab === 'models' && (
          <ModelsView
            models={models}
            isLoading={isLoading}
            onRefresh={refreshModels}
            isElectron={isElectron}
          />
        )}

        {/* Tab 4: Generate */}
        {activeTab === 'generate' && (
          <GenerateView
            models={models}
            hardwareProfile={hardwareProfile}
            onNavigateTab={onSelectTab}
            onGenerationComplete={() => {
              refreshOutputs();
              onSelectTab('history');
            }}
          />
        )}

        {/* Tab 5: History */}
        {activeTab === 'history' && (
          <HistoryView
            outputs={outputs}
            isLoading={isLoading}
            onRefresh={refreshOutputs}
            isElectron={isElectron}
          />
        )}

        {/* Tab 6: Logs */}
        {activeTab === 'logs' && (
          <LogsViewer engineStatus={statusData.engine.status} />
        )}

        {/* Tab 7: Settings */}
        {activeTab === 'settings' && (
          <SettingsView
            config={config}
            isElectron={isElectron}
            onStorageChanged={() => {
              refreshStatus();
              refreshModels();
              refreshOutputs();
            }}
          />
        )}
      </main>

      <footer className="border-t border-zinc-800/80 bg-zinc-950/80 px-6 py-4 text-center text-xs text-zinc-500 font-mono">
        {tFooter.copyright}
      </footer>
    </div>
  );
};

export default HomePage;
