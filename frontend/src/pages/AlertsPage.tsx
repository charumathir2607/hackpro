import { useState, useCallback } from 'react';
import { api, Alert, AlertList, Inspection } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useApp } from '../context/AppContext';
import { ErrorState, EmptyState } from '../components/ui/States';
import { SkeletonRows, Skeleton } from '../components/ui/Skeleton';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { clsx } from 'clsx';
import {
  Search, Filter, Bell, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, Eye, X, ClipboardList,
  User, Calendar, MessageSquare
} from 'lucide-react';

const SECTION_IDS = ['S-01', 'S-02', 'S-03', 'S-04', 'S-05', 'S-06'];
const PER_PAGE = 15;

function SeverityBadge({ sev }: { sev: string }) {
  if (sev === 'high') return <span className="badge-high">⬤ High</span>;
  if (sev === 'medium') return <span className="badge-medium">⬤ Medium</span>;
  return <span className="badge-low">⬤ Low</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: 'badge-anomaly',
    acknowledged: 'badge-monitor',
    inspecting: 'badge-monitor',
    resolved: 'badge-normal',
  };
  const cls = map[status] ?? 'badge-low';
  return <span className={cls}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

// ─── Alert Detail & Action Drawer ─────────────────────────────────────────────

interface AlertDrawerProps {
  alert: Alert;
  onClose: () => void;
  onRefresh: () => void;
}

