import { useState, useEffect } from 'react';
import { api, AppSettings } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useApp } from '../context/AppContext';
import { ErrorState } from '../components/ui/States';
import { Skeleton } from '../components/ui/Skeleton';
import { Settings, Save, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface FieldConfig {
  key: keyof AppSettings;
  label: string;
  description: string;
  type: 'number' | 'time';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

const FIELDS: FieldConfig[] = [
  {
    key: 'loss_threshold_pct',
    label: 'Loss Threshold (%)',
    description: 'Maximum acceptable unexplained energy loss as a percentage of feeder input. Sections exceeding this are flagged for investigation.',
    type: 'number', min: 1, max: 50, step: 0.5, unit: '%',
  },
  {
    key: 'min_unexplained_kwh',
    label: 'Minimum Unexplained kWh',
    description: 'Minimum absolute unexplained energy in kWh before an alert is raised. Prevents noise-level alerts.',
    type: 'number', min: 0.5, max: 50, step: 0.5, unit: 'kWh',
  },
  {
    key: 'technical_loss_pct',
    label: 'Estimated Technical Loss (%)',
    description: 'Estimated distribution losses (I²R conductor heating and transformer core losses) subtracted before calculating unexplained energy.',
    type: 'number', min: 0.5, max: 15, step: 0.5, unit: '%',
  },
  {
    key: 'evening_start',
    label: 'Evening Monitor Start',
    description: 'Start time for the evening high-priority monitoring window. Detection sensitivity is higher during this period.',
    type: 'time',
  },
  {
    key: 'evening_end',
    label: 'Evening Monitor End',
    description: 'End time for the evening monitoring window.',
    type: 'time',
  },
  {
    key: 'consecutive_intervals',
    label: 'Consecutive Intervals to Alert',
    description: 'Number of consecutive monitoring intervals that must exceed threshold before generating an alert. Reduces false positives.',
    type: 'number', min: 1, max: 10, step: 1, unit: 'intervals',
  },
];

export default function SettingsPage() {
  const { refreshKey, addToast } = useApp();
  const { data, loading, error, refetch } = useApi<AppSettings>(() => api.settings(), [refreshKey]);

  const [form, setForm] = useState<Partial<AppSettings>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setForm(data);
      setDirty(false);
    }
  }, [data]);

  const handleChange = (key: keyof AppSettings, value: string | number) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSettings(form);
      addToast({
        type: 'success',
        title: 'Settings Saved',
        message: 'Detection parameters updated. The backend will use new thresholds for all calculations.',
      });
      setDirty(false);
      refetch();
    } catch (e: unknown) {
      addToast({ type: 'error', title: 'Save Failed', message: String(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (data) {
      setForm(data);
      setDirty(false);
    }
  };

  if (error && !data) {
    return <div className="p-8"><ErrorState error={error} onRetry={refetch} /></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure detection thresholds and monitoring parameters</p>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-navy-800/60 border border-navy-600/40">
          <Settings className="h-4 w-4 text-slate-500" />
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-cyan-accent/6 border border-cyan-accent/15">
        <Info className="h-4 w-4 text-cyan-accent/60 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400">
          Changes to these settings will be applied to the backend immediately upon saving. 
          Detection calculations and alert thresholds will update for all subsequent analysis.
          Settings persist only in-memory for this demo session.
        </p>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {FIELDS.map(field => (
          <div key={field.key} className="card p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <label className="text-sm font-semibold text-slate-200">{field.label}</label>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{field.description}</p>
              </div>
              {field.unit && (
                <span className="shrink-0 text-xs px-2 py-0.5 rounded bg-navy-700/60 text-slate-400 border border-navy-600/40">
                  {field.unit}
                </span>
              )}
            </div>

            {loading ? (
              <Skeleton className="h-9 w-full" />
            ) : field.type === 'time' ? (
              <input
                type="time"
                className="input-field w-40"
                value={(form[field.key] as string) ?? ''}
                onChange={e => handleChange(field.key, e.target.value)}
              />
            ) : (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  className="input-field w-40"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={(form[field.key] as number) ?? 0}
                  onChange={e => handleChange(field.key, parseFloat(e.target.value))}
                />
                {field.min !== undefined && field.max !== undefined && (
                  <p className="text-xs text-slate-600">Range: {field.min} – {field.max}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className={clsx('btn-primary', (!dirty || saving) && 'opacity-50 cursor-not-allowed')}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
              Saving...
            </span>
          ) : (
            <><Save className="h-4 w-4" />Save Settings</>
          )}
        </button>
        <button
          onClick={handleReset}
          disabled={!dirty}
          className={clsx('btn-secondary', !dirty && 'opacity-40 cursor-not-allowed')}
        >
          Discard Changes
        </button>
        {dirty && (
          <div className="flex items-center gap-1.5 text-amber-400 text-xs">
            <AlertTriangle className="h-3 w-3" />
            Unsaved changes
          </div>
        )}
        {!dirty && !loading && data && (
          <div className="flex items-center gap-1.5 text-electric-500 text-xs">
            <CheckCircle className="h-3 w-3" />
            Settings saved
          </div>
        )}
      </div>

      {/* Current values reference */}
      {data && !loading && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 mb-3">Current Backend Configuration</p>
          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-2 py-1 border-b border-navy-700/30">
                <span className="text-slate-500">{key}</span>
                <span className="text-cyan-accent font-semibold">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
