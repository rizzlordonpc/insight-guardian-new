import { prisma } from '../db/prisma';

export async function getDashboardStats() {
  type StatsRow = {
    active_users: bigint;
    high_risk_users: bigint;
    open_alerts: bigint;
    decoy_hits: bigint;
    total_users: bigint;
  };

  const rows = await prisma.$queryRaw<StatsRow[]>`
    SELECT
      (SELECT COUNT(*)::bigint FROM "User" WHERE status = 'active') AS active_users,
      (SELECT COUNT(*)::bigint FROM "User" WHERE "riskScore" >= 60) AS high_risk_users,
      (SELECT COUNT(*)::bigint FROM "Alert" WHERE status IN ('open','investigating')) AS open_alerts,
      (SELECT COUNT(*)::bigint FROM "ActivityLog" WHERE "isDecoy" = true) AS decoy_hits,
      (SELECT COUNT(*)::bigint FROM "User") AS total_users
  `;

  const r = rows[0]!;
  return {
    activeUsers: Number(r.active_users),
    highRiskUsers: Number(r.high_risk_users),
    openAlerts: Number(r.open_alerts),
    decoyHits: Number(r.decoy_hits),
    totalUsers: Number(r.total_users),
  };
}

type DayBucket = {
  date: string;
  low: number;
  medium: number;
  high: number;
  critical: number;
};

/**
 * 14-day alert counts by UTC calendar day and severity (SQL GROUP BY day + severity).
 */
export async function getAlertTimeseries(): Promise<DayBucket[]> {
  const now = new Date();
  type GroupRow = { day: Date; severity: string; cnt: bigint };
  const rows = await prisma.$queryRaw<GroupRow[]>`
    SELECT
      DATE("timestamp" AT TIME ZONE 'UTC') AS day,
      severity::text AS severity,
      COUNT(*)::bigint AS cnt
    FROM "Alert"
    WHERE "timestamp" >= (NOW() AT TIME ZONE 'UTC' - INTERVAL '14 days')
    GROUP BY 1, 2
    ORDER BY 1 ASC, 2 ASC
  `;

  const keys: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }

  const map = new Map<string, DayBucket>();
  for (const k of keys) {
    map.set(k, { date: k, low: 0, medium: 0, high: 0, critical: 0 });
  }

  for (const r of rows) {
    const dayKey =
      r.day instanceof Date
        ? r.day.toISOString().slice(0, 10)
        : String(r.day).slice(0, 10);
    const bucket = map.get(dayKey);
    if (!bucket) continue;
    const n = Number(r.cnt);
    switch (r.severity) {
      case 'low':
        bucket.low += n;
        break;
      case 'medium':
        bucket.medium += n;
        break;
      case 'high':
        bucket.high += n;
        break;
      case 'critical':
        bucket.critical += n;
        break;
      default:
        break;
    }
  }

  return keys.map((k) => map.get(k)!);
}

type HourBucket = { hour: number; count: number; anomalies: number };

/**
 * ActivityLog aggregated by hour-of-day (UTC). Single raw query for SQL-level grouping.
 */
export async function getHourlyActivity(): Promise<HourBucket[]> {
  type HourRow = { hour: number; total: bigint; anomalies: bigint };
  const rows = await prisma.$queryRaw<HourRow[]>`
    SELECT
      EXTRACT(HOUR FROM ("timestamp" AT TIME ZONE 'UTC'))::int AS hour,
      COUNT(*)::bigint AS total,
      COALESCE(SUM(CASE WHEN "riskContribution" > 50 THEN 1 ELSE 0 END), 0)::bigint AS anomalies
    FROM "ActivityLog"
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  const byHour = new Map<number, HourBucket>();
  for (let h = 0; h < 24; h++) {
    byHour.set(h, { hour: h, count: 0, anomalies: 0 });
  }
  for (const r of rows) {
    const h = Number(r.hour);
    if (h >= 0 && h < 24) {
      byHour.set(h, {
        hour: h,
        count: Number(r.total),
        anomalies: Number(r.anomalies),
      });
    }
  }
  return Array.from({ length: 24 }, (_, h) => byHour.get(h)!);
}
