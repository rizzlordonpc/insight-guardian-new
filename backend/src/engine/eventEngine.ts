/**
 * Pure insider-threat event logic (no I/O). Service layer loads/saves Prisma rows and calls these functions.
 */

export const RISK_THRESHOLD = 75;
export const EXPONENTIAL_BASE = 1.6;
export const MAX_RISK = 100;

export const SENSITIVITY_RISK_MAP: Record<
  'low' | 'medium' | 'high' | 'critical',
  number
> = {
  low: 10,
  medium: 20,
  high: 35,
  critical: 50,
};

export interface EngineUser {
  id: string;
  riskScore: number;
  riskTrend: 'increasing' | 'decreasing' | 'stable';
  status: 'active' | 'inactive' | 'flagged' | 'frozen';
  role: 'Admin' | 'Manager' | 'Employee' | 'Intern';
  department: string;
  decoyHitCount?: number;
}

export interface EngineDecoy {
  id: string;
  name: string;
  type: 'file' | 'database' | 'api';
  sensitivityTag: 'low' | 'medium' | 'high' | 'critical';
  accessCount: number;
  status: 'active' | 'inactive';
}

export interface EngineResult {
  updatedRiskScore: number;
  updatedStatus: 'active' | 'inactive' | 'flagged' | 'frozen';
  updatedRiskTrend: 'increasing' | 'decreasing' | 'stable';
  accessType: 'normal' | 'decoy' | 'denied';
  riskFlag: boolean;
  shouldCreateAlert: boolean;
  alertSeverity?: 'low' | 'medium' | 'high' | 'critical';
  alertTitle?: string;
  alertDescription?: string;
  matchedDecoy?: EngineDecoy;
}

export interface RiskBreakdown {
  timeAnomaly: number;
  sensitivityScore: number;
  roleDeviation: number;
  behaviorDeviation: number;
  decoyWeight: number;
}

const ROLE_SUSPICIOUS_PATTERNS: Record<EngineUser['role'], RegExp[]> = {
  Intern: [/database/i, /admin/i, /confidential/i, /payroll/i],
  Employee: [/admin/i, /root/i, /secrets/i],
  Manager: [/root/i, /secrets/i],
  Admin: [],
};

function clampRisk(score: number): number {
  return Math.min(Math.max(Math.round(score), 0), MAX_RISK);
}

function midRange(a: number, b: number): number {
  return Math.round((a + b) / 2);
}

/** Case-insensitive decoy name match; only active decoys (matches frontend engine). */
export function resolveDecoy(resourceName: string, decoys: EngineDecoy[]): EngineDecoy | null {
  const needle = resourceName.trim().toLowerCase();
  return (
    decoys.find((d) => d.status === 'active' && d.name.toLowerCase() === needle) ?? null
  );
}

function isRoleSuspiciousAccess(user: EngineUser, resourceName: string): boolean {
  const patterns = ROLE_SUSPICIOUS_PATTERNS[user.role] ?? [];
  return patterns.some((re) => re.test(resourceName));
}

/**
 * Sensitivity map × 1.6^decoyHitCount on decoy path; +8 role heuristic when no decoy; frozen → 0.
 * Decoy path takes precedence over role heuristic (same as frontend `computeUpdatedRisk`).
 */
export function computeRiskDelta(
  user: EngineUser,
  decoy: EngineDecoy | null,
  resourceName: string,
): number {
  if (user.status === 'frozen') {
    return 0;
  }

  if (decoy) {
    const base = SENSITIVITY_RISK_MAP[decoy.sensitivityTag];
    const hits = user.decoyHitCount ?? 0;
    const multiplier = Math.pow(EXPONENTIAL_BASE, hits);
    return Math.round(base * multiplier);
  }

  if (isRoleSuspiciousAccess(user, resourceName)) {
    return 8;
  }

  return 0;
}

function deriveAccessType(
  user: EngineUser,
  isDecoy: boolean,
): 'normal' | 'decoy' | 'denied' {
  if (user.status === 'frozen') return 'denied';
  if (isDecoy) return 'decoy';
  return 'normal';
}

function deriveAlertSeverity(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
  if (riskScore >= 90) return 'critical';
  if (riskScore >= 75) return 'high';
  if (riskScore >= 50) return 'medium';
  return 'low';
}

