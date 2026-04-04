import type { AppRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';

/**
 * Restricts routes by SOC operator role (`AppRole`).
 * - Administrator: full access (writes, restrict/restore users, decoys).
 * - Analyst: use on mutating routes to deny; omit or pair with read handlers for read-only API access.
 *
 * @example router.delete('/users/:id', requireAuth, requireRole('Administrator'), handler)
 */
export function requireRole(...allowed: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    if (!allowed.includes(req.user.appRole)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }
    next();
  };
}
