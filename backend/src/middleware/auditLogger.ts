import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../db/prisma';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function clientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]?.trim();
  }
  return req.socket.remoteAddress ?? undefined;
}

/**
 * Audit-log middleware — persists an HttpAuditLog row for every
 * POST / PUT / PATCH / DELETE request with:
 *   timestamp, method, path, userId (authAccountId), statusCode, latencyMs
 */
export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  const startMs = Date.now();

  res.on('finish', () => {
    if (!MUTATING.has(req.method)) return;

    const latencyMs = Date.now() - startMs;

    void prisma.httpAuditLog
      .create({
        data: {
          method: req.method,
          path: req.originalUrl ?? req.url,
          statusCode: res.statusCode,
          latencyMs,
          ip: clientIp(req),
          authAccountId: req.user?.id,
          operatorEmail: req.user?.email,
        },
      })
      .catch((err: unknown) => {
        console.error('[auditLogger] failed to persist audit entry', err);
      });
  });

  next();
}
