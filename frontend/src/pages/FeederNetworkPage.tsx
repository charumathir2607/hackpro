import { useState } from 'react';
import { api, Section, SectionDetail } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useApp } from '../context/AppContext';
import { ErrorState } from '../components/ui/States';
import { ChartSkeleton, Skeleton } from '../components/ui/Skeleton';
import { clsx } from 'clsx';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { Zap, ChevronRight, X, AlertTriangle, CheckCircle, Eye, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Boundary points
const BOUNDARIES = ['B-00', 'B-01', 'B-02', 'B-03', 'B-04', 'B-05', 'B-06'];
const SECTIONS = ['S-01', 'S-02', 'S-03', 'S-04', 'S-05', 'S-06'];

function sectionColor(status: string) {
  switch (status) {
    case 'anomaly': return { bg: '#f43f5e22', border: '#f43f5e60', text: '#f43f5e', label: 'Anomaly' };
    case 'monitor': return { bg: '#f59e0b18', border: '#f59e0b50', text: '#f59e0b', label: 'Monitor' };
    default: return { bg: '#00ff8812', border: '#00ff8830', text: '#00ff88', label: 'Normal' };
  }
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'anomaly') return <AlertTriangle className="h-3 w-3 text-rose-400" />;
  if (status === 'monitor') return <Eye className="h-3 w-3 text-amber-400" />;
  return <CheckCircle className="h-3 w-3 text-electric-500" />;
}

function ChartTip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !payload) return null;
  const items = payload as Array<{ name: string; value: number; color: string }>;
  return (
    <div className="px-3 py-2.5 rounded-xl bg-navy-900 border border-navy-600/60 shadow-card text-xs">
      <p className="text-slate-400 mb-1.5 font-mono">{String(label)}</p>
      {items.map((i) => (
        <p key={i.name} style={{ color: i.color }} className="flex gap-3 justify-between">
          <span>{i.name}</span>
          <span className="font-semibold tabular-nums">{Number(i.value).toFixed(2)} kWh</span>
        </p>
      ))}
    </div>
  );
}

// ─── Section Detail Panel ─────────────────────────────────────────────────────

function SectionPanel({ sectionId, onClose }: { sectionId: string; onClose: () => void }) {
  const { refreshKey } = useApp();
  const { data, loading, error, refetch } = useApi(
    () => api.section(sectionId), [sectionId, refreshKey]
  );

  const fmtTime = (ts: string) => {
    try { return format(parseISO(ts), 'HH:mm'); } catch { return ts.slice(11, 16); }
  };

  const chartData = data?.readings_24h.map(p => ({
    time: fmtTime(p.timestamp),
    'Entry': p.entry_kwh,
    'Consumer': p.consumer_kwh,
    'Unexplained': p.unexplained_kwh,
  })) ?? [];

  const col = data ? sectionColor(data.status) : sectionColor('normal');

  return (
    <div className="animate-slide-in flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-navy-700/60 flex items-center justify-center">
            <Zap className="h-5 w-5 text-cyan-accent" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">{sectionId}</h2>
            {data && (
              <span className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: col.text }}>
                {col.label}
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="btn-ghost p-1.5"><X className="h-4 w-4" /></button>
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg bg-navy-800/60">
                <Skeleton className="h-2.5 w-16 mb-2" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
          <ChartSkeleton height={200} />
        </div>
      )}

      {error && <ErrorState error={error} onRetry={refetch} />}

      {data && !loading && (
        <div className="space-y-5">
          {/* Detection reason */}
          {data.status !== 'normal' && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl"
              style={{ background: col.bg, border: `1px solid ${col.border}` }}>
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: col.text }} />
              <p className="text-xs text-slate-300">{data.detection_reason}</p>
            </div>
          )}

          {/* Energy metrics */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Entry Energy', value: `${data.entry_kwh} kWh`, from: data.entry_boundary },
              { label: 'Exit Energy', value: `${data.exit_kwh} kWh`, from: data.exit_boundary },
              { label: 'Consumer Usage', value: `${data.consumer_kwh} kWh`, from: `${data.household_count} households` },
              { label: 'Tech Losses', value: `${data.technical_loss_kwh} kWh`, from: `${data.thresholds.technical_loss_pct}% est.` },
              { label: 'Unexplained', value: `${data.unexplained_kwh} kWh`, from: `${data.unexplained_pct}% of input`, highlight: data.status !== 'normal' },
              { label: 'Threshold', value: `${data.thresholds.loss_threshold_pct}%`, from: 'Detection limit' },
            ].map(({ label, value, from, highlight }) => (
              <div key={label} className={clsx(
                'p-3 rounded-lg border',
                highlight ? 'bg-rose-500/8 border-rose-500/25' : 'bg-navy-800/60 border-navy-600/40'
              )}>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
                <p className={clsx('text-sm font-bold', highlight ? 'text-rose-400' : 'text-slate-200')}>
                  {value}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">{from}</p>
              </div>
            ))}
          </div>

          {/* Calculation breakdown */}
          <div className="p-3 rounded-xl bg-navy-800/40 border border-navy-600/30">
            <p className="text-xs font-semibold text-slate-400 mb-2">Calculation Breakdown</p>
            <p className="text-xs text-slate-500 leading-relaxed font-mono">
              Unexplained = Entry ({data.entry_kwh}) − Exit ({data.exit_kwh}) −<br />
              Consumer ({data.consumer_kwh}) − Tech Loss ({data.technical_loss_kwh})<br />
              <span className={data.status !== 'normal' ? 'text-rose-400 font-semibold' : 'text-electric-500'}>
                = {data.unexplained_kwh} kWh ({data.unexplained_pct}%)
              </span>
            </p>
          </div>

          {/* Evening vs Daytime */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-amber-500/8 border border-amber-500/20">
              <p className="text-[10px] text-amber-500/60 uppercase tracking-wider mb-1">Evening Avg</p>
              <p className="text-sm font-bold text-amber-400">{data.evening_avg_unexplained_kwh} kWh</p>
              <p className="text-[10px] text-slate-500">19:00 – 22:00</p>
            </div>
            <div className="p-3 rounded-lg bg-navy-800/60 border border-navy-600/40">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Daytime Avg</p>
              <p className="text-sm font-bold text-slate-300">{data.daytime_avg_unexplained_kwh} kWh</p>
              <p className="text-[10px] text-slate-500">09:00 – 17:00</p>
            </div>
          </div>

          {/* 24h Trend */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-3">24-Hour Section Trend</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradE" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradU" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,51,86,0.5)" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 9 }} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="Entry" stroke="#00d4ff" strokeWidth={1.5} fill="url(#gradE)" />
                <Area type="monotone" dataKey="Consumer" stroke="#00ff88" strokeWidth={1.5} fill="none" strokeDasharray="3 2" />
                <Area type="monotone" dataKey="Unexplained" stroke="#f43f5e" strokeWidth={2} fill="url(#gradU)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Feeder Network Page ──────────────────────────────────────────────────────

