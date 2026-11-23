import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel, UserDoc } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: Omit<UserDoc, 'passwordHash'>;
  userId?: string;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing.');
  }
  return secret;
}

export function signAuthToken(userId: string): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN?.trim() || '7d') as jwt.SignOptions['expiresIn'];
  return jwt.sign({ sub: userId }, getJwtSecret(), { expiresIn });
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const cookieToken = req.cookies?.dfv_token as string | undefined;
    const token = bearerToken || cookieToken;

    if (!token) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }

    let decoded: { sub?: string };
    try {
      decoded = jwt.verify(token, getJwtSecret()) as { sub?: string };
    } catch {
      res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
      return;
    }

    if (!decoded?.sub) {
      res.status(401).json({ error: 'Invalid session token.' });
      return;
    }

    const user = await UserModel.findById(decoded.sub);
    if (!user) {
      res.status(401).json({ error: 'Account no longer exists.' });
      return;
    }

    const { passwordHash: _removed, ...safeUser } = user;
    req.user = safeUser;
    req.userId = user._id;
    next();
  } catch (err) {
    next(err);
  }
}
