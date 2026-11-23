import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { lookupEmailBreach, getDatasetInfo } from '../services/demoBreachService';
import { BreachModel } from '../models/Breach';

export const checkBreachSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.').toLowerCase(),
});

export async function checkBreach(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body as z.infer<typeof checkBreachSchema>;
    const userId = req.userId; // Optional for authenticated users to mirror into breaches collection

    const result = await lookupEmailBreach(email, userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getSavedBreaches(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const breaches = await BreachModel.find({ userId }, { sort: { createdAt: -1 } });
    res.json({ breaches });
  } catch (err) {
    next(err);
  }
}

export async function datasetInfo(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const info = getDatasetInfo();
    res.json(info);
  } catch (err) {
    next(err);
  }
}
