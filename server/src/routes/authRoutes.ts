import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  deleteAccount,
  registerSchema,
  loginSchema,
  updateProfileSchema,
} from '../controllers/authController';
import { requireAuth } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validateRequest';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait a few minutes.' },
});

router.post('/register', authLimiter, validateBody(registerSchema), register);
router.post('/login', authLimiter, validateBody(loginSchema), login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);
router.patch('/profile', requireAuth, validateBody(updateProfileSchema), updateProfile);
router.delete('/account', requireAuth, deleteAccount);

export default router;
