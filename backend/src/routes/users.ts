import { Router } from 'express';
import { z } from 'zod';
import { AppRole, Department, MonitoredUserStatus, OrgRole } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import * as userService from '../services/userService';
import { asyncRoute } from '../utils/asyncRoute';

const router = Router();
router.use(requireAuth);

const listQuerySchema = z.object({
  status: z.nativeEnum(MonitoredUserStatus).optional(),
  department: z.nativeEnum(Department).optional(),
  sortBy: z.enum(['riskScore', 'name', 'lastActivity']).default('riskScore'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.nativeEnum(OrgRole),
  department: z.nativeEnum(Department),
  workingHoursStart: z.number().int().min(0).max(23),
  workingHoursEnd: z.number().int().min(0).max(23),
});

const restrictBodySchema = z.object({
  operatorName: z.string().min(1),
  rationale: z.string().optional(),
});

const restoreBodySchema = z.object({
  operatorName: z.string().min(1),
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
      const users = await userService.listUsers(parsed.data);
      res.json({ success: true, users });
    } catch (e) {
      next(e);
    }
  }),
);

router.post(
  '/',
  requireRole(AppRole.Administrator),
  asyncRoute(async (req, res, next) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid body',
        details: parsed.error.flatten(),
      });
      return;
    }
    try {
      const user = await userService.createUser(parsed.data);
      res.status(201).json({ success: true, user });
    } catch (e) {
      next(e);
    }
  }),
);

router.patch(
  '/:id/restrict',
  requireRole(AppRole.Administrator),
  asyncRoute(async (req, res, next) => {
    const parsedBody = restrictBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid body',
        details: parsedBody.error.flatten(),
      });
      return;
    }
    try {
      const user = await userService.restrictUser(req.params.id, parsedBody.data);
      res.json({ success: true, user });
    } catch (e) {
      next(e);
    }
  }),
);

router.patch(
  '/:id/restore',
  requireRole(AppRole.Administrator),
  asyncRoute(async (req, res, next) => {
    const parsedBody = restoreBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid body',
        details: parsedBody.error.flatten(),
      });
      return;
    }
    try {
      const user = await userService.restoreUser(req.params.id, parsedBody.data);
      res.json({ success: true, user });
    } catch (e) {
      next(e);
    }
  }),
);

router.get(
  '/:id',
  asyncRoute(async (req, res, next) => {
    try {
      const user = await userService.getUserById(req.params.id);
      res.json({ success: true, ...user });
    } catch (e) {
      next(e);
    }
  }),
);

export default router;
