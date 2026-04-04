// ─── Types ───────────────────────────────────────────────────────────────────

export type Role = 'Admin' | 'Manager' | 'Employee' | 'Intern';
export type Department = 'Engineering' | 'Finance' | 'HR' | 'Marketing' | 'Legal' | 'Operations';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type ActionType = 'file_read' | 'file_write' | 'file_download' | 'db_query' | 'api_call' | 'login' | 'logout' | 'decoy_access';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: Department;
  avatar: string;
  workingHours: { start: number; end: number };
  riskScore: number;
  riskTrend: 'increasing' | 'decreasing' | 'stable';
  lastActivity: string;
  status: 'active' | 'inactive' | 'flagged' | 'frozen';
  behaviorProfile: BehaviorProfile;
}

export interface BehaviorProfile {
  avgLoginHour: number;
  avgSessionMinutes: number;
  avgDailyAccesses: number;
  commonFileTypes: string[];
  stabilityScore: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  actionType: ActionType;
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
  actions: ActivityLog[];
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
}

export interface RiskBreakdown {
  timeAnomaly: number;
  sensitivityScore: number;
  roleDeviation: number;
  behaviorDeviation: number;
  decoyWeight: number;
}

export interface DecoyAsset {
  id: string;
  name: string;
  type: 'file' | 'database' | 'api';
  format: string;
  sensitivityTag: Severity;
  createdAt: string;
  accessCount: number;
  lastAccessed: string | null;
  beacon: string;
  status: 'active' | 'inactive';
}

// ─── Generators ──────────────────────────────────────────────────────────────

const firstNames = ['Alex', 'Jordan', 'Morgan', 'Casey', 'Riley', 'Taylor', 'Quinn', 'Avery', 'Dakota', 'Reese', 'Skyler', 'Cameron', 'Drew', 'Hayden', 'Jamie', 'Kendall', 'Logan', 'Parker', 'Sage', 'Blake'];
const lastNames = ['Chen', 'Patel', 'Kim', 'Santos', 'Williams', 'Johnson', 'Garcia', 'Mueller', 'Nakamura', 'Anderson', 'Thompson', 'Lee', 'Martinez', 'Robinson', 'Clark', 'Lewis', 'Walker', 'Hall', 'Young', 'King'];
const ips = ['192.168.1.', '10.0.0.', '172.16.0.', '203.0.113.', '198.51.100.'];

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[rand(0, arr.length - 1)]; }
function uuid() { return crypto.randomUUID(); }

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600000).toISOString();
}

const roles: Role[] = ['Admin', 'Manager', 'Employee', 'Intern'];
const departments: Department[] = ['Engineering', 'Finance', 'HR', 'Marketing', 'Legal', 'Operations'];

export function generateUsers(count = 20): User[] {
  return Array.from({ length: count }, (_, i) => {
    const first = pick(firstNames);
    const last = pick(lastNames);
    const role = i === 0 ? 'Admin' : pick(roles);
    const riskScore = role === 'Intern' ? rand(20, 85) : rand(5, 70);
    return {
      id: uuid(),
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@corp.internal`,
      role,
      department: pick(departments),
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${first}+${last}&backgroundColor=0d1117&textColor=22d3ee`,
      workingHours: { start: rand(7, 10), end: rand(16, 19) },
      riskScore,
      riskTrend: riskScore > 60 ? 'increasing' : riskScore > 30 ? 'stable' : 'decreasing',
      lastActivity: hoursAgo(rand(0, 48)),
      status: riskScore > 75 ? 'flagged' : riskScore > 85 ? 'frozen' : 'active',
      behaviorProfile: {
        avgLoginHour: rand(7, 10),
        avgSessionMinutes: rand(120, 540),
        avgDailyAccesses: rand(10, 80),
        commonFileTypes: ['.pdf', '.xlsx', '.docx', '.csv'].slice(0, rand(2, 4)),
        stabilityScore: rand(40, 98) / 100,
      },
    };
  });
}

const resources = [
  'Q4-Financial-Report.xlsx', 'Employee-Salaries-2025.csv', 'client-contracts/acme.pdf',
  'source-code/auth-module.ts', 'db/users_table', 'api/v2/payments', 'hr/performance-reviews.docx',
  'legal/merger-docs.pdf', 'marketing/campaign-roi.xlsx', 'ops/server-credentials.txt',
  'DECOY_salary-master-2025.xlsx', 'DECOY_api/admin/export-all', 'DECOY_db/credit_cards',
  'DECOY_merger-acquisition-plan.pdf', 'DECOY_ssh-keys-backup.tar.gz',
];

const actionTypes: ActionType[] = ['file_read', 'file_write', 'file_download', 'db_query', 'api_call', 'login', 'logout'];

