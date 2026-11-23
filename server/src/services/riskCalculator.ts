import { FindingDoc, FindingCategory, SeverityLevel } from '../models/Finding';
import { CategoryScores } from '../models/ScanReport';
import { FootprintTargetModel } from '../models/FootprintTarget';

const SEVERITY_PENALTY: Record<SeverityLevel, number> = {
  critical: 18,
  high: 11,
  medium: 5,
  low: 2,
};

export function isActiveFinding(finding: Pick<FindingDoc, 'status'>): boolean {
  return finding.status === 'open' || finding.status === 'acknowledged';
}

export function getExposureLevel(healthScore: number): 'low' | 'moderate' | 'elevated' | 'critical' {
  if (healthScore >= 85) return 'low';
  if (healthScore >= 65) return 'moderate';
  if (healthScore >= 45) return 'elevated';
  return 'critical';
}

export function calculateScoreSummary(findings: FindingDoc[]): {
  overallScore: number;
  categoryScores: CategoryScores;
  counts: { critical: number; high: number; medium: number; low: number; total: number };
} {
  const active = findings.filter(isActiveFinding);

  const penalties: Record<FindingCategory, number> = {
    accountSecurity: 0,
    brokerExposure: 0,
    publicMetadata: 0,
    domainHygiene: 0,
  };

  const counts = { critical: 0, high: 0, medium: 0, low: 0, total: active.length };

  for (const f of active) {
    counts[f.severity] += 1;
    const basePenalty = SEVERITY_PENALTY[f.severity] ?? 4;
    const statusFactor = f.status === 'acknowledged' ? 0.65 : 1;
    penalties[f.category] += basePenalty * statusFactor;
  }

  const categoryScores: CategoryScores = {
    accountSecurity: Math.max(12, Math.round(100 - Math.min(88, penalties.accountSecurity * 1.4))),
    brokerExposure: Math.max(12, Math.round(100 - Math.min(88, penalties.brokerExposure * 1.4))),
    publicMetadata: Math.max(12, Math.round(100 - Math.min(88, penalties.publicMetadata * 1.4))),
    domainHygiene: Math.max(12, Math.round(100 - Math.min(88, penalties.domainHygiene * 1.4))),
  };

  const weighted =
    categoryScores.accountSecurity * 0.34 +
    categoryScores.brokerExposure * 0.28 +
    categoryScores.publicMetadata * 0.20 +
    categoryScores.domainHygiene * 0.18;

  const overallScore = Math.max(5, Math.min(100, Math.round(weighted)));

  return {
    overallScore,
    categoryScores,
    counts,
  };
}

export async function recalculateTargetScore(targetId: string, findingsForTarget: FindingDoc[]): Promise<void> {
  const active = findingsForTarget.filter(isActiveFinding);
  let totalPenalty = 0;
  const counts = { critical: 0, high: 0, medium: 0, low: 0, total: active.length };

  for (const f of active) {
    counts[f.severity] += 1;
    const factor = f.status === 'acknowledged' ? 0.65 : 1;
    totalPenalty += (SEVERITY_PENALTY[f.severity] ?? 4) * factor;
  }

  const healthScore = Math.max(8, Math.min(100, Math.round(100 - Math.min(92, totalPenalty))));
  const exposureLevel = getExposureLevel(healthScore);

  await FootprintTargetModel.findByIdAndUpdate(targetId, {
    healthScore,
    exposureLevel,
    findingCounts: counts,
  });
}
