import { useState } from 'react';
import { api, DailyReport } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useApp } from '../context/AppContext';
import { ErrorState } from '../components/ui/States';
import { ChartSkeleton, Skeleton } from '../components/ui/Skeleton';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { Download, AlertTriangle, FileText, Printer, Calendar, CheckCircle, Info } from 'lucide-react';
import { clsx } from 'clsx';

function StatusBadge({ status }: { status: string }) {
  if (status === 'anomaly') return <span className="badge-anomaly">Anomaly</span>;
  if (status === 'monitor') return <span className="badge-monitor">Monitor</span>;
  return <span className="badge-normal">Normal</span>;
}

export default function ReportsPage() {
  const { refreshKey } = useApp();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);

  const { data, loading, error, refetch } = useApi<DailyReport>(
    () => api.dailyReport(date),
    [date, refreshKey]
  );

  const handleDownload = () => {
    const url = api.exportReportUrl();
    const a = document.createElement('a');
    a.href = url;
    a.download = `gridsentinel-report-${date}.csv`;
    a.click();
  };

  const handlePrint = () => window.print();

  const chartData = data?.section_breakdown.map(s => ({
    section: s.section,
    'Consumer': s.consumer_kwh,
    'Tech Loss': s.technical_loss_kwh,
    'Unexplained': s.unexplained_kwh,
  })) ?? [];

  if (error && !data) {
    return <div className="p-8"><ErrorState error={error} onRetry={refetch} /></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-xl print:bg-white print:text-black">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Daily energy balance and section-wise breakdown</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="sim-banner">
            <AlertTriangle className="h-3 w-3" />
            SIMULATED DATA — DEMO MODE
          </div>
          <button onClick={handleDownload} className="btn-secondary">
            <Download className="h-4 w-4" />
            Download CSV
          </button>
          <button onClick={handlePrint} className="btn-ghost">
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">GridSentinel Daily Energy Report</h1>
        <p className="text-sm text-gray-500 mt-1">⚠ SIMULATED DATA — FOR DEMONSTRATION PURPOSES ONLY</p>
        <p className="text-sm text-gray-500">Generated: {new Date().toLocaleString('en-IN')}</p>
      </div>

      {/* Date selector */}
      <div className="card p-4 flex items-center gap-3 print:hidden">
        <Calendar className="h-4 w-4 text-slate-500" />
        <label className="text-sm text-slate-400">Report Date:</label>
        <input
          type="date"
          className="input-field w-48"
          value={date}
          max={today}
          onChange={e => setDate(e.target.value)}
        />
        {data && (
          <span className="text-xs text-slate-500">
            Generated at: <span className="font-mono">{data.generated_at.slice(0, 19).replace('T', ' ')}</span>
          </span>
        )}
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4">
              <Skeleton className="h-2.5 w-20 mb-3" />
              <Skeleton className="h-6 w-28" />
            </div>
          ))
        ) : data ? (
          [
            { label: 'Feeder Input', value: `${data.feeder_input_kwh} kWh`, color: 'text-cyan-accent' },
            { label: 'Consumer Total', value: `${data.consumer_total_kwh} kWh`, color: 'text-electric-500' },
            { label: 'Technical Loss', value: `${data.technical_loss_kwh} kWh`, color: 'text-slate-400' },
            { label: 'Unexplained', value: `${data.unexplained_kwh} kWh`, color: data.unexplained_pct > 10 ? 'text-rose-400' : 'text-amber-400' },
            { label: 'Gap %', value: `${data.unexplained_pct}%`, color: data.unexplained_pct > 10 ? 'text-rose-400' : 'text-amber-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-4">
              <p className="stat-label mb-2">{label}</p>
              <p className={clsx('text-xl font-bold tabular-nums', color)}>{value}</p>
            </div>
          ))
        ) : null}
      </div>

      {/* Evening Anomaly */}
      {data?.evening_anomaly && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/8 border border-rose-500/30 animate-fade-in">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-300">
              Evening Anomaly Detected — {data.evening_anomaly.section}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Window: {data.evening_anomaly.window} IST &nbsp;|&nbsp;
              Unexplained: {data.evening_anomaly.unexplained_kwh} kWh ({data.evening_anomaly.unexplained_pct}%)
            </p>
          </div>
        </div>
      )}

      {/* Stats summary */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Alerts Generated', value: data.alerts_generated, icon: AlertTriangle, color: 'text-rose-400' },
            { label: 'Inspections Created', value: data.inspections_created, icon: CheckCircle, color: 'text-electric-500' },
            { label: 'Report Date', value: data.date, icon: Calendar, color: 'text-cyan-accent' },
            { label: 'Demo Mode', value: data.demo_mode ? 'Active' : 'Inactive', icon: Info, color: data.demo_mode ? 'text-amber-400' : 'text-slate-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-4 flex items-center gap-3">
              <Icon className={clsx('h-5 w-5 shrink-0', color)} />
              <div>
                <p className="stat-label">{label}</p>
                <p className={clsx('font-bold', color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Section breakdown chart */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-1">Section-Wise Energy Breakdown</h3>
        <p className="text-xs text-slate-500 mb-4">Consumer usage, technical losses, and unexplained energy per section</p>
        {loading ? <ChartSkeleton /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,51,86,0.5)" />
              <XAxis dataKey="section" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} unit=" kWh" width={60} />
              <Tooltip
                contentStyle={{ background: '#0d1528', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                formatter={(v: number, n: string) => [`${v.toFixed(2)} kWh`, n]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Bar dataKey="Consumer" fill="#00ff88" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Tech Loss" fill="#64748b" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Unexplained" fill="#f43f5e" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Section breakdown table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-navy-700/50 flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-200">Section-Wise Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Section', 'Entry kWh', 'Exit kWh', 'Consumer kWh', 'Tech Loss kWh', 'Unexplained kWh', 'Gap %', 'Status'].map(h => (
                  <th key={h} className="table-header text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-navy-700/30">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-3 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.section_breakdown.map(s => (
                <tr key={s.section} className="table-row">
                  <td className="table-cell font-bold text-cyan-accent">{s.section}</td>
                  <td className="table-cell tabular-nums">{s.entry_kwh}</td>
                  <td className="table-cell tabular-nums">{s.exit_kwh}</td>
                  <td className="table-cell tabular-nums text-electric-500">{s.consumer_kwh}</td>
                  <td className="table-cell tabular-nums text-slate-500">{s.technical_loss_kwh}</td>
                  <td className={clsx('table-cell tabular-nums font-semibold', s.status === 'anomaly' ? 'text-rose-400' : s.status === 'monitor' ? 'text-amber-400' : 'text-slate-300')}>
                    {s.unexplained_kwh}
                  </td>
                  <td className={clsx('table-cell tabular-nums font-semibold', s.status === 'anomaly' ? 'text-rose-400' : s.status === 'monitor' ? 'text-amber-400' : 'text-slate-300')}>
                    {s.unexplained_pct}%
                  </td>
                  <td className="table-cell"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note */}
      <div className="flex items-start gap-2.5 p-4 rounded-xl bg-amber-500/6 border border-amber-500/15">
        <AlertTriangle className="h-4 w-4 text-amber-500/60 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-amber-500/70">Disclaimer:</span> All readings displayed in this report are 
          simulated for demonstration purposes. No actual utility metering data is represented. 
          Unexplained energy flags are indicative only and require field investigation before any action is taken.
        </p>
      </div>
    </div>
  );
}
