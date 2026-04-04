import {
  Prisma,
  AccessEventKind,
  AccessEventSource,
  AdminActionSource,
  AdminActionType,
  ContainmentDuration,
  Department,
  MonitoredUserStatus,
  OrgRole,
  RiskTrend,
} from '@prisma/client';
import { prisma } from '../db/prisma';
import { HttpError } from '../lib/httpError';
import { emitter } from '../sockets';

export type UserListSortBy = 'riskScore' | 'name' | 'lastActivity';
export type SortOrder = 'asc' | 'desc';

export function buildUserResponse(
  u: Prisma.UserGetPayload<{ include: { containment: true } }>,
) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department,
    avatar: u.avatar,
    workingHours: { start: u.workingHoursStart, end: u.workingHoursEnd },
    riskScore: u.riskScore,
    riskTrend: u.riskTrend,
    lastActivity: u.lastActivity,
    status: u.status,
    behaviorProfile: {
      avgLoginHour: u.behaviorAvgLoginHour,
      avgSessionMinutes: u.behaviorAvgSessionMinutes,
      avgDailyAccesses: u.behaviorAvgDailyAccesses,
      commonFileTypes: u.behaviorCommonFileTypes,
      stabilityScore: u.behaviorStabilityScore,
    },
    containment: u.containment,
  };
}

export async function listUsers(params: {
  status?: MonitoredUserStatus;
  department?: Department;
  sortBy: UserListSortBy;
  order: SortOrder;
}) {
  const where: Prisma.UserWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.department) where.department = params.department;

  const dir = params.order === 'asc' ? 'asc' : 'desc';
  const orderBy: Prisma.UserOrderByWithRelationInput =
    params.sortBy === 'name'
      ? { name: dir }
      : params.sortBy === 'lastActivity'
        ? { lastActivity: dir }
        : { riskScore: dir };

  const rows = await prisma.user.findMany({
    where,
    include: { containment: true },
    orderBy,
  });

  return rows.map(buildUserResponse);
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { containment: true },
  });
  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  const [recentAccessEvents, openAlertsCount] = await Promise.all([
    prisma.accessEvent.findMany({
      where: { userId: id },
      orderBy: { timestamp: 'desc' },
      take: 10,
    }),
    prisma.alert.count({
      where: {
        userId: id,
        status: { in: ['open', 'investigating'] },
      },
    }),
  ]);

  return {
    ...buildUserResponse(user),
    recentAccessEvents,
    openAlertsCount,
  };
}

const SIMULATOR_IP = '0.0.0.0';
const ALL_RESOURCES = 'ALL_SYSTEM_RESOURCES';

export async function createUser(data: {
  name: string;
  email: string;
  role: OrgRole;
  department: Department;
  workingHoursStart: number;
  workingHoursEnd: number;
}) {
  const email = data.email.trim().toLowerCase();
  const riskScore = Math.floor(Math.random() * 11) + 10;
  const seed = encodeURIComponent(data.name.trim());
  const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`;

  try {
    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email,
        role: data.role,
        department: data.department,
        avatar,
        workingHoursStart: data.workingHoursStart,
        workingHoursEnd: data.workingHoursEnd,
        riskScore,
        riskTrend: RiskTrend.stable,
        status: MonitoredUserStatus.active,
        behaviorAvgLoginHour: 9,
        behaviorAvgSessionMinutes: 240,
        behaviorAvgDailyAccesses: 30,
        behaviorCommonFileTypes: ['.pdf', '.docx'],
        behaviorStabilityScore: 0.75,
      },
      include: { containment: true },
    });
    return buildUserResponse(user);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new HttpError(409, 'Email already in use');
    }
    throw e;
  }
}

export async function restrictUser(
  userId: string,
  body: { operatorName: string; rationale?: string },
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { status: MonitoredUserStatus.frozen },
    });

    await tx.containmentState.upsert({
      where: { userId },
      create: {
        userId,
        fileAccess: false,
        dbAccess: false,
        apiAccess: false,
        duration: ContainmentDuration.manual,
      },
      update: {
        fileAccess: false,
        dbAccess: false,
        apiAccess: false,
        duration: ContainmentDuration.manual,
        appliedAt: new Date(),
      },
    });

    await tx.adminActionLog.create({
      data: {
        actionType: AdminActionType.USER_RESTRICTED,
        targetUserId: userId,
        targetUserName: user.name,
        triggeredBy: AdminActionSource.ADMIN,
        operatorName: body.operatorName.trim(),
        rationale: body.rationale?.trim() || null,
      },
    });

    await tx.accessEvent.create({
      data: {
        userId,
        employeeName: user.name,
        resource: ALL_RESOURCES,
        accessType: AccessEventKind.denied,
        riskFlag: true,
        actionType: 'USER_RESTRICTED',
        ip: SIMULATOR_IP,
        triggeredBy: AccessEventSource.ADMIN,
      },
    });
  });

  const updated = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { containment: true },
  });
  const payload = buildUserResponse(updated);
  emitter.userRestricted({ id: payload.id, name: payload.name, status: payload.status });
  return payload;
}

export async function restoreUser(userId: string, body: { operatorName: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { status: MonitoredUserStatus.active },
    });

    await tx.containmentState.deleteMany({ where: { userId } });

    await tx.adminActionLog.create({
      data: {
        actionType: AdminActionType.USER_RESTORED,
        targetUserId: userId,
        targetUserName: user.name,
        triggeredBy: AdminActionSource.ADMIN,
        operatorName: body.operatorName.trim(),
      },
    });

    await tx.accessEvent.create({
      data: {
        userId,
        employeeName: user.name,
        resource: ALL_RESOURCES,
        accessType: AccessEventKind.normal,
        riskFlag: false,
        actionType: 'USER_RESTORED',
        ip: SIMULATOR_IP,
        triggeredBy: AccessEventSource.ADMIN,
      },
    });
  });

  const updated = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { containment: true },
  });
  const payload = buildUserResponse(updated);
  emitter.userRestored({ id: payload.id, name: payload.name, status: payload.status });
  return payload;
}