function AlertDrawer({ alert, onClose, onRefresh }: AlertDrawerProps) {
  const { addToast } = useApp();
  const [ackLoading, setAckLoading] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [inspector, setInspector] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [showInspectForm, setShowInspectForm] = useState(false);

  const handleAck = async () => {
    setAckLoading(true);
    try {
      await api.acknowledgeAlert(alert.id);
      addToast({ type: 'success', title: 'Alert Acknowledged', message: `${alert.id} marked as acknowledged` });
      onRefresh();
      onClose();
    } catch (e: unknown) {
      addToast({ type: 'error', title: 'Failed', message: String(e) });
    } finally {
      setAckLoading(false);
    }
  };

  const handleInspect = async () => {
    setInspecting(true);
    try {
      await api.createInspection(alert.id, { inspector, priority, due_date: dueDate, notes });
      addToast({ type: 'success', title: 'Inspection Created', message: `Scheduled for ${inspector || 'Unassigned'}` });
      onRefresh();
      onClose();
    } catch (e: unknown) {
      addToast({ type: 'error', title: 'Failed', message: String(e) });
    } finally {
      setInspecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-navy-900 border-l border-navy-700/50 h-full overflow-y-auto shadow-2xl animate-slide-in p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">{alert.id}</p>
            <h2 className="text-base font-bold text-slate-100 mt-1">Section {alert.section}</h2>
            <div className="flex items-center gap-2 mt-2">
              <SeverityBadge sev={alert.severity} />
              <StatusBadge status={alert.status} />
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1"><X className="h-4 w-4" /></button>
        </div>

        {/* Detection reason */}
        <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300">{alert.detection_reason}</p>
          </div>
          <p className="text-[10px] text-amber-500/60 mt-2">
            ⚠ This flag indicates unexplained discrepancy. Field verification is required before drawing conclusions.
          </p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Unexplained', value: `${alert.unexplained_kwh} kWh` },
            { label: 'Gap %', value: `${alert.unexplained_pct}%` },
            { label: 'Category', value: alert.category.replace('_', ' ') },
            { label: 'Detected', value: alert.detected_at.slice(0, 16).replace('T', ' ') },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-lg bg-navy-800/60 border border-navy-600/40">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-slate-200">{value}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</p>

          {alert.status === 'open' && (
            <button
              onClick={handleAck}
              disabled={ackLoading}
              className="btn-secondary w-full justify-center"
            >
              {ackLoading ? (
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />Acknowledging...</span>
              ) : (
                <><CheckCircle className="h-4 w-4" />Acknowledge Alert</>
              )}
            </button>
          )}

          {alert.status !== 'resolved' && (
            <button
              onClick={() => setShowInspectForm(!showInspectForm)}
              className="btn-primary w-full justify-center"
            >
              <ClipboardList className="h-4 w-4" />
              {showInspectForm ? 'Cancel Inspection' : 'Create Inspection'}
            </button>
          )}

          {/* Inspection form */}
          {showInspectForm && (
            <div className="p-4 rounded-xl bg-navy-800/60 border border-navy-600/40 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-slate-500" />
                <input
                  className="input-field flex-1"
                  placeholder="Inspector name"
                  value={inspector}
                  onChange={e => setInspector(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Priority</label>
                  <select className="select-field" value={priority} onChange={e => setPriority(e.target.value)}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Due Date</label>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="date"
                      className="input-field flex-1 text-xs"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-slate-500 mt-2" />
                <textarea
                  className="input-field flex-1 h-20 resize-none"
                  placeholder="Notes for inspector..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
              <button
                onClick={handleInspect}
                disabled={inspecting}
                className="btn-primary w-full justify-center"
              >
                {inspecting ? 'Creating...' : 'Schedule Inspection'}
              </button>
            </div>
          )}
        </div>

        {/* Inspector info */}
        {alert.inspector && (
          <div className="p-3 rounded-lg bg-navy-800/40 border border-navy-600/30">
            <p className="text-[10px] text-slate-500 mb-1">Assigned Inspector</p>
            <p className="text-sm font-semibold text-slate-200">{alert.inspector}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Inspections Table ────────────────────────────────────────────────────────

function InspectionsTable() {
  const { refreshKey, addToast } = useApp();
  const { data: inspections, loading, refetch } = useApi<Inspection[]>(() => api.inspections(), [refreshKey]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showResolve, setShowResolve] = useState<string | null>(null);

  const handleResolve = async (id: string) => {
    setUpdating(id);
    try {
      await api.updateInspection(id, { status: 'resolved' });
      addToast({ type: 'success', title: 'Inspection Resolved', message: `${id} marked as resolved.` });
      refetch();
    } catch (e: unknown) {
      addToast({ type: 'error', title: 'Failed', message: String(e) });
    } finally {
      setUpdating(null);
      setShowResolve(null);
    }
  };

  if (!inspections?.length && !loading) {
    return <EmptyState title="No inspections scheduled" description="Create an inspection from an alert." icon={ClipboardList} />;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {['ID', 'Alert', 'Section', 'Inspector', 'Priority', 'Due Date', 'Status', 'Action'].map(h => (
                <th key={h} className="table-header text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <SkeletonRows count={3} cols={8} /> : inspections?.map((ins: Inspection) => (
              <tr key={ins.id} className="table-row">
                <td className="table-cell font-mono text-xs">{ins.id}</td>
                <td className="table-cell font-mono text-xs text-cyan-accent">{ins.alert_id}</td>
                <td className="table-cell font-semibold">{ins.section}</td>
                <td className="table-cell">{ins.inspector || '—'}</td>
                <td className="table-cell">
                  <span className={ins.priority === 'high' ? 'badge-high' : ins.priority === 'medium' ? 'badge-medium' : 'badge-low'}>
                    {ins.priority}
                  </span>
                </td>
                <td className="table-cell text-xs text-slate-400">{ins.due_date ?? '—'}</td>
                <td className="table-cell">
                  <span className={ins.status === 'resolved' ? 'badge-normal' : 'badge-monitor'}>
                    {ins.status}
                  </span>
                </td>
                <td className="table-cell">
                  {ins.status !== 'resolved' && (
                    <button
                      onClick={() => setShowResolve(ins.id)}
                      disabled={updating === ins.id}
                      className="text-xs text-electric-500 hover:text-electric-400 font-medium transition-colors"
                    >
                      {updating === ins.id ? 'Resolving...' : 'Mark Resolved'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={!!showResolve}
        onClose={() => setShowResolve(null)}
        onConfirm={() => showResolve && handleResolve(showResolve)}
        title="Mark Inspection Resolved?"
        message="This will mark the inspection as resolved and update the related alert status. Ensure field verification has been completed."
        confirmLabel="Mark Resolved"
        loading={!!updating}
      />
    </>
  );
}

// ─── Alerts Page ──────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const { refreshKey } = useApp();
  const [section, setSection] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [activeTab, setActiveTab] = useState<'alerts' | 'inspections'>('alerts');

  const { data, loading, error, refetch } = useApi<AlertList>(
    () => api.alerts({ section, severity, status, search, page, per_page: PER_PAGE }),
    [section, severity, status, search, page, refreshKey]
  );

  const handleSearch = useCallback(() => { setSearch(searchInput); setPage(1); }, [searchInput]);

  if (error && !data) {
    return <div className="p-8"><ErrorState error={error} onRetry={refetch} /></div>;
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Alerts & Inspections</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {data ? `${data.total} alerts total` : 'Loading...'}
          </p>
        </div>
        <div className="sim-banner">
          <AlertTriangle className="h-3 w-3" />
          SIMULATED DATA — DEMO MODE
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-navy-800/60 rounded-lg w-fit border border-navy-600/40">
        {[
          { key: 'alerts', label: 'Alerts', icon: Bell },
          { key: 'inspections', label: 'Inspections', icon: ClipboardList },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as 'alerts' | 'inspections')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
              activeTab === key
                ? 'bg-navy-700 text-slate-200 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'alerts' ? (
        <>
          {/* Filters */}
          <div className="card p-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex gap-2 flex-1 min-w-[200px]">
                <input
                  className="input-field flex-1"
                  placeholder="Search alert ID, section, reason..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch} className="btn-secondary px-3">
                  <Search className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <select className="select-field w-36" value={section} onChange={e => { setSection(e.target.value); setPage(1); }}>
                  <option value="">All Sections</option>
                  {SECTION_IDS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <select className="select-field w-32" value={severity} onChange={e => { setSeverity(e.target.value); setPage(1); }}>
                <option value="">All Severity</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select className="select-field w-36" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="inspecting">Inspecting</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Alert ID', 'Section', 'Category', 'Severity', 'Detected', 'kWh Gap', '% Gap', 'Status', 'Inspector'].map(h => (
                      <th key={h} className="table-header text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <SkeletonRows count={6} cols={9} />
                  ) : data?.alerts.length ? (
                    data.alerts.map((alert: Alert) => (
                      <tr
                        key={alert.id}
                        className="table-row cursor-pointer"
                        onClick={() => setSelectedAlert(alert)}
                      >
                        <td className="table-cell font-mono text-xs text-cyan-accent">{alert.id}</td>
                        <td className="table-cell font-bold">{alert.section}</td>
                        <td className="table-cell text-xs capitalize">{alert.category.replace('_', ' ')}</td>
                        <td className="table-cell"><SeverityBadge sev={alert.severity} /></td>
                        <td className="table-cell text-xs text-slate-400 font-mono">{alert.detected_at.slice(0, 16).replace('T', ' ')}</td>
                        <td className="table-cell tabular-nums font-semibold text-rose-400">{alert.unexplained_kwh} kWh</td>
                        <td className="table-cell tabular-nums font-semibold text-rose-400">{alert.unexplained_pct}%</td>
                        <td className="table-cell"><StatusBadge status={alert.status} /></td>
                        <td className="table-cell text-xs text-slate-500">{alert.inspector ?? '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9}>
                        <EmptyState title="No alerts match your filters" description="Try clearing some filters." icon={Bell} />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-navy-700/50">
                <p className="text-xs text-slate-500">Page {data.page} of {data.pages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost px-2 py-1 disabled:opacity-40">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages} className="btn-ghost px-2 py-1 disabled:opacity-40">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-navy-700/50">
            <h3 className="text-sm font-semibold text-slate-200">Scheduled Inspections</h3>
          </div>
          <InspectionsTable />
        </div>
      )}

      {/* Alert drawer */}
      {selectedAlert && (
        <AlertDrawer
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}
