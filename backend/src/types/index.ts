/**
 * Shared TypeScript interfaces for the Insight Guardian backend.
 *
 * These are **manually typed** (not auto-generated from Prisma) so the types
 * remain portable and can be shared with the frontend or any other consumer.
 *
 * Import from any file:
 *   import type { User, Alert, DecoyAsset } from '../types';
 */

// ────────────────────────────────────────────────────────────────────────────
// Enums (string unions matching Prisma enum values)
// ────────────────────────────────────────────────────────────────────────────

/** SOC console operator role (JWT / session operators). */
export type AppRole = 'Administrator' | 'Analyst';

/** Monitored organization user role. */
export type OrgRole = 'Admin' | 'Manager' | 'Employee' | 'Intern';

export type Department =
  | 'Engineering'
  | 'Finance'
  | 'HR'
  | 'Marketing'
  | 'Legal'
  | 'Operations';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type RiskTrend = 'increasing' | 'decreasing' | 'stable';

export type MonitoredUserStatus = 'active' | 'inactive' | 'flagged' | 'frozen';

export type DecoyAssetType = 'file' | 'database' | 'api';

export type DecoyLifecycleStatus = 'active' | 'inactive';

export type ActivityActionType =
  | 'file_read'
  | 'file_write'
  | 'file_download'
  | 'db_query'
  | 'api_call'
  | 'login'
  | 'logout'
  | 'decoy_access';

export type AlertStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

export type AccessEventKind = 'normal' | 'decoy' | 'denied';

export type AccessEventSource = 'SYSTEM' | 'ADMIN';

export type AdminActionType = 'USER_RESTRICTED' | 'USER_RESTORED';

export type AdminActionSource = 'ADMIN';

export type ContainmentDuration = 'h1' | 'h24' | 'manual';

// ────────────────────────────────────────────────────────────────────────────
// Prisma Model Output Shapes
// ────────────────────────────────────────────────────────────────────────────

/** SOC operator account (JWT issuer). */
export interface AuthAccount {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  appRole: AppRole;
  createdAt: string;
  lastLogin: string | null;
  refreshToken: string | null;
}

/** HTTP API audit trail entry. */
export interface HttpAuditLog {
  id: string;
  createdAt: string;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number | null;
  ip: string | null;
  authAccountId: string | null;
  operatorEmail: string | null;
}

/** Monitored organization employee (simulation), not an AuthAccount. */
export interface User {
  id: string;
  name: string;
  email: string;
  role: OrgRole;
  department: Department;
  avatar: string;
  workingHoursStart: number;
  workingHoursEnd: number;
  riskScore: number;
  riskTrend: RiskTrend;
  lastActivity: string;
  status: MonitoredUserStatus;
  behaviorAvgLoginHour: number;
  behaviorAvgSessionMinutes: number;
  behaviorAvgDailyAccesses: number;
  behaviorCommonFileTypes: string[];
  behaviorStabilityScore: number;
}

export interface DecoyAsset {
  id: string;
  name: string;
  type: DecoyAssetType;
  format: string;
  sensitivityTag: Severity;
  createdAt: string;
  accessCount: number;
  lastAccessed: string | null;
  beacon: string;
  status: DecoyLifecycleStatus;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  actionType: ActivityActionType;
  resource: string;
  sensitivityLevel: Severity;
  ip: string;
  isDecoy: boolean;
  riskContribution: number;
}

export interface Alert {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  severity: Severity;
  riskScore: number;
  title: string;
  description: string;
  reasons: RiskBreakdown;
  status: AlertStatus;
}

export interface AccessEvent {
  id: string;
  userId: string;
  employeeName: string;
  resource: string;
  timestamp: string;
  accessType: AccessEventKind;
  riskFlag: boolean;
  actionType: string;
  ip: string;
  triggeredBy: AccessEventSource;
}

export interface AdminActionLog {
  id: string;
  timestamp: string;
  actionType: AdminActionType;
  targetUserId: string;
  targetUserName: string;
  triggeredBy: AdminActionSource;
  operatorName: string;
  rationale: string | null;
}

