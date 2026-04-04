import { useCallback, useSyncExternalStore } from 'react';
import {
  api,
  apiUserToUser,
  normalizeAlert,
  accessEventToActivityLog,
  apiAccessEventToStoreEvent,
  normalizeDecoy,
  type ApiUserRow,
  type ApiAccessEventRow,
  type ApiAlertRow,
} from './api';
import { connectSocket, disconnectSocket } from './socket';
import { getData, type User, type DecoyAsset, type ActivityLog, type Alert, type Severity } from './mock-data';

// ─── Access Event Types ─────────────────────────────────────────────────────

export type AccessType = 'normal' | 'decoy' | 'denied';

export interface AccessEvent {
  id: string;
  userId: string;
  employeeName: string;
  resource: string;
  timestamp: string;
  accessType: AccessType;
  riskFlag: boolean;
  actionType: string;
  ip: string;
  triggeredBy?: 'SYSTEM' | 'ADMIN';
}

// ─── Containment Types ──────────────────────────────────────────────────────

export interface ContainmentState {
  fileAccess: boolean;
  dbAccess: boolean;
  apiAccess: boolean;
  duration: '1h' | '24h' | 'manual';
  appliedAt: string | null;
}

// ─── Admin Action Log ───────────────────────────────────────────────────────

export interface AdminActionLog {
  id: string;
  timestamp: string;
  actionType: 'USER_RESTRICTED' | 'USER_RESTORED';
  targetUserId: string;
  targetUserName: string;
  triggeredBy: 'ADMIN';
  operatorName: string;
  rationale?: string;
}

export interface AppState {
  users: User[];
  decoys: DecoyAsset[];
  logs: ActivityLog[];
  alerts: Alert[];
  containment: Record<string, ContainmentState>;
  orgName: string;
  accessEvents: AccessEvent[];
  adminActions: AdminActionLog[];
  loading: boolean;
  error: string | null;
}

// ─── External store ─────────────────────────────────────────────────────────

let state: AppState | undefined;
const listeners = new Set<() => void>();

function mapApiDuration(d: 'h1' | 'h24' | 'manual'): ContainmentState['duration'] {
  if (d === 'h1') return '1h';
  if (d === 'h24') return '24h';
  return 'manual';
}

function extractUsersAndContainment(rows: ApiUserRow[]): {
  users: User[];
  containment: Record<string, ContainmentState>;
} {
  const containment: Record<string, ContainmentState> = {};
  const users: User[] = [];
  for (const row of rows) {
    if (row.containment) {
      containment[row.id] = {
        fileAccess: row.containment.fileAccess,
        dbAccess: row.containment.dbAccess,
        apiAccess: row.containment.apiAccess,
        duration: mapApiDuration(row.containment.duration),
        appliedAt: row.containment.appliedAt ?? null,
      };
    }
    users.push(apiUserToUser(row));
  }
  return { users, containment };
}

function createEmptyState(): AppState {
  return {
    users: [],
    decoys: [],
    logs: [],
    alerts: [],
    containment: {},
    orgName: 'Acme Corp',
    accessEvents: [],
    adminActions: [],
    loading: false,
    error: null,
  };
}

function getState(): AppState {
  if (!state) state = createEmptyState();
  return state;
}

