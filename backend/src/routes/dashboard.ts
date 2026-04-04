import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as dashboardService from '../services/dashboardService';
import { asyncRoute } from '../utils/asyncRoute';

const router = Router();
router.use(requireAuth);

router.get(
  '/stats',
  asyncRoute(async (_req, res, next) => {
    try {
      const stats = await dashboardService.getDashboardStats();
      res.json({ success: true, ...stats });
    } catch (e) {
      next(e);
    }
  }),
);

router.get(
  '/timeseries',
  asyncRoute(async (_req, res, next) => {
    try {
      const series = await dashboardService.getAlertTimeseries();
      res.json({ success: true, series });
    } catch (e) {
      next(e);
    }
  }),
);

router.get(
  '/hourly',
  asyncRoute(async (_req, res, next) => {
    try {
      const hourly = await dashboardService.getHourlyActivity();
      res.json({ success: true, hourly });
    } catch (e) {
      next(e);
    }
  }),
);

export default router;
