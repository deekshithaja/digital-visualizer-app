import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorMiddleware';
import { RemediationTaskModel } from '../models/RemediationTask';
import { FindingModel } from '../models/Finding';
import { FootprintTargetModel } from '../models/FootprintTarget';
import { AuditLogModel } from '../models/AuditLog';
import { calculateScoreSummary, recalculateTargetScore } from '../services/riskCalculator';
import { generateObjectId } from '../config/db';

export const createActionSchema = z.object({
  title: z.string().trim().min(3, 'Task title is required.').max(120),
  description: z.string().trim().min(3).max(400),
  category: z.enum(['accountSecurity', 'brokerExposure', 'publicMetadata', 'domainHygiene']).default('accountSecurity'),
  severity: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  estimatedMinutes: z.number().int().min(1).max(120).default(5),
  steps: z.array(z.string().trim().min(2)).min(1).max(6),
});

export const updateActionSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'completed', 'dismissed']).optional(),
  steps: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        done: z.boolean(),
      })
    )
    .optional(),
});

export async function listActions(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const [tasks, targets] = await Promise.all([
      RemediationTaskModel.find({ userId }, { sort: { impactPoints: -1 } }),
      FootprintTargetModel.find({ userId }),
    ]);

    const targetMap = new Map(targets.map((t) => [t._id, t]));
    const enriched = tasks.map((task) => {
      const t = task.targetId ? targetMap.get(task.targetId) : undefined;
      return {
        ...task,
        targetLabel: t?.label || 'Personal Hygiene',
        targetValue: t?.value || '',
      };
    });

    res.json({ actions: enriched });
  } catch (err) {
    next(err);
  }
}

export async function createAction(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const data = req.body as z.infer<typeof createActionSchema>;

    const action = await RemediationTaskModel.create({
      userId,
      findingId: null,
      targetId: null,
      title: data.title,
      description: data.description,
      category: data.category,
      severity: data.severity,
      status: 'todo',
      impactPoints: data.severity === 'critical' ? 14 : data.severity === 'high' ? 10 : 5,
      estimatedMinutes: data.estimatedMinutes,
      steps: data.steps.map((label) => ({
        id: generateObjectId(),
        label,
        done: false,
      })),
      completedAt: null,
    });

    await AuditLogModel.create({
      userId,
      action: 'task.created',
      actorLabel: req.user?.fullName || 'Account Owner',
      summary: `Added custom security task: "${action.title}".`,
      metadata: { taskId: action._id },
    });

    res.status(201).json({ action: { ...action, targetLabel: 'Personal Hygiene', targetValue: '' } });
  } catch (err) {
    next(err);
  }
}

export async function updateAction(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);
    const task = await RemediationTaskModel.findOne({ _id: id, userId });
    if (!task) throw new AppError('Remediation task not found.', 404);

    const payload = req.body as z.infer<typeof updateActionSchema>;
    let nextSteps = payload.steps ?? task.steps;
    let nextStatus = payload.status ?? task.status;

    if (payload.status === 'completed') {
      nextSteps = nextSteps.map((s) => ({ ...s, done: true }));
    } else if (payload.steps && !payload.status) {
      const doneCount = nextSteps.filter((s) => s.done).length;
      if (doneCount === nextSteps.length && nextSteps.length > 0) {
        nextStatus = 'completed';
      } else if (doneCount > 0) {
        nextStatus = 'in_progress';
      } else {
        nextStatus = 'todo';
      }
    }

    const completedAt = nextStatus === 'completed' ? new Date().toISOString() : null;
    const updated = await RemediationTaskModel.findByIdAndUpdate(id, {
      status: nextStatus,
      steps: nextSteps,
      completedAt,
    });

    // Sync linked Finding
    if (task.findingId) {
      if (nextStatus === 'completed') {
        await FindingModel.findByIdAndUpdate(task.findingId, {
          status: 'resolved',
          resolvedAt: new Date().toISOString(),
        });
      } else if (nextStatus === 'dismissed') {
        await FindingModel.findByIdAndUpdate(task.findingId, {
          status: 'false_positive',
          resolvedAt: new Date().toISOString(),
        });
      } else {
        await FindingModel.findByIdAndUpdate(task.findingId, {
          status: 'open',
          resolvedAt: null,
        });
      }

      if (task.targetId) {
        const tf = await FindingModel.find({ userId, targetId: task.targetId });
        await recalculateTargetScore(task.targetId, tf);
      }
    }

    const allFindings = await FindingModel.find({ userId });
    const scoreSummary = calculateScoreSummary(allFindings);

    if (nextStatus === 'completed' && task.status !== 'completed') {
      await AuditLogModel.create({
        userId,
        action: 'task.completed',
        actorLabel: req.user?.fullName || 'Account Owner',
        summary: `Completed "${task.title}" (+${task.impactPoints} health impact).`,
        metadata: { taskId: id, overallScore: scoreSummary.overallScore },
      });
    }

    res.json({
      action: updated,
      overallScore: scoreSummary.overallScore,
      categoryScores: scoreSummary.categoryScores,
    });
  } catch (err) {
    next(err);
  }
}
