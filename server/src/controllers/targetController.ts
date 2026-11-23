import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorMiddleware';
import { FootprintTargetModel, FootprintTargetDoc } from '../models/FootprintTarget';
import { FindingModel } from '../models/Finding';
import { RemediationTaskModel } from '../models/RemediationTask';
import { ScanReportModel } from '../models/ScanReport';
import { AuditLogModel } from '../models/AuditLog';
import { runTargetScan } from '../services/scanEngine';
import { calculateScoreSummary, recalculateTargetScore } from '../services/riskCalculator';
import { buildOfficerBriefing } from '../services/officerBriefingService';
import { generateObjectId } from '../config/db';

export const createTargetSchema = z.object({
  type: z.enum(['email', 'domain', 'social', 'phone', 'alias']),
  value: z.string().trim().min(2, 'Please enter the asset identifier to monitor.').max(140),
  label: z.string().trim().min(2, 'Please give this asset a short label.').max(80),
  scanNow: z.boolean().optional().default(true),
});

export const updateTargetSchema = z.object({
  label: z.string().trim().min(2).max(80).optional(),
  status: z.enum(['active', 'paused']).optional(),
});

async function executeScanForTarget(
  userId: string,
  actorLabel: string,
  target: FootprintTargetDoc,
  tone: 'calm' | 'concise'
) {
  const { findings: generated, durationMs } = await runTargetScan(target);
  const now = new Date().toISOString();

  // Remove previous unresolved findings for this target so re-scans refresh cleanly
  // while keeping user-resolved or dismissed findings intact
  const existingForTarget = await FindingModel.find({ userId, targetId: target._id });
  const resolvedTitles = new Set(
    existingForTarget
      .filter((f) => f.status === 'resolved' || f.status === 'false_positive')
      .map((f) => f.title)
  );
  const openIdsToReplace = existingForTarget
    .filter((f) => f.status === 'open' || f.status === 'acknowledged')
    .map((f) => f._id);

  if (openIdsToReplace.length > 0) {
    await FindingModel.deleteMany({ userId, targetId: target._id, status: { $in: ['open', 'acknowledged'] } });
    await RemediationTaskModel.deleteMany({
      userId,
      targetId: target._id,
      status: { $in: ['todo', 'in_progress'] },
    });
  }

  const reportPlaceholder = await ScanReportModel.create({
    userId,
    targetId: target._id,
    scope: 'single',
    targetLabel: target.label,
    overallScore: 100,
    categoryScores: { accountSecurity: 100, brokerExposure: 100, publicMetadata: 100, domainHygiene: 100 },
    summary: 'Scanning...',
    findingsFound: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    durationMs,
  });

  const toInsert = generated.filter((g) => !resolvedTitles.has(g.title));
  const insertedFindings =
    toInsert.length > 0
      ? await FindingModel.insertMany(
          toInsert.map((g) => ({
            userId,
            targetId: target._id,
            scanReportId: reportPlaceholder._id,
            category: g.category,
            severity: g.severity,
            status: 'open' as const,
            title: g.title,
            plainSummary: g.plainSummary,
            whyItMatters: g.whyItMatters,
            evidence: g.evidence,
            sourceName: g.sourceName,
            impactPoints: g.impactPoints,
            recommendedSteps: g.recommendedSteps,
            detectedAt: now,
            resolvedAt: null,
          }))
        )
      : [];

  if (insertedFindings.length > 0) {
    await RemediationTaskModel.insertMany(
      insertedFindings.map((finding) => ({
        userId,
        findingId: finding._id,
        targetId: target._id,
        title: finding.title,
        description: finding.plainSummary,
        category: finding.category,
        severity: finding.severity,
        status: 'todo' as const,
        impactPoints: finding.impactPoints,
        estimatedMinutes:
          toInsert.find((g) => g.title === finding.title)?.estimatedMinutes ?? 6,
        steps: finding.recommendedSteps.map((stepLabel) => ({
          id: generateObjectId(),
          label: stepLabel,
          done: false,
        })),
        completedAt: null,
      }))
    );
  }

  const updatedTargetFindings = await FindingModel.find({ userId, targetId: target._id });
  await recalculateTargetScore(target._id, updatedTargetFindings);
  const refreshedTarget = await FootprintTargetModel.findByIdAndUpdate(target._id, {
    lastScannedAt: now,
  });

  const allUserFindings = await FindingModel.find({ userId });
  const scoreSummary = calculateScoreSummary(allUserFindings);
  const briefing = buildOfficerBriefing(
    scoreSummary.overallScore,
    scoreSummary.categoryScores,
    allUserFindings,
    tone
  );

  const report = await ScanReportModel.findByIdAndUpdate(reportPlaceholder._id, {
    overallScore: scoreSummary.overallScore,
    categoryScores: scoreSummary.categoryScores,
    summary: briefing.narrative,
    findingsFound: insertedFindings.length,
    criticalCount: insertedFindings.filter((f) => f.severity === 'critical').length,
    highCount: insertedFindings.filter((f) => f.severity === 'high').length,
    mediumCount: insertedFindings.filter((f) => f.severity === 'medium').length,
    lowCount: insertedFindings.filter((f) => f.severity === 'low').length,
  });

  await AuditLogModel.create({
    userId,
    action: 'scan.completed',
    actorLabel,
    summary: `Scanned "${target.label}" (${target.value}) — found ${insertedFindings.length} active item(s).`,
    metadata: { targetId: target._id, overallScore: scoreSummary.overallScore },
  });

  return { target: refreshedTarget, report, findings: insertedFindings, overallScore: scoreSummary.overallScore };
}