function setState(partial: Partial<AppState>) {
  state = { ...getState(), ...partial };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let socketListenersBound = false;

function wireSocketListeners(): void {
  if (socketListenersBound) return;
  const s = connectSocket();
  if (!s) return;
  socketListenersBound = true;

  s.on(
    'user:riskUpdated',
    (p: {
      id: string;
      name: string;
      riskScore: number;
      riskTrend: User['riskTrend'];
      status: User['status'];
    }) => {
      setState({
        users: getState().users.map((u) => (u.id === p.id ? { ...u, ...p } : u)),
      });
    },
  );

  s.on('user:restricted', (p: { id: string; name: string; status: User['status'] }) => {
    const cur = getState();
    const newContainment = {
      ...cur.containment,
      [p.id]: {
        fileAccess: false,
        dbAccess: false,
        apiAccess: false,
        duration: 'manual' as const,
        appliedAt: new Date().toISOString(),
      },
    };
    setState({
      users: cur.users.map((u) => (u.id === p.id ? { ...u, ...p } : u)),
      containment: newContainment,
    });
  });

  s.on('user:restored', (p: { id: string; name: string; status: User['status'] }) => {
    const cur = getState();
    const { [p.id]: _, ...rest } = cur.containment;
    setState({
      users: cur.users.map((u) => (u.id === p.id ? { ...u, ...p } : u)),
      containment: rest,
    });
  });

  s.on('event:new', (ev: ApiAccessEventRow) => {
    const e = apiAccessEventToStoreEvent(ev);
    const cur = getState();
    setState({
      accessEvents: [e as AccessEvent, ...cur.accessEvents],
      logs: [accessEventToActivityLog(ev), ...cur.logs],
    });
  });

  s.on('alert:new', (a: ApiAlertRow) => {
    const cur = getState();
    setState({
      alerts: [normalizeAlert(a), ...cur.alerts],
    });
  });

  s.on('alert:updated', (p: { id: string; status: Alert['status'] }) => {
    setState({
      alerts: getState().alerts.map((a) => (a.id === p.id ? { ...a, status: p.status } : a)),
    });
  });

  s.on(
    'decoy:hit',
    (p: { decoyId: string; decoyName: string; userId: string; userName: string; riskDelta: number }) => {
      void p;
      setState({
        decoys: getState().decoys.map((d) =>
          d.id === p.decoyId ? { ...d, accessCount: d.accessCount + 1 } : d,
        ),
      });
    },
  );

  s.on('decoy:deployed', (d: DecoyAsset) => {
    const cur = getState();
    if (cur.decoys.some((x) => x.id === d.id)) return;
    setState({ decoys: [normalizeDecoy(d), ...cur.decoys] });
  });
}

export function teardownStoreSockets(): void {
  socketListenersBound = false;
  disconnectSocket();
}

export function resetStore(): void {
  state = createEmptyState();
  listeners.forEach((l) => l());
}

/**
 * Load users, alerts, decoys, events, and dashboard stats from the API (parallel).
 * Call after authentication. Attaches Socket.io listeners when a token is present.
 */
export async function initializeStore(): Promise<void> {
  setState({ ...getState(), loading: true, error: null });
  try {
    const [usersRes, alertsRes, decoysRes, eventsRes, _statsRes] = await Promise.all([
      api.users.list(),
      api.alerts.list(),
      api.decoys.list(),
      api.events.list({ limit: 500 }),
      api.dashboard.stats(),
    ]);
    void _statsRes;

    const { users, containment } = extractUsersAndContainment(usersRes.users);

    const alerts = alertsRes.alerts.map((a) => {
      const { userAvatar: _, ...rest } = a as ApiAlertRow & { userAvatar?: string };
      return normalizeAlert(rest as ApiAlertRow);
    });

    const decoys = decoysRes.decoys.map(normalizeDecoy);
    const accessEvents = eventsRes.events.map((e) => apiAccessEventToStoreEvent(e) as AccessEvent);
    const logs = eventsRes.events.map(accessEventToActivityLog);

    setState({
      users,
      alerts,
      decoys,
      logs,
      accessEvents,
      containment,
      loading: false,
      error: null,
    });

    wireSocketListeners();
    connectSocket();
  } catch (e) {
    setState({
      ...getState(),
      loading: false,
      error: e instanceof Error ? e.message : 'Failed to load data',
    });
  }
}

/** Fallback hydrate from mock when API is unavailable (tests / offline). */
export function hydrateFromMock(): void {
  const { users, decoys, logs, alerts } = getData();
  setState({
    users,
    decoys,
    logs,
    alerts,
    containment: {},
    orgName: 'Acme Corp',
    accessEvents: logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      employeeName: log.userName,
      resource: log.resource,
      timestamp: log.timestamp,
      accessType: (log.isDecoy ? 'decoy' : 'normal') as AccessType,
      riskFlag: log.isDecoy || log.riskContribution > 30,
      actionType: log.actionType,
      ip: log.ip,
      triggeredBy: 'SYSTEM',
    })),
    adminActions: [],
    loading: false,
    error: null,
  });
}

