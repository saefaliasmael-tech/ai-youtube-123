import React, { useState, useEffect } from 'react';
import {
  Video,
  Sparkles,
  Settings2,
  XCircle,
  Play,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  FileVideo,
} from 'lucide-react';
import { ModelInfo, HardwareProfile, engineApi } from '../services/engineApi';
import { useTranslation } from '../i18n';

interface GenerateViewProps {
  models: ModelInfo[];
  hardwareProfile: HardwareProfile | null;
  onNavigateTab: (tab: any) => void;
  onGenerationComplete: () => void;
}

export const GenerateView: React.FC<GenerateViewProps> = ({
  models,
  hardwareProfile,
  onNavigateTab,
  onGenerationComplete,
}) => {
  const { strings, isRtl, language } = useTranslation();
  const t = strings.generate;
  const common = strings.common;

  // Form states
  const [prompt, setPrompt] = useState<string>('A cinematic shot of a futuristic sports car driving through a rain-slicked city at dusk with neon reflections');
  const [selectedModel, setSelectedModel] = useState<string>('wan-2.1-1.3b-t2v');
  const [resolution, setResolution] = useState<string>('832x480');
  const [duration, setDuration] = useState<number>(3);
  const [steps, setSteps] = useState<number>(25);
  const [guidance, setGuidance] = useState<number>(5.0);
  const [seed, setSeed] = useState<number>(-1);

  // Job execution states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeJobStatus, setActiveJobStatus] = useState<any>({ state: 'idle', progress: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Poll status while job is active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const checkJobStatus = async () => {
      try {
        const status = await engineApi.getGenerationStatus();
        setActiveJobStatus(status);

        if (status.state === 'completed') {
          onGenerationComplete();
        }
      } catch {
        // Ignored
      }
    };

    checkJobStatus();

    const isRunning = [
      'preparing',
      'loading_model',
      'generating',
      'encoding',
    ].includes(activeJobStatus?.state);

    if (isRunning) {
      interval = setInterval(checkJobStatus, 1500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeJobStatus?.state, onGenerationComplete]);

  const activeModelMeta = models.find((m) => m.id === selectedModel);
  const isModelReady = activeModelMeta?.status === 'ready';
  const isPyTorchReady = hardwareProfile?.pytorch?.pytorch_installed && hardwareProfile?.pytorch?.cuda_available;

  const handleStartGeneration = async () => {
    if (!prompt.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await engineApi.startGeneration({
        prompt: prompt.trim(),
        model_id: selectedModel,
        resolution,
        duration,
        steps,
        guidance,
        seed: seed === -1 ? Math.floor(Math.random() * 1000000) : seed,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to start generation');
      } else {
        setActiveJobStatus({ state: 'preparing', progress: 0 });
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Error communicating with generation engine');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelGeneration = async () => {
    try {
      await engineApi.cancelGeneration();
    } catch {
      // Ignored
    }
  };

  const isGenerating = [
    'preparing',
    'loading_model',
    'generating',
    'encoding',
  ].includes(activeJobStatus?.state);

  const renderStatusBadge = () => {
    const s = activeJobStatus?.state || 'idle';
    switch (s) {
      case 'preparing':
        return (
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-amber-400">
            <Clock className="w-4 h-4 animate-spin" />
            <span>{t.statusPreparing}</span>
          </div>
        );
      case 'loading_model':
        return (
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-purple-400">
            <Layers className="w-4 h-4 animate-pulse" />
            <span>{t.statusLoadingModel}</span>
          </div>
        );
      case 'generating':
        return (
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-rose-400 font-bold">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>{t.statusGenerating}</span>
          </div>
        );
      case 'encoding':
        return (
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-cyan-400">
            <FileVideo className="w-4 h-4 animate-pulse" />
            <span>{t.statusEncoding}</span>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{t.statusCompleted}</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-rose-400">
            <XCircle className="w-4 h-4" />
            <span>{t.statusFailed}</span>
          </div>
        );
      case 'cancelled':
        return (
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-zinc-400">
            <RotateCcw className="w-4 h-4" />
            <span>{t.statusCancelled}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-zinc-500 font-mono">
            <span>{t.statusIdle}</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Card */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 shadow-xl backdrop-blur">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Video className="w-5 h-5 text-rose-500" />
          <h2 className="text-lg font-bold text-white tracking-tight">{t.title}</h2>
        </div>
        <p className="text-xs text-zinc-400 mt-1">{t.subtitle}</p>
      </div>

      {/* Warnings & Diagnostics checks */}
      <div className="space-y-3">
        {!isPyTorchReady && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 text-xs text-amber-200 flex items-start space-x-3 rtl:space-x-reverse">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block text-sm">{t.requiresPyTorchWarning}</span>
              <p className="text-zinc-300 mt-1">
                {isRtl
                  ? 'تم رصد بيئة بايثون لا تحتوي على حزمة PyTorch المجمعة مع دعم CUDA. قم بتثبيت الحزمة لتفعيل التوليد.'
                  : 'Python environment lacks CUDA-enabled PyTorch. Install PyTorch with CUDA to unlock local generation.'}
              </p>
              <button
                onClick={() => onNavigateTab('hardware')}
                className="mt-2 text-rose-400 underline hover:text-rose-300 font-semibold cursor-pointer"
              >
                {isRtl ? 'عرض تفاصيل العتاد و PyTorch ←' : 'View Hardware & PyTorch Diagnostics →'}
              </button>
            </div>
          </div>
        )}

        {!isModelReady && (
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-start space-x-3 rtl:space-x-reverse">
            <Layers className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block text-white text-sm">{t.requiresModelWarning}</span>
              <p className="text-zinc-400 mt-1">
                {isRtl
                  ? 'يتطلب النموذج تنزيل أوزان Wan 2.1 1.3B (حوالي 4.5 جيجابايت) قبل البدء.'
                  : 'Wan 2.1 1.3B model weights (~4.5 GB) must be downloaded prior to generating.'}
              </p>
              <button
                onClick={() => onNavigateTab('models')}
                className="mt-2 text-rose-400 underline hover:text-rose-300 font-semibold cursor-pointer"
              >
                {isRtl ? 'الانتقال إلى إدارة النماذج والتنزيل ←' : 'Go to Models Tab to download →'}
              </button>
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-200 flex items-start space-x-3 rtl:space-x-reverse">
          <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">{common.error}</span>
            <span className="text-zinc-300 font-mono mt-0.5 block">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Prompt & Generation Monitor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prompt Box */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
            <label className="text-sm font-bold text-white block flex items-center justify-between">
              <span>{t.promptLabel}</span>
              <span className="text-xs text-zinc-500 font-normal">{prompt.length} chars</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
              rows={4}
              placeholder={t.promptPlaceholder}
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg p-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-sans leading-relaxed resize-none disabled:opacity-50"
            />

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs font-mono">{renderStatusBadge()}</div>

              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                {isGenerating && (
                  <button
                    onClick={handleCancelGeneration}
                    className="flex items-center space-x-1.5 rtl:space-x-reverse px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 text-zinc-400" />
                    <span>{t.cancelBtn}</span>
                  </button>
                )}

                <button
                  onClick={handleStartGeneration}
                  disabled={isGenerating || isSubmitting || !prompt.trim()}
                  className="flex items-center space-x-2 rtl:space-x-reverse px-6 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition shadow-lg shadow-rose-950/60 disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>{isGenerating ? t.generatingBtn : t.generateBtn}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Job State & Output Details Banner */}
          {activeJobStatus?.job && (
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="text-zinc-400">Job ID: <strong className="text-zinc-200">{activeJobStatus.job.id}</strong></span>
                <span className="text-zinc-500">{activeJobStatus.job.timestamp}</span>
              </div>

              {activeJobStatus.job.status_message && (
                <div className="text-zinc-300">
                  <span className="text-zinc-500 block text-[10px] uppercase tracking-wide">Status Details:</span>
                  <span className="text-rose-300">{activeJobStatus.job.status_message}</span>
                </div>
              )}

              {activeJobStatus.job.error && (
                <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/80 text-rose-300">
                  <span className="font-bold block mb-1">Execution Failure:</span>
                  <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{activeJobStatus.job.error}</p>
                </div>
              )}

              {activeJobStatus.job.output_path && (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 flex items-center justify-between">
                  <span>Output saved: {activeJobStatus.job.output_path}</span>
                  <button
                    onClick={() => onNavigateTab('history')}
                    className="text-xs text-white underline hover:text-emerald-200 font-semibold cursor-pointer"
                  >
                    View in History →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Col: Synthesis Settings */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-5">
          <div className="flex items-center space-x-2 rtl:space-x-reverse border-b border-zinc-800 pb-3">
            <Settings2 className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white">{isRtl ? 'إعدادات النموذج والتوليد' : 'Synthesis Parameters'}</h3>
          </div>

          {/* Model Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">{t.modelSelectLabel}</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isGenerating}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 font-mono"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.status === 'ready' ? 'Ready' : 'Not Installed'})
                </option>
              ))}
            </select>
          </div>

          {/* Resolution */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">{t.resolutionLabel}</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              disabled={isGenerating}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 font-mono"
            >
              <option value="832x480">832 x 480 (16:9 Standard 480p)</option>
              <option value="480x832">480 x 832 (9:16 Shorts/Reels)</option>
              <option value="640x480">640 x 480 (4:3 Classic)</option>
            </select>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-zinc-300">{t.durationLabel}</span>
              <span className="text-rose-400 font-mono font-bold">{duration} {t.durationUnit}</span>
            </div>
            <input
              type="range"
              min={3}
              max={5}
              step={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={isGenerating}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
              <span>3s</span>
              <span>4s</span>
              <span>5s</span>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-zinc-300">{t.stepsLabel}</span>
              <span className="text-zinc-200 font-mono">{steps}</span>
            </div>
            <input
              type="range"
              min={15}
              max={40}
              step={5}
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value))}
              disabled={isGenerating}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          {/* Guidance Scale */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-zinc-300">{t.guidanceLabel}</span>
              <span className="text-zinc-200 font-mono">{guidance.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={2.0}
              max={9.0}
              step={0.5}
              value={guidance}
              onChange={(e) => setGuidance(Number(e.target.value))}
              disabled={isGenerating}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          {/* Seed */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">{t.seedLabel}</label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              disabled={isGenerating}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
