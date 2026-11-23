import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User';
import { FootprintTargetModel } from '../models/FootprintTarget';
import { FindingModel } from '../models/Finding';
import { RemediationTaskModel } from '../models/RemediationTask';
import { ScanReportModel } from '../models/ScanReport';
import { AuditLogModel } from '../models/AuditLog';
import { calculateScoreSummary, recalculateTargetScore } from '../services/riskCalculator';
import { buildOfficerBriefing } from '../services/officerBriefingService';
import { generateObjectId } from '../config/db';

export async function seedDemoData(): Promise<void> {
  const demoEmail = 'demo@sentinel.local';
  const existing = await UserModel.findOne({ email: demoEmail });
  if (existing) return;

  const passwordHash = await bcrypt.hash('SentinelDemo!2026', 10);
  const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const user = await UserModel.create({
    fullName: 'Elena Vance',
    email: demoEmail,
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

  const emailTarget = await FootprintTargetModel.create({
    userId: user._id,
    type: 'email',
    value: 'elena.vance@proton.me',
    label: 'Primary Personal Email',
    status: 'active',
    healthScore: 76,
    exposureLevel: 'moderate',
    lastScannedAt: daysAgo(1),
    findingCounts: { critical: 0, high: 1, medium: 1, low: 0, total: 2 },
  });

  const domainTarget = await FootprintTargetModel.create({
    userId: user._id,
    type: 'domain',
    value: 'elenavance.studio',
    label: 'Portfolio Website',
    status: 'active',
    healthScore: 84,
    exposureLevel: 'moderate',
    lastScannedAt: daysAgo(1),
    findingCounts: { critical: 0, high: 1, medium: 1, low: 0, total: 2 },
  });

  const socialTarget = await FootprintTargetModel.create({
    userId: user._id,
    type: 'social',
    value: '@elenavance',
    label: 'Public Social Handle',
    status: 'active',
    healthScore: 86,
    exposureLevel: 'low',
    lastScannedAt: daysAgo(2),
    findingCounts: { critical: 0, high: 1, medium: 0, low: 1, total: 2 },
  });

  const phoneTarget = await FootprintTargetModel.create({
    userId: user._id,
    type: 'phone',
    value: '+1 (415) 555-0194',
    label: 'Mobile Number',
    status: 'active',
    healthScore: 69,
    exposureLevel: 'moderate',
    lastScannedAt: daysAgo(1),
    findingCounts: { critical: 1, high: 0, medium: 1, low: 0, total: 2 },
  });

  // Historical baseline reports to plot real score progress
  await ScanReportModel.create({
    userId: user._id,
    targetId: null,
    scope: 'full',
    targetLabel: 'Initial Onboarding Baseline (4 assets)',
    overallScore: 58,
    categoryScores: { accountSecurity: 48, brokerExposure: 52, publicMetadata: 68, domainHygiene: 64 },
    summary:
      'Initial onboarding scan identified legacy breach records, unredacted broker listings, and missing domain authentication policies.',
    findingsFound: 10,
    criticalCount: 2,
    highCount: 4,
    mediumCount: 3,
    lowCount: 1,
    durationMs: 640,
    createdAt: daysAgo(21),
  });

  await ScanReportModel.create({
    userId: user._id,
    targetId: null,
    scope: 'full',
    targetLabel: 'Mid-Month Privacy Checkup (4 assets)',
    overallScore: 67,
    categoryScores: { accountSecurity: 66, brokerExposure: 59, publicMetadata: 74, domainHygiene: 70 },
    summary:
      'Password rotation and 2FA upgrades improved Account Security by 18 points. Phone broker removal and DMARC remain open.',
    findingsFound: 8,
    criticalCount: 1,
    highCount: 3,
    mediumCount: 3,
    lowCount: 1,
    durationMs: 510,
    createdAt: daysAgo(9),
  });

  const latestReport = await ScanReportModel.create({
    userId: user._id,
    targetId: null,
    scope: 'full',
    targetLabel: 'Full Footprint Sweep (4 assets)',
    overallScore: 73,
    categoryScores: { accountSecurity: 78, brokerExposure: 61, publicMetadata: 76, domainHygiene: 76 },
    summary: 'Latest scheduled check across all monitored personal assets.',
    findingsFound: 7,
    criticalCount: 1,
    highCount: 3,
    mediumCount: 2,
    lowCount: 1,
    durationMs: 470,
    createdAt: daysAgo(1),
  });

  const seededFindings = await FindingModel.insertMany([
    {
      userId: user._id,
      targetId: phoneTarget._id,
      scanReportId: latestReport._id,
      category: 'brokerExposure',
      severity: 'critical',
      status: 'open',
      title: 'Mobile number listed on 3 public people-search directories',
      plainSummary:
        'Your mobile number appears on consumer lookup sites alongside your current city and prior mailing address.',
      whyItMatters:
        'Publicly searchable phone numbers increase spam calls and raise the risk of carrier SIM-swap account takeovers.',
      evidence: 'Matched 3 active people-finder indexes during scheduled directory check.',
      sourceName: 'People-Search Directory Audit',
      impactPoints: 15,
      recommendedSteps: [
        'Enable a Carrier Port-Out PIN with your mobile service provider.',
        'Submit opt-out removal forms on the 3 indexed people-search sites.',
        'Switch bank and email 2FA away from SMS to an authenticator app.',
      ],
      detectedAt: daysAgo(1),
      resolvedAt: null,
    },
    {
      userId: user._id,
      targetId: emailTarget._id,
      scanReportId: latestReport._id,
      category: 'brokerExposure',
      severity: 'high',
      status: 'open',
      title: 'Primary email correlated with retail marketing data brokers',
      plainSummary:
        'Using your main personal email for online shopping and newsletters has linked it to commercial marketing profiles.',
      whyItMatters:
        'Broker leaks frequently trigger targeted phishing emails disguised as delivery or billing alerts.',
      evidence: 'Address correlated across 4 retail loyalty & audience-enrichment lists.',
      sourceName: 'Data Broker Index',
      impactPoints: 10,
      recommendedSteps: [
        'Create masked email aliases for retail and newsletter signups.',
        'Submit a bulk marketing opt-out request for elena.vance@proton.me.',
      ],
      detectedAt: daysAgo(1),
      resolvedAt: null,
    },
    {
      userId: user._id,
      targetId: domainTarget._id,
      scanReportId: latestReport._id,
      category: 'domainHygiene',
      severity: 'high',
      status: 'open',
      title: 'DMARC email policy on elenavance.studio is monitor-only (p=none)',
      plainSummary:
        'Your personal website domain publishes a DMARC record, but it does not yet instruct inbox providers to block spoofed messages.',
      whyItMatters:
        'Impersonators could send fraudulent invoices or portfolio inquiries that appear to come from your studio domain.',
      evidence: '_dmarc.elenavance.studio TXT record currently evaluates to v=DMARC1; p=none.',
      sourceName: 'DNS Security Audit',
      impactPoints: 9,
      recommendedSteps: [
        'Update your _dmarc TXT record from p=none to p=quarantine.',
        'Confirm your SPF record ends with ~all or -all.',
      ],
      detectedAt: daysAgo(1),
      resolvedAt: null,
    },
    {
      userId: user._id,
      targetId: socialTarget._id,
      scanReportId: latestReport._id,
      category: 'publicMetadata',
      severity: 'high',
      status: 'open',
      title: 'Handle @elenavance reused across 6 public community & portfolio sites',
      plainSummary:
        'Your exact social handle links your current design studio profiles with several older forum accounts from 2018–2021.',
      whyItMatters:
        'Anyone searching your handle can assemble a timeline of past hobbies, locations, and old bios.',
      evidence: 'Matched @elenavance across 6 indexed social and developer communities.',
      sourceName: 'Handle Correlation Check',
      impactPoints: 8,
      recommendedSteps: [
        'Close or rename inactive forum accounts still using @elenavance.',
        'Turn off search engine indexing in privacy settings on active social accounts.',
      ],
      detectedAt: daysAgo(2),
      resolvedAt: null,
    },
    {
      userId: user._id,
      targetId: emailTarget._id,
      scanReportId: latestReport._id,
      category: 'accountSecurity',
      severity: 'medium',
      status: 'acknowledged',
      title: 'Legacy photo-printing account from 2020 breach still unverified',
      plainSummary:
        'Your email appeared in an older 2020 consumer print service breach. You likely changed your password, though the old account may still exist.',
      whyItMatters:
        'Deleting dormant breached accounts reduces the surface area for future credential leaks.',
      evidence: 'Breach archive correlation (2020 consumer print vendor; hashed credentials).',
      sourceName: 'Public Breach Archive Check',
      impactPoints: 5,
      recommendedSteps: [
        'Request full account deletion from the legacy vendor support page.',
        'Verify no other account shares that 2020 password.',
      ],
      detectedAt: daysAgo(9),
      resolvedAt: null,
    },
    {
      userId: user._id,
      targetId: domainTarget._id,
      scanReportId: latestReport._id,
      category: 'publicMetadata',
      severity: 'medium',
      status: 'open',
      title: 'Domain registrant city visible in public RDAP record',
      plainSummary:
        'While your name and email are redacted, your city and state remain visible in public domain lookup records.',
      whyItMatters:
        'Limits geographic anonymity for solo practitioners working from home.',
      evidence: 'RDAP query returned administrative locality field without full proxy redaction.',
      sourceName: 'Domain WHOIS Privacy Check',
      impactPoints: 4,
      recommendedSteps: [
        'Enable full registrar WHOIS proxy privacy in your domain registrar dashboard.',
      ],
      detectedAt: daysAgo(1),
      resolvedAt: null,
    },
    {
      userId: user._id,
      targetId: socialTarget._id,
      scanReportId: latestReport._id,
      category: 'publicMetadata',
      severity: 'low',
      status: 'open',
      title: 'Public follower list & tagged photo settings open to non-followers',
      plainSummary:
        'Your social profile allows anyone online to browse your connections and tagged photos without signing in.',
      whyItMatters:
        'Makes it easier for impersonation accounts to copy your connections list.',
      evidence: 'Public profile privacy check flagged open follower visibility.',
      sourceName: 'Social Privacy Hygiene',
      impactPoints: 3,
      recommendedSteps: [
        'Set "Require approval for tagged photos" in your social account settings.',
      ],
      detectedAt: daysAgo(2),
      resolvedAt: null,
    },
    {
      userId: user._id,
      targetId: emailTarget._id,
      scanReportId: latestReport._id,
      category: 'accountSecurity',
      severity: 'critical',
      status: 'resolved',
      title: 'Primary inbox lacking hardware or app-based two-factor protection',
      plainSummary:
        'Your primary inbox previously relied on password-only login from new browsers.',
      whyItMatters:
        'Protecting your primary email blocks password-reset hijacking across every linked service.',
      evidence: 'Resolved by user: Authenticator app 2FA and recovery codes verified.',
      sourceName: 'Account Posture Check',
      impactPoints: 18,
      recommendedSteps: ['Enable TOTP authenticator app 2FA.', 'Store backup recovery codes offline.'],
      detectedAt: daysAgo(21),
      resolvedAt: daysAgo(9),
    },
  ]);

  await RemediationTaskModel.insertMany(
    seededFindings.map((f) => ({
      userId: user._id,
      findingId: f._id,
      targetId: f.targetId,
      title: f.title,
      description: f.plainSummary,
      category: f.category,
      severity: f.severity,
      status: f.status === 'resolved' ? ('completed' as const) : ('todo' as const),
      impactPoints: f.impactPoints,
      estimatedMinutes: f.severity === 'critical' ? 10 : f.severity === 'high' ? 7 : 4,
      steps: f.recommendedSteps.map((label, idx) => ({
        id: generateObjectId(),
        label,
        done: f.status === 'resolved' || (f.status === 'acknowledged' && idx === 0),
      })),
      completedAt: f.status === 'resolved' ? daysAgo(9) : null,
    }))
  );

  // Recalculate exact live scores so all numbers align transparently
  for (const target of [emailTarget, domainTarget, socialTarget, phoneTarget]) {
    const tf = seededFindings.filter((f) => f.targetId === target._id);
    await recalculateTargetScore(target._id, tf);
  }

  const scoreSummary = calculateScoreSummary(seededFindings);
  const briefing = buildOfficerBriefing(
    scoreSummary.overallScore,
    scoreSummary.categoryScores,
    seededFindings,
    'calm'
  );
  await ScanReportModel.findByIdAndUpdate(latestReport._id, {
    overallScore: scoreSummary.overallScore,
    categoryScores: scoreSummary.categoryScores,
    summary: briefing.narrative,
  });

  await AuditLogModel.insertMany([
    {
      userId: user._id,
      action: 'scan.full_sweep',
      actorLabel: 'Elena Vance',
      summary: `Completed scheduled footprint sweep across 4 monitored assets (Score: ${scoreSummary.overallScore}/100).`,
      metadata: { overallScore: scoreSummary.overallScore },
      createdAt: daysAgo(1),
    },
    {
      userId: user._id,
      action: 'finding.resolved',
      actorLabel: 'Elena Vance',
      summary: 'Enabled authenticator app 2FA on Primary Personal Email (+18 health impact).',
      metadata: {},
      createdAt: daysAgo(9),
    },
    {
      userId: user._id,
      action: 'target.added',
      actorLabel: 'Elena Vance',
      summary: 'Added Portfolio Website (elenavance.studio) to footprint monitoring.',
      metadata: {},
      createdAt: daysAgo(21),
    },
  ]);

  console.log('[Seed] Initialized demo officer workspace for demo@sentinel.local');
}
