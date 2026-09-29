import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Languages,
  FolderOpen,
  FolderPlus,
  Server,
  ShieldCheck,
  HardDrive,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AppConfigData, engineApi } from '../services/engineApi';
import { useTranslation } from '../i18n';

interface SettingsViewProps {
  config: AppConfigData | null;
  isElectron: boolean;
  onStorageChanged?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  isElectron,
  onStorageChanged,
}) => {
  const { strings, language, setLanguage, isRtl } = useTranslation();
  const t = strings.settings;

  const [isChangingStorage, setIsChangingStorage] = useState(false);
  const [storageFeedback, setStorageFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const currentStoragePath =
    config?.storage_root || config?.paths?.storage_root || 'Default AppData Location';

  const isCustomStorage = Boolean(
    config?.storage_root && !config.storage_root.includes('ai-youtube')
  );

  const handleChooseStorage = async () => {
    setIsChangingStorage(true);
    setStorageFeedback(null);
    try {
      const res = await engineApi.selectStorageFolder();
      if (res.success && res.storageRoot) {
        setStorageFeedback({
          type: 'success',
          message: `${t.changeStorageSuccess}: ${res.storageRoot}`,
        });
        if (onStorageChanged) {
          onStorageChanged();
        }
      } else if (!res.canceled && res.error) {
        setStorageFeedback({
          type: 'error',
          message: res.error,
        });
      }
    } catch (e: any) {
      setStorageFeedback({
        type: 'error',
        message: e?.message || 'Failed to select storage folder',
      });
    } finally {
      setIsChangingStorage(false);
    }
  };

  const handleOpenStorageRoot = async () => {
    await engineApi.openStorageFolder();
  };

  const handleOpenOutputs = async () => {
    await engineApi.openOutputFolder();
  };

  const handleOpenModels = async () => {
    await engineApi.openModelsFolder();
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 shadow-xl backdrop-blur">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <SettingsIcon className="w-5 h-5 text-rose-500" />
          <h2 className="text-lg font-bold text-white tracking-tight">{t.title}</h2>
        </div>
        <p className="text-xs text-zinc-400 mt-1">{t.subtitle}</p>
      </div>

      {storageFeedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center space-x-2 rtl:space-x-reverse ${
            storageFeedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}
        >
          {storageFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="font-mono">{storageFeedback.message}</span>
        </div>
      )}

      {/* Main Storage Location Card */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-6 space-y-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <HardDrive className="w-5 h-5 text-rose-500" />
            <div>
              <h3 className="text-sm font-bold text-white">{t.customStorageTitle}</h3>
              <p className="text-xs text-zinc-400 mt-0.5">{t.storageLocationDesc}</p>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold self-start sm:self-auto border ${
              isCustomStorage
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : 'bg-zinc-800 text-zinc-300 border-zinc-700'
            }`}
          >
            {isCustomStorage ? t.customStorageBadge : t.defaultStorageBadge}
          </span>
        </div>

        {/* Current Storage Display & Actions */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-zinc-300 block">
            {t.currentStorageLocation}
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-3 font-mono text-xs text-emerald-400 break-all select-all flex items-center space-x-2 rtl:space-x-reverse">
              <FolderOpen className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>{currentStoragePath}</span>
            </div>

            <div className="flex items-center space-x-2 rtl:space-x-reverse shrink-0">
              <button
                onClick={handleChooseStorage}
                disabled={isChangingStorage}
                className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 rtl:space-x-reverse px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition shadow-lg shadow-rose-950/50 cursor-pointer disabled:opacity-50"
              >
                <FolderPlus className="w-4 h-4" />
                <span>{isChangingStorage ? t.changingStorage : t.chooseStorageFolder}</span>
              </button>

              <button
                onClick={handleOpenStorageRoot}
                className="flex items-center justify-center space-x-1.5 rtl:space-x-reverse px-3.5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition border border-zinc-700 cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-zinc-400" />
                <span>{t.openStorageBtn}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Subdirectories Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-300">Models (Wan 2.1)</span>
              <button
                onClick={handleOpenModels}
                className="text-[10px] text-rose-400 hover:underline cursor-pointer"
              >
                Open
              </button>
            </div>
            <div className="text-[11px] font-mono text-zinc-500 truncate">
              {config?.paths?.models_dir || `${currentStoragePath}/models`}
            </div>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-300">Outputs (MP4 Videos)</span>
              <button
                onClick={handleOpenOutputs}
                className="text-[10px] text-rose-400 hover:underline cursor-pointer"
              >
                Open
              </button>
            </div>
            <div className="text-[11px] font-mono text-zinc-500 truncate">
              {config?.paths?.outputs_dir || `${currentStoragePath}/outputs`}
            </div>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-300">Generation Cache</span>
              <span className="text-[10px] text-zinc-500">Auto-managed</span>
            </div>
            <div className="text-[11px] font-mono text-zinc-500 truncate">
              {config?.paths?.cache_dir || `${currentStoragePath}/cache`}
            </div>
          </div>
        </div>

        {/* Safety Note */}
        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-start space-x-2.5 rtl:space-x-reverse text-xs text-zinc-400">
          <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">{t.storageSafetyNote}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Language Selection Card */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center space-x-2 rtl:space-x-reverse border-b border-zinc-800 pb-3">
            <Languages className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white">{t.languageTitle}</h3>
          </div>
          <p className="text-xs text-zinc-400">{t.languageDesc}</p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setLanguage('ar')}
              className={`p-3 rounded-lg border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                language === 'ar'
                  ? 'bg-rose-950/60 border-rose-600 text-rose-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <span>العربية (RTL)</span>
              {language === 'ar' && <span className="w-2 h-2 rounded-full bg-rose-500" />}
            </button>

            <button
              onClick={() => setLanguage('en')}
              className={`p-3 rounded-lg border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                language === 'en'
                  ? 'bg-rose-950/60 border-rose-600 text-rose-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <span>English (LTR)</span>
              {language === 'en' && <span className="w-2 h-2 rounded-full bg-rose-500" />}
            </button>
          </div>
        </div>

        {/* Engine Network Configuration */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center space-x-2 rtl:space-x-reverse border-b border-zinc-800 pb-3">
            <Server className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">{t.networkTitle}</h3>
          </div>
          <p className="text-xs text-zinc-400">{t.networkDesc}</p>

          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 font-mono text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-zinc-500">Host:</span>
              <span className="text-emerald-400 font-bold">127.0.0.1 (Strict Loopback)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Port:</span>
              <span className="text-zinc-200">8765</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Binding Policy:</span>
              <span className="text-zinc-400">Local Only (No External Exposure)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
