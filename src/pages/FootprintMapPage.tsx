import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Network, Search } from 'lucide-react';
import { api } from '../services/api';
import { Finding, FindingStatus, FootprintTarget, SeverityLevel } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FootprintGraph } from '../components/map/FootprintGraph';
import { FindingDetailDrawer } from '../components/map/FindingDetailDrawer';
import { RiskBadge, StatusIndicator } from '../components/common/RiskBadge';
import { SkeletonCard, SkeletonTableRows } from '../components/common/SkeletonCard';
import { EmptyState } from '../components/common/EmptyState';

interface ShellContext {
  refreshKey: number;
  triggerRefresh: () => void;
  openAddTarget: () => void;
}

export function FootprintMapPage() {
  const { user } = useAuth();
  const { refreshKey, triggerRefresh, openAddTarget } = useOutletContext<ShellContext>();
  const { showToast } = useToast();

  const [targets, setTargets] = useState<FootprintTarget[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetFilter, setTargetFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | SeverityLevel>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'resolved'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [updating, setUpdating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, fRes] = await Promise.all([api.targets.list(), api.findings.list()]);
      setTargets(tRes.targets);
      setFindings(fRes.findings);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Could not load footprint map',
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshKey]);

  const filteredFindings = findings.filter((f) => {
    if (targetFilter !== 'all' && f.targetId !== targetFilter) return false;
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    if (statusFilter === 'active' && (f.status === 'resolved' || f.status === 'false_positive')) {
      return false;
    }
    if (statusFilter === 'resolved' && f.status !== 'resolved' && f.status !== 'false_positive') {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        f.plainSummary.toLowerCase().includes(q) ||
        (f.targetLabel || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleUpdateStatus = async (findingId: string, status: FindingStatus) => {
    setUpdating(true);
    try {
      const res = await api.findings.updateStatus(findingId, status);
      setFindings((prev) => prev.map((f) => (f._id === findingId ? { ...f, ...res.finding } : f)));
      setSelectedFinding((prev) => (prev && prev._id === findingId ? { ...prev, ...res.finding } : prev));
      showToast({
        type: 'success',
        title: `Marked as ${status.replace('_', ' ')}`,
        description: `Updated Privacy Health Score: ${res.overallScore}/100.`,
      });
      triggerRefresh();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Status update failed',
        description: (err as Error).message,
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading && targets.length === 0) {
    return (
      <div className="space-y-6">
        <SkeletonCard lines={6} />
        <div className="rounded-xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32]">
          <SkeletonTableRows rows={4} />
        </div>
      </div>
    );
  }

  if (targets.length === 0) {
    return (
      <EmptyState
        icon={Network}
        title="No assets mapped yet"
        description="Add an email, domain, social handle, or phone number to visualize how your online exposures connect."
        actionLabel="Add Asset"
        onAction={openAddTarget}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            aria-label="Filter by asset"
            className="rounded-lg border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#050F20] px-3 py-1.5 text-xs font-medium text-[#F4F7FF] dark:text-slate-200 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Assets ({targets.length})</option>
            {targets.map((t) => (
              <option key={t._id} value={t._id}>
                {t.label} ({t.type})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-[#172641] p-1">
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors cursor-pointer whitespace-nowrap ${
                  severityFilter === sev
                    ? 'bg-[#172641] dark:bg-[#101B32] text-[#F4F7FF] dark:text-[#F4F7FF] shadow-xs'
                    : 'text-[#A9B7CE] dark:text-[#A9B7CE] hover:text-[#F4F7FF] dark:hover:text-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-[#172641] p-1">
            {(
              [
                { id: 'active', label: 'Active' },
                { id: 'resolved', label: 'Resolved' },
                { id: 'all', label: 'All' },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === st.id
                    ? 'bg-[#172641] dark:bg-[#101B32] text-[#F4F7FF] dark:text-[#F4F7FF] shadow-xs'
                    : 'text-[#A9B7CE] dark:text-[#A9B7CE] hover:text-[#F4F7FF] dark:hover:text-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full lg:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#A9B7CE]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search findings..."
            className="w-full rounded-lg border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#050F20] pl-8 pr-3 py-1.5 text-xs text-[#F4F7FF] dark:text-[#F4F7FF] placeholder:text-[#A9B7CE] focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Interactive SVG Node Map */}
      <FootprintGraph
        ownerName={user?.fullName || 'You'}
        targets={
          targetFilter === 'all' ? targets : targets.filter((t) => t._id === targetFilter)
        }
        findings={filteredFindings}
        selectedFindingId={selectedFinding?._id || null}
        onSelectFinding={(f) => setSelectedFinding(f)}
        onSelectTarget={(tid) => setTargetFilter((prev) => (prev === tid ? 'all' : tid))}
      />

      {/* Findings Breakdown Table */}
      <section className="rounded-2xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[#263653] dark:border-[#263653] px-5 py-4">
          <h2 className="font-display text-base font-semibold text-[#F4F7FF] dark:text-[#F4F7FF]">
            Findings ({filteredFindings.length})
          </h2>
          <span className="text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">
            Click any item to fix
          </span>
        </div>

        {filteredFindings.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[#A9B7CE] dark:text-[#A9B7CE]">
            No findings match your current filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredFindings.map((finding) => (
              <button
                key={finding._id}
                type="button"
                onClick={() => setSelectedFinding(finding)}
                className="flex w-full flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-[#050F20] dark:hover:bg-[#172641]/40 transition-colors cursor-pointer"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <RiskBadge severity={finding.severity} />
                    <StatusIndicator status={finding.status} />
                    <span className="text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">
                      {finding.targetLabel} · {finding.sourceName}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[#F4F7FF] dark:text-[#F4F7FF] truncate">
                    {finding.title}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-xs text-[#A9B7CE] dark:text-[#A9B7CE] tabular-nums">
                  <span>+{finding.impactPoints} pts</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">Inspect</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <FindingDetailDrawer
        finding={selectedFinding}
        updating={updating}
        onClose={() => setSelectedFinding(null)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
