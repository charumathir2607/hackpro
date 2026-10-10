/**
 * GridSentinel API Client
 * Single source of truth for all backend communication.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
  } catch (e) {
    throw new ApiError(0, 'Cannot reach the GridSentinel backend. Please start the Flask server on port 5000.');
  }

  const json = await res.json().catch(() => ({ success: false, error: 'Invalid JSON response' }));

  if (!res.ok || !json.success) {
    throw new ApiError(res.status, json.error || `HTTP ${res.status}`, json);
  }

  return json.data as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HealthData {
  status: string;
  timestamp: string;
  demo_mode: boolean;
}

export interface EveningAnomaly {
  section: string;
  start: string;
  end: string;
  unexplained_kwh: number;
  unexplained_pct: number;
  description: string;
}

export interface SummaryData {
  transformer_input_kwh: number;
  consumer_total_kwh: number;
  technical_loss_kwh: number;
  unexplained_kwh: number;
  unexplained_pct: number;
  sections_flagged: number;
  open_alerts: number;
  demo_mode: boolean;
  evening_anomaly: EveningAnomaly | null;
  as_of: string;
}

export interface TrendPoint {
  timestamp: string;
  entry_kwh: number;
  consumer_kwh: number;
  technical_loss_kwh: number;
  unexplained_kwh: number;
}

export interface TrendData {
  trend: TrendPoint[];
  section: string;
}

export type SectionStatus = 'normal' | 'monitor' | 'anomaly' | 'data_warning';

export interface Section {
  id: string;
  name: string;
  entry_boundary: string;
  exit_boundary: string;
  entry_kwh: number;
  exit_kwh: number;
  consumer_kwh: number;
  technical_loss_kwh: number;
  unexplained_kwh: number;
  unexplained_pct: number;
  household_count: number;
  status: SectionStatus;
  detection_reason: string;
  interval_start: string;
  interval_end: string;
}

export interface SectionDetail extends Section {
  readings_24h: TrendPoint[];
  evening_avg_unexplained_kwh: number;
  daytime_avg_unexplained_kwh: number;
  thresholds: {
    loss_threshold_pct: number;
    min_unexplained_kwh: number;
    technical_loss_pct: number;
  };
}

export type MeterType = 'boundary' | 'consumer';
export type MeterStatus = 'active' | 'inactive' | 'fault';

export interface Meter {
  id: string;
  type: MeterType;
  section: string;
  boundary_point: string | null;
  consumer_id: string | null;
  latest_reading_kwh: number;
  interval_kwh: number;
  timestamp: string;
  status: MeterStatus;
}

export interface MeterDetail extends Meter {
  reading_history: { timestamp: string; reading_kwh: number }[];
}

export interface MeterList {
  meters: Meter[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export type AlertSeverity = 'high' | 'medium' | 'low';
export type AlertStatus = 'open' | 'acknowledged' | 'inspecting' | 'resolved';

export interface Alert {
  id: string;
  section: string;
  category: string;
  severity: AlertSeverity;
  detected_at: string;
  unexplained_kwh: number;
  unexplained_pct: number;
  detection_reason: string;
  status: AlertStatus;
  acknowledged: boolean;
  inspector: string | null;
  priority: string;
  due_date: string | null;
  notes: string;
  resolved_at: string | null;
}

export interface AlertList {
  alerts: Alert[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface Inspection {
  id: string;
  alert_id: string;
  section: string;
  inspector: string;
  priority: string;
  due_date: string | null;
  notes: string;
  status: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface DailyReport {
  date: string;
  feeder_input_kwh: number;
  consumer_total_kwh: number;
  technical_loss_kwh: number;
  unexplained_kwh: number;
  unexplained_pct: number;
  alerts_generated: number;
  inspections_created: number;
  section_breakdown: Array<{
    section: string;
    entry_kwh: number;
    exit_kwh: number;
    consumer_kwh: number;
    technical_loss_kwh: number;
    unexplained_kwh: number;
    unexplained_pct: number;
    status: string;
  }>;
  evening_anomaly: { section: string; window: string; unexplained_kwh: number; unexplained_pct: number } | null;
  generated_at: string;
  demo_mode: boolean;
}

export interface AppSettings {
  loss_threshold_pct: number;
  min_unexplained_kwh: number;
  technical_loss_pct: number;
  evening_start: string;
  evening_end: string;
  consecutive_intervals: number;
}

export interface DemoResult {
  message: string;
  affected_section?: string;
  unexplained_kwh?: number;
  unexplained_pct?: number;
  demo_mode: boolean;
}

// ─── API functions ────────────────────────────────────────────────────────────

export const api = {
  health: () => request<HealthData>('/health'),

  summary: () => request<SummaryData>('/summary'),

  trend: (section?: string) =>
    request<TrendData>(`/readings/trend${section ? `?section=${section}` : ''}`),

  sections: () => request<Section[]>('/sections'),

  section: (id: string) => request<SectionDetail>(`/sections/${id}`),

  meters: (params: {
    section?: string;
    type?: string;
    search?: string;
    page?: number;
    per_page?: number;
  } = {}) => {
    const q = new URLSearchParams();
    if (params.section) q.set('section', params.section);
    if (params.type) q.set('type', params.type);
    if (params.search) q.set('search', params.search);
    if (params.page) q.set('page', String(params.page));
    if (params.per_page) q.set('per_page', String(params.per_page));
    return request<MeterList>(`/meters?${q}`);
  },

  meter: (id: string) => request<MeterDetail>(`/meters/${id}`),

  alerts: (params: {
    section?: string;
    severity?: string;
    status?: string;
    search?: string;
    page?: number;
    per_page?: number;
  } = {}) => {
    const q = new URLSearchParams();
    if (params.section) q.set('section', params.section);
    if (params.severity) q.set('severity', params.severity);
    if (params.status) q.set('status', params.status);
    if (params.search) q.set('search', params.search);
    if (params.page) q.set('page', String(params.page));
    if (params.per_page) q.set('per_page', String(params.per_page));
    return request<AlertList>(`/alerts?${q}`);
  },

  alert: (id: string) => request<Alert>(`/alerts/${id}`),

  acknowledgeAlert: (id: string) =>
    request<Alert>(`/alerts/${id}/acknowledge`, { method: 'POST' }),

  createInspection: (
    alertId: string,
    body: { inspector?: string; priority?: string; due_date?: string; notes?: string }
  ) =>
    request<Inspection>(`/alerts/${alertId}/inspect`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  inspections: () => request<Inspection[]>('/inspections'),

  updateInspection: (
    id: string,
    body: { status?: string; notes?: string; inspector?: string; priority?: string; due_date?: string }
  ) =>
    request<Inspection>(`/inspections/${id}/update`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  dailyReport: (date?: string) =>
    request<DailyReport>(`/reports/daily${date ? `?date=${date}` : ''}`),

  exportReportUrl: () => `${BASE_URL}/reports/export`,

  settings: () => request<AppSettings>('/settings'),

  updateSettings: (body: Partial<AppSettings>) =>
    request<AppSettings>('/settings', { method: 'PUT', body: JSON.stringify(body) }),

  simulateEveningAnomaly: () =>
    request<DemoResult>('/demo/simulate-evening-anomaly', { method: 'POST' }),

  resetDemo: () =>
    request<DemoResult>('/demo/reset', { method: 'POST' }),
};
