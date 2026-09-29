import React from 'react';
import {
  Sparkles,
  Cpu,
  Layers,
  Video,
  Clock,
  Terminal,
  Settings,
  Languages,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MonitorPlay,
} from 'lucide-react';
import { useTranslation } from '../i18n';

export type NavTab = 'dashboard' | 'hardware' | 'models' | 'generate' | 'history' | 'logs' | 'settings';

interface HeaderProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isElectron: boolean;
  platform: string;
  engineStatus: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  isElectron,
  engineStatus,
}) => {
  const { language, setLanguage, strings, isRtl } = useTranslation();
  const tNav = strings.nav;

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: tNav.dashboard, icon: Activity },
    { id: 'hardware', label: tNav.hardware, icon: Cpu },
    { id: 'models', label: tNav.models, icon: Layers },
    { id: 'generate', label: tNav.generate, icon: Video },
    { id: 'history', label: tNav.history, icon: Clock },
    { id: 'logs', label: tNav.logs, icon: Terminal },
    { id: 'settings', label: tNav.settings, icon: Settings },
  ];

  const getStatusBadge = () => {
    if (engineStatus === 'Connected') {
      return (
        <span className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Sidecar: 127.0.0.1:8765</span>
        </span>
      );
    }
    if (engineStatus === 'Starting') {
      return (
        <span className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-amber-950/80 text-amber-400 border border-amber-800/80">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          <span>Sidecar: Starting...</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-rose-950/80 text-rose-400 border border-rose-800/80">
        <XCircle className="w-3.5 h-3.5 text-rose-400" />
        <span>Sidecar: Offline</span>
      </span>
    );
  };

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/95 sticky top-0 z-50 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top brand & control row */}
        <div className="flex items-center justify-between h-16 border-b border-zinc-800/50">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center shadow-lg shadow-rose-950/60 ring-1 ring-rose-500/40">
              <MonitorPlay className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <h1 className="text-base font-extrabold text-white tracking-tight">AI YouTube</h1>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold border border-zinc-700">
                  Wan 2.1 (1.3B)
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">Local Video Synthesis • RTX 3060 12GB</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            {getStatusBadge()}

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              title="Toggle Arabic / English"
              className="flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-medium text-zinc-200 transition-colors cursor-pointer"
            >
              <Languages className="w-3.5 h-3.5 text-rose-400" />
              <span>{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>
        </div>

        {/* Navigation tabs row */}
        <nav className="flex items-center space-x-1 rtl:space-x-reverse py-2 overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center space-x-2 rtl:space-x-reverse px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