export default function FeederNetworkPage() {
  const { refreshKey } = useApp();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const { data: sections, loading, error, refetch } = useApi(
    () => api.sections(), [refreshKey]
  );

  const sectionMap = sections
    ? Object.fromEntries(sections.map(s => [s.id, s]))
    : {};

  if (error && !sections) {
    return <div className="p-8"><ErrorState error={error} onRetry={refetch} /></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Feeder Network</h1>
          <p className="text-sm text-slate-500 mt-0.5">Visual schematic of the distribution feeder with boundary measurement points</p>
        </div>
        <div className="sim-banner">
          <AlertTriangle className="h-3 w-3" />
          SIMULATED DATA — DEMO MODE
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {[
          { color: 'bg-electric-500', label: 'Normal' },
          { color: 'bg-amber-400', label: 'Monitor' },
          { color: 'bg-rose-400', label: 'Anomaly Detected' },
          { color: 'bg-slate-500', label: 'Data Warning' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span className="text-slate-400">{label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-5">
        {/* Schematic */}
        <div className={clsx('flex-1 card p-6 transition-all duration-300', selectedSection ? 'xl:flex-[0_0_55%]' : '')}>
          <div className="overflow-x-auto">
            <div className="min-w-[680px]">
              {/* Transformer */}
              <div className="flex justify-center mb-8">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-16 rounded-xl bg-gradient-to-br from-cyan-accent/20 to-navy-700 border-2 border-cyan-accent/50 flex items-center justify-center shadow-glow-cyan">
                    <div className="text-center">
                      <Zap className="h-5 w-5 text-cyan-accent mx-auto" />
                      <p className="text-[10px] text-cyan-accent font-bold mt-0.5">TRANSFORMER</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-5 h-5 rounded-full border-2 border-cyan-accent/60 bg-cyan-accent/10 flex items-center justify-center">
                      <span className="text-[8px] text-cyan-accent font-bold">B-00</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Feeder Head</span>
                  </div>
                </div>
              </div>

              {/* Main bus line */}
              <div className="relative flex items-start justify-between gap-0 mb-3">
                {/* Horizontal bus */}
                <div className="absolute top-0 left-[8%] right-[8%] h-0.5 bg-gradient-to-r from-cyan-accent/30 via-cyan-accent/60 to-cyan-accent/30" />
                
                {/* Section columns */}
                {SECTIONS.map((sid, idx) => {
                  const sec: Section | undefined = sectionMap[sid];
                  const col = sec ? sectionColor(sec.status) : sectionColor('normal');
                  const isSelected = selectedSection === sid;

                  return (
                    <div key={sid} className="flex flex-col items-center flex-1 relative">
                      {/* Drop line */}
                      <div className="w-0.5 h-6 bg-cyan-accent/30" />

                      {/* Section box */}
                      <button
                        onClick={() => setSelectedSection(isSelected ? null : sid)}
                        className="w-full max-w-[110px] rounded-xl border-2 transition-all duration-200 p-3 group"
                        style={{
                          background: isSelected ? `${col.bg}` : col.bg,
                          borderColor: isSelected ? col.text : col.border,
                          boxShadow: isSelected ? `0 0 16px ${col.text}30` : 'none',
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold" style={{ color: col.text }}>{sid}</span>
                          <StatusIcon status={sec?.status ?? 'normal'} />
                        </div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                          style={{ color: col.text }}>{col.label}</p>
                        {loading ? (
                          <Skeleton className="h-2 w-full" />
                        ) : sec ? (
                          <div className="space-y-0.5">
                            <p className="text-[9px] text-slate-500">Input: <span className="text-slate-400">{sec.entry_kwh} kWh</span></p>
                            <p className="text-[9px] text-slate-500">Gap: <span style={{ color: col.text }}>{sec.unexplained_pct}%</span></p>
                            <p className="text-[9px] text-slate-500">HH: 10</p>
                          </div>
                        ) : null}
                        <p className="text-[9px] text-slate-600 mt-1.5 text-center">
                          {isSelected ? 'Click to close' : 'Click for details'}
                        </p>
                      </button>

                      {/* Boundary point */}
                      <div className="mt-2 flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full border border-slate-500/50 bg-navy-800 flex items-center justify-center">
                          <span className="text-[7px] text-slate-400 font-mono">{BOUNDARIES[idx + 1]}</span>
                        </div>
                      </div>

                      {/* Households */}
                      <div className="mt-3 grid grid-cols-5 gap-0.5">
                        {Array.from({ length: 10 }).map((_, h) => (
                          <div
                            key={h}
                            className="w-3 h-3 rounded-sm border"
                            style={{
                              background: sec?.status === 'anomaly' && h < 4 ? '#f43f5e20' : '#1a254020',
                              borderColor: sec?.status === 'anomaly' && h < 4 ? '#f43f5e40' : '#243356',
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-[8px] text-slate-600 mt-1">10 households</p>

                      {/* Selected indicator */}
                      {isSelected && (
                        <div className="mt-2 flex items-center gap-1">
                          <ChevronRight className="h-3 w-3" style={{ color: col.text }} />
                          <span className="text-[9px] font-medium" style={{ color: col.text }}>Selected</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {selectedSection && (
          <div className="card p-5 w-[380px] shrink-0 max-h-[700px] overflow-y-auto animate-slide-in">
            <SectionPanel
              sectionId={selectedSection}
              onClose={() => setSelectedSection(null)}
            />
          </div>
        )}
      </div>

      {/* Sections table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-navy-700/50">
          <h3 className="text-sm font-semibold text-slate-200">All Sections Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Section', 'Entry (B)', 'Exit (B)', 'Input kWh', 'Consumer kWh', 'Tech Loss', 'Unexplained kWh', 'Gap %', 'Status'].map(h => (
                  <th key={h} className="table-header text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-navy-700/30">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-3 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : sections?.map(sec => {
                const col = sectionColor(sec.status);
                return (
                  <tr
                    key={sec.id}
                    className="table-row cursor-pointer"
                    onClick={() => setSelectedSection(sec.id === selectedSection ? null : sec.id)}
                  >
                    <td className="table-cell font-bold" style={{ color: col.text }}>{sec.id}</td>
                    <td className="table-cell text-slate-500 text-xs font-mono">{sec.entry_boundary}</td>
                    <td className="table-cell text-slate-500 text-xs font-mono">{sec.exit_boundary}</td>
                    <td className="table-cell tabular-nums">{sec.entry_kwh}</td>
                    <td className="table-cell tabular-nums">{sec.consumer_kwh}</td>
                    <td className="table-cell tabular-nums text-slate-500">{sec.technical_loss_kwh}</td>
                    <td className="table-cell tabular-nums font-semibold" style={{ color: col.text }}>{sec.unexplained_kwh}</td>
                    <td className="table-cell tabular-nums font-semibold" style={{ color: col.text }}>{sec.unexplained_pct}%</td>
                    <td className="table-cell">
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: col.text }}>
                        {col.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
