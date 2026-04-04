import { describe, expect, it } from 'vitest';
import {
  RISK_THRESHOLD,
  SENSITIVITY_RISK_MAP,
  EXPONENTIAL_BASE,
  MAX_RISK,
  resolveDecoy,
  computeRiskDelta,
  processAccessEvent,
  deriveAlertReasons,
  type EngineDecoy,
  type EngineUser,
} from './eventEngine';

function decoy(overrides: Partial<EngineDecoy> = {}): EngineDecoy {
  return {
    id: 'd1',
    name: 'secret-file.pdf',
    type: 'file',
    sensitivityTag: 'critical',
    accessCount: 0,
    status: 'active',
    ...overrides,
  };
}

function user(overrides: Partial<EngineUser> = {}): EngineUser {
  return {
    id: 'u1',
    riskScore: 20,
    riskTrend: 'stable',
    status: 'active',
    role: 'Employee',
    department: 'Engineering',
    ...overrides,
  };
}

describe('resolveDecoy', () => {
  it('matches name case-insensitively', () => {
    const d = decoy({ name: 'MyDecoy.xlsx' });
    expect(resolveDecoy('mydecoy.xlsx', [d])).toEqual(d);
    expect(resolveDecoy('MYDECOY.XLSX', [d])).toEqual(d);
  });

  it('returns null when no decoy matches', () => {
    expect(resolveDecoy('unknown', [decoy({ name: 'other' })])).toBeNull();
  });

  it('ignores inactive decoys', () => {
    const d = decoy({ name: 'trap', status: 'inactive' });
    expect(resolveDecoy('trap', [d])).toBeNull();
  });

  it('trims resource name for comparison', () => {
    const d = decoy({ name: 'beacon' });
    expect(resolveDecoy('  beacon  ', [d])).toEqual(d);
  });
});

describe('computeRiskDelta', () => {
  it('returns 0 for frozen users', () => {
    const u = user({ status: 'frozen', decoyHitCount: 5 });
    const d = decoy({ sensitivityTag: 'critical' });
    expect(computeRiskDelta(u, d, 'anything')).toBe(0);
    expect(computeRiskDelta(u, null, '/admin/root')).toBe(0);
  });

  it('applies sensitivity map × exponential base ^ decoyHitCount for decoy path', () => {
    const d = decoy({ sensitivityTag: 'critical' });
    const base = SENSITIVITY_RISK_MAP.critical;
    expect(computeRiskDelta(user({ decoyHitCount: 0 }), d, 'x')).toBe(
      Math.round(base * Math.pow(EXPONENTIAL_BASE, 0)),
    );
    expect(computeRiskDelta(user({ decoyHitCount: 2 }), d, 'x')).toBe(
      Math.round(base * Math.pow(EXPONENTIAL_BASE, 2)),
    );
  });

  it('decoy path overrides role heuristic (no double count)', () => {
    const d = decoy({ sensitivityTag: 'low' });
    const intern = user({ role: 'Intern', decoyHitCount: 0 });
    const deltaDecoy = computeRiskDelta(intern, d, '/admin/payroll');
    expect(deltaDecoy).toBe(Math.round(10 * Math.pow(EXPONENTIAL_BASE, 0)));
    expect(deltaDecoy).not.toBe(10 + 8);
  });

  it('adds +8 for Intern when resource matches suspicious pattern and no decoy', () => {
    const u = user({ role: 'Intern', status: 'active' });
    expect(computeRiskDelta(u, null, 'path/to/database')).toBe(8);
    expect(computeRiskDelta(u, null, 'CONFIDENTIAL memo')).toBe(8);
  });

  it('adds +8 for Employee on admin/root/secrets patterns', () => {
    const u = user({ role: 'Employee' });
    expect(computeRiskDelta(u, null, '/admin/panel')).toBe(8);
    expect(computeRiskDelta(u, null, '/secrets/vault')).toBe(8);
  });

  it('adds +8 for Manager on root/secrets only', () => {
    const u = user({ role: 'Manager' });
    expect(computeRiskDelta(u, null, '/root/ssh')).toBe(8);
    expect(computeRiskDelta(u, null, 'company-secrets.doc')).toBe(8);
    expect(computeRiskDelta(u, null, '/admin/panel')).toBe(0);
  });

  it('never adds role heuristic for Admin', () => {
    const u = user({ role: 'Admin' });
    expect(computeRiskDelta(u, null, '/admin/root/secrets')).toBe(0);
  });

  it('returns 0 when no decoy and no pattern match', () => {
    expect(computeRiskDelta(user({ role: 'Employee' }), null, 'reports/q1.pdf')).toBe(0);
  });
});

