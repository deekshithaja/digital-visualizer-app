import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { checkBreach, getSavedBreaches, datasetInfo, checkBreachSchema } from '../controllers/breachController';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validateRequest';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middleware/authMiddleware';
import { UserModel } from '../models/User';

const router = Router();

const breachLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// Optional auth middleware for check endpoint so if logged in, results mirror to user account
async function optionalAuth(req: AuthenticatedRequest, _res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : req.cookies?.dfv_token;
    if (token) {
      const decoded = jwt.verify(token, getJwtSecret()) as { sub?: string };
      if (decoded?.sub) {
        const user = await UserModel.findById(decoded.sub);
        if (user) {
          req.userId = user._id;
          req.user = user;
        }
      }
    }
  } catch {}
  next();
}

router.post('/check', breachLimiter, optionalAuth, validateBody(checkBreachSchema), checkBreach);
router.get('/', breachLimiter, requireAuth, getSavedBreaches);
router.get('/dataset-info', breachLimiter, datasetInfo);

export default router;
