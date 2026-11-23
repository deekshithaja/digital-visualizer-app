import { Router } from 'express';
import { getOverview, getAuditLogs } from '../controllers/dashboardController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);
router.get('/overview', getOverview);
router.get('/audit-logs', getAuditLogs);

export default router;
