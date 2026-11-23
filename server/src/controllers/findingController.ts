import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorMiddleware';
import { FindingModel } from '../models/Finding';
import { FootprintTargetModel } from '../models/FootprintTarget';
import { RemediationTaskModel } from '../models/RemediationTask';
import { AuditLogModel } from '../models/AuditLog';
import { calculateScoreSummary, recalculateTargetScore } from '../services/riskCalculator';

export const updateFindingSchema = z.object({
  status: z.enum(['open', 'acknowledged', 'resolved', 'false_positive']),
});

export async function listFindings(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const filter: Record<string, any> = { userId };
    if (req.query.status && req.query.status !== 'all') filter.status = String(req.query.status);
    if (req.query.severity && req.query.severity !== 'all') filter.severity = String(req.query.severity);
    if (req.query.category && req.query.category !== 'all') filter.category = String(req.query.category);
    if (req.query.targetId && req.query.targetId !== 'all') filter.targetId = String(req.query.targetId);

    const [findings, targets] = await Promise.all([
      FindingModel.find(filter, { sort: { detectedAt: -1 } }),
      FootprintTargetModel.find({ userId }),
    ]);

    const targetMap = new Map(targets.map((t) => [t._id, t]));
    const enriched = findings.map((f) => {
      const t = targetMap.get(f.targetId);
      return {
        ...f,
        targetLabel: t?.label || 'Removed Asset',
        targetValue: t?.value || '',
        targetType: t?.type || 'email',
      };
    });

    res.json({ findings: enriched });
  } catch (err) {
    next(err);
  }
}

export async function updateFindingStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);
    const { status } = req.body as z.infer<typeof updateFindingSchema>;

    const finding = await FindingModel.findOne({ _id: id, userId });
    if (!finding) throw new AppError('Finding not found.', 404);

    const resolvedAt = status === 'resolved' || status === 'false_positive' ? new Date().toISOString() : null;
    const updated = await FindingModel.findByIdAndUpdate(id, { status, resolvedAt });

    // Sync linked remediation task
    const linkedTask = await RemediationTaskModel.findOne({ userId, findingId: id });
    if (linkedTask) {
      if (status === 'resolved') {
        await RemediationTaskModel.findByIdAndUpdate(linkedTask._id, {
          status: 'completed',
          completedAt: new Date().toISOString(),
          steps: linkedTask.steps.map((s) => ({ ...s, done: true })),
        });
      } else if (status === 'false_positive') {
        await RemediationTaskModel.findByIdAndUpdate(linkedTask._id, {
          status: 'dismissed',
        });
      } else if (status === 'open') {
        await RemediationTaskModel.findByIdAndUpdate(linkedTask._id, {
          status: 'todo',
          completedAt: null,
        });
      }
    }

    const targetFindings = await FindingModel.find({ userId, targetId: finding.targetId });
    await recalculateTargetScore(finding.targetId, targetFindings);

    const allFindings = await FindingModel.find({ userId });
    const scoreSummary = calculateScoreSummary(allFindings);

    await AuditLogModel.create({
      userId,
      action: `finding.${status}`,
      actorLabel: req.user?.fullName || 'Account Owner',
      summary: `Marked "${finding.title}" as ${status.replace('_', ' ')}.`,
      metadata: { findingId: id, overallScore: scoreSummary.overallScore },
    });

    res.json({
      finding: updated,
      overallScore: scoreSummary.overallScore,
      categoryScores: scoreSummary.categoryScores,
    });
  } catch (err) {
    next(err);
  }
}
