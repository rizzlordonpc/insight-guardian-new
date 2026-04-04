import { Router } from 'express';
import { z } from 'zod';
import { AccessEventKind, AppRole } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import * as eventService from '../services/eventService';
import { asyncRoute } from '../utils/asyncRoute';

const router = Router();
router.use(requireAuth);

const listQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  accessType: z.nativeEnum(AccessEventKind).optional(),
  riskFlag: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

const simulateBodySchema = z.object({
  userId: z.string().uuid(),
  resourceName: z.string().min(1),
});

router.get(
  '/',
  asyncRoute(async (req, res, next) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid query',
        details: parsed.error.flatten(),
      });
      return;
    }
    try {
      const { riskFlag, ...rest } = parsed.data;
      const events = await eventService.listAccessEvents({
        ...rest,
        riskFlag: riskFlag === undefined ? undefined : riskFlag === 'true',
      });
      res.json({ success: true, events });
    } catch (e) {
      next(e);
    }
  }),
);

router.post(
  '/simulate',
  requireRole(AppRole.Administrator),
  asyncRoute(async (req, res, next) => {
    const parsed = simulateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid body',
        details: parsed.error.flatten(),
      });
      return;
    }
    try {
      const result = await eventService.simulateAccessEvent(
        parsed.data.userId,
        parsed.data.resourceName,
      );
      res.json({
        success: true,
        accessEvent: result.accessEvent,
        updatedUser: result.updatedUser,
        ...(result.alert ? { alert: result.alert } : {}),
      });
    } catch (e) {
      next(e);
    }
  }),
);

export default router;
