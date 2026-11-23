import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import { FindingStatus, SeverityLevel } from '../../types';

const SEVERITY_CONFIG: Record<
  SeverityLevel,
  { label: string; classes: string; Icon: typeof ShieldAlert }
> = {
  critical: {
    label: 'Critical',
    classes:
      'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300',
    Icon: ShieldAlert,
  },
  high: {
    label: 'High',
    classes:
      'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/50 dark:text-orange-300',
    Icon: AlertTriangle,
  },
  medium: {
    label: 'Medium',
    classes:
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300',
    Icon: Info,
  },
  low: {
    label: 'Low',
    classes:
      'border-[#263653] bg-slate-100 text-[#F4F7FF] dark:border-[#263653] dark:bg-[#172641] dark:text-[#F4F7FF]',
    Icon: Info,
  },
};

export function RiskBadge({ severity }: { severity: SeverityLevel }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.medium;
  const Icon = cfg.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap shrink-0 ${cfg.classes}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{cfg.label}</span>
    </span>
  );
}

const STATUS_CONFIG: Record<FindingStatus, { label: string; classes: string }> = {
  open: {
    label: 'Open',
    classes: 'text-red-700 dark:text-red-300',
  },
  acknowledged: {
    label: 'In Review',
    classes: 'text-amber-700 dark:text-amber-300',
  },
  resolved: {
    label: 'Resolved',
    classes: 'text-emerald-700 dark:text-emerald-300',
  },
  false_positive: {
    label: 'Dismissed',
    classes: 'text-[#A9B7CE] dark:text-[#A9B7CE]',
  },
};

export function StatusIndicator({ status }: { status: FindingStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap ${cfg.classes}`}>
      {status === 'resolved' && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      <span>{cfg.label}</span>
    </span>
  );
}
