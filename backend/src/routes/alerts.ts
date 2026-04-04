import { Router } from 'express';
import { z } from 'zod';
import { AlertStatus, AppRole, Severity } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import * as alertService from '../services/alertService';
import { asyncRoute } from '../utils/asyncRoute';

const router = Router();
router.use(requireAuth);

const listQuerySchema = z.object({
  severity: z.nativeEnum(Severity).optional(),
  status: z.nativeEnum(AlertStatus).optional(),
  userId: z.string().uuid().optional(),
});

const statusBodySchema = z.object({
  status: z.nativeEnum(AlertStatus),
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
      const alerts = await alertService.listAlerts(parsed.data);
      res.json({ success: true, alerts });
    } catch (e) {
      next(e);
    }
  }),
);

router.patch(
  '/:id/status',
  requireRole(AppRole.Administrator),
  asyncRoute(async (req, res, next) => {
    const parsed = statusBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid body',
        details: parsed.error.flatten(),
      });
      return;
    }
    try {
      const alert = await alertService.updateAlertStatus(req.params.id, parsed.data.status);
      res.json({ success: true, alert });
    } catch (e) {
      next(e);
    }
  }),
);

export default router;
