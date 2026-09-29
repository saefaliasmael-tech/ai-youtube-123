import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Shield, Filter, RotateCcw, Download } from 'lucide-react';
import { engineApi } from '../services/engineApi';
import { useTranslation } from '../i18n';

interface LogsViewerProps {
  engineStatus: string;
}

export const LogsViewer: React.FC<LogsViewerProps> = ({ engineStatus }) => {
  const { strings } = useTranslation();
  const t = strings.logs;

  const [logs, setLogs] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      const serverLogs = await engineApi.getLogs();
      if (serverLogs && serverLogs.length > 0) {
        setLogs(serverLogs);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs = logs.filter((line) => {
    if (filter === 'all') return true;
    if (filter === 'electron') return line.includes('[Electron]') || line.includes('[App]');
    if (filter === 'engine') return line.includes('[Engine]') || line.includes('[Sidecar]') || line.includes('[Python]');
    if (filter === 'generation') return line.includes('[Generation]');
    if (filter === 'hardware') return line.includes('Hardware Scanner') || line.includes('[Hardware]');
    return true;
  });

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-2 rtl:space-x-reverse text-white font-semibold text-sm">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>{t.title}</span>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded text-[11px] cursor-pointer ${
              filter === 'all' ? 'bg-rose-600 text-white font-bold' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('electron')}
            className={`px-2.5 py-1 rounded text-[11px] cursor-pointer ${
              filter === 'electron' ? 'bg-rose-600 text-white font-bold' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Electron
          </button>
          <button
            onClick={() => setFilter('engine')}
            className={`px-2.5 py-1 rounded text-[11px] cursor-pointer ${
              filter === 'engine' ? 'bg-rose-600 text-white font-bold' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Engine
          </button>
          <button
            onClick={() => setFilter('hardware')}
            className={`px-2.5 py-1 rounded text-[11px] cursor-pointer ${
              filter === 'hardware' ? 'bg-rose-600 text-white font-bold' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Hardware
          </button>
          <button
            onClick={() => setFilter('generation')}
            className={`px-2.5 py-1 rounded text-[11px] cursor-pointer ${
              filter === 'generation' ? 'bg-rose-600 text-white font-bold' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Generation
          </button>
        </div>
      </div>

      {/* Terminal window */}
      <div
        ref={scrollRef}
        className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-3.5 font-mono text-xs text-zinc-300 h-80 overflow-y-auto space-y-1 dir-ltr text-start select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-zinc-600 italic py-8 text-center">No logs matching filter.</div>
        ) : (
          filteredLogs.map((line, idx) => {
            let color = 'text-zinc-300';
            if (line.includes('[ERROR]') || line.includes('error')) color = 'text-rose-400 font-semibold';
            else if (line.includes('[WARN]') || line.includes('warning')) color = 'text-amber-400';
            else if (line.includes('Connected') || line.includes('Ready') || line.includes('completed')) color = 'text-emerald-300';
            else if (line.includes('[Generation]')) color = 'text-purple-300';

            return (
              <div key={idx} className={`leading-relaxed break-words ${color}`}>
                {line.trim()}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