export function generateActivityLogs(users: User[], count = 200): ActivityLog[] {
  return Array.from({ length: count }, () => {
    const user = pick(users);
    const resource = pick(resources);
    const isDecoy = resource.startsWith('DECOY_');
    const actionType = isDecoy ? 'decoy_access' : pick(actionTypes);
    return {
      id: uuid(),
      timestamp: hoursAgo(rand(0, 168)),
      userId: user.id,
      userName: user.name,
      actionType,
      resource,
      sensitivityLevel: isDecoy ? 'critical' : pick(['low', 'medium', 'high'] as Severity[]),
      ip: pick(ips) + rand(1, 254),
      isDecoy,
      riskContribution: isDecoy ? rand(60, 100) : rand(1, 40),
    };
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function computeRiskBreakdown(score: number, hasDecoy: boolean): RiskBreakdown {
  const decoyWeight = hasDecoy ? rand(40, 60) : 0;
  const remaining = score - decoyWeight;
  return {
    timeAnomaly: Math.max(0, rand(5, Math.max(6, remaining * 0.3))),
    sensitivityScore: Math.max(0, rand(5, Math.max(6, remaining * 0.3))),
    roleDeviation: Math.max(0, rand(3, Math.max(4, remaining * 0.2))),
    behaviorDeviation: Math.max(0, rand(3, Math.max(4, remaining * 0.2))),
    decoyWeight,
  };
}

export function generateAlerts(users: User[], logs: ActivityLog[], count = 15): Alert[] {
  const flagged = users.filter(u => u.riskScore > 35).slice(0, count);
  return flagged.map(user => {
    const userLogs = logs.filter(l => l.userId === user.id).slice(0, rand(2, 6));
    const hasDecoy = userLogs.some(l => l.isDecoy);
    const severity: Severity = user.riskScore > 75 ? 'critical' : user.riskScore > 55 ? 'high' : user.riskScore > 35 ? 'medium' : 'low';
    const reasons = computeRiskBreakdown(user.riskScore, hasDecoy);
    const titles: Record<Severity, string[]> = {
      critical: ['Decoy Data Exfiltration Attempt', 'Massive Unauthorized Access Detected'],
      high: ['Abnormal Data Access Pattern', 'Off-Hours Sensitive File Download'],
      medium: ['Unusual Access Frequency Spike', 'Role-Resource Mismatch Detected'],
      low: ['Minor Behavioral Deviation', 'Slightly Elevated Access Rate'],
    };
    return {
      id: uuid(),
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
      actions: userLogs,
      status: pick(['open', 'investigating', 'resolved', 'dismissed'] as const),
    };
  }).sort((a, b) => b.riskScore - a.riskScore);
}

const decoyNames = [
  'salary-master-2025.xlsx', 'admin-export-all-endpoint', 'credit_cards_table',
  'merger-acquisition-plan.pdf', 'ssh-keys-backup.tar.gz', 'board-meeting-minutes.docx',
  'aws-credentials.env', 'customer-pii-export.csv', 'internal-audit-findings.pdf',
  'vpn-config-backup.ovpn', 'executive-compensation.xlsx', 'source-code-signing-key.pem',
];

export function generateDecoys(count = 12): DecoyAsset[] {
  return decoyNames.slice(0, count).map(name => {
    const ext = name.split('.').pop() || '';
    const type: DecoyAsset['type'] = ['env', 'pem'].includes(ext) ? 'api' :
      name.includes('table') || name.includes('endpoint') ? 'database' : 'file';
    const accessCount = rand(0, 8);
    return {
      id: uuid(),
      name,
      type,
      format: ext || 'endpoint',
      sensitivityTag: pick(['medium', 'high', 'critical'] as Severity[]),
      createdAt: hoursAgo(rand(168, 2000)),
      accessCount,
      lastAccessed: accessCount > 0 ? hoursAgo(rand(1, 168)) : null,
      beacon: `BKN-${uuid().slice(0, 8).toUpperCase()}`,
      status: 'active',
    };
  });
}

// ─── Time-series data for charts ─────────────────────────────────────────────

export function generateTimeSeriesRisk(days = 14): { date: string; low: number; medium: number; high: number; critical: number }[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      low: rand(5, 25),
      medium: rand(3, 15),
      high: rand(0, 8),
      critical: rand(0, 3),
    };
  });
}

export function generateHourlyActivity(): { hour: string; count: number; anomalies: number }[] {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    count: i >= 8 && i <= 18 ? rand(30, 120) : rand(2, 20),
    anomalies: i >= 22 || i <= 5 ? rand(1, 8) : rand(0, 2),
  }));
}

// ─── Singleton data store ────────────────────────────────────────────────────

let _users: User[] | null = null;
let _logs: ActivityLog[] | null = null;
let _alerts: Alert[] | null = null;
let _decoys: DecoyAsset[] | null = null;

export function getData() {
  if (!_users) _users = generateUsers(20);
  if (!_logs) _logs = generateActivityLogs(_users, 300);
  if (!_alerts) _alerts = generateAlerts(_users, _logs, 15);
  if (!_decoys) _decoys = generateDecoys(12);
  return { users: _users, logs: _logs, alerts: _alerts, decoys: _decoys };
}
