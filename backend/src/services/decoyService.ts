import { randomUUID } from 'crypto';
import { DecoyAssetType, DecoyLifecycleStatus, Prisma, Severity } from '@prisma/client';
import { prisma } from '../db/prisma';
import { HttpError } from '../lib/httpError';
import { emitter } from '../sockets';

function deriveFormatFromName(name: string): string {
  const parts = name.trim().split('.');
  if (parts.length > 1) {
    const ext = parts[parts.length - 1];
    if (ext && ext.length <= 8) return ext.toLowerCase();
  }
  return 'endpoint';
}

export async function listDecoys(filters: {
  type?: DecoyAssetType;
  sensitivityTag?: Severity;
  status?: DecoyLifecycleStatus;
}) {
  const where: Prisma.DecoyAssetWhereInput = {};
  if (filters.type) where.type = filters.type;
  if (filters.sensitivityTag) where.sensitivityTag = filters.sensitivityTag;
  if (filters.status) where.status = filters.status;

  return prisma.decoyAsset.findMany({
    where,
    orderBy: { accessCount: 'desc' },
  });
}

export async function createDecoy(data: {
  name: string;
  type: DecoyAssetType;
  sensitivityTag: Severity;
}) {
  const name = data.name.trim();
  const beacon = `BKN-${randomUUID().slice(0, 8).toUpperCase()}`;
  const format = deriveFormatFromName(name);

  try {
    const created = await prisma.decoyAsset.create({
      data: {
        name,
        type: data.type,
        format,
        sensitivityTag: data.sensitivityTag,
        beacon,
        status: DecoyLifecycleStatus.active,
      },
    });
    emitter.decoyDeployed(created);
    return created;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new HttpError(409, 'Beacon collision — retry');
    }
    throw e;
  }
}

export async function deactivateDecoy(id: string) {
  const decoy = await prisma.decoyAsset.findUnique({ where: { id } });
  if (!decoy) {
    throw new HttpError(404, 'Decoy not found');
  }

  return prisma.decoyAsset.update({
    where: { id },
    data: { status: DecoyLifecycleStatus.inactive },
  });
}
