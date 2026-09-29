import React, { useState } from 'react';
import {
  Layers,
  HardDrive,
  Cpu,
  Download,
  FolderOpen,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { ModelInfo, engineApi } from '../services/engineApi';
import { useTranslation } from '../i18n';

interface ModelsViewProps {
  models: ModelInfo[];
  isLoading: boolean;
  onRefresh: () => void;
  isElectron: boolean;
}

export const ModelsView: React.FC<ModelsViewProps> = ({
  models,
  isLoading,
  onRefresh,
  isElectron,
}) => {
  const { strings, isRtl, language } = useTranslation();
  const t = strings.models;
  const common = strings.common;

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async (modelId: string) => {
    setDownloadingId(modelId);
    setDownloadError(null);
    try {
      const res = await engineApi.downloadModel(modelId);
      if (res && res.status === 'error') {
        setDownloadError(res.message || 'Download failed');
      } else {
        onRefresh();
      }
    } catch (e: any) {
      setDownloadError(e?.message || 'Error initiating download');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenFolder = async () => {
    await engineApi.openModelsFolder();
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 shadow-xl backdrop-blur">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Layers className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg font-bold text-white tracking-tight">{t.title}</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">{t.subtitle}</p>
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              onClick={handleOpenFolder}
              className="flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition border border-zinc-700 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
              <span>{t.modelsFolderBtn}</span>
            </button>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition border border-zinc-700 cursor-pointer"
              title={common.refresh}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {downloadError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-xs text-rose-200 flex items-start space-x-3 rtl:space-x-reverse">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block text-sm">{common.error}</span>
            <span className="text-zinc-300 font-mono mt-1 block">{downloadError}</span>
          </div>
        </div>
      )}

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 gap-6">
        {models.map((model) => {
          const isReady = model.status === 'ready';
          const isDownloading = model.status === 'downloading' || downloadingId === model.id;

          return (
            <div
              key={model.id}
              className="bg-zinc-900/60 border border-zinc-800/90 rounded-xl p-6 shadow-xl relative overflow-hidden"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                    <span className="text-base font-bold text-white">{model.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/60">
                      {model.parameters}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {model.architecture}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed max-w-3xl">
                    {language === 'ar' ? model.description_ar : model.description_en}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono">
                    <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800">
                      <span className="text-zinc-500 text-[10px] block">{t.vramTarget}</span>
                      <span className="text-emerald-400 font-bold">{model.target_vram_gb} GB</span>
                      <span className="text-[10px] text-zinc-500 block">RTX 3060 12GB</span>
                    </div>

                    <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800">
                      <span className="text-zinc-500 text-[10px] block">{t.diskRequired}</span>
                      <span className="text-zinc-200 font-bold">{model.required_disk_gb} GB</span>
                      <span className="text-[10px] text-zinc-500 block">weights: ~{model.model_size_gb} GB</span>
                    </div>

                    <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800">
                      <span className="text-zinc-500 text-[10px] block">Resolution</span>
                      <span className="text-zinc-200 font-bold">{model.default_resolution}</span>
                      <span className="text-[10px] text-zinc-500 block">480p standard</span>
                    </div>

                    <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800">
                      <span className="text-zinc-500 text-[10px] block">Status</span>
                      <span className={`font-bold ${isReady ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isReady ? t.installed : isDownloading ? t.downloading : t.notInstalled}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Column */}
                <div className="flex flex-col justify-center items-start lg:items-end space-y-3 min-w-[200px]">
                  {isReady ? (
                    <div className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{t.installed}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDownload(model.id)}
                      disabled={isDownloading}
                      className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition shadow-lg shadow-rose-950/50 disabled:opacity-50 cursor-pointer w-full sm:w-auto"
                    >
                      <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
                      <span>{isDownloading ? t.downloading : t.downloadBtn}</span>
                    </button>
                  )}

                  <div className="text-[11px] text-zinc-500 font-mono text-start lg:text-end">
                    <span>{t.huggingFaceRepo}: </span>
                    <span className="text-zinc-400">{model.huggingface_repo}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual placement helper card */}
      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-5 text-xs text-zinc-400 space-y-2 font-mono">
        <div className="flex items-center space-x-2 rtl:space-x-reverse text-zinc-300 font-semibold">
          <Info className="w-4 h-4 text-rose-400" />
          <span>{isRtl ? 'تعليمات التثبيت اليدوي (Offline Setup)' : 'Offline Setup Instructions'}</span>
        </div>
        <p className="leading-relaxed text-[11px]">
          {isRtl
            ? 'إذا كنت في بيئة غير متصلة بالإنترنت أو قمت بتنزيل أوزان Wan 2.1 1.3B مسبقاً، يمكنك وضع ملفات النموذج (.safetensors / model_index.json) مباشرة داخل مجلد models/wan-2.1-1.3b وسيتعرف التطبيق عليها تلقائياً.'
            : 'If you are offline or pre-downloaded the Wan 2.1 1.3B weights, place the model files (.safetensors / model_index.json) directly into models/wan-2.1-1.3b and the app will recognize them immediately.'}
        </p>
      </div>
    </div>
  );
};
