import React from 'react';
import { Cpu, Server, Activity, CheckCircle2, Clock, AlertTriangle, RefreshCw, Power } from 'lucide-react';
import { EngineStatusData } from '../services/engineApi';
import { useTranslation } from '../i18n';

interface StatusCardProps {
  data: EngineStatusData;
  isLoading: boolean;
  onRefresh: () => void;
  onStartEngine: () => void;
  onStopEngine: () => void;
  isElectron: boolean;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  data,
  isLoading,
  onRefresh,
  onStartEngine,
  onStopEngine,
}) => {
  const { strings } = useTranslation();
  const t = strings.statusCard;
  const common = strings.common;
  const engineStatus = data.engine.status;

  const getStatusBadge = () => {
    switch (engineStatus) {
      case 'Connected':
        return (
          <span className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{common.connected}</span>
          </span>
        );
      case 'Starting':
        return (
          <span className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1 rounded-full text-xs font-medium bg-amber-950/80 text-amber-400 border border-amber-800/60">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>{common.starting}</span>
          </span>
        );
      case 'Stopped':
        return (
          <span className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1 rounded-full text-xs font-medium bg-rose-950/80 text-rose-400 border border-rose-800/60">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>{common.stopped}</span>
          </span>
        );
      case 'Not Connected':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
            <span className="w-2 h-2 rounded-full bg-zinc-500" />
            <span>{common.notConnected}</span>
          </span>
        );
    }
  };

  const getHardwareStatusText = () => {
    const hw = data.hardware;
    if (hw === 'Ready') return common.ready;
    if (hw === 'Warning') return common.warning;
    if (hw === 'Not Scanned Yet') return common.notScannedYet;
    return hw;
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 shadow-xl backdrop-blur">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-zinc-800/80 gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider font-semibold text-zinc-500 font-mono">
            {common.systemOverview}
          </div>
          <div className="text-2xl font-bold text-white mt-1">{common.appName}</div>
        </div>
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors border border-zinc-700 disabled:opacity-50 cursor-pointer"
            title={common.checkStatus}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{common.checkStatus}</span>
          </button>

          {engineStatus !== 'Connected' ? (
            <button
              onClick={onStartEngine}
              disabled={isLoading || engineStatus === 'Starting'}
              className="flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>{common.startEngine}</span>
            </button>
          ) : (
            <button
              onClick={onStopEngine}
              disabled={isLoading}
              className="flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-xs font-medium text-white transition-colors border border-rose-500/30 disabled:opacity-50 cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>{common.stopEngine}</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary 3 Status Indicators according to Stage 0 & 1 Specification */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {/* 1. Application Status */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2 font-mono">
            <span className="flex items-center space-x-1.5 rtl:space-x-reverse">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>{t.appStatus}</span>
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-semibold text-emerald-400">
            {common.ready}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {t.appStatusDesc}
          </div>
        </div>

        {/* 2. Engine Status */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2 font-mono">
            <span className="flex items-center space-x-1.5 rtl:space-x-reverse">
              <Server className="w-4 h-4 text-rose-400" />
              <span>{t.engineStatus}</span>
            </span>
            {getStatusBadge()}
          </div>
          <div className="text-lg font-semibold text-white">
            Python Sidecar — {getStatusBadge().props.children[1].props.children}
          </div>
          <div className="text-xs text-zinc-400 mt-1 font-mono">
            {engineStatus === 'Connected' ? (
              <span>
                127.0.0.1:{data.engine.port || 8765} {data.engine.pid ? `(PID: ${data.engine.pid})` : ''}
              </span>
            ) : (
              <span>{t.engineOffline}</span>
            )}
          </div>
        </div>

        {/* 3. Hardware Status */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2 font-mono">
            <span className="flex items-center space-x-1.5 rtl:space-x-reverse">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>{t.hardwareStatus}</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
              {t.hardwareTarget}
            </span>
          </div>
          <div className={`text-lg font-semibold ${data.hardware === 'Ready' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {getHardwareStatusText()}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {t.hardwareDesc}
          </div>
        </div>
      </div>

      {data.lastError && (
        <div className="mt-4 p-3 rounded-lg bg-red-950/40 border border-red-800/50 flex items-start space-x-2 rtl:space-x-reverse text-xs text-red-300">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">{t.engineCommunicationNote}</div>
            <div className="text-red-300/80 font-mono mt-0.5">{data.lastError}</div>
          </div>
        </div>
      )}
    </div>
  );
};
