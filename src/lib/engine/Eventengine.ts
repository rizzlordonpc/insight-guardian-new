import { nanoid } from "nanoid";

export interface User {
  id: string;
  name: string;
  role: "Admin" | "Manager" | "Employee" | "Intern";
  department: string;
  riskScore: number;
  riskTrend?: "increasing" | "stable" | "decreasing";
  decoyHitCount?: number;
  status: "active" | "flagged" | "frozen";
}

export interface DecoyAsset {
  id: string;
  name: string;
  type: "file" | "database" | "api";
  sensitivityTag: "low" | "medium" | "high" | "critical";
  accessCount: number;
  status: "active";
}

export interface AccessEvent {
  id: string;
  userId: string;
  resource: string;
  timestamp: string;
  accessType: "normal" | "decoy" | "denied";
  riskFlag: boolean;
}

export interface Alert {
  id: string;
  userId: string;
  severity: "low" | "medium" | "high" | "critical";
  riskScore: number;
  title: string;
  description: string;
}

export interface EngineStoreSlice {
  users: User[];
  decoyAssets: DecoyAsset[];
  accessEvents: AccessEvent[];
  alerts: Alert[];
}

export interface EngineResult {
  updatedUsers: User[];
  newAccessEvent: AccessEvent;
  newAlert?: Alert;
  updatedDecoyAssets?: DecoyAsset[];
}

const RISK_THRESHOLD = 75;

const SENSITIVITY_RISK_MAP: Record<DecoyAsset["sensitivityTag"], number> = {
  low: 10,
  medium: 20,
  high: 35,
  critical: 50,
};

const ROLE_SUSPICIOUS_RESOURCES: Record<User["role"], RegExp[]> = {
  Intern: [/database/i, /admin/i, /confidential/i, /payroll/i],
  Employee: [/admin/i, /root/i, /secrets/i],
  Manager: [/root/i, /secrets/i],
  Admin: [],
};

const MAX_RISK_SCORE = 100;
const EXPONENTIAL_DECAY_BASE = 1.6;

function clampRisk(score: number): number {
  return Math.min(Math.max(Math.round(score), 0), MAX_RISK_SCORE);
}

function resolveDecoyAsset(
  resourceName: string,
  decoyAssets: DecoyAsset[]
): DecoyAsset | null {
  return (
    decoyAssets.find(
      (d) =>
        d.status === "active" &&
        d.name.toLowerCase() === resourceName.toLowerCase()
    ) ?? null
  );
}

function isRoleSuspiciousAccess(user: User, resourceName: string): boolean {
  const patterns = ROLE_SUSPICIOUS_RESOURCES[user.role] ?? [];
  return patterns.some((pattern) => pattern.test(resourceName));
}

function deriveAccessType(
  user: User,
  resourceName: string,
  isDecoy: boolean
): AccessEvent["accessType"] {
  if (user.status === "frozen") return "denied";
  if (isDecoy) return "decoy";
  return "normal";
}

function deriveSeverity(riskScore: number): Alert["severity"] {
  if (riskScore >= 90) return "critical";
  if (riskScore >= 75) return "high";
  if (riskScore >= 50) return "medium";
  return "low";
}

function buildAlert(user: User, decoyAsset: DecoyAsset | null, resourceName: string): Alert {
  const severity = deriveSeverity(user.riskScore);
  const isDecoy = decoyAsset !== null;

  const title = isDecoy
    ? `Decoy Asset Accessed — ${decoyAsset!.sensitivityTag.toUpperCase()} Sensitivity`
    : `Suspicious Resource Access Detected`;

  const description = isDecoy
    ? `User "${user.name}" (${user.role}, ${user.department}) accessed decoy ${decoyAsset!.type} "${resourceName}". Sensitivity: ${decoyAsset!.sensitivityTag}. Risk score escalated to ${user.riskScore}. Immediate review recommended.`
    : `User "${user.name}" accessed "${resourceName}", which is outside their role scope. Risk score: ${user.riskScore}.`;

  return {
    id: nanoid(),
    userId: user.id,
    severity,
    riskScore: user.riskScore,
    title,
    description,
  };
}

function computeUpdatedRisk(
  user: User,
  isDecoy: boolean,
  decoyAsset: DecoyAsset | null,
  resourceName: string
): { newRiskScore: number; newDecoyHitCount: number; riskTrend: User["riskTrend"] } {
  let riskDelta = 0;
  const currentHits = user.decoyHitCount ?? 0;

  if (isDecoy && decoyAsset) {
    const baseRisk = SENSITIVITY_RISK_MAP[decoyAsset.sensitivityTag];
    const multiplier = Math.pow(EXPONENTIAL_DECAY_BASE, currentHits);
    riskDelta = Math.round(baseRisk * multiplier);
  } else if (isRoleSuspiciousAccess(user, resourceName)) {
    riskDelta = 8;
  }

  const newRiskScore = clampRisk(user.riskScore + riskDelta);
  const newDecoyHitCount = isDecoy ? currentHits + 1 : currentHits;
  const riskTrend: User["riskTrend"] =
    newRiskScore > user.riskScore
      ? "increasing"
      : newRiskScore < user.riskScore
      ? "decreasing"
      : "stable";

  return { newRiskScore, newDecoyHitCount, riskTrend };
}

export function processAccessEvent(
  userId: string,
  resourceName: string,
  store: EngineStoreSlice
): EngineResult {
  const user = store.users.find((u) => u.id === userId);
  if (!user) throw new Error(`[EventEngine] User not found: ${userId}`);

  const decoyAsset = resolveDecoyAsset(resourceName, store.decoyAssets);
  const isDecoy = decoyAsset !== null;

  const accessType = deriveAccessType(user, resourceName, isDecoy);

  const newAccessEvent: AccessEvent = {
    id: nanoid(),
    userId: user.id,
    resource: resourceName,
    timestamp: new Date().toISOString(),
    accessType,
    riskFlag: isDecoy || isRoleSuspiciousAccess(user, resourceName),
  };

  const { newRiskScore, newDecoyHitCount, riskTrend } = computeUpdatedRisk(
    user,
    isDecoy,
    decoyAsset,
    resourceName
  );

  const updatedUser: User = {
    ...user,
    riskScore: newRiskScore,
    decoyHitCount: newDecoyHitCount,
    riskTrend,
    status:
      user.status === "frozen"
        ? "frozen"
        : newRiskScore >= RISK_THRESHOLD
        ? "flagged"
        : user.status,
  };

  const updatedUsers = store.users.map((u) =>
    u.id === userId ? updatedUser : u
  );

  let updatedDecoyAssets = store.decoyAssets;
  if (isDecoy && decoyAsset) {
    updatedDecoyAssets = store.decoyAssets.map((d) =>
      d.id === decoyAsset.id ? { ...d, accessCount: d.accessCount + 1 } : d
    );
  }

  let newAlert: Alert | undefined;
  const wasAlreadyFlagged = user.riskScore >= RISK_THRESHOLD;
  const nowFlagged = newRiskScore >= RISK_THRESHOLD;
  const shouldAlert = isDecoy || (!wasAlreadyFlagged && nowFlagged);

  if (shouldAlert) {
    newAlert = buildAlert(updatedUser, decoyAsset, resourceName);
  }

  return {
    updatedUsers,
    newAccessEvent,
    newAlert,
    updatedDecoyAssets,
  };
}