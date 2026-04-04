/**
 * Typed REST client for Insight Guardian backend.
 */
import type {
  User,
  Alert,
  DecoyAsset,
  ActivityLog,
  Severity,
  RiskBreakdown,
  Role,
  Department,
  ActionType,
} from './mock-data';
const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');

export const TOKEN_ACCESS = 'ig_access_token';
export const TOKEN_REFRESH = 'ig_refresh_token';

function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_ACCESS);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(TOKEN_REFRESH);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(TOKEN_ACCESS, access);
  localStorage.setItem(TOKEN_REFRESH, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_ACCESS);
  localStorage.removeItem(TOKEN_REFRESH);
}

function clearAuthAndRedirect(): void {
  clearTokens();
  localStorage.removeItem('ig_auth_session');
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const rt = getRefreshToken();
  if (!rt) return false;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        accessToken?: string;
        refreshToken?: string;
      };
      if (!res.ok || !data.success || !data.accessToken || !data.refreshToken) {
        return false;
      }
      setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function request<T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean; _retried?: boolean } = {},
): Promise<T> {
  const { skipAuth, _retried, ...req } = init;
  const headers = new Headers(req.headers);

  if (req.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const url = path.startsWith('http') ? path : `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, { ...req, headers });

  if (res.status === 401 && !skipAuth && path !== '/auth/refresh' && !_retried) {
    const ok = await tryRefresh();
    if (ok) {
      return request<T>(path, { ...init, _retried: true });
    }
    clearAuthAndRedirect();
    throw new Error('Unauthorized');
  }

  if (res.status === 401 && _retried) {
    clearAuthAndRedirect();
    throw new Error('Unauthorized');
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg =
      typeof data === 'object' && data && 'error' in data
        ? String((data as { error: string }).error)
        : res.statusText;
    throw new Error(msg || `HTTP ${res.status}`);
  }

  return data as T;
}

// ─── API shapes (backend JSON) ───────────────────────────────────────────────

export type ApiUserRow = Omit<User, never> & {
  workingHours: { start: number; end: number };
  behaviorProfile: User['behaviorProfile'];
  containment?: {
    id: string;
    userId: string;
    fileAccess: boolean;
    dbAccess: boolean;
    apiAccess: boolean;
    duration: 'h1' | 'h24' | 'manual';
    appliedAt: string;
  } | null;
};

export type ApiAlertRow = Omit<Alert, 'actions'> & {
  reasons: RiskBreakdown | Record<string, unknown>;
};

export type ApiAccessEventRow = {
  id: string;
  userId: string;
  employeeName: string;
  resource: string;
  timestamp: string;
  accessType: 'normal' | 'decoy' | 'denied';
  riskFlag: boolean;
  actionType: string;
  ip: string;
  triggeredBy: 'SYSTEM' | 'ADMIN';
};

function normalizeReasons(r: unknown): RiskBreakdown {
  if (r && typeof r === 'object') {
    const o = r as Record<string, unknown>;
    return {
      timeAnomaly: Number(o.timeAnomaly ?? 0),
      sensitivityScore: Number(o.sensitivityScore ?? 0),
      roleDeviation: Number(o.roleDeviation ?? 0),
      behaviorDeviation: Number(o.behaviorDeviation ?? 0),
      decoyWeight: Number(o.decoyWeight ?? 0),
    };
  }
  return {
    timeAnomaly: 0,
    sensitivityScore: 0,
    roleDeviation: 0,
    behaviorDeviation: 0,
    decoyWeight: 0,
  };
}

export function normalizeAlert(a: ApiAlertRow): Alert {
  return {
    id: a.id,
    timestamp: typeof a.timestamp === 'string' ? a.timestamp : new Date(a.timestamp as unknown as Date).toISOString(),
    userId: a.userId,
    userName: a.userName,
    severity: a.severity,
    riskScore: a.riskScore,
    title: a.title,
    description: a.description,
    reasons: normalizeReasons(a.reasons),
    actions: [],
    status: a.status,
  };
}

export function normalizeDecoy(d: DecoyAsset): DecoyAsset {
  return {
    ...d,
    createdAt:
      typeof d.createdAt === 'string'
        ? d.createdAt
        : new Date(d.createdAt as unknown as Date).toISOString(),
    lastAccessed: d.lastAccessed
      ? typeof d.lastAccessed === 'string'
        ? d.lastAccessed
        : new Date(d.lastAccessed as unknown as Date).toISOString()
      : null,
  };
}

export function apiUserToUser(row: ApiUserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as Role,
    department: row.department as Department,
    avatar: row.avatar,
    workingHours: row.workingHours,
    riskScore: row.riskScore,
    riskTrend: row.riskTrend,
    lastActivity:
      typeof row.lastActivity === 'string'
        ? row.lastActivity
        : new Date(row.lastActivity as unknown as Date).toISOString(),
    status: row.status,
    behaviorProfile: row.behaviorProfile,
  };
}

export function accessEventToActivityLog(e: ApiAccessEventRow): ActivityLog {
  const isDecoy = e.accessType === 'decoy';
  return {
    id: e.id,
    timestamp: typeof e.timestamp === 'string' ? e.timestamp : new Date(e.timestamp).toISOString(),
    userId: e.userId,
    userName: e.employeeName,
    actionType: (e.actionType as ActionType) || 'file_read',
    resource: e.resource,
    sensitivityLevel: (isDecoy ? 'critical' : e.riskFlag ? 'high' : 'low') as Severity,
    ip: e.ip,
    isDecoy,
    riskContribution: e.riskFlag ? 55 : 15,
  };
}

/** Matches `AccessEvent` in `store.ts` (avoid circular import). */
export function apiAccessEventToStoreEvent(e: ApiAccessEventRow) {
  return {
    id: e.id,
    userId: e.userId,
    employeeName: e.employeeName,
    resource: e.resource,
    timestamp: typeof e.timestamp === 'string' ? e.timestamp : new Date(e.timestamp).toISOString(),
    accessType: e.accessType,
    riskFlag: e.riskFlag,
    actionType: e.actionType,
    ip: e.ip,
    triggeredBy: e.triggeredBy,
  };
}

// ─── api object ──────────────────────────────────────────────────────────────

async function postPublic<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T;
  return data;
}

export const api = {
  auth: {
    async login(email: string, password: string) {
      type R = {
        success: boolean;
        accessToken?: string;
        refreshToken?: string;
        user?: { id: string; email: string; name: string; appRole: 'Administrator' | 'Analyst' };
        error?: string;
      };
      return postPublic<R>('/auth/login', { email, password });
    },

    async refresh() {
      const rt = getRefreshToken();
      if (!rt) throw new Error('No refresh token');
      type R = {
        success: boolean;
        accessToken?: string;
        refreshToken?: string;
        user?: { id: string; email: string; name: string; appRole: 'Administrator' | 'Analyst' };
      };
      return request<R>('/auth/refresh', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ refreshToken: rt }),
      });
    },

    async logout() {
      try {
        await request<{ success: boolean }>('/auth/logout', { method: 'POST' });
      } catch {
        /* best-effort */
      }
    },

    async me() {
      type R = {
        success: boolean;
        user: { id: string; email: string; name: string; appRole: 'Administrator' | 'Analyst' };
      };
      return request<R>('/auth/me');
    },
  },

  users: {
    async list(filters?: {
      status?: string;
      department?: string;
      sortBy?: 'riskScore' | 'name' | 'lastActivity';
      order?: 'asc' | 'desc';
    }) {
      const q = new URLSearchParams();
      if (filters?.status) q.set('status', filters.status);
      if (filters?.department) q.set('department', filters.department);
      if (filters?.sortBy) q.set('sortBy', filters.sortBy);
      if (filters?.order) q.set('order', filters.order);
      const qs = q.toString();
      type R = { success: boolean; users: ApiUserRow[] };
      return request<R>(`/users${qs ? `?${qs}` : ''}`);
    },

    async get(id: string) {
      type R = { success: boolean } & ApiUserRow & {
        recentAccessEvents: ApiAccessEventRow[];
        openAlertsCount: number;
      };
      return request<R>(`/users/${id}`);
    },

    async create(input: {
      name: string;
      email: string;
      role: Role;
      department: Department;
      workingHoursStart: number;
      workingHoursEnd: number;
    }) {
      type R = { success: boolean; user: ApiUserRow };
      return request<R>('/users', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    async restrict(id: string, operatorName: string, rationale?: string) {
      type R = { success: boolean; user: ApiUserRow };
      return request<R>(`/users/${id}/restrict`, {
        method: 'PATCH',
        body: JSON.stringify({ operatorName, rationale }),
      });
    },

    async restore(id: string, operatorName: string) {
      type R = { success: boolean; user: ApiUserRow };
      return request<R>(`/users/${id}/restore`, {
        method: 'PATCH',
        body: JSON.stringify({ operatorName }),
      });
    },
  },

  alerts: {
    async list(filters?: { severity?: string; status?: string; userId?: string }) {
      const q = new URLSearchParams();
      if (filters?.severity) q.set('severity', filters.severity);
      if (filters?.status) q.set('status', filters.status);
      if (filters?.userId) q.set('userId', filters.userId);
      const qs = q.toString();
      type Row = ApiAlertRow & { userAvatar?: string };
      type R = { success: boolean; alerts: Row[] };
      return request<R>(`/alerts${qs ? `?${qs}` : ''}`);
    },

    async updateStatus(id: string, status: Alert['status']) {
      type R = { success: boolean; alert: ApiAlertRow & { user?: { avatar: string } } };
      return request<R>(`/alerts/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
  },

  decoys: {
    async list(filters?: { type?: string; sensitivityTag?: string; status?: string }) {
      const q = new URLSearchParams();
      if (filters?.type) q.set('type', filters.type);
      if (filters?.sensitivityTag) q.set('sensitivityTag', filters.sensitivityTag);
      if (filters?.status) q.set('status', filters.status);
      const qs = q.toString();
      type R = { success: boolean; decoys: DecoyAsset[] };
      return request<R>(`/decoys${qs ? `?${qs}` : ''}`);
    },

    async create(input: { name: string; type: DecoyAsset['type']; sensitivityTag: Severity; department?: string }) {
      type R = { success: boolean; decoy: DecoyAsset };
      return request<R>('/decoys', {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          type: input.type,
          sensitivityTag: input.sensitivityTag,
        }),
      });
    },
  },

  events: {
    async list(filters?: {
      userId?: string;
      accessType?: string;
      riskFlag?: boolean;
      limit?: number;
    }) {
      const q = new URLSearchParams();
      if (filters?.userId) q.set('userId', filters.userId);
      if (filters?.accessType) q.set('accessType', filters.accessType);
      if (filters.riskFlag !== undefined) q.set('riskFlag', String(filters.riskFlag));
      if (filters?.limit != null) q.set('limit', String(filters.limit));
      const qs = q.toString();
      type R = { success: boolean; events: ApiAccessEventRow[] };
      return request<R>(`/events${qs ? `?${qs}` : ''}`);
    },

    async simulate(userId: string, resourceName: string) {
      type R = {
        success: boolean;
        accessEvent: ApiAccessEventRow;
        updatedUser: ApiUserRow;
        alert?: ApiAlertRow;
      };
      return request<R>('/events/simulate', {
        method: 'POST',
        body: JSON.stringify({ userId, resourceName }),
      });
    },
  },

  dashboard: {
    async stats() {
      type R = {
        success: boolean;
        activeUsers: number;
        highRiskUsers: number;
        openAlerts: number;
        decoyHits: number;
        totalUsers: number;
      };
      return request<R>('/dashboard/stats');
    },

    async timeseries() {
      type R = {
        success: boolean;
        series: Array<{
          date: string;
          low: number;
          medium: number;
          high: number;
          critical: number;
        }>;
      };
      return request<R>('/dashboard/timeseries');
    },

    async hourly() {
      type R = {
        success: boolean;
        hourly: Array<{ hour: number; count: number; anomalies: number }>;
      };
      return request<R>('/dashboard/hourly');
    },
  },
};
