import { Router } from 'express';
import {
  listActions,
  createAction,
  updateAction,
  createActionSchema,
  updateActionSchema,
} from '../controllers/actionController';
import { requireAuth } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validateRequest';

const router = Router();

router.use(requireAuth);
router.get('/', listActions);
router.post('/', validateBody(createActionSchema), createAction);
router.patch('/:id', validateBody(updateActionSchema), updateAction);

export default router;
