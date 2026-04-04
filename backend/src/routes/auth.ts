import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import * as authService from '../services/authService';
import { prisma } from '../db/prisma';

const router = Router();

const loginBodySchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

function asyncAuthRoute(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res, next).catch(next);
  };
}

router.post(
  '/login',
  asyncAuthRoute(async (req, res, next) => {
    const parsed = loginBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const result = await authService.login(parsed.data.email, parsed.data.password);
      res.json({
        success: true,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      });
    } catch (err) {
      if (err instanceof authService.InvalidCredentialsError) {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
        return;
      }
      next(err);
    }
  }),
);

router.post(
  '/refresh',
  asyncAuthRoute(async (req, res, next) => {
    const parsed = refreshBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const result = await authService.refreshTokens(parsed.data.refreshToken);
      res.json({
        success: true,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      });
    } catch (err) {
      if (err instanceof authService.InvalidCredentialsError) {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
        return;
      }
      next(err);
    }
  }),
);

router.post(
  '/logout',
  requireAuth,
  asyncAuthRoute(async (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    try {
      await authService.logout(req.user.id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncAuthRoute(async (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    try {
      const account = await prisma.authAccount.findUnique({
        where: { id: req.user.id },
        select: { id: true, email: true, name: true, appRole: true },
      });
      if (!account) {
        res.status(404).json({ success: false, error: 'Account not found' });
        return;
      }
      res.json({
        success: true,
        user: {
          id: account.id,
          email: account.email,
          name: account.name,
          appRole: account.appRole,
        },
      });
    } catch (err) {
      next(err);
    }
  }),
);

export default router;
