import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api, Section, Alert } from '../api/client';
import { useApi } from '../hooks/useApi';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import {
  Zap, TrendingDown, AlertTriangle, Activity,
  Clock, CheckCircle, XCircle, Eye, RefreshCw
} from 'lucide-react';
import { CardSkeleton, ChartSkeleton, Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/States';
import { DemoControls } from '../components/demo/DemoControls';
import { clsx } from 'clsx';
import { format, parseISO } from 'date-fns';

// ─── KPI Card ───────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: string;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'green' | 'cyan' | 'amber' | 'rose' | 'slate';
  trend?: string;
  highlight?: boolean;
}

function KPICard({ label, value, unit, icon: Icon, color = 'slate', highlight }: KPICardProps) {
  const colors = {
    green: 'text-electric-500 bg-electric-500/10 border-electric-500/20 shadow-glow-green',
    cyan: 'text-cyan-accent bg-cyan-accent/10 border-cyan-accent/20 shadow-glow-cyan',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-glow-red',
    slate: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  };

  const iconColor = {
    green: 'text-electric-500', cyan: 'text-cyan-accent',
    amber: 'text-amber-400', rose: 'text-rose-400', slate: 'text-slate-400',
  };

  return (
    <div className={clsx(
      'card p-5 flex flex-col gap-3 transition-all duration-200',
      highlight && 'border-l-2 border-l-rose-500/60'
    )}>
      <div className="flex items-start justify-between">
        <p className="stat-label">{label}</p>
        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center border', colors[color])}>
          <Icon className={clsx('h-4 w-4', iconColor[color])} />
        </div>
      </div>
      <div>
        <p className={clsx('text-2xl font-bold tabular-nums', iconColor[color])}>{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{unit}</p>
      </div>
    </div>
  );
}

// ─── Simulated data tag ──────────────────────────────────────────────────────

function SimTag() {
  return (
    <div className="sim-banner">
      <AlertTriangle className="h-3 w-3" />
      SIMULATED DATA — DEMO MODE
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'anomaly') return <span className="badge-anomaly"><XCircle className="h-2.5 w-2.5" />Anomaly</span>;
  if (status === 'monitor') return <span className="badge-monitor"><Eye className="h-2.5 w-2.5" />Monitor</span>;
  return <span className="badge-normal"><CheckCircle className="h-2.5 w-2.5" />Normal</span>;
}

// ─── Section Card ────────────────────────────────────────────────────────────

function SectionCard({ sec }: { sec: Section }) {
  const colors = {
    normal: 'border-electric-500/20 hover:border-electric-500/40',
    monitor: 'border-amber-500/20 hover:border-amber-500/40',
    anomaly: 'border-rose-500/30 hover:border-rose-500/50',
    data_warning: 'border-slate-500/20',
  };

  return (
    <div className={clsx('card p-4 transition-all duration-150', colors[sec.status] || colors.normal)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-navy-700/60 flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-cyan-accent" />
          </div>
          <span className="text-sm font-semibold text-slate-200">{sec.id}</span>
        </div>
        <StatusBadge status={sec.status} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div>
          <p className="text-slate-500">Input</p>
          <p className="font-semibold text-slate-200">{sec.entry_kwh} kWh</p>
        </div>
        <div>
          <p className="text-slate-500">Consumer</p>
          <p className="font-semibold text-slate-200">{sec.consumer_kwh} kWh</p>
        </div>
        <div>
          <p className="text-slate-500">Unexplained</p>
          <p className={clsx('font-semibold', sec.status === 'anomaly' ? 'text-rose-400' : sec.status === 'monitor' ? 'text-amber-400' : 'text-slate-300')}>
            {sec.unexplained_kwh} kWh
          </p>
        </div>
        <div>
          <p className="text-slate-500">Gap %</p>
          <p className={clsx('font-semibold', sec.status === 'anomaly' ? 'text-rose-400' : sec.status === 'monitor' ? 'text-amber-400' : 'text-slate-300')}>
            {sec.unexplained_pct}%
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Alert Severity Badge ────────────────────────────────────────────────────

function SeverityBadge({ sev }: { sev: string }) {
  if (sev === 'high') return <span className="badge-high">High</span>;
  if (sev === 'medium') return <span className="badge-medium">Medium</span>;
  return <span className="badge-low">Low</span>;
}

// ─── Chart tooltip ───────────────────────────────────────────────────────────

function ChartTip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !payload) return null;
  const items = payload as Array<{ name: string; value: number; color: string }>;
  return (
    <div className="px-3 py-2.5 rounded-xl bg-navy-900 border border-navy-600/60 shadow-card text-xs">
      <p className="text-slate-400 mb-2 font-mono">{String(label)}</p>
      {items.map((i) => (
        <p key={i.name} style={{ color: i.color }} className="flex items-center justify-between gap-4">
          <span>{i.name}</span>
          <span className="font-semibold tabular-nums">{Number(i.value).toFixed(2)} kWh</span>
        </p>
      ))}
    </div>
  );
}

// ─── Overview Page ────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const { refreshKey, addToast, triggerRefresh } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const { data: summary, loading: sumLoading, error: sumError, refetch: refetchSummary } = useApi(
    () => api.summary(), [refreshKey]
  );
  const { data: trend, loading: trendLoading, error: trendError, refetch: refetchTrend } = useApi(
    () => api.trend(), [refreshKey]
  );
  const { data: sections, loading: secLoading, error: secError, refetch: refetchSecs } = useApi(
    () => api.sections(), [refreshKey]
  );
  const { data: alertList, loading: alertLoading, error: alertError, refetch: refetchAlerts } = useApi(
    () => api.alerts({ per_page: 5 }), [refreshKey]
  );

  const handleRefresh = () => {
    setRefreshing(true);
    triggerRefresh();
    setTimeout(() => setRefreshing(false), 800);
  };

  const fmtTime = (ts: string) => {
    try { return format(parseISO(ts), 'HH:mm'); } catch { return ts.slice(11, 16); }
  };

  const chartData = trend?.trend.map(p => ({
    time: fmtTime(p.timestamp),
    'Feeder Input': p.entry_kwh,
    'Consumer Usage': p.consumer_kwh,
    'Tech Losses': p.technical_loss_kwh,
    'Unexplained': p.unexplained_kwh,
  })) ?? [];

  // Section ranking by unexplained %
  const sectionRanking = sections
    ? [...sections].sort((a, b) => b.unexplained_pct - a.unexplained_pct)
    : [];

  const rankingData = sectionRanking.map(s => ({
    section: s.id,
    'Unexplained %': s.unexplained_pct,
    fill: s.status === 'anomaly' ? '#f43f5e' : s.status === 'monitor' ? '#f59e0b' : '#00ff88',
  }));

  const anyError = sumError || trendError || secError || alertError;

  if (anyError && !summary) {
    return (
      <div className="p-8">
        <ErrorState error={anyError!} onRetry={() => { refetchSummary(); refetchTrend(); refetchSecs(); refetchAlerts(); }} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-100">System Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {summary ? (
              <>Last updated: <span className="font-mono">{fmtTime(summary.as_of)}</span></>
            ) : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SimTag />
          <button onClick={handleRefresh} className="btn-secondary" disabled={refreshing}>
            <RefreshCw className={clsx('h-4 w-4', refreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Evening anomaly alert */}
      {summary?.evening_anomaly && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/8 border border-rose-500/30 animate-fade-in">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-300">Evening Anomaly Detected — Section {summary.evening_anomaly.section}</p>
            <p className="text-xs text-slate-400 mt-1">{summary.evening_anomaly.description}</p>
            <p className="text-xs text-slate-500 mt-1">Window: {summary.evening_anomaly.start} – {summary.evening_anomaly.end} IST</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {sumLoading ? (
          Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
        ) : summary ? (
          <>
            <KPICard label="Transformer Input" value={summary.transformer_input_kwh.toFixed(1)} unit="kWh (24h)" icon={Zap} color="cyan" />
            <KPICard label="Consumer Consumption" value={summary.consumer_total_kwh.toFixed(1)} unit="kWh Registered" icon={Activity} color="green" />
            <KPICard label="Unexplained Gap" value={summary.unexplained_kwh.toFixed(1)} unit="kWh Unaccounted" icon={TrendingDown} color={summary.unexplained_pct > 10 ? 'rose' : 'amber'} highlight={summary.unexplained_pct > 10} />
            <KPICard label="Gap Percentage" value={`${summary.unexplained_pct}%`} unit="of Feeder Input" icon={AlertTriangle} color={summary.unexplained_pct > 10 ? 'rose' : 'amber'} highlight={summary.unexplained_pct > 10} />
            <KPICard label="Sections Flagged" value={String(summary.sections_flagged)} unit="Require Investigation" icon={Clock} color={summary.sections_flagged > 0 ? 'rose' : 'green'} />
          </>
        ) : null}
      </div>

      {/* Demo Controls */}
      <DemoControls />

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* 24h Trend */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">24-Hour Energy Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">Feeder input vs consumer usage vs losses</p>
            </div>
            <SimTag />
          </div>
          {trendLoading ? <ChartSkeleton /> : trendError ? (
            <ErrorState error={trendError} onRetry={refetchTrend} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="gradInput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradConsumer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ff88" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradUnexplained" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,51,86,0.5)" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} unit=" kWh" width={60} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                <Area type="monotone" dataKey="Feeder Input" stroke="#00d4ff" strokeWidth={2} fill="url(#gradInput)" />
                <Area type="monotone" dataKey="Consumer Usage" stroke="#00ff88" strokeWidth={2} fill="url(#gradConsumer)" />
                <Area type="monotone" dataKey="Unexplained" stroke="#f43f5e" strokeWidth={2} fill="url(#gradUnexplained)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Section ranking */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Section-Wise Unexplained Loss Ranking</h3>
              <p className="text-xs text-slate-500 mt-0.5">Sorted by unexplained energy percentage</p>
            </div>
          </div>
          {secLoading ? <ChartSkeleton /> : secError ? (
            <ErrorState error={secError} onRetry={refetchSecs} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={rankingData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,51,86,0.5)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} unit="%" tickLine={false} />
                <YAxis type="category" dataKey="section" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} width={38} />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, 'Unexplained']}
                  contentStyle={{ background: '#0d1528', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                />
                <Bar dataKey="Unexplained %" radius={[0, 4, 4, 0]}>
                  {rankingData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Section Cards */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Feeder Sections</h3>
        {secLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : sections ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {sections.map(sec => <SectionCard key={sec.id} sec={sec} />)}
          </div>
        ) : null}
      </div>

      {/* Alerts table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-700/50">
          <h3 className="text-sm font-semibold text-slate-200">Latest Alerts</h3>
          <a href="/alerts" className="text-xs text-cyan-accent hover:text-cyan-soft transition-colors">
            View all →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Alert ID', 'Section', 'Severity', 'Unexplained', '% Gap', 'Status', 'Detected'].map(h => (
                  <th key={h} className="table-header text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alertLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-navy-700/30">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-3 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : alertList?.alerts.length ? (
                alertList.alerts.map((alert: Alert) => (
                  <tr key={alert.id} className="table-row">
                    <td className="table-cell font-mono text-xs">{alert.id}</td>
                    <td className="table-cell font-semibold">{alert.section}</td>
                    <td className="table-cell"><SeverityBadge sev={alert.severity} /></td>
                    <td className="table-cell tabular-nums">{alert.unexplained_kwh} kWh</td>
                    <td className="table-cell tabular-nums">{alert.unexplained_pct}%</td>
                    <td className="table-cell"><StatusBadge status={alert.status} /></td>
                    <td className="table-cell text-slate-500 text-xs">{alert.detected_at.slice(0, 16).replace('T', ' ')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-sm">
                    No alerts detected. System operating normally.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

