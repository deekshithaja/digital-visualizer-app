import { FindingDoc, FindingCategory } from '../models/Finding';
import { CategoryScores } from '../models/ScanReport';
import { isActiveFinding } from './riskCalculator';

const CATEGORY_LABELS: Record<FindingCategory, string> = {
  accountSecurity: 'Account & Credential Security',
  brokerExposure: 'Data Broker Exposure',
  publicMetadata: 'Public Profile & Metadata',
  domainHygiene: 'Domain & Email Hygiene',
};

export interface OfficerBriefing {
  headline: string;
  narrative: string;
  topRecommendation: string;
  weakestCategory: FindingCategory;
  weakestCategoryLabel: string;
  postureLabel: 'Strong Posture' | 'Manageable Exposure' | 'Needs Attention' | 'Priority Action Advised';
}

export function buildOfficerBriefing(
  overallScore: number,
  categoryScores: CategoryScores,
  findings: FindingDoc[],
  tone: 'calm' | 'concise' = 'calm'
): OfficerBriefing {
  const active = findings.filter(isActiveFinding);
  const criticalCount = active.filter((f) => f.severity === 'critical').length;
  const highCount = active.filter((f) => f.severity === 'high').length;

  const entries = Object.entries(categoryScores) as [FindingCategory, number][];
  entries.sort((a, b) => a[1] - b[1]);
  const [weakestCategory, weakestScore] = entries[0];
  const weakestCategoryLabel = CATEGORY_LABELS[weakestCategory];

  let postureLabel: OfficerBriefing['postureLabel'] = 'Strong Posture';
  if (overallScore < 50) postureLabel = 'Priority Action Advised';
  else if (overallScore < 72) postureLabel = 'Needs Attention';
  else if (overallScore < 86) postureLabel = 'Manageable Exposure';

  const topFinding = [...active].sort((a, b) => b.impactPoints - a.impactPoints)[0];

  if (active.length === 0) {
    return {
      headline: 'Your monitored footprint looks quiet and well-protected.',
      narrative:
        tone === 'concise'
          ? 'No active exposures detected across your monitored assets. Maintain your current MFA and privacy habits.'
          : 'Everything across your monitored email addresses, domains, and public handles is in good order. No active risks require your attention today—just keep periodic scans running so new changes are caught early.',
      topRecommendation: 'Add another email alias or personal domain if you want broader coverage.',
      weakestCategory,
      weakestCategoryLabel,
      postureLabel: 'Strong Posture',
    };
  }

  let headline = '';
  if (criticalCount > 0) {
    headline = `${criticalCount} critical exposure${criticalCount > 1 ? 's' : ''} deserve${criticalCount === 1 ? 's' : ''} a quick review today.`;
  } else if (highCount > 0) {
    headline = `Your footprint is mostly stable, with ${highCount} high-priority item${highCount > 1 ? 's' : ''} to tighten up.`;
  } else {
    headline = 'Overall posture is calm—only minor privacy cleanup remains.';
  }

  const narrative =
    tone === 'concise'
      ? `Privacy Health Score is ${overallScore}/100 across ${active.length} active findings. Lowest pillar: ${weakestCategoryLabel} (${weakestScore}/100).`
      : `Your Privacy Health Score currently stands at ${overallScore} out of 100, with ${active.length} open item${active.length === 1 ? '' : 's'} across your digital footprint. Most of your score reduction stems from ${weakestCategoryLabel} (${weakestScore}/100). Resolving just the top one or two items below will meaningfully shrink what strangers and automated scrapers can see.`;

  const topRecommendation = topFinding
    ? `Start with "${topFinding.title}" — completing this step restores up to +${topFinding.impactPoints} health points.`
    : 'Review your open items in the Action Center.';

  return {
    headline,
    narrative,
    topRecommendation,
    weakestCategory,
    weakestCategoryLabel,
    postureLabel,
  };
}
