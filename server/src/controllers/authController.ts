import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserModel } from '../models/User';
import { FootprintTargetModel } from '../models/FootprintTarget';
import { FindingModel } from '../models/Finding';
import { RemediationTaskModel } from '../models/RemediationTask';
import { ScanReportModel } from '../models/ScanReport';
import { AuditLogModel } from '../models/AuditLog';
import { BreachResultModel } from '../models/BreachResult';
import { AuthenticatedRequest, signAuthToken } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorMiddleware';

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters.').max(80),
  email: z.string().trim().email('Please enter a valid email address.').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.').toLowerCase(),
  password: z.string().min(1, 'Password is required.'),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
      briefingTone: z.enum(['calm', 'concise']).optional(),
      scanFrequency: z.enum(['weekly', 'monthly', 'manual']).optional(),
      emailAlerts: z.boolean().optional(),
    })
    .optional(),
});

function setAuthCookie(res: Response, token: string): void {
  res.cookie('dfv_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export async function register(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { fullName, email, password } = req.body as z.infer<typeof registerSchema>;

    const existing = await UserModel.findOne({ email });
    if (existing) {
      throw new AppError('An account with this email already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      fullName,
      email,
      passwordHash,
      avatarUrl: '/src/assets/images/avatar_officer_profile_1795078539079.jpg',
      role: 'member',
      preferences: {
        theme: 'light',
        briefingTone: 'calm',
        scanFrequency: 'weekly',
        emailAlerts: true,
      },
    });

    await AuditLogModel.create({
      userId: user._id,
      action: 'account.created',
      actorLabel: user.fullName,
      summary: 'Created Personal Cybersecurity Officer workspace.',
      metadata: { email: user.email },
    });

    const token = signAuthToken(user._id);
    setAuthCookie(res, token);

    const { passwordHash: _removed, ...safeUser } = user;
    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError('Invalid email or password.', 401);
    }

    const token = signAuthToken(user._id);
    setAuthCookie(res, token);

    const { passwordHash: _removed, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    next(err);
  }
}

export function logout(_req: AuthenticatedRequest, res: Response): void {
  res.clearCookie('dfv_token', { path: '/' });
  res.json({ message: 'Signed out cleanly.' });
}

export function getMe(req: AuthenticatedRequest, res: Response): void {
  res.json({ user: req.user });
}

export async function updateProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const current = await UserModel.findById(userId);
    if (!current) throw new AppError('User not found.', 404);

    const { fullName, preferences } = req.body as z.infer<typeof updateProfileSchema>;
    const updated = await UserModel.findByIdAndUpdate(userId, {
      ...(fullName ? { fullName } : {}),
      ...(preferences
        ? {
            preferences: {
              ...current.preferences,
              ...preferences,
            },
          }
        : {}),
    });

    if (!updated) throw new AppError('Failed to update profile.', 500);

    await AuditLogModel.create({
      userId,
      action: 'settings.updated',
      actorLabel: updated.fullName,
      summary: 'Updated officer briefing and workspace preferences.',
      metadata: preferences || {},
    });

    const { passwordHash: _removed, ...safeUser } = updated;
    res.json({ user: safeUser });
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError('User not found.', 404);

    await Promise.all([
      FootprintTargetModel.deleteMany({ userId }),
      FindingModel.deleteMany({ userId }),
      RemediationTaskModel.deleteMany({ userId }),
      ScanReportModel.deleteMany({ userId }),
      AuditLogModel.deleteMany({ userId }),
      BreachResultModel.deleteMany({ userId }),
      UserModel.findByIdAndDelete(userId),
    ]);

    res.clearCookie('dfv_token', { path: '/' });
    res.json({ message: 'Account and all associated footprint records permanently deleted.' });
  } catch (err) {
    next(err);
  }
}
