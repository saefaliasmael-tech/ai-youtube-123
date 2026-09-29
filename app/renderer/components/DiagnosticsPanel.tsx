import React from 'react';
import { Folder, ShieldCheck } from 'lucide-react';
import { AppConfigData } from '../services/engineApi';
import { useTranslation } from '../i18n';

interface DiagnosticsPanelProps {
  config: AppConfigData | null;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({ config }) => {
  const { strings } = useTranslation();
  const t = strings.diagnostics;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Directory Management & Path Safety */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center space-x-2 rtl:space-x-reverse text-white font-semibold text-sm mb-4">
          <Folder className="w-4 h-4 text-rose-500" />
          <span>{t.storageTitle}</span>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
            <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">{t.modelsDir}</div>
            <div className="text-zinc-300 break-all dir-ltr text-start">{config?.paths?.models_dir || 'models/'}</div>
            <div className="text-zinc-500 text-[10px] mt-1">{t.modelsDirDesc}</div>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
            <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">{t.outputsDir}</div>
            <div className="text-zinc-300 break-all dir-ltr text-start">{config?.paths?.outputs_dir || 'outputs/'}</div>
            <div className="text-zinc-500 text-[10px] mt-1">{t.outputsDirDesc}</div>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
            <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">{t.logsDir}</div>
            <div className="text-zinc-300 break-all dir-ltr text-start">{config?.paths?.logs_dir || 'logs/'}</div>
            <div className="text-zinc-500 text-[10px] mt-1">{t.logsDirDesc}</div>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
            <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">{t.cacheDir}</div>
            <div className="text-zinc-300 break-all dir-ltr text-start">{config?.paths?.cache_dir || 'cache/'}</div>
            <div className="text-zinc-500 text-[10px] mt-1">{t.cacheDirDesc}</div>
          </div>
        </div>
      </div>

      {/* Security & Architecture Compliance */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-white font-semibold text-sm mb-4">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{t.securityTitle}</span>
          </div>

          <div className="space-y-2.5 text-xs text-zinc-300">
            <div className="flex items-start space-x-2 rtl:space-x-reverse p-2.5 rounded bg-zinc-950/60 border border-zinc-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <div>
                <span className="font-semibold text-white">{t.loopbackBound}: </span>
                <span className="text-zinc-400">{t.loopbackBoundDesc}</span>
              </div>
            </div>

            <div className="flex items-start space-x-2 rtl:space-x-reverse p-2.5 rounded bg-zinc-950/60 border border-zinc-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <div>
                <span className="font-semibold text-white">{t.isolation}: </span>
                <span className="text-zinc-400">{t.isolationDesc}</span>
              </div>
            </div>

            <div className="flex items-start space-x-2 rtl:space-x-reverse p-2.5 rounded bg-zinc-950/60 border border-zinc-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <div>
                <span className="font-semibold text-white">{t.traversalDefense}: </span>
                <span className="text-zinc-400">{t.traversalDefenseDesc}</span>
              </div>
            </div>

            <div className="flex items-start space-x-2 rtl:space-x-reverse p-2.5 rounded bg-zinc-950/60 border border-zinc-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <div>
                <span className="font-semibold text-white">{t.zeroMock}: </span>
                <span className="text-zinc-400">{t.zeroMockDesc}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between text-xs text-zinc-500 font-mono gap-2">
          <span>{t.targetRuntime}</span>
          <span>{t.engineRuntime}</span>
        </div>
      </div>
    </div>
  );
};
