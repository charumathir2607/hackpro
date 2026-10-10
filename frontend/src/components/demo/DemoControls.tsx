import { useState } from 'react';
import { Zap, Play, RotateCcw, Info } from 'lucide-react';
import { api } from '../../api/client';
import { useApp } from '../../context/AppContext';
import { ConfirmDialog } from '../ui/Modal';

export function DemoControls() {
  const { addToast, triggerRefresh, setDemoMode } = useApp();
  const [simulating, setSimulating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const result = await api.simulateEveningAnomaly();
      setDemoMode(true);
      triggerRefresh();
      addToast({
        type: 'warning',
        title: 'Evening Anomaly Activated',
        message: `Section ${result.affected_section}: ${result.unexplained_kwh} kWh unexplained (${result.unexplained_pct}%)`,
      });
    } catch (e: unknown) {
      addToast({ type: 'error', title: 'Simulation failed', message: String(e) });
    } finally {
      setSimulating(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setShowResetConfirm(false);
    try {
      await api.resetDemo();
      setDemoMode(false);
      triggerRefresh();
      addToast({ type: 'success', title: 'Reset to Baseline', message: 'All sections show normal operating parameters.' });
    } catch (e: unknown) {
      addToast({ type: 'error', title: 'Reset failed', message: String(e) });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="card p-5 border-l-2 border-l-electric-500/50">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-electric-500/10 border border-electric-500/20 flex items-center justify-center">
            <Zap className="h-4 w-4 text-electric-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Demo Controls</h3>
            <p className="text-[10px] text-slate-500">For hackathon judges</p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold uppercase tracking-wider">
          Demo
        </span>
      </div>

      {/* Boundary Measurement Principle */}
      <div className="mb-4 p-3 rounded-lg bg-navy-800/60 border border-navy-600/40">
        <div className="flex items-start gap-2">
          <Info className="h-3.5 w-3.5 text-cyan-accent/60 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <span className="text-slate-400 font-medium">Boundary Measurement Principle:</span>{' '}
            Measure energy entering and leaving each feeder section over the same interval.
            Subtract registered consumer usage and estimated technical losses.
            Any remaining difference warrants investigation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleSimulate}
          disabled={simulating}
          className="flex flex-col items-start gap-2 p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/12 transition-all duration-150 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            {simulating ? (
              <span className="h-4 w-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
            ) : (
              <Play className="h-4 w-4 text-amber-400 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-xs font-semibold text-amber-400">
              {simulating ? 'Simulating...' : 'Simulate Evening Anomaly'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 text-left leading-relaxed">
            Inject discrepancy in S-04 during 19:00–22:00 window. Watch dashboard and alerts update.
          </p>
        </button>

        <button
          onClick={() => setShowResetConfirm(true)}
          disabled={resetting}
          className="flex flex-col items-start gap-2 p-3.5 rounded-xl bg-navy-800/60 border border-navy-600/40 hover:border-electric-500/30 hover:bg-navy-700/60 transition-all duration-150 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            {resetting ? (
              <span className="h-4 w-4 rounded-full border-2 border-electric-500 border-t-transparent animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 text-electric-500 group-hover:rotate-180 transition-transform duration-300" />
            )}
            <span className="text-xs font-semibold text-electric-500">
              {resetting ? 'Resetting...' : 'Reset to Baseline'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 text-left leading-relaxed">
            Restore normal operating parameters. Clears all simulated anomalies.
          </p>
        </button>
      </div>

      <ConfirmDialog
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleReset}
        title="Reset to Baseline?"
        message="This will restore all sections to normal baseline data and clear the simulated evening anomaly. This action cannot be undone."
        confirmLabel="Reset"
        loading={resetting}
      />
    </div>
  );
}
