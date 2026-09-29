import React from 'react';
import {
  Cpu,
  Server,
  HardDrive,
  Film,
  Zap,
  Layers,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import { HardwareProfile } from '../services/engineApi';
import { useTranslation } from '../i18n';

interface HardwareCardProps {
  profile: HardwareProfile | null;
  isScanning: boolean;
  onRescan: () => void;
  error?: string | null;
}

export const HardwareCard: React.FC<HardwareCardProps> = ({ profile, isScanning, onRescan, error }) => {
  const { strings, isRtl, language } = useTranslation();
  const t = strings.hardware;
  const common = strings.common;

  const renderBadge = (status: string, label?: string) => {
    const s = status.toLowerCase();
    if (s === 'ready' || s === 'available') {
      return (
        <span className="inline-flex items-center space-x-1 rtl:space-x-reverse px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>{label || common.ready}</span>
        </span>
      );
    }
    if (s === 'warning') {
      return (
        <span className="inline-flex items-center space-x-1 rtl:space-x-reverse px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-950/80 text-amber-400 border border-amber-800/60 font-mono">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span>{label || common.warning}</span>
        </span>
      );
    }
    if (s === 'not installed' || s === 'not found') {
      return (
        <span className="inline-flex items-center space-x-1 rtl:space-x-reverse px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
          <XCircle className="w-3 h-3 text-zinc-500" />
          <span>{label || (s === 'not installed' ? common.notInstalled : common.notFound)}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 rtl:space-x-reverse px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700 font-mono">
        <span>{label || common.unavailable}</span>
      </span>
    );
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 shadow-xl backdrop-blur">
      {/* Header & Rescan Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-zinc-800/80 gap-4">
        <div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Cpu className="w-5 h-5 text-rose-500" />
            <h3 className="text-lg font-bold text-white tracking-tight">{t.sectionTitle}</h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {profile?.scanner
              ? `${t.scanCompletedIn} ${profile.scanner.duration_ms} ms (${profile.scanner.platform} • Python ${profile.scanner.python_version || '3.10+'})`
              : t.systemProfile}
          </p>
        </div>

        <button
          onClick={onRescan}
          disabled={isScanning}
          className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-all shadow-md shadow-rose-950/40 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? t.scanningBtn : t.rescanBtn}</span>
        </button>
      </div>

      {!profile && isScanning && (
        <div className="py-12 text-center text-zinc-400 font-mono text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-rose-400" />
          <span>{t.scanningBtn}</span>
        </div>
      )}

      {error && !isScanning && (
        <div className="mt-6 p-4 rounded-lg bg-rose-950/40 border border-rose-800/60 flex items-start space-x-3 rtl:space-x-reverse text-xs text-rose-200">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-sm block mb-1">
              {isRtl ? 'تعذر إتمام فحص العتاد' : 'Hardware scan could not be completed'}
            </span>
            <span className="text-zinc-300 font-mono block mb-2">{error}</span>
            <span className="text-[11px] text-zinc-400 block">
              {isRtl
                ? 'تأكد من تشغيل محرك بايثون المحلي على http://127.0.0.1:8765 ثم أعد المحاولة.'
                : 'Ensure the local Python sidecar is running on http://127.0.0.1:8765 and try again.'}
            </span>
          </div>
        </div>
      )}

      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {/* 1. CPU */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-semibold text-zinc-300">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  <span>{t.cpuTitle}</span>
                </span>
                {renderBadge(profile.cpu.status)}
              </div>
              <div className="text-sm font-bold text-white font-mono break-words leading-tight">
                {profile.cpu.name || common.unknown}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-zinc-800/60 text-xs font-mono text-zinc-400">
              <div>
                <span className="text-zinc-500 block text-[10px]">{t.cores}</span>
                <span className="text-zinc-200 font-semibold">{profile.cpu.physical_cores ?? common.unknown}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">{t.threads}</span>
                <span className="text-zinc-200 font-semibold">{profile.cpu.logical_cores ?? common.unknown}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">{t.arch}</span>
                <span className="text-zinc-200">{profile.cpu.architecture || common.unknown}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">{t.freq}</span>
                <span className="text-zinc-200">
                  {profile.cpu.frequency_mhz ? `${profile.cpu.frequency_mhz} MHz` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. RAM */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-semibold text-zinc-300">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>{t.ramTitle}</span>
                </span>
                {renderBadge(profile.ram.status)}
              </div>
              <div className="text-xl font-bold text-white font-mono">
                {profile.ram.total_gb !== null ? `${profile.ram.total_gb} GB` : common.unknown}
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                {t.available}: <span className="text-emerald-400 font-semibold">{profile.ram.available_gb ?? '—'} GB</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/60">
              <div className="flex justify-between text-xs font-mono text-zinc-400 mb-1">
                <span>{t.usage}</span>
                <span className="text-zinc-200 font-bold">{profile.ram.usage_percent ?? 0}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, profile.ram.usage_percent || 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 3. NVIDIA GPU & VRAM */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-semibold text-zinc-300">
                  <Server className="w-4 h-4 text-rose-400" />
                  <span>{t.gpuTitle}</span>
                </span>
                {renderBadge(
                  profile.nvidia.nvidia_available ? 'Ready' : 'Unavailable',
                  profile.nvidia.nvidia_available ? common.available : common.unavailable
                )}
              </div>

              {profile.nvidia.nvidia_available ? (
                <div>
                  <div className="text-sm font-bold text-white font-mono leading-tight">
                    {profile.nvidia.primary_gpu}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    {t.driverVersion}: <span className="font-mono text-zinc-200">{profile.nvidia.driver_version || '—'}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs text-amber-400/90 font-medium">
                    {language === 'ar' ? profile.nvidia.message_ar : profile.nvidia.message_en}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">{t.noNvidiaDesc}</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/60 text-xs font-mono text-zinc-400">
              {profile.nvidia.nvidia_available ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">{t.vramTotal}</span>
                    <span className="text-zinc-200 font-bold">{profile.nvidia.total_vram_gb} GB</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">{t.vramFree}</span>
                    <span className="text-emerald-400 font-bold">{profile.nvidia.free_vram_gb} GB</span>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-zinc-500">
                  VRAM: 0 GB ({common.unavailable})
                </div>
              )}
            </div>
          </div>

          {/* 4. CUDA Diagnostics */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-semibold text-zinc-300">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>{t.cudaTitle}</span>
                </span>
                {renderBadge(
                  profile.cuda.cuda_available ? 'Ready' : 'Unavailable',
                  profile.cuda.cuda_available ? common.available : common.unavailable
                )}
              </div>
              <div className="text-xs text-zinc-300 leading-relaxed">
                {language === 'ar' ? profile.cuda.message_ar : profile.cuda.message_en}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/60 text-xs font-mono text-zinc-400 flex justify-between">
              <span className="text-zinc-500">{t.driverCuda}:</span>
              <span className="text-zinc-200 font-semibold">{profile.cuda.driver_cuda_version || common.unavailable}</span>
            </div>
          </div>

          {/* 5. PyTorch Framework */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-semibold text-zinc-300">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>{t.pytorchTitle}</span>
                </span>
                {renderBadge(profile.pytorch.status)}
              </div>
              <div className="text-xs text-zinc-300 leading-relaxed">
                {language === 'ar' ? profile.pytorch.message_ar : profile.pytorch.message_en}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/60 text-xs font-mono text-zinc-400 flex justify-between">
              <span className="text-zinc-500">{t.pytorchVersion}:</span>
              <span className="text-zinc-200 font-semibold">{profile.pytorch.version || common.notInstalled}</span>
            </div>
          </div>

          {/* 6. FFmpeg Media Engine */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-semibold text-zinc-300">
                  <Film className="w-4 h-4 text-rose-400" />
                  <span>{t.ffmpegTitle}</span>
                </span>
                {renderBadge(
                  profile.ffmpeg.ffmpeg_available ? 'Ready' : 'Not Found',
                  profile.ffmpeg.ffmpeg_available ? common.available : common.notFound
                )}
              </div>
              <div className="text-xs text-zinc-300 leading-relaxed font-mono truncate">
                {profile.ffmpeg.version ? `v${profile.ffmpeg.version}` : common.notFound}
              </div>
              {profile.ffmpeg.path && (
                <div className="text-[10px] text-zinc-500 font-mono truncate mt-1">
                  {profile.ffmpeg.path}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/60 text-xs font-mono text-zinc-400 flex justify-between">
              <span className="text-zinc-500">Status:</span>
              <span className={profile.ffmpeg.ffmpeg_available ? 'text-emerald-400' : 'text-zinc-500'}>
                {profile.ffmpeg.ffmpeg_available ? common.ready : common.notFound}
              </span>
            </div>
          </div>

          {/* 7. Disk Storage */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4 flex flex-col justify-between md:col-span-2 lg:col-span-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-semibold text-zinc-300">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <span>{t.diskTitle}</span>
                </span>
                <span className="text-[11px] text-zinc-500 font-mono block mt-0.5">
                  {t.modelsStorage}: {profile.disk.path}
                </span>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                {profile.disk.low_space_warning && (
                  <span className="text-xs text-amber-400 font-medium flex items-center space-x-1 rtl:space-x-reverse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{t.diskLowSpaceWarning}</span>
                  </span>
                )}
                {renderBadge(profile.disk.status)}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-zinc-800/60 font-mono text-xs">
              <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">{t.diskFree}</span>
                <span className="text-emerald-400 font-bold text-base">{profile.disk.free_gb} GB</span>
              </div>
              <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">{t.diskTotal}</span>
                <span className="text-zinc-200 font-bold text-base">{profile.disk.total_gb} GB</span>
              </div>
              <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">{t.usage}</span>
                <span className="text-cyan-400 font-bold text-base">{profile.disk.usage_percent}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
