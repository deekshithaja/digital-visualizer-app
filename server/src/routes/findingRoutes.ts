import { Router } from 'express';
import { listFindings, updateFindingStatus, updateFindingSchema } from '../controllers/findingController';
import { requireAuth } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validateRequest';

const router = Router();

router.use(requireAuth);
router.get('/', listFindings);
router.patch('/:id', validateBody(updateFindingSchema), updateFindingStatus);

export default router;
