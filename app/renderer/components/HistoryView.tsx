import React, { useState } from 'react';
import {
  Clock,
  FolderOpen,
  Play,
  Trash2,
  FileVideo,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Info,
  RefreshCw,
} from 'lucide-react';
import { OutputRecord, engineApi } from '../services/engineApi';
import { useTranslation } from '../i18n';

interface HistoryViewProps {
  outputs: OutputRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  isElectron: boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  outputs,
  isLoading,
  onRefresh,
  isElectron,
}) => {
  const { strings, isRtl } = useTranslation();
  const t = strings.history;
  const common = strings.common;

  const [selectedVideo, setSelectedVideo] = useState<OutputRecord | null>(null);

  const handleOpenOutputsFolder = async () => {
    await engineApi.openOutputFolder();
  };

  const handleOpenVideoFile = async (filePath?: string | null) => {
    if (filePath) {
      await engineApi.openPath(filePath);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      isRtl ? 'هل أنت متأكد من رغبتك في حذف هذا الفيديو من السجل؟' : 'Are you sure you want to delete this record?'
    );
    if (confirmed) {
      await engineApi.deleteOutput(id);
      onRefresh();
    }
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1 rtl:space-x-reverse px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Completed</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center space-x-1 rtl:space-x-reverse px-2 py-0.5 rounded text-[11px] font-mono bg-rose-950 text-rose-400 border border-rose-800">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>Failed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center space-x-1 rtl:space-x-reverse px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
            <RotateCcw className="w-3 h-3 text-zinc-400" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 rtl:space-x-reverse px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 shadow-xl backdrop-blur">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Clock className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg font-bold text-white tracking-tight">{t.title}</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">{t.subtitle}</p>
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              onClick={handleOpenOutputsFolder}
              className="flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition border border-zinc-700 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
              <span>{t.openOutputsBtn}</span>
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

      {/* Output items list */}
      {outputs.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 text-center space-y-3">
          <FileVideo className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-bold text-zinc-300">{t.emptyTitle}</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">{t.emptyDesc}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {outputs.map((item) => (
            <div
              key={item.id}
              className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  {renderStatus(item.status)}
                  <span className="text-xs text-zinc-500 font-mono">{item.timestamp}</span>
                  <span className="text-xs text-zinc-500 font-mono">• {item.model}</span>
                  {item.generation_time_sec && (
                    <span className="text-xs text-rose-400 font-mono font-semibold">
                      ({item.generation_time_sec}s)
                    </span>
                  )}
                </div>

                <p className="text-sm font-medium text-white line-clamp-2">
                  "{item.prompt}"
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-zinc-400">
                  <span>Res: {item.settings.resolution}</span>
                  <span>Duration: {item.settings.duration_seconds}s</span>
                  <span>Steps: {item.settings.steps}</span>
                  {item.output_path && (
                    <span className="text-zinc-500 truncate max-w-md">
                      File: {item.output_path}
                    </span>
                  )}
                </div>

                {item.error && (
                  <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2 rounded-lg font-mono">
                    {item.error}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                {item.output_path && item.file_exists && (
                  <button
                    onClick={() => handleOpenVideoFile(item.output_path)}
                    className="flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isRtl ? 'تشغيل' : 'Play'}</span>
                  </button>
                )}

                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 transition border border-zinc-700 cursor-pointer"
                  title={common.delete}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
