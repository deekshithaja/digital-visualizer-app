import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { FootprintTargetModel } from '../models/FootprintTarget';
import { FindingModel } from '../models/Finding';
import { RemediationTaskModel } from '../models/RemediationTask';
import { ScanReportModel } from '../models/ScanReport';
import { AuditLogModel } from '../models/AuditLog';
import { calculateScoreSummary } from '../services/riskCalculator';
import { buildOfficerBriefing } from '../services/officerBriefingService';

export async function getOverview(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const tone = req.user?.preferences?.briefingTone || 'calm';

    const [targets, findings, tasks, reports, logs] = await Promise.all([
      FootprintTargetModel.find({ userId }, { sort: { createdAt: -1 } }),
      FindingModel.find({ userId }, { sort: { detectedAt: -1 } }),
      RemediationTaskModel.find({ userId }, { sort: { impactPoints: -1 } }),
      ScanReportModel.find({ userId }, { sort: { createdAt: 1 }, limit: 12 }),
      AuditLogModel.find({ userId }, { sort: { createdAt: -1 }, limit: 8 }),
    ]);

    const { overallScore, categoryScores, counts } = calculateScoreSummary(findings);
    const briefing = buildOfficerBriefing(overallScore, categoryScores, findings, tone);

    const targetMap = new Map(targets.map((t) => [t._id, t]));
    const priorityTasks = tasks
      .filter((t) => t.status === 'todo' || t.status === 'in_progress')
      .slice(0, 4)
      .map((task) => ({
        ...task,
        targetLabel: task.targetId ? targetMap.get(task.targetId)?.label || 'Account' : 'General',
      }));

    const scoreHistory = reports.map((r) => ({
      id: r._id,
      date: r.createdAt,
      score: r.overallScore,
      label: r.targetLabel,
      scope: r.scope,
    }));

    // Build 30-day daily findings discovered & resolved series
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dayBuckets = new Map<string, { date: string; label: string; discovered: number; resolved: number }>();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const isoDay = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      dayBuckets.set(isoDay, { date: isoDay, label, discovered: 0, resolved: 0 });
    }

    for (const f of findings) {
      const detectedDay = (f.detectedAt || '').slice(0, 10);
      const detectedBucket = dayBuckets.get(detectedDay);
      if (detectedBucket) {
        detectedBucket.discovered += 1;
      }
      if (f.resolvedAt) {
        const resolvedDay = f.resolvedAt.slice(0, 10);
        const resolvedBucket = dayBuckets.get(resolvedDay);
        if (resolvedBucket) {
          resolvedBucket.resolved += 1;
        }
      }
    }

    const findingsTrend = Array.from(dayBuckets.values());

    const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
    const resolvedFindingsCount = findings.filter(
      (f) => f.status === 'resolved' || f.status === 'false_positive'
    ).length;

    res.json({
      overallScore,
      categoryScores,
      findingCounts: counts,
      targetsCount: targets.length,
      completedTasksCount,
      resolvedFindingsCount,
      lastScanAt: reports.length > 0 ? reports[reports.length - 1].createdAt : null,
      briefing,
      priorityTasks,
      scoreHistory,
      findingsTrend,
      recentLogs: logs,
      targets,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAuditLogs(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const logs = await AuditLogModel.find(
      { userId: req.userId! },
      { sort: { createdAt: -1 }, limit: 40 }
    );
    res.json({ logs });
  } catch (err) {
    next(err);
  }
}
