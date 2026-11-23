import { CheckCircle2, Eye, RotateCcw, ShieldOff, X } from 'lucide-react';
import { Finding, FindingStatus } from '../../types';
import { RiskBadge, StatusIndicator } from '../common/RiskBadge';

interface FindingDetailDrawerProps {
  finding: Finding | null;
  updating: boolean;
  onClose: () => void;
  onUpdateStatus: (findingId: string, status: FindingStatus) => Promise<void>;
}

const CATEGORY_NAMES: Record<string, string> = {
  accountSecurity: 'Account Security',
  brokerExposure: 'Broker Exposure',
  publicMetadata: 'Public Metadata',
  domainHygiene: 'Domain Hygiene',
};

export function FindingDetailDrawer({
  finding,
  updating,
  onClose,
  onUpdateStatus,
}: FindingDetailDrawerProps) {
  if (!finding) return null;

  const isClosed = finding.status === 'resolved' || finding.status === 'false_positive';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-[#050F20]/40 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="finding-drawer-title"
        className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#263653] dark:border-[#263653] px-6 py-5">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <RiskBadge severity={finding.severity} />
              <StatusIndicator status={finding.status} />
              <span className="text-xs text-[#A9B7CE] dark:text-[#A9B7CE] tabular-nums">
                +{finding.impactPoints} pts on resolution
              </span>
            </div>
            <h2
              id="finding-drawer-title"
              className="font-display text-lg font-semibold text-[#F4F7FF] dark:text-[#F4F7FF] leading-snug"
            >
              {finding.title}
            </h2>
            <p className="text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">
              {finding.targetLabel || 'Asset'} · {CATEGORY_NAMES[finding.category] || finding.category} ·{' '}
              {finding.sourceName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#A9B7CE] hover:bg-slate-100 hover:text-[#A9B7CE] dark:hover:bg-[#172641] dark:hover:text-slate-200 cursor-pointer shrink-0"
            aria-label="Close finding details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A9B7CE] dark:text-[#A9B7CE]">
              What We Found
            </h3>
            <p className="mt-2 text-sm text-[#F4F7FF] dark:text-[#F4F7FF] leading-relaxed">
              {finding.plainSummary}
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A9B7CE] dark:text-[#A9B7CE]">
              Why It Matters
            </h3>
            <p className="mt-2 text-sm text-[#F4F7FF] dark:text-[#F4F7FF] leading-relaxed">
              {finding.whyItMatters}
            </p>
          </section>

          <section className="rounded-lg border border-[#263653] dark:border-[#263653] bg-[#050F20] dark:bg-[#050F20]/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A9B7CE] dark:text-[#A9B7CE]">
              Observed Signal
            </h3>
            <p className="mt-1.5 font-mono text-xs text-[#F4F7FF] dark:text-[#F4F7FF] leading-relaxed">
              {finding.evidence}
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A9B7CE] dark:text-[#A9B7CE]">
              Recommended Steps
            </h3>
            <ol className="mt-2.5 space-y-2.5">
              {finding.recommendedSteps.map((step, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-lg border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#050F20]/40 px-3.5 py-2.5 text-sm text-[#F4F7FF] dark:text-[#F4F7FF]"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-[#172641] font-mono text-xs font-semibold text-[#F4F7FF] dark:text-[#F4F7FF] tabular-nums">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="border-t border-[#263653] dark:border-[#263653] bg-[#050F20] dark:bg-[#050F20]/60 px-6 py-4 flex flex-wrap items-center justify-between gap-2.5">
          {!isClosed ? (
            <>
              <div className="flex items-center gap-2">
                {finding.status === 'open' && (
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => void onUpdateStatus(finding._id, 'acknowledged')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] px-3 py-2 text-xs font-medium text-[#F4F7FF] dark:text-[#F4F7FF] hover:bg-slate-100 dark:hover:bg-[#172641] cursor-pointer whitespace-nowrap"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Mark In Review</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => void onUpdateStatus(finding._id, 'false_positive')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] px-3 py-2 text-xs font-medium text-[#A9B7CE] dark:text-[#A9B7CE] hover:bg-slate-100 dark:hover:bg-[#172641] cursor-pointer whitespace-nowrap"
                >
                  <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Dismiss</span>
                </button>
              </div>
              <button
                type="button"
                disabled={updating}
                onClick={() => void onUpdateStatus(finding._id, 'resolved')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>{updating ? 'Saving...' : 'Mark Resolved'}</span>
              </button>
            </>
          ) : (
            <div className="flex w-full items-center justify-between gap-3">
              <span className="text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">
                Closed on {finding.resolvedAt ? new Date(finding.resolvedAt).toLocaleDateString() : 'record'}
              </span>
              <button
                type="button"
                disabled={updating}
                onClick={() => void onUpdateStatus(finding._id, 'open')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] px-3.5 py-2 text-xs font-medium text-[#F4F7FF] dark:text-[#F4F7FF] hover:bg-slate-100 dark:hover:bg-[#172641] cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reopen Item</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
