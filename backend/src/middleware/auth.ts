import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AppRole } from '@prisma/client';
import { env } from '../config/env';

type AccessJwtPayload = {
  sub: string;
  email: string;
  appRole: AppRole;
};

function attachUserFromPayload(payload: AccessJwtPayload, req: Request): void {
  req.user = {
    id: payload.sub,
    email: payload.email,
    appRole: payload.appRole,
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessJwtPayload;
    if (!payload.sub || !payload.email || payload.appRole === undefined) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    attachUserFromPayload(payload, req);
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Unauthorized' });
  }
}

/**
 * Attaches `req.user` when a valid Bearer token is present; continues without user if missing/invalid.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessJwtPayload;
    if (payload.sub && payload.email !== undefined && payload.appRole !== undefined) {
      attachUserFromPayload(payload, req);
    }
  } catch {
    // ignore invalid optional token
  }
  next();
}
