// Shared types for every Platform Dashboard widget. Real backend payloads
// should conform to these shapes once endpoints exist - widgets are already
// written against them, so wiring real data later is a hook-body change
// only, never a UI change.

export interface KPIDatum {
  label: string;
  value: number;
  format?: 'number' | 'currency' | 'percent';
  previousValue?: number;
  sparkline?: number[];
  quickActionLabel?: string;
  quickActionPath?: string;
}

export interface ServiceHealth {
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
  latencyMs?: number;
  uptimePercent?: number;
  version?: string;
  lastHeartbeatAt?: string;
  lastIncidentAt?: string;
}

export interface ActivityEvent {
  id: string;
  type: string;
  message: string;
  actor?: string;
  timestamp: string;
  severity?: 'info' | 'success' | 'warning' | 'critical';
}

export interface AlertItem {
  id: string;
  title: string;
  description?: string;
  severity: 'critical' | 'high' | 'security' | 'warning';
  timestamp: string;
}

export interface DeploymentItem {
  id: string;
  version: string;
  environment: string;
  status: 'success' | 'failed' | 'in_progress' | 'rolled_back';
  deployedAt: string;
  notesUrl?: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  category: 'maintenance' | 'update' | 'release' | 'internal';
  scheduledFor?: string;
  body?: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  plan?: string;
}

/**
 * Generic envelope every widget hook resolves to. `connected: false` means
 * there is no backend endpoint wired up yet (today, for every widget) -
 * widgets must render an honest "not connected" / empty state in that case,
 * never fabricated numbers.
 */
export interface WidgetResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  refetch: () => void;
}
