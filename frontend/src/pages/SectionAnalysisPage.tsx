import { useState } from 'react';
import { api, SectionDetail } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useApp } from '../context/AppContext';
import { ErrorState } from '../components/ui/States';
import { ChartSkeleton, Skeleton } from '../components/ui/Skeleton';
import { clsx } from 'clsx';
import {
  ResponsiveContainer, AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const SECTION_IDS = ['S-01', 'S-02', 'S-03', 'S-04', 'S-05', 'S-06'];

function ChartTip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !payload) return null;
  const items = payload as Array<{ name: string; value: number; color: string }>;
  return (
    <div className="px-3 py-2.5 rounded-xl bg-navy-900 border border-navy-600/60 shadow-card text-xs">
      <p className="text-slate-400 mb-1.5 font-mono">{String(label)}</p>
      {items.map((i) => (
        <p key={i.name} style={{ color: i.color }} className="flex gap-4 justify-between">
          <span>{i.name}</span>
          <span className="font-semibold tabular-nums">{Number(i.value).toFixed(3)} kWh</span>
        </p>
      ))}
    </div>
  );
}

export default function SectionAnalysisPage() {
  const { refreshKey } = useApp();
  const [selectedId, setSelectedId] = useState('S-04');

  const { data, loading, error, refetch } = useApi<SectionDetail>(
    () => api.section(selectedId),
    [selectedId, refreshKey]
  );

  const fmtTime = (ts: string) => {
    try { return format(parseISO(ts), 'HH:mm'); } catch { return ts.slice(11, 16); }
  };

  const chartData = data?.readings_24h.map(p => ({
    time: fmtTime(p.timestamp),
    'Entry': p.entry_kwh,
    'Consumer': p.consumer_kwh,
    'Tech Loss': p.technical_loss_kwh,
    'Unexplained': p.unexplained_kwh,
  })) ?? [];

  const comparisonData = data ? [
    { period: 'Evening (19–22h)', unexplained: data.evening_avg_unexplained_kwh },
    { period: 'Daytime (09–17h)', unexplained: data.daytime_avg_unexplained_kwh },
  ] : [];

  const isAnomalous = data?.status === 'anomaly';
  const isMonitored = data?.status === 'monitor';

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Section Analysis</h1>
          <p className="text-sm text-slate-500 mt-0.5">Detailed energy balance and detection analysis for a selected feeder section</p>
        </div>
        <div className="sim-banner">
          <AlertTriangle className="h-3 w-3" />
          SIMULATED DATA — DEMO MODE
        </div>
      </div>

      {/* Section selector */}
      <div className="flex flex-wrap gap-2">
        {SECTION_IDS.map(id => (
          <button
            key={id}
            onClick={() => setSelectedId(id)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
              selectedId === id
                ? 'bg-electric-500/20 text-electric-500 border border-electric-500/40'
                : 'bg-navy-800 text-slate-400 border border-navy-600/50 hover:border-electric-500/30 hover:text-slate-200'
            )}
          >
            {id}
          </button>
        ))}
      </div>

      {error && !data && (
        <ErrorState error={error} onRetry={refetch} />
      )}

      {/* Status banner */}
      {!loading && data && (
        <div className={clsx(
          'flex items-start gap-3 p-4 rounded-xl border animate-fade-in',
          isAnomalous
            ? 'bg-rose-500/8 border-rose-500/30'
            : isMonitored
            ? 'bg-amber-500/8 border-amber-500/30'
            : 'bg-electric-500/8 border-electric-500/20'
        )}>
          {isAnomalous ? (
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          ) : isMonitored ? (
            <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="h-4 w-4 text-electric-500 shrink-0 mt-0.5" />
          )}
          <div>
            <p className={clsx(
              'text-sm font-semibold',
              isAnomalous ? 'text-rose-300' : isMonitored ? 'text-amber-300' : 'text-electric-400'
            )}>
              {isAnomalous ? `Anomaly Detected — ${selectedId}` :
               isMonitored ? `Under Monitoring — ${selectedId}` :
               `Normal Operation — ${selectedId}`}
            </p>
            <p className="text-xs text-slate-400 mt-1">{data.detection_reason}</p>
            {isAnomalous && (
              <p className="text-xs text-rose-400/70 mt-1 font-medium">
                ⚠ Note: This flag indicates an unexplained energy discrepancy that warrants investigation. 
                It does not constitute proof of electricity theft.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main metrics */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4">
              <Skeleton className="h-2.5 w-20 mb-3" />
              <Skeleton className="h-6 w-28" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: 'Entry Energy', value: `${data.entry_kwh} kWh`, sub: data.entry_boundary, color: 'text-cyan-accent' },
            { label: 'Exit Energy', value: `${data.exit_kwh} kWh`, sub: data.exit_boundary, color: 'text-slate-300' },
            { label: 'Consumer Total', value: `${data.consumer_kwh} kWh`, sub: `${data.household_count} households`, color: 'text-electric-500' },
            { label: 'Tech Losses', value: `${data.technical_loss_kwh} kWh`, sub: `${data.thresholds.technical_loss_pct}% est.`, color: 'text-slate-400' },
            { label: 'Unexplained', value: `${data.unexplained_kwh} kWh`, sub: `${data.unexplained_pct}% of input`, color: isAnomalous ? 'text-rose-400' : isMonitored ? 'text-amber-400' : 'text-electric-500', highlight: isAnomalous },
            { label: 'Threshold', value: `${data.thresholds.loss_threshold_pct}%`, sub: `Min ${data.thresholds.min_unexplained_kwh} kWh`, color: 'text-slate-400' },
          ].map(({ label, value, sub, color, highlight }) => (
            <div key={label} className={clsx('card p-4', highlight && 'border-l-2 border-l-rose-500/60')}>
              <p className="stat-label mb-2">{label}</p>
              <p className={clsx('text-xl font-bold tabular-nums', color)}>{value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Calculation formula */}
      {data && (
        <div className="card p-5 border-l-2 border-l-cyan-accent/40">
          <p className="text-xs font-semibold text-slate-400 mb-3">Energy Balance Calculation</p>
          <div className="font-mono text-xs text-slate-300 leading-relaxed space-y-1">
            <p>
              <span className="text-slate-500">Unexplained Energy</span> ={' '}
              <span className="text-cyan-accent">Entry ({data.entry_kwh} kWh)</span> −
              <span className="text-slate-400"> Exit ({data.exit_kwh} kWh)</span> −
              <span className="text-electric-500"> Consumer ({data.consumer_kwh} kWh)</span> −
              <span className="text-slate-500"> Tech Loss ({data.technical_loss_kwh} kWh)</span>
            </p>
            <p className={clsx('font-bold text-sm', isAnomalous ? 'text-rose-400' : 'text-electric-500')}>
              = {data.unexplained_kwh} kWh ({data.unexplained_pct}% of input)
              {data.unexplained_pct > data.thresholds.loss_threshold_pct && (
                <span className="ml-2 text-xs font-normal text-rose-400/70">
                  ← Exceeds {data.thresholds.loss_threshold_pct}% threshold
                </span>
              )}
            </p>
          </div>
          {isAnomalous && (
            <p className="text-[11px] text-amber-500/70 mt-3 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" />
              Investigation recommended. No assumptions about cause should be made without field verification.
            </p>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* 24h trend */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-1">24-Hour Energy Trend — {selectedId}</h3>
          <p className="text-xs text-slate-500 mb-4">Hourly entry, consumer, and unexplained energy</p>
          {loading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gU" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,51,86,0.5)" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} unit=" kWh" width={60} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                <ReferenceLine x="19:00" stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Eve.', fill: '#f59e0b', fontSize: 9 }} />
                <ReferenceLine x="22:00" stroke="#f59e0b" strokeDasharray="4 2" />
                <Area type="monotone" dataKey="Entry" stroke="#00d4ff" strokeWidth={2} fill="url(#gE)" />
                <Area type="monotone" dataKey="Consumer" stroke="#00ff88" strokeWidth={1.5} fill="none" strokeDasharray="4 2" />
                <Area type="monotone" dataKey="Unexplained" stroke="#f43f5e" strokeWidth={2} fill="url(#gU)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Evening vs Daytime */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Evening vs Daytime Comparison</h3>
          <p className="text-xs text-slate-500 mb-4">Average unexplained energy by time period</p>
          {loading ? <ChartSkeleton /> : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={comparisonData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,51,86,0.5)" horizontal />
                  <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} unit=" kWh" width={60} />
                  <Tooltip
                    formatter={(v: number) => [`${v.toFixed(3)} kWh`, 'Avg Unexplained']}
                    contentStyle={{ background: '#0d1528', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8 }}
                    labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                  />
                  <Bar dataKey="unexplained" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Avg Unexplained" />
                </BarChart>
              </ResponsiveContainer>
              {data && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-amber-500/8 border border-amber-500/20 text-center">
                    <p className="text-[10px] text-amber-500/60 uppercase tracking-wider">Evening Avg</p>
                    <p className="text-xl font-bold text-amber-400 mt-1">{data.evening_avg_unexplained_kwh} kWh</p>
                    <p className="text-[10px] text-slate-500">19:00 – 22:00 window</p>
                  </div>
                  <div className="p-3 rounded-lg bg-navy-800/60 border border-navy-600/40 text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Daytime Avg</p>
                    <p className="text-xl font-bold text-slate-300 mt-1">{data.daytime_avg_unexplained_kwh} kWh</p>
                    <p className="text-[10px] text-slate-500">09:00 – 17:00 window</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Thresholds */}
      {data && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Detection Thresholds</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Loss Threshold', value: `${data.thresholds.loss_threshold_pct}%`, desc: 'Maximum acceptable unexplained loss percentage' },
              { label: 'Min Unexplained', value: `${data.thresholds.min_unexplained_kwh} kWh`, desc: 'Minimum kWh below which alert is suppressed' },
              { label: 'Technical Loss Est.', value: `${data.thresholds.technical_loss_pct}%`, desc: 'Estimated I²R and core losses in distribution' },
            ].map(({ label, value, desc }) => (
              <div key={label} className="p-4 rounded-xl bg-navy-800/60 border border-navy-600/40">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-lg font-bold text-cyan-accent">{value}</p>
                <p className="text-[10px] text-slate-600 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
