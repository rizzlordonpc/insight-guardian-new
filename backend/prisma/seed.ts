import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import {
  PrismaClient,
  OrgRole,
  Department,
  RiskTrend,
  MonitoredUserStatus,
  DecoyAssetType,
  Severity,
  ActivityActionType,
  AlertStatus,
  AccessEventKind,
  AccessEventSource,
  AppRole,
  DecoyLifecycleStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const firstNames = [
  'Alex', 'Jordan', 'Morgan', 'Casey', 'Riley', 'Taylor', 'Quinn', 'Avery', 'Dakota', 'Reese',
  'Skyler', 'Cameron', 'Drew', 'Hayden', 'Jamie', 'Kendall', 'Logan', 'Parker', 'Sage', 'Blake',
];
const lastNames = [
  'Chen', 'Patel', 'Kim', 'Santos', 'Williams', 'Johnson', 'Garcia', 'Mueller', 'Nakamura',
  'Anderson', 'Thompson', 'Lee', 'Martinez', 'Robinson', 'Clark', 'Lewis', 'Walker', 'Hall', 'Young', 'King',
];
const ips = ['192.168.1.', '10.0.0.', '172.16.0.', '203.0.113.', '198.51.100.'];

const orgRoles: OrgRole[] = [OrgRole.Admin, OrgRole.Manager, OrgRole.Employee, OrgRole.Intern];
const departments: Department[] = [
  Department.Engineering,
  Department.Finance,
  Department.HR,
  Department.Marketing,
  Department.Legal,
  Department.Operations,
];

const normalResources = [
  'Q4-Financial-Report.xlsx',
  'Employee-Salaries-2025.csv',
  'client-contracts/acme.pdf',
  'source-code/auth-module.ts',
  'db/users_table',
  'api/v2/payments',
  'hr/performance-reviews.docx',
  'legal/merger-docs.pdf',
  'marketing/campaign-roi.xlsx',
  'ops/server-credentials.txt',
];

const nonDecoyActionTypes: ActivityActionType[] = [
  ActivityActionType.file_read,
  ActivityActionType.file_write,
  ActivityActionType.file_download,
  ActivityActionType.db_query,
  ActivityActionType.api_call,
  ActivityActionType.login,
  ActivityActionType.logout,
];

const decoyNames = [
  'salary-master-2025.xlsx',
  'admin-export-all-endpoint',
  'credit_cards_table',
  'merger-acquisition-plan.pdf',
  'ssh-keys-backup.tar.gz',
  'board-meeting-minutes.docx',
  'aws-credentials.env',
  'customer-pii-export.csv',
  'internal-audit-findings.pdf',
  'vpn-config-backup.ovpn',
  'executive-compensation.xlsx',
  'source-code-signing-key.pem',
];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)];
}

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 3600000);
}

function decoyTypeForName(name: string): DecoyAssetType {
  const ext = name.split('.').pop() || '';
  if (['env', 'pem'].includes(ext)) return DecoyAssetType.api;
  if (name.includes('table') || name.includes('endpoint')) return DecoyAssetType.database;
  return DecoyAssetType.file;
}

function computeRiskBreakdown(score: number, hasDecoy: boolean) {
  const decoyWeight = hasDecoy ? rand(40, 60) : 0;
  const remaining = Math.max(0, score - decoyWeight);
  return {
    timeAnomaly: Math.max(0, rand(5, Math.max(6, Math.floor(remaining * 0.3)))),
    sensitivityScore: Math.max(0, rand(5, Math.max(6, Math.floor(remaining * 0.3)))),
    roleDeviation: Math.max(0, rand(3, Math.max(4, Math.floor(remaining * 0.2)))),
    behaviorDeviation: Math.max(0, rand(3, Math.max(4, Math.floor(remaining * 0.2)))),
    decoyWeight,
  };
}

