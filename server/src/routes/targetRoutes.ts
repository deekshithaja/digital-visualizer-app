import { Router } from 'express';
import {
  listTargets,
  createTarget,
  updateTarget,
  deleteTarget,
  scanTarget,
  runFullSweep,
  createTargetSchema,
  updateTargetSchema,
} from '../controllers/targetController';
import { requireAuth } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validateRequest';

const router = Router();

router.use(requireAuth);
router.get('/', listTargets);
router.post('/', validateBody(createTargetSchema), createTarget);
router.post('/sweep', runFullSweep);
router.patch('/:id', validateBody(updateTargetSchema), updateTarget);
router.delete('/:id', deleteTarget);
router.post('/:id/scan', scanTarget);

export default router;