function buildAlertCopy(
  user: EngineUser,
  matchedDecoy: EngineDecoy | null,
  resourceName: string,
  updatedRiskScore: number,
): { title: string; description: string } {
  const isDecoy = matchedDecoy !== null;
  const severityLabel = deriveAlertSeverity(updatedRiskScore);

  if (isDecoy && matchedDecoy) {
    const title = `Decoy Asset Accessed — ${matchedDecoy.sensitivityTag.toUpperCase()} Sensitivity`;
    const description =
      `User (${user.role}, ${user.department}) accessed decoy ${matchedDecoy.type} "${resourceName}". ` +
      `Sensitivity: ${matchedDecoy.sensitivityTag}. Risk score escalated to ${updatedRiskScore}. Immediate review recommended.`;
    return { title, description };
  }

  return {
    title: 'Suspicious Resource Access Detected',
    description:
      `User (${user.role}, ${user.department}) accessed "${resourceName}", which is outside their role scope. ` +
      `Risk score: ${updatedRiskScore}. Severity band: ${severityLabel}.`,
  };
}

export function processAccessEvent(
  user: EngineUser,
  resourceName: string,
  decoys: EngineDecoy[],
  decoyHitCount: number,
): EngineResult {
  const userWithHits: EngineUser = { ...user, decoyHitCount };
  const matchedDecoy = resolveDecoy(resourceName, decoys);
  const isDecoy = matchedDecoy !== null;

  const delta = computeRiskDelta(userWithHits, matchedDecoy, resourceName);
  const updatedRiskScore = clampRisk(user.riskScore + delta);

  let updatedStatus: EngineResult['updatedStatus'];
  if (user.status === 'frozen') {
    updatedStatus = 'frozen';
  } else if (updatedRiskScore >= RISK_THRESHOLD) {
    updatedStatus = 'flagged';
  } else {
    updatedStatus = 'active';
  }

  const updatedRiskTrend: EngineResult['updatedRiskTrend'] =
    updatedRiskScore > user.riskScore
      ? 'increasing'
      : updatedRiskScore < user.riskScore
        ? 'decreasing'
        : 'stable';

  const accessType = deriveAccessType(user, isDecoy);
  const riskFlag = isDecoy || isRoleSuspiciousAccess(user, resourceName);

  const wasBelowThreshold = user.riskScore < RISK_THRESHOLD;
  const nowAtOrAboveThreshold = updatedRiskScore >= RISK_THRESHOLD;
  const shouldCreateAlert = isDecoy || (wasBelowThreshold && nowAtOrAboveThreshold);

  const alertSeverity = shouldCreateAlert
    ? deriveAlertSeverity(updatedRiskScore)
    : undefined;

  let alertTitle: string | undefined;
  let alertDescription: string | undefined;
  if (shouldCreateAlert) {
    const copy = buildAlertCopy(user, matchedDecoy, resourceName, updatedRiskScore);
    alertTitle = copy.title;
    alertDescription = copy.description;
  }

  return {
    updatedRiskScore,
    updatedStatus,
    updatedRiskTrend,
    accessType,
    riskFlag,
    shouldCreateAlert,
    alertSeverity,
    alertTitle,
    alertDescription,
    matchedDecoy: matchedDecoy ?? undefined,
  };
}

/**
 * Deterministic analogue of frontend `computeRiskBreakdown` (mock-data used `rand()`).
 * Uses midpoint of each random range and the same bounds on `remaining`.
 */
export function deriveAlertReasons(riskScore: number, hasDecoy: boolean): RiskBreakdown {
  const decoyWeight = hasDecoy ? midRange(40, 60) : 0;
  const remaining = Math.max(0, riskScore - decoyWeight);
  const upper30 = Math.max(6, remaining * 0.3);
  const upper20 = Math.max(4, remaining * 0.2);

  return {
    timeAnomaly: Math.max(0, midRange(5, upper30)),
    sensitivityScore: Math.max(0, midRange(5, upper30)),
    roleDeviation: Math.max(0, midRange(3, upper20)),
    behaviorDeviation: Math.max(0, midRange(3, upper20)),
    decoyWeight,
  };
}
