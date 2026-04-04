import { Router } from 'express';
import { z } from 'zod';
import { AppRole, DecoyAssetType, DecoyLifecycleStatus, Severity } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import * as decoyService from '../services/decoyService';
import { asyncRoute } from '../utils/asyncRoute';

const router = Router();
router.use(requireAuth);

const listQuerySchema = z.object({
  type: z.nativeEnum(DecoyAssetType).optional(),
  sensitivityTag: z.nativeEnum(Severity).optional(),
  status: z.nativeEnum(DecoyLifecycleStatus).optional(),
});

const createDecoySchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(DecoyAssetType),
  sensitivityTag: z.nativeEnum(Severity),
  department: z.string().optional(),
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
      const decoys = await decoyService.listDecoys(parsed.data);
      res.json({ success: true, decoys });
    } catch (e) {
      next(e);
    }
  }),
);

router.post(
  '/',
  requireRole(AppRole.Administrator),
  asyncRoute(async (req, res, next) => {
    const parsed = createDecoySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid body',
        details: parsed.error.flatten(),
      });
      return;
    }
    try {
      const { name, type, sensitivityTag } = parsed.data;
      const decoy = await decoyService.createDecoy({ name, type, sensitivityTag });
      res.status(201).json({ success: true, decoy });
    } catch (e) {
      next(e);
    }
  }),
);

router.patch(
  '/:id/deactivate',
  requireRole(AppRole.Administrator),
  asyncRoute(async (req, res, next) => {
    try {
      const decoy = await decoyService.deactivateDecoy(req.params.id);
      res.json({ success: true, decoy });
    } catch (e) {
      next(e);
    }
  }),
);

export default router;