export interface ContainmentState {
  id: string;
  userId: string;
  fileAccess: boolean;
  dbAccess: boolean;
  apiAccess: boolean;
  duration: ContainmentDuration;
  appliedAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Composite / Nested Shapes
// ────────────────────────────────────────────────────────────────────────────

export interface BehaviorProfile {
  avgLoginHour: number;
  avgSessionMinutes: number;
  avgDailyAccesses: number;
  commonFileTypes: string[];
  stabilityScore: number;
}

export interface RiskBreakdown {
  timeAnomaly: number;
  sensitivityScore: number;
  roleDeviation: number;
  behaviorDeviation: number;
  decoyWeight: number;
}

/**
 * "Simulation user" — a User enriched with nested working-hours
 * and behavior profile objects, used in API responses.
 */
export interface SimulationUser {
  id: string;
  name: string;
  email: string;
  role: OrgRole;
  department: Department;
  avatar: string;
  workingHours: { start: number; end: number };
  riskScore: number;
  riskTrend: RiskTrend;
  lastActivity: string;
  status: MonitoredUserStatus;
  behaviorProfile: BehaviorProfile;
}

// ────────────────────────────────────────────────────────────────────────────
// API Request / Response Body Shapes
// ────────────────────────────────────────────────────────────────────────────

/** Authenticated operator returned in /auth/me, /auth/login, /auth/refresh. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  appRole: AppRole;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: true;
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshRequestBody {
  refreshToken: string;
}

export interface RefreshResponse {
  success: true;
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface LogoutResponse {
  success: true;
}

export interface MeResponse {
  success: true;
  user: AuthUser;
}

// ── Users ───────────────────────────────────────────────────────────────────

export interface ListUsersQuery {
  status?: MonitoredUserStatus;
  department?: Department;
  sortBy?: 'riskScore' | 'name' | 'lastActivity';
  order?: 'asc' | 'desc';
}

export interface CreateUserRequestBody {
  name: string;
  email: string;
  role: OrgRole;
  department: Department;
  workingHoursStart: number;
  workingHoursEnd: number;
}

export interface RestrictUserRequestBody {
  operatorName: string;
  rationale?: string;
}

export interface RestoreUserRequestBody {
  operatorName: string;
}

// ── Alerts ──────────────────────────────────────────────────────────────────

export interface ListAlertsQuery {
  severity?: Severity;
  status?: AlertStatus;
  userId?: string;
}

export interface UpdateAlertStatusBody {
  status: AlertStatus;
}

// ── Decoys ──────────────────────────────────────────────────────────────────

export interface ListDecoysQuery {
  type?: DecoyAssetType;
  sensitivityTag?: Severity;
  status?: DecoyLifecycleStatus;
}

export interface CreateDecoyRequestBody {
  name: string;
  type: DecoyAssetType;
  sensitivityTag: Severity;
  department?: string;
}

// ── Events ──────────────────────────────────────────────────────────────────

export interface ListEventsQuery {
  userId?: string;
  accessType?: AccessEventKind;
  riskFlag?: 'true' | 'false';
  limit?: number;
}

export interface SimulateEventRequestBody {
  userId: string;
  resourceName: string;
}

export interface SimulateEventResponse {
  success: true;
  accessEvent: AccessEvent;
  updatedUser: User;
  alert?: Alert;
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalUsers: number;
  activeAlerts: number;
  avgRiskScore: number;
  criticalUsers: number;
  activeDecoys: number;
  decoyHitsToday: number;
  departmentBreakdown: { department: Department; count: number; avgRisk: number }[];
}

export interface AlertTimeseriesPoint {
  date: string;
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface HourlyActivityPoint {
  hour: number;
  count: number;
}

// ── Generic Envelope ────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  [key: string]: T | true;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

// ────────────────────────────────────────────────────────────────────────────
// Socket.io Event Payload Types
// ────────────────────────────────────────────────────────────────────────────

export interface SocketUserRiskUpdatedPayload {
  id: string;
  name: string;
  riskScore: number;
  riskTrend: RiskTrend;
  status: MonitoredUserStatus;
}

export interface SocketUserRestrictedPayload {
  id: string;
  name: string;
  status: MonitoredUserStatus;
}

export interface SocketUserRestoredPayload {
  id: string;
  name: string;
  status: MonitoredUserStatus;
}

/** Full AccessEvent model — same shape as `AccessEvent` above. */
export type SocketNewAccessEventPayload = AccessEvent;

/** Full Alert model — same shape as `Alert` above. */
export type SocketNewAlertPayload = Alert;

export interface SocketAlertUpdatedPayload {
  id: string;
  status: AlertStatus;
}

/** Full DecoyAsset model — same shape as `DecoyAsset` above. */
export type SocketDecoyDeployedPayload = DecoyAsset;

export interface SocketDecoyHitPayload {
  decoyId: string;
  decoyName: string;
  userId: string;
  userName: string;
  riskDelta: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Server → Client event map (for typed Socket.io)
// ────────────────────────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  'user:riskUpdated': (payload: SocketUserRiskUpdatedPayload) => void;
  'user:restricted': (payload: SocketUserRestrictedPayload) => void;
  'user:restored': (payload: SocketUserRestoredPayload) => void;
  'event:new': (payload: SocketNewAccessEventPayload) => void;
  'alert:new': (payload: SocketNewAlertPayload) => void;
  'alert:updated': (payload: SocketAlertUpdatedPayload) => void;
  'decoy:deployed': (payload: SocketDecoyDeployedPayload) => void;
  'decoy:hit': (payload: SocketDecoyHitPayload) => void;
}

/** No custom client → server events at this time. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ClientToServerEvents {}