export function useAppStore(): AppState & {
  addUser: (user: Omit<User, 'id' | 'avatar' | 'riskScore' | 'riskTrend' | 'lastActivity' | 'status' | 'behaviorProfile'> & { accessLevel: string }) => void;
  addDecoy: (decoy: { name: string; type: DecoyAsset['type']; sensitivityTag: Severity; department?: string }) => void;
  setContainment: (userId: string, c: ContainmentState) => void;
  clearContainment: (userId: string) => void;
  restrictUser: (userId: string, operatorName: string, rationale?: string) => void;
  restoreUser: (userId: string, operatorName: string) => void;
  simulateAccessAttempt: (userId: string, resource: string) => void;
} {
  const snapshot = useSyncExternalStore(subscribe, getState, getState);

  const addUser = useCallback(
    (input: Omit<User, 'id' | 'avatar' | 'riskScore' | 'riskTrend' | 'lastActivity' | 'status' | 'behaviorProfile'> & { accessLevel: string }) => {
      void (async () => {
        try {
          const res = await api.users.create({
            name: input.name,
            email: input.email,
            role: input.role,
            department: input.department,
            workingHoursStart: input.workingHours.start,
            workingHoursEnd: input.workingHours.end,
          });
          const u = apiUserToUser(res.user);
          const s = getState();
          setState({ users: [u, ...s.users], error: null });
        } catch (e) {
          setState({
            ...getState(),
            error: e instanceof Error ? e.message : 'Failed to create user',
          });
        }
      })();
    },
    [],
  );

  const addDecoy = useCallback(
    (input: { name: string; type: DecoyAsset['type']; sensitivityTag: Severity; department?: string }) => {
      void (async () => {
        try {
          const res = await api.decoys.create(input);
          const s = getState();
          setState({ decoys: [normalizeDecoy(res.decoy), ...s.decoys], error: null });
        } catch (e) {
          setState({
            ...getState(),
            error: e instanceof Error ? e.message : 'Failed to create decoy',
          });
        }
      })();
    },
    [],
  );

  const setContainment = useCallback((userId: string, c: ContainmentState) => {
    const s = getState();
    const newContainment = { ...s.containment, [userId]: c };
    const newUsers = s.users.map((u) => (u.id === userId ? { ...u, status: 'frozen' as const } : u));
    setState({ containment: newContainment, users: newUsers });
  }, []);

  const clearContainment = useCallback((userId: string) => {
    const s = getState();
    const { [userId]: _, ...rest } = s.containment;
    const newUsers = s.users.map((u) => (u.id === userId ? { ...u, status: 'active' as const } : u));
    setState({ containment: rest, users: newUsers });
  }, []);

  const restrictUser = useCallback((userId: string, operatorName: string, rationale?: string) => {
    void (async () => {
      try {
        const res = await api.users.restrict(userId, operatorName, rationale);
        const { users, containment } = extractUsersAndContainment([res.user]);
        const u = users[0];
        if (!u) return;
        const s = getState();
        const newContainment = { ...s.containment, ...containment };
        setState({
          users: s.users.map((x) => (x.id === userId ? u : x)),
          containment: newContainment,
          error: null,
        });
      } catch (e) {
        setState({
          ...getState(),
          error: e instanceof Error ? e.message : 'Failed to restrict user',
        });
      }
    })();
  }, []);

  const restoreUser = useCallback((userId: string, operatorName: string) => {
    void (async () => {
      try {
        const res = await api.users.restore(userId, operatorName);
        const u = apiUserToUser(res.user);
        const s = getState();
        const { [userId]: _, ...restContainment } = s.containment;
        setState({
          users: s.users.map((x) => (x.id === userId ? u : x)),
          containment: restContainment,
          error: null,
        });
      } catch (e) {
        setState({
          ...getState(),
          error: e instanceof Error ? e.message : 'Failed to restore user',
        });
      }
    })();
  }, []);

  const simulateAccessAttempt = useCallback((userId: string, resource: string) => {
    void (async () => {
      try {
        const res = await api.events.simulate(userId, resource);
        const u = apiUserToUser(res.updatedUser);
        const ev = apiAccessEventToStoreEvent(res.accessEvent) as AccessEvent;
        const log = accessEventToActivityLog(res.accessEvent);
        const s = getState();
        let alerts = s.alerts;
        if (res.alert) {
          alerts = [normalizeAlert(res.alert), ...alerts];
        }
        const { containment: nextC } = extractUsersAndContainment([res.updatedUser]);
        const containment = { ...s.containment, ...nextC };
        setState({
          users: s.users.map((x) => (x.id === userId ? u : x)),
          accessEvents: [ev, ...s.accessEvents],
          logs: [log, ...s.logs],
          alerts,
          containment,
          error: null,
        });
      } catch (e) {
        setState({
          ...getState(),
          error: e instanceof Error ? e.message : 'Simulation failed',
        });
      }
    })();
  }, []);

  return {
    ...snapshot,
    addUser,
    addDecoy,
    setContainment,
    clearContainment,
    restrictUser,
    restoreUser,
    simulateAccessAttempt,
  };
}
