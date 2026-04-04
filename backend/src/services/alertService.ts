import { AlertStatus, Prisma, Severity } from '@prisma/client';
import { prisma } from '../db/prisma';
import { HttpError } from '../lib/httpError';
import { emitter } from '../sockets';

export async function listAlerts(filters: {
  severity?: Severity;
  status?: AlertStatus;
  userId?: string;
}) {
  const where: Prisma.AlertWhereInput = {};
  if (filters.severity) where.severity = filters.severity;
  if (filters.status) where.status = filters.status;
  if (filters.userId) where.userId = filters.userId;

  const rows = await prisma.alert.findMany({
    where,
    include: {
      user: { select: { avatar: true } },
    },
    orderBy: [{ riskScore: 'desc' }, { timestamp: 'desc' }],
  });

  return rows.map((a) => ({
    id: a.id,
    timestamp: a.timestamp,
    userId: a.userId,
    userName: a.userName,
    userAvatar: a.user.avatar,
    severity: a.severity,
    riskScore: a.riskScore,
    title: a.title,
    description: a.description,
    reasons: a.reasons,
    status: a.status,
  }));
}

export async function updateAlertStatus(alertId: string, status: AlertStatus) {
  const existing = await prisma.alert.findUnique({ where: { id: alertId } });
  if (!existing) {
    throw new HttpError(404, 'Alert not found');
  }

  const updated = await prisma.alert.update({
    where: { id: alertId },
    data: { status },
    include: {
      user: { select: { avatar: true } },
    },
  });

  emitter.alertUpdated({ id: updated.id, status: updated.status });

  return updated;
}