describe('processAccessEvent', () => {
  it('sets accessType denied for frozen user', () => {
    const u = user({ status: 'frozen', riskScore: 80 });
    const d = decoy({ name: 'honeypot' });
    const r = processAccessEvent(u, 'honeypot', [d], 0);
    expect(r.accessType).toBe('denied');
    expect(r.updatedRiskScore).toBe(80);
    expect(r.updatedStatus).toBe('frozen');
  });

  it('crossing risk threshold triggers alert and flagged status', () => {
    const u = user({ riskScore: 70, role: 'Employee' });
    const r = processAccessEvent(u, '/admin/dashboard', [], 0);
    expect(r.updatedRiskScore).toBe(78);
    expect(r.updatedStatus).toBe('flagged');
    expect(r.shouldCreateAlert).toBe(true);
    expect(r.alertSeverity).toBe('high');
  });

  it('does not fire threshold alert when already at or above 75', () => {
    const u = user({ riskScore: 76, role: 'Employee' });
    const r = processAccessEvent(u, 'safe-report.pdf', [], 0);
    expect(r.updatedRiskScore).toBe(76);
    expect(r.shouldCreateAlert).toBe(false);
  });

  it('always suggests alert on decoy access', () => {
    const u = user({ riskScore: 10, role: 'Manager' });
    const d = decoy({ name: 'trap.csv', sensitivityTag: 'medium' });
    const r = processAccessEvent(u, 'trap.csv', [d], 0);
    expect(r.shouldCreateAlert).toBe(true);
    expect(r.matchedDecoy).toEqual(d);
    expect(r.accessType).toBe('decoy');
    expect(r.alertTitle).toContain('Decoy Asset Accessed');
  });

  it('uses decoyHitCount for exponential repeat-offender scaling', () => {
    const u = user({ riskScore: 0, role: 'Intern' });
    const d = decoy({ name: 'x', sensitivityTag: 'critical' });
    const r0 = processAccessEvent(u, 'x', [d], 0);
    const r3 = processAccessEvent(u, 'x', [d], 3);
    expect(r3.updatedRiskScore).toBeGreaterThan(r0.updatedRiskScore);
  });

  it('assigns critical alert severity when score reaches 90+', () => {
    const u = user({ riskScore: 40, role: 'Employee' });
    const d = decoy({ name: 'critical-decoy', sensitivityTag: 'critical' });
    const r = processAccessEvent(u, 'critical-decoy', [d], 0);
    expect(r.updatedRiskScore).toBe(90);
    expect(r.shouldCreateAlert).toBe(true);
    expect(r.alertSeverity).toBe('critical');
  });

  it('demotes to active when score drops below threshold', () => {
    const u = user({ riskScore: 30, status: 'flagged', role: 'Employee' });
    const r = processAccessEvent(u, 'boring.pdf', [], 0);
    expect(r.updatedRiskScore).toBe(30);
    expect(r.updatedStatus).toBe('active');
  });

  it('clamps risk score to MAX_RISK', () => {
    const u = user({ riskScore: 95, role: 'Intern', decoyHitCount: 5 });
    const d = decoy({ name: 'bomb', sensitivityTag: 'critical' });
    const r = processAccessEvent(u, 'bomb', [d], 5);
    expect(r.updatedRiskScore).toBe(MAX_RISK);
  });

  it('sets riskFlag on decoy or suspicious resource', () => {
    expect(processAccessEvent(user(), 'decoy', [decoy({ name: 'decoy' })], 0).riskFlag).toBe(
      true,
    );
    expect(processAccessEvent(user({ role: 'Intern' }), 'payroll', [], 0).riskFlag).toBe(true);
    expect(processAccessEvent(user({ role: 'Employee' }), 'notes.txt', [], 0).riskFlag).toBe(
      false,
    );
  });
});

describe('deriveAlertReasons', () => {
  it('sets decoyWeight to 0 when hasDecoy is false', () => {
    const r = deriveAlertReasons(80, false);
    expect(r.decoyWeight).toBe(0);
    expect(r.timeAnomaly).toBeGreaterThanOrEqual(0);
  });

  it('uses midpoint 50 for decoy weight when hasDecoy is true', () => {
    const r = deriveAlertReasons(80, true);
    expect(r.decoyWeight).toBe(50);
    const remaining = 30;
    const upper30 = Math.max(6, remaining * 0.3);
    expect(r.timeAnomaly).toBe(Math.round((5 + upper30) / 2));
  });

  it('handles low riskScore with hasDecoy (remaining clamped)', () => {
    const r = deriveAlertReasons(20, true);
    expect(r.decoyWeight).toBe(50);
    expect(r.timeAnomaly).toBeGreaterThanOrEqual(0);
  });
});

describe('constants', () => {
  it('exports expected threshold and max', () => {
    expect(RISK_THRESHOLD).toBe(75);
    expect(MAX_RISK).toBe(100);
    expect(SENSITIVITY_RISK_MAP.low).toBe(10);
    expect(EXPONENTIAL_BASE).toBe(1.6);
  });
});
