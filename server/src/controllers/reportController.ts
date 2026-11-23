import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorMiddleware';
import { ScanReportModel } from '../models/ScanReport';
import { FindingModel } from '../models/Finding';
import { FootprintTargetModel } from '../models/FootprintTarget';
import { BreachResultModel } from '../models/BreachResult';

export async function listReports(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reports = await ScanReportModel.find(
      { userId: req.userId! },
      { sort: { createdAt: -1 } }
    );
    res.json({ reports });
  } catch (err) {
    next(err);
  }
}

export async function getReportById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);
    const report = await ScanReportModel.findOne({ _id: id, userId });
    if (!report) throw new AppError('Scan report not found.', 404);

    const findingFilter: Record<string, any> = { userId };
    if (report.targetId) findingFilter.targetId = report.targetId;
    const findings = await FindingModel.find(findingFilter, { sort: { detectedAt: -1 } });

    res.json({ report, findings });
  } catch (err) {
    next(err);
  }
}

export async function exportReport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);
    const format = req.query.format === 'markdown' ? 'markdown' : 'json';

    const report = await ScanReportModel.findOne({ _id: id, userId });
    if (!report) throw new AppError('Scan report not found.', 404);

    const [targets, findings, demoBreaches] = await Promise.all([
      FootprintTargetModel.find({ userId }),
      FindingModel.find(report.targetId ? { userId, targetId: report.targetId } : { userId }),
      BreachResultModel.find({ userId }, { sort: { checkedAt: -1 } }),
    ]);

    const sanitizedBreaches = demoBreaches.map((b) => ({
      badge: 'SIMULATED DEMO DATA' as const,
      provenance: 'simulated' as const,
      dataset: b.dataset,
      disclaimer: b.disclaimer,
      found: b.found,
      breach_source: b.breach_source,
      breach_date: b.breach_date,
      account_status: b.account_status,
      exposed_data_classes: b.exposed_data_classes,
      severity: b.severity,
      masked_fields: b.masked_fields,
      message: b.message,
      checkedAt: b.checkedAt,
    }));

    if (format === 'markdown') {
      const lines = [
        `# Digital Footprint Officer Briefing`,
        `Generated: ${new Date(report.createdAt).toUTCString()}`,
        `Scope: ${report.targetLabel}`,
        `Privacy Health Score: ${report.overallScore}/100`,
        ``,
        `## Executive Assessment`,
        report.summary,
        ``,
        `## Category Breakdown`,
        `- Account Security: ${report.categoryScores.accountSecurity}/100`,
        `- Data Broker Exposure: ${report.categoryScores.brokerExposure}/100`,
        `- Public Metadata: ${report.categoryScores.publicMetadata}/100`,
        `- Domain Hygiene: ${report.categoryScores.domainHygiene}/100`,
        ``,
        `## Monitored Assets (${targets.length})`,
        ...targets.map((t) => `- [${t.type.toUpperCase()}] ${t.label} (${t.value}) — Score: ${t.healthScore}/100`),
        ``,
        `## Findings (${findings.length})`,
        ...findings.map(
          (f) =>
            `### [${f.severity.toUpperCase()} / ${f.status.toUpperCase()}] ${f.title}\n${f.plainSummary}\nEvidence: ${f.evidence}\n`
        ),
        ``,
        `## Demo Email Breach Checks — SIMULATED DEMO DATA (${sanitizedBreaches.length})`,
        ...(sanitizedBreaches.length > 0
          ? sanitizedBreaches.map(
              (b) =>
                `### [SIMULATED DEMO DATA] ${b.masked_fields.email} — ${
                  b.found ? `${b.breach_source} (${b.severity.toUpperCase()})` : 'No demo record'
                }\n- Provenance: ${b.provenance}\n- Dataset: ${b.dataset}\n- Disclaimer: ${b.disclaimer}\n- Message: ${b.message}${
                  b.found
                    ? `\n- Breach Date: ${b.breach_date}\n- Account Status: ${b.account_status}\n- Exposed Classes: ${b.exposed_data_classes.join(', ')}`
                    : ''
                }\n`
            )
          : ['- No simulated breach checks recorded yet.']),
      ];

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="footprint-briefing-${report._id.slice(0, 8)}.md"`);
      res.send(lines.join('\n'));
      return;
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="footprint-briefing-${report._id.slice(0, 8)}.json"`);
    res.send(
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          report,
          targets,
          findings,
          demoBreachChecks: sanitizedBreaches,
        },
        null,
        2
      )
    );
  } catch (err) {
    next(err);
  }
}
