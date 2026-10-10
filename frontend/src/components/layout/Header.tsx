import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, User, Wifi, WifiOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/client';
import { clsx } from 'clsx';
import { format } from 'date-fns';

export function Header() {
  const { triggerRefresh, demoMode } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        await api.health();
        setBackendOk(true);
      } catch {
        setBackendOk(false);
      }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    triggerRefresh();
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <header className="h-14 border-b border-navy-700/50 bg-navy-900/80 backdrop-blur-sm sticky top-0 z-30 flex items-center px-5 gap-4">
      {/* Demo banner */}
      {demoMode && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 shrink-0">
          <AlertTriangle className="h-3 w-3 text-amber-400" />
          <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase">
            ANOMALY DEMO ACTIVE
          </span>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Sim data badge */}
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/8 border border-amber-500/20">
        <AlertTriangle className="h-3 w-3 text-amber-500/70" />
        <span className="text-[10px] font-semibold text-amber-500/70 uppercase tracking-wider">
          SIMULATED DATA — DEMO MODE
        </span>
      </div>

      {/* Backend status */}
      <div className={clsx(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider',
        backendOk === null ? 'text-slate-500' :
        backendOk ? 'text-electric-500 bg-electric-500/8 border border-electric-500/20' :
        'text-rose-400 bg-rose-500/8 border border-rose-500/20'
      )}>
        {backendOk ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {backendOk === null ? 'Checking...' : backendOk ? 'API Connected' : 'API Offline'}
      </div>

      {/* Clock */}
      <div className="hidden md:block text-xs text-slate-500 font-mono tabular-nums">
        {format(now, 'HH:mm:ss')}
      </div>

      {/* Refresh */}
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="btn-ghost p-2 rounded-lg"
        title="Refresh all data"
      >
        <RefreshCw className={clsx('h-4 w-4', refreshing && 'animate-spin')} />
      </button>

      {/* User */}
      <div className="flex items-center gap-2 pl-3 border-l border-navy-700/50">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-electric-500/30 to-cyan-accent/20 border border-electric-500/30 flex items-center justify-center">
          <User className="h-3.5 w-3.5 text-electric-500" />
        </div>
        <div className="hidden sm:block">
          <p className="text-xs font-semibold text-slate-200">Operator</p>
          <p className="text-[10px] text-slate-500">Admin</p>
        </div>
      </div>
    </header>
  );
}