async function main() {
  await prisma.httpAuditLog.deleteMany();
  await prisma.accessEvent.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.adminActionLog.deleteMany();
  await prisma.containmentState.deleteMany();
  await prisma.decoyAsset.deleteMany();
  await prisma.user.deleteMany();
  await prisma.authAccount.deleteMany();

  const saltRounds = 12;
  const [adminHash, analystHash] = await Promise.all([
    bcrypt.hash('admin123', saltRounds),
    bcrypt.hash('analyst123', saltRounds),
  ]);

  await prisma.authAccount.createMany({
    data: [
      {
        id: randomUUID(),
        email: 'admin@insightguardian.io',
        passwordHash: adminHash,
        name: 'Pranay Mishra',
        appRole: AppRole.Administrator,
      },
      {
        id: randomUUID(),
        email: 'analyst@insightguardian.io',
        passwordHash: analystHash,
        name: 'Sarah Chen',
        appRole: AppRole.Analyst,
      },
    ],
  });

  const usersData = Array.from({ length: 20 }, (_, i) => {
    const first = pick(firstNames);
    const last = pick(lastNames);
    const role = i === 0 ? OrgRole.Admin : pick(orgRoles);
    const riskScore = role === OrgRole.Intern ? rand(20, 85) : rand(5, 70);
    const fileTypes = ['.pdf', '.xlsx', '.docx', '.csv'].slice(0, rand(2, 4));

    let status: MonitoredUserStatus = MonitoredUserStatus.active;
    if (riskScore > 85) status = MonitoredUserStatus.frozen;
    else if (riskScore > 75) status = MonitoredUserStatus.flagged;

    return {
      id: randomUUID(),
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@corp.internal`,
      role,
      department: pick(departments),
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${first}+${last}&backgroundColor=0d1117&textColor=22d3ee`,
      workingHoursStart: rand(7, 10),
      workingHoursEnd: rand(16, 19),
      riskScore,
      riskTrend:
        riskScore > 60 ? RiskTrend.increasing : riskScore > 30 ? RiskTrend.stable : RiskTrend.decreasing,
      lastActivity: hoursAgo(rand(0, 48)),
      status,
      behaviorAvgLoginHour: rand(7, 10),
      behaviorAvgSessionMinutes: rand(120, 540),
      behaviorAvgDailyAccesses: rand(10, 80),
      behaviorCommonFileTypes: fileTypes,
      behaviorStabilityScore: rand(40, 98) / 100,
    };
  });

  await prisma.user.createMany({ data: usersData });
  const users = await prisma.user.findMany({ orderBy: { email: 'asc' } });

  const decoysPayload = decoyNames.map((name) => {
    const ext = name.split('.').pop() || '';
    const accessCount = rand(0, 8);
    return {
      id: randomUUID(),
      name,
      type: decoyTypeForName(name),
      format: ext || 'endpoint',
      sensitivityTag: pick([Severity.medium, Severity.high, Severity.critical]),
      createdAt: hoursAgo(rand(168, 2000)),
      accessCount,
      lastAccessed: accessCount > 0 ? hoursAgo(rand(1, 168)) : null,
      beacon: `BKN-${randomUUID().slice(0, 8).toUpperCase()}`,
      status: DecoyLifecycleStatus.active,
    };
  });

  await prisma.decoyAsset.createMany({ data: decoysPayload });
  const decoys = await prisma.decoyAsset.findMany();

  const decoyCount = 45;
  const normalCount = 300 - decoyCount;

  type LogRow = {
    id: string;
    timestamp: Date;
    userId: string;
    userName: string;
    actionType: ActivityActionType;
    resource: string;
    sensitivityLevel: Severity;
    ip: string;
    isDecoy: boolean;
    riskContribution: number;
  };

  const logs: LogRow[] = [];

  for (let i = 0; i < normalCount; i++) {
    const user = pick(users);
    const resource = pick(normalResources);
    logs.push({
      id: randomUUID(),
      timestamp: hoursAgo(rand(0, 168)),
      userId: user.id,
      userName: user.name,
      actionType: pick(nonDecoyActionTypes),
      resource,
      sensitivityLevel: pick([Severity.low, Severity.medium, Severity.high]),
      ip: `${pick(ips)}${rand(1, 254)}`,
      isDecoy: false,
      riskContribution: rand(1, 40),
    });
  }

  for (let i = 0; i < decoyCount; i++) {
    const user = pick(users);
    const decoy = pick(decoys);
    logs.push({
      id: randomUUID(),
      timestamp: hoursAgo(rand(0, 168)),
      userId: user.id,
      userName: user.name,
      actionType: ActivityActionType.decoy_access,
      resource: decoy.name,
      sensitivityLevel: Severity.critical,
      ip: `${pick(ips)}${rand(1, 254)}`,
      isDecoy: true,
      riskContribution: rand(60, 100),
    });
  }

  logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  await prisma.activityLog.createMany({
    data: logs.map((l) => ({
      id: l.id,
      timestamp: l.timestamp,
      userId: l.userId,
      userName: l.userName,
      actionType: l.actionType,
      resource: l.resource,
      sensitivityLevel: l.sensitivityLevel,
      ip: l.ip,
      isDecoy: l.isDecoy,
      riskContribution: l.riskContribution,
    })),
  });

  const decoyStats = new Map<string, { count: number; last: Date }>();
  for (const l of logs) {
    if (!l.isDecoy) continue;
    const cur = decoyStats.get(l.resource) ?? { count: 0, last: l.timestamp };
    cur.count += 1;
    if (l.timestamp > cur.last) cur.last = l.timestamp;
    decoyStats.set(l.resource, cur);
  }

  for (const d of decoys) {
    const stat = decoyStats.get(d.name);
    if (!stat) continue;
    await prisma.decoyAsset.update({
      where: { id: d.id },
      data: {
        accessCount: d.accessCount + stat.count,
        lastAccessed: stat.last,
      },
    });
  }

  const titles: Record<Severity, string[]> = {
    [Severity.critical]: [
      'Decoy Data Exfiltration Attempt',
      'Massive Unauthorized Access Detected',
    ],
    [Severity.high]: ['Abnormal Data Access Pattern', 'Off-Hours Sensitive File Download'],
    [Severity.medium]: ['Unusual Access Frequency Spike', 'Role-Resource Mismatch Detected'],
    [Severity.low]: ['Minor Behavioral Deviation', 'Slightly Elevated Access Rate'],
  };

  const usersForAlerts = users.filter((u) => u.riskScore > 35);
  for (const user of usersForAlerts) {
    const userLogs = logs.filter((l) => l.userId === user.id);
    const hasDecoy = userLogs.some((l) => l.isDecoy);
    const severity: Severity =
      user.riskScore > 75
        ? Severity.critical
        : user.riskScore > 55
          ? Severity.high
          : user.riskScore > 35
            ? Severity.medium
            : Severity.low;
    const reasons = computeRiskBreakdown(user.riskScore, hasDecoy);

    await prisma.alert.create({
      data: {
        id: randomUUID(),
        timestamp: hoursAgo(rand(0, 72)),
        userId: user.id,
        userName: user.name,
        severity,
        riskScore: user.riskScore,
        title: pick(titles[severity]),
        description: hasDecoy
          ? `${user.name} accessed decoy asset(s), indicating potential malicious intent. Immediate review recommended.`
          : `${user.name} exhibited behavioral anomalies deviating from established baseline profile.`,
        reasons,
        status: pick([
          AlertStatus.open,
          AlertStatus.investigating,
          AlertStatus.resolved,
          AlertStatus.dismissed,
        ]),
      },
    });
  }

  await prisma.accessEvent.createMany({
    data: logs.map((l) => ({
      id: randomUUID(),
      userId: l.userId,
      employeeName: l.userName,
      resource: l.resource,
      timestamp: l.timestamp,
      accessType: l.isDecoy ? AccessEventKind.decoy : AccessEventKind.normal,
      riskFlag: l.isDecoy || l.riskContribution >= 50,
      actionType: l.actionType,
      ip: l.ip,
      triggeredBy: AccessEventSource.SYSTEM,
    })),
  });

  console.log(
    `Seeded: AuthAccount×2, User×${users.length}, Decoy×${decoys.length}, ActivityLog×${logs.length} (~${decoyCount} decoy hits), Alert×${usersForAlerts.length}, AccessEvent×${logs.length}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
