import { useState, useCallback } from 'react';
import { api, Meter, MeterDetail, MeterList } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useApp } from '../context/AppContext';
import { ErrorState, EmptyState } from '../components/ui/States';
import { SkeletonRows, Skeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { clsx } from 'clsx';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { Search, Filter, Download, Gauge, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const SECTION_IDS = ['', 'S-01', 'S-02', 'S-03', 'S-04', 'S-05', 'S-06'];
const PER_PAGE = 20;

function MeterStatusBadge({ status }: { status: string }) {
  if (status === 'active') return <span className="badge-normal"><CheckCircle className="h-2.5 w-2.5" />Active</span>;
  if (status === 'inactive') return <span className="badge-low"><XCircle className="h-2.5 w-2.5" />Inactive</span>;
  return <span className="badge-anomaly"><AlertTriangle className="h-2.5 w-2.5" />Fault</span>;
}

function MeterTypeBadge({ type }: { type: string }) {
  if (type === 'boundary') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-accent/10 text-cyan-accent border border-cyan-accent/20">
        Boundary
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
      Consumer
    </span>
  );
}

function MeterDetailModal({ meterId, onClose }: { meterId: string; onClose: () => void }) {
  const { data, loading, error } = useApi<MeterDetail>(() => api.meter(meterId), [meterId]);

  const historyData = data?.reading_history.map(h => ({
    time: h.timestamp.slice(11, 16),
    reading: h.reading_kwh,
  })) ?? [];

  return (
    <Modal open title={`Meter ${meterId}`} onClose={onClose} size="lg">
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg bg-navy-800/60">
                <Skeleton className="h-2 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      )}
      {error && <ErrorState error={error} />}
      {data && !loading && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Type', value: data.type.charAt(0).toUpperCase() + data.type.slice(1) },
              { label: 'Section', value: data.section },
              { label: 'Status', value: data.status },
              { label: 'Latest Reading', value: `${data.latest_reading_kwh} kWh` },
              { label: 'Interval Usage', value: `${data.interval_kwh} kWh/hr` },
              { label: data.consumer_id ? 'Consumer' : 'Boundary Point', value: data.consumer_id ?? data.boundary_point ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-lg bg-navy-800/60 border border-navy-600/40">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm font-semibold text-slate-200">{value}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-3">Reading History (24h)</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={historyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,51,86,0.5)" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 9 }} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v: number) => [`${v.toFixed(3)} kWh`, 'Reading']}
                  contentStyle={{ background: '#0d1528', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                />
                <Line type="monotone" dataKey="reading" stroke="#00d4ff" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="p-3 rounded-lg bg-navy-800/40 border border-navy-600/30">
            <p className="text-xs text-slate-500">
              Last updated: <span className="font-mono text-slate-300">{data.timestamp.replace('T', ' ')}</span>
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function SmartMetersPage() {
  const { refreshKey } = useApp();
  const [section, setSection] = useState('');
  const [meterType, setMeterType] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [selectedMeter, setSelectedMeter] = useState<string | null>(null);

  const fetchParams = { section, type: meterType, search, page, per_page: PER_PAGE };

  const { data, loading, error, refetch } = useApi<MeterList>(
    () => api.meters(fetchParams),
    [section, meterType, search, page, refreshKey]
  );

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const handleExport = () => {
    const rows = data?.meters ?? [];
    const csv = [
      'Meter ID,Type,Section,Consumer/Boundary,Latest Reading (kWh),Interval (kWh/hr),Status,Timestamp',
      ...rows.map(m =>
        `${m.id},${m.type},${m.section},${m.consumer_id ?? m.boundary_point ?? ''},${m.latest_reading_kwh},${m.interval_kwh},${m.status},${m.timestamp}`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gridsentinel-meters-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error && !data) {
    return <div className="p-8"><ErrorState error={error} onRetry={refetch} /></div>;
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Smart Meters</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {data ? `${data.total} meters registered` : 'Loading meter registry...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="sim-banner">
            <AlertTriangle className="h-3 w-3" />
            SIMULATED DATA
          </div>
          <button onClick={handleExport} disabled={!data} className="btn-secondary">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="flex gap-2 flex-1 min-w-[200px]">
            <input
              className="input-field flex-1"
              placeholder="Search meter ID or consumer..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="btn-secondary px-3">
              <Search className="h-4 w-4" />
            </button>
          </div>

          {/* Section filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              className="select-field w-36"
              value={section}
              onChange={e => { setSection(e.target.value); setPage(1); }}
            >
              <option value="">All Sections</option>
              {SECTION_IDS.filter(Boolean).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Type filter */}
          <select
            className="select-field w-36"
            value={meterType}
            onChange={e => { setMeterType(e.target.value); setPage(1); }}
          >
            <option value="">All Types</option>
            <option value="boundary">Boundary</option>
            <option value="consumer">Consumer</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Meter ID', 'Type', 'Section', 'Consumer / Boundary', 'Latest Reading', 'Interval Usage', 'Updated', 'Status'].map(h => (
                  <th key={h} className="table-header text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows count={10} cols={8} />
              ) : data?.meters.length ? (
                data.meters.map((meter: Meter) => (
                  <tr
                    key={meter.id}
                    className="table-row cursor-pointer"
                    onClick={() => setSelectedMeter(meter.id)}
                  >
                    <td className="table-cell font-mono text-xs text-cyan-accent">{meter.id}</td>
                    <td className="table-cell"><MeterTypeBadge type={meter.type} /></td>
                    <td className="table-cell font-semibold">{meter.section}</td>
                    <td className="table-cell text-slate-400 text-xs">
                      {meter.consumer_id ?? meter.boundary_point ?? '—'}
                    </td>
                    <td className="table-cell tabular-nums font-semibold">{meter.latest_reading_kwh} kWh</td>
                    <td className="table-cell tabular-nums text-slate-400">{meter.interval_kwh} kWh/hr</td>
                    <td className="table-cell text-slate-500 text-xs font-mono">
                      {meter.timestamp.slice(11, 16)}
                    </td>
                    <td className="table-cell"><MeterStatusBadge status={meter.status} /></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <EmptyState title="No meters found" description="Try adjusting your filters." icon={Gauge} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-navy-700/50">
            <p className="text-xs text-slate-500">
              Page {data.page} of {data.pages} ({data.total} total meters)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost px-2 py-1 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(data.pages, 5) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={clsx(
                    'w-7 h-7 rounded text-xs font-medium transition-colors',
                    page === p
                      ? 'bg-electric-500/20 text-electric-500 border border-electric-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-navy-700/50'
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="btn-ghost px-2 py-1 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Meter detail modal */}
      {selectedMeter && (
        <MeterDetailModal meterId={selectedMeter} onClose={() => setSelectedMeter(null)} />
      )}
    </div>
  );
}
