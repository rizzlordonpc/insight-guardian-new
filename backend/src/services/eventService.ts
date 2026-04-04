import {
  AccessEventKind,
  AccessEventSource,
  ActivityActionType,
  AlertStatus,
  DecoyLifecycleStatus,
  MonitoredUserStatus,
  OrgRole,
  Prisma,
  RiskTrend,
  Severity,
} from '@prisma/client';
import {
  deriveAlertReasons,
  processAccessEvent,
  type EngineDecoy,
  type EngineUser,
} from '../engine/eventEngine';
import { prisma } from '../db/prisma';
import { HttpError } from '../lib/httpError';
import { buildUserResponse } from './userService';
import { emitter } from '../sockets';

const SIMULATOR_IP = '127.0.0.1';

function prismaUserToEngine(u: {
  id: string;
  riskScore: number;
  riskTrend: RiskTrend;
  status: MonitoredUserStatus;
  role: OrgRole;
  department: string | { toString(): string };
}): EngineUser {
  return {
    id: u.id,
    riskScore: u.riskScore,
    riskTrend: u.riskTrend as EngineUser['riskTrend'],
    status: u.status as EngineUser['status'],
    role: u.role as EngineUser['role'],
    department: String(u.department),
  };
}

function prismaDecoyToEngine(d: {
  id: string;
  name: string;
  type: string;
  sensitivityTag: Severity;
  accessCount: number;
  status: DecoyLifecycleStatus;
}): EngineDecoy {
  return {
    id: d.id,
    name: d.name,
    type: d.type.toLowerCase() as EngineDecoy['type'],
    sensitivityTag: d.sensitivityTag as EngineDecoy['sensitivityTag'],
    accessCount: d.accessCount,
    status: d.status === DecoyLifecycleStatus.active ? 'active' : 'inactive',
  };
}

function engineStatusToPrisma(s: EngineUser['status']): MonitoredUserStatus {
  return s as MonitoredUserStatus;
}

function engineSeverityToPrisma(s: NonNullable<
  ReturnType<typeof processAccessEvent>['alertSeverity']
>): Severity {
  return s as Severity;
}

export async function listAccessEvents(params: {
  userId?: string;
  accessType?: AccessEventKind;
  riskFlag?: boolean;
  limit: number;
}) {
  const where: Prisma.AccessEventWhereInput = {};
  if (params.userId) where.userId = params.userId;
  if (params.accessType) where.accessType = params.accessType;
  if (params.riskFlag !== undefined) where.riskFlag = params.riskFlag;

  return prisma.accessEvent.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: params.limit,
  });
}

export async function simulateAccessEvent(userId: string, resourceName: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  const [decoyHitCount, decoys] = await Promise.all([
    prisma.activityLog.count({
      where: { userId, isDecoy: true },
    }),
    prisma.decoyAsset.findMany({
      where: { status: DecoyLifecycleStatus.active },
    }),
  ]);

  const engineUser = prismaUserToEngine(user);
  const engineDecoys = decoys.map(prismaDecoyToEngine);
  const engineResult = processAccessEvent(
    engineUser,
    resourceName,
    engineDecoys,
    decoyHitCount,
  );

  const matchedPrismaDecoy = engineResult.matchedDecoy
    ? decoys.find((d) => d.id === engineResult.matchedDecoy!.id) ?? null
    : null;

  const isDecoyAccess = matchedPrismaDecoy !== null;
  const activityActionType = isDecoyAccess
    ? ActivityActionType.decoy_access
    : ActivityActionType.file_read;

  const sensitivityLevel: Severity = matchedPrismaDecoy
    ? matchedPrismaDecoy.sensitivityTag
    : engineResult.riskFlag
      ? Severity.high
      : Severity.low;

  const riskDelta = Math.max(
    0,
    engineResult.updatedRiskScore - user.riskScore,
  );
  const riskContribution = Math.min(100, Math.max(1, riskDelta || 1));

  const accessTypePrisma = engineResult.accessType as AccessEventKind;

  const result = await prisma.$transaction(async (tx) => {
    const accessEvent = await tx.accessEvent.create({
      data: {
        userId,
        employeeName: user.name,
        resource: resourceName,
        accessType: accessTypePrisma,
        riskFlag: engineResult.riskFlag,
        actionType: activityActionType,
        ip: SIMULATOR_IP,
        triggeredBy: AccessEventSource.SYSTEM,
      },
    });

    await tx.activityLog.create({
      data: {
        userId,
        userName: user.name,
        actionType: activityActionType,
        resource: resourceName,
        sensitivityLevel,
        ip: SIMULATOR_IP,
        isDecoy: isDecoyAccess,
        riskContribution,
      },
    });

    const updatedUserRow = await tx.user.update({
      where: { id: userId },
      data: {
        riskScore: engineResult.updatedRiskScore,
        riskTrend: engineResult.updatedRiskTrend as RiskTrend,
        status: engineStatusToPrisma(engineResult.updatedStatus),
        lastActivity: new Date(),
      },
      include: { containment: true },
    });

    if (matchedPrismaDecoy) {
      await tx.decoyAsset.update({
        where: { id: matchedPrismaDecoy.id },
        data: {
          accessCount: { increment: 1 },
          lastAccessed: new Date(),
        },
      });
    }

    let alert = null;
    if (
      engineResult.shouldCreateAlert &&
      engineResult.alertSeverity &&
      engineResult.alertTitle &&
      engineResult.alertDescription
    ) {
      const reasons = deriveAlertReasons(
        engineResult.updatedRiskScore,
        isDecoyAccess,
      );
      alert = await tx.alert.create({
        data: {
          userId,
          userName: user.name,
          severity: engineSeverityToPrisma(engineResult.alertSeverity),
          riskScore: engineResult.updatedRiskScore,
          title: engineResult.alertTitle,
          description: engineResult.alertDescription,
          reasons: JSON.parse(JSON.stringify(reasons)) as Prisma.InputJsonValue,
          status: AlertStatus.open,
        },
      });
    }

    return { accessEvent, updatedUser: updatedUserRow, alert };
  });

  emitter.newAccessEvent(result.accessEvent);
  const ur = buildUserResponse(result.updatedUser);
  emitter.userRiskUpdated({
    id: ur.id,
    name: ur.name,
    riskScore: ur.riskScore,
    riskTrend: ur.riskTrend,
    status: ur.status,
  });
  if (result.alert) {
    emitter.newAlert(result.alert);
  }
  if (matchedPrismaDecoy) {
    emitter.decoyHit({
      decoyId: matchedPrismaDecoy.id,
      decoyName: matchedPrismaDecoy.name,
      userId,
      userName: user.name,
      riskDelta: engineResult.updatedRiskScore - user.riskScore,
    });
  }

  return {
    accessEvent: result.accessEvent,
    updatedUser: buildUserResponse(result.updatedUser),
    alert: result.alert,
  };
}