export async function listTargets(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const targets = await FootprintTargetModel.find(
      { userId: req.userId! },
      { sort: { createdAt: -1 } }
    );
    res.json({ targets });
  } catch (err) {
    next(err);
  }
}

export async function createTarget(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const { type, value, label, scanNow } = req.body as z.infer<typeof createTargetSchema>;
    const normalizedValue = type === 'email' || type === 'domain' ? value.toLowerCase() : value;

    const existing = await FootprintTargetModel.findOne({ userId, type, value: normalizedValue });
    if (existing) {
      throw new AppError('You are already monitoring this exact asset.', 409);
    }

    const target = await FootprintTargetModel.create({
      userId,
      type,
      value: normalizedValue,
      label,
      status: 'active',
      healthScore: 100,
      exposureLevel: 'low',
      lastScannedAt: null,
      findingCounts: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
    });

    await AuditLogModel.create({
      userId,
      action: 'target.added',
      actorLabel: req.user?.fullName || 'Account Owner',
      summary: `Added ${type} asset "${label}" (${normalizedValue}) to monitoring.`,
      metadata: { targetId: target._id, type },
    });

    if (scanNow) {
      const scanResult = await executeScanForTarget(
        userId,
        req.user?.fullName || 'Account Owner',
        target,
        req.user?.preferences?.briefingTone || 'calm'
      );
      res.status(201).json({
        target: scanResult.target,
        report: scanResult.report,
        findings: scanResult.findings,
        overallScore: scanResult.overallScore,
      });
      return;
    }

    res.status(201).json({ target });
  } catch (err) {
    next(err);
  }
}

export async function updateTarget(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);
    const existing = await FootprintTargetModel.findOne({ _id: id, userId });
    if (!existing) throw new AppError('Monitored asset not found.', 404);

    const updates = req.body as z.infer<typeof updateTargetSchema>;
    const updated = await FootprintTargetModel.findByIdAndUpdate(id, updates);
    res.json({ target: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteTarget(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);
    const existing = await FootprintTargetModel.findOne({ _id: id, userId });
    if (!existing) throw new AppError('Monitored asset not found.', 404);

    await Promise.all([
      FindingModel.deleteMany({ userId, targetId: id }),
      RemediationTaskModel.deleteMany({ userId, targetId: id }),
      FootprintTargetModel.findByIdAndDelete(id),
    ]);

    await AuditLogModel.create({
      userId,
      action: 'target.removed',
      actorLabel: req.user?.fullName || 'Account Owner',
      summary: `Removed "${existing.label}" (${existing.value}) from monitoring.`,
      metadata: { targetId: id },
    });

    res.json({ message: 'Asset removed from monitoring.' });
  } catch (err) {
    next(err);
  }
}

export async function scanTarget(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);
    const target = await FootprintTargetModel.findOne({ _id: id, userId });
    if (!target) throw new AppError('Monitored asset not found.', 404);

    const result = await executeScanForTarget(
      userId,
      req.user?.fullName || 'Account Owner',
      target,
      req.user?.preferences?.briefingTone || 'calm'
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function runFullSweep(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const targets = await FootprintTargetModel.find({ userId, status: 'active' });
    if (targets.length === 0) {
      throw new AppError('Add at least one active asset before running a full footprint sweep.', 400);
    }

    const tone = req.user?.preferences?.briefingTone || 'calm';
    const started = Date.now();

    for (const target of targets) {
      await executeScanForTarget(userId, req.user?.fullName || 'Account Owner', target, tone);
    }

    const allFindings = await FindingModel.find({ userId });
    const scoreSummary = calculateScoreSummary(allFindings);
    const briefing = buildOfficerBriefing(
      scoreSummary.overallScore,
      scoreSummary.categoryScores,
      allFindings,
      tone
    );

    const fullReport = await ScanReportModel.create({
      userId,
      targetId: null,
      scope: 'full',
      targetLabel: `Full Footprint Sweep (${targets.length} assets)`,
      overallScore: scoreSummary.overallScore,
      categoryScores: scoreSummary.categoryScores,
      summary: briefing.narrative,
      findingsFound: scoreSummary.counts.total,
      criticalCount: scoreSummary.counts.critical,
      highCount: scoreSummary.counts.high,
      mediumCount: scoreSummary.counts.medium,
      lowCount: scoreSummary.counts.low,
      durationMs: Math.max(420, Date.now() - started),
    });

    await AuditLogModel.create({
      userId,
      action: 'scan.full_sweep',
      actorLabel: req.user?.fullName || 'Account Owner',
      summary: `Completed full footprint sweep across ${targets.length} monitored assets.`,
      metadata: { overallScore: scoreSummary.overallScore },
    });

    res.json({
      report: fullReport,
      overallScore: scoreSummary.overallScore,
      categoryScores: scoreSummary.categoryScores,
      counts: scoreSummary.counts,
    });
  } catch (err) {
    next(err);
  }
}
