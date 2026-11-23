import { Router } from 'express';
import { listReports, getReportById, exportReport } from '../controllers/reportController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);
router.get('/', listReports);
router.get('/:id', getReportById);
router.get('/:id/export', exportReport);

export default router;
