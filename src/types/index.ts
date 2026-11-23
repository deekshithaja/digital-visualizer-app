export type TargetType = 'email' | 'domain' | 'social' | 'phone' | 'alias';
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
export type FindingCategory = 'accountSecurity' | 'brokerExposure' | 'publicMetadata' | 'domainHygiene';
export type FindingStatus = 'open' | 'acknowledged' | 'resolved' | 'false_positive';
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'dismissed';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  briefingTone: 'calm' | 'concise';
  scanFrequency: 'weekly' | 'monthly' | 'manual';
  emailAlerts: boolean;
}

export interface User {
  _id: string;
  fullName: string;
  email: string;
  avatarUrl: string;
  role: 'member';
  preferences: UserPreferences;
  createdAt: string;
}

export interface FootprintTarget {
  _id: string;
  userId: string;
  type: TargetType;
  value: string;
  label: string;
  status: 'active' | 'paused';
  healthScore: number;
  exposureLevel: 'low' | 'moderate' | 'elevated' | 'critical';
  lastScannedAt: string | null;
  findingCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  createdAt: string;
}

export interface Finding {
  _id: string;
  userId: string;
  targetId: string;
  scanReportId: string;
  category: FindingCategory;
  severity: SeverityLevel;
  status: FindingStatus;
  title: string;
  plainSummary: string;
  whyItMatters: string;
  evidence: string;
  sourceName: string;
  impactPoints: number;
  recommendedSteps: string[];
  detectedAt: string;
  resolvedAt: string | null;
  targetLabel?: string;
  targetValue?: string;
  targetType?: TargetType;
}

export interface TaskStep {
  id: string;
  label: string;
  done: boolean;
}

export interface RemediationTask {
  _id: string;
  userId: string;
  findingId: string | null;
  targetId: string | null;
  title: string;
  description: string;
  category: FindingCategory;
  severity: SeverityLevel;
  status: TaskStatus;
  impactPoints: number;
  estimatedMinutes: number;
  steps: TaskStep[];
  completedAt: string | null;
  createdAt: string;
  targetLabel?: string;
  targetValue?: string;
}

export interface CategoryScores {
  accountSecurity: number;
  brokerExposure: number;
  publicMetadata: number;
  domainHygiene: number;
}

export interface ScanReport {
  _id: string;
  userId: string;
  targetId: string | null;
  scope: 'single' | 'full';
  targetLabel: string;
  overallScore: number;
  categoryScores: CategoryScores;
  summary: string;
  findingsFound: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  durationMs: number;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  userId: string;
  action: string;
  actorLabel: string;
  summary: string;
  createdAt: string;
}

export interface OfficerBriefing {
  headline: string;
  narrative: string;
  topRecommendation: string;
  weakestCategory: FindingCategory;
  weakestCategoryLabel: string;
  postureLabel: 'Strong Posture' | 'Manageable Exposure' | 'Needs Attention' | 'Priority Action Advised';
}

export interface DashboardOverview {
  overallScore: number;
  categoryScores: CategoryScores;
  findingCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  targetsCount: number;
  completedTasksCount: number;
  resolvedFindingsCount: number;
  lastScanAt: string | null;
  briefing: OfficerBriefing;
  priorityTasks: RemediationTask[];
  scoreHistory: Array<{
    id: string;
    date: string;
    score: number;
    label: string;
    scope: 'single' | 'full';
  }>;
  findingsTrend: Array<{
    date: string;
    label: string;
    discovered: number;
    resolved: number;
  }>;
  recentLogs: AuditLog[];
  targets: FootprintTarget[];
}

export interface DemoBreachMaskedFields {
  email: string;
  username?: string;
  phone?: string;
  ip_address?: string;
}

export interface DemoBreachCheckResult {
  _id?: string;
  found: boolean;
  provenance: 'simulated';
  badge: 'SIMULATED DEMO DATA';
  dataset: string;
  disclaimer: string;
  breach_source: string | null;
  breach_date: string | null;
  account_status: 'active' | 'deactivated' | 'password_reset_required' | null;
  exposed_data_classes: string[];
  severity: 'high' | 'medium' | 'low' | 'none';
  masked_fields: DemoBreachMaskedFields;
  message: string;
  checkedAt: string;
}

export interface DemoBreachDatasetInfo {
  provenance: 'simulated';
  badge: 'SIMULATED DEMO DATA';
  dataset_name: string;
  disclaimer: string;
  record_count: number;
  seeded_record_count: number;
  generated_at: string;
  breach_sources: string[];
}

export interface DemoBreachListResponse {
  provenance: 'simulated';
  badge: 'SIMULATED DEMO DATA';
  dataset: string;
  disclaimer: string;
  breaches: DemoBreachCheckResult[];
}

