import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Globe,
  Mail,
  Pause,
  Phone,
  Play,
  Plus,
  Radar,
  RefreshCw,
  Shield,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { FootprintTarget, TargetType } from '../types';
import { useToast } from '../context/ToastContext';
import { EmptyState } from '../components/common/EmptyState';
import { SkeletonTableRows } from '../components/common/SkeletonCard';

interface ShellContext {
  refreshKey: number;
  triggerRefresh: () => void;
  openAddTarget: () => void;
}

const TYPE_ICONS: Record<TargetType, typeof Mail> = {
  email: Mail,
  domain: Globe,
  social: UserCheck,
  phone: Phone,
  alias: Shield,
};

export function TargetsPage() {
  const { refreshKey, triggerRefresh, openAddTarget } = useOutletContext<ShellContext>();
  const { showToast } = useToast();

  const [targets, setTargets] = useState<FootprintTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [sweeping, setSweeping] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadTargets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.targets.list();
      setTargets(res.targets);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Failed to load targets',
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadTargets();
  }, [loadTargets, refreshKey]);

  const handleScanOne = async (target: FootprintTarget) => {
    setScanningId(target._id);
    try {
      const res = await api.targets.scan(target._id);
      showToast({
        type: 'success',
        title: `Scanned ${target.label}`,
        description: `Found ${res.findings.length} open item(s). Overall score: ${res.overallScore}/100.`,
      });
      triggerRefresh();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Scan failed',
        description: (err as Error).message,
      });
    } finally {
      setScanningId(null);
    }
  };

  const handleFullSweep = async () => {
    setSweeping(true);
    try {
      const res = await api.targets.sweep();
      showToast({
        type: 'success',
        title: 'Full footprint sweep complete',
        description: `Updated overall Privacy Health Score: ${res.overallScore}/100.`,
      });
      triggerRefresh();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Sweep failed',
        description: (err as Error).message,
      });
    } finally {
      setSweeping(false);
    }
  };

  const handleTogglePause = async (target: FootprintTarget) => {
    const nextStatus = target.status === 'active' ? 'paused' : 'active';
    try {
      const res = await api.targets.update(target._id, { status: nextStatus });
      setTargets((prev) => prev.map((t) => (t._id === target._id ? res.target : t)));
      showToast({
        type: 'info',
        title: nextStatus === 'paused' ? 'Monitoring paused' : 'Monitoring resumed',
        description: target.label,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Update failed',
        description: (err as Error).message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.targets.remove(id);
      setTargets((prev) => prev.filter((t) => t._id !== id));
      setConfirmDeleteId(null);
      showToast({
        type: 'info',
        title: 'Asset removed from monitoring',
      });
      triggerRefresh();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Removal failed',
        description: (err as Error).message,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-sm text-[#A9B7CE] dark:text-[#A9B7CE]">
          Emails, domains, handles, and phone numbers being checked.
        </p>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={sweeping || targets.length === 0}
            onClick={() => void handleFullSweep()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] px-3.5 py-2 text-xs sm:text-sm font-medium text-[#F4F7FF] dark:text-slate-200 hover:bg-[#050F20] dark:hover:bg-[#172641] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`h-4 w-4 ${sweeping ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{sweeping ? 'Scanning...' : 'Scan All'}</span>
          </button>

          <button
            type="button"
            onClick={openAddTarget}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      {loading && targets.length === 0 ? (
        <div className="rounded-2xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32]">
          <SkeletonTableRows rows={4} />
        </div>
      ) : targets.length === 0 ? (
        <EmptyState
          icon={Radar}
          title="No assets yet"
          description="Add an email, domain, or handle to start scanning."
          actionLabel="Add Asset"
          onAction={openAddTarget}
        />
      ) : (
        <div className="rounded-2xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#263653] dark:border-[#263653] text-xs font-medium text-[#A9B7CE] dark:text-[#A9B7CE]">
                  <th className="px-5 py-3.5">Asset</th>
                  <th className="px-4 py-3.5">Identifier</th>
                  <th className="px-4 py-3.5 text-right">Health Score</th>
                  <th className="px-4 py-3.5 text-right">Open Items</th>
                  <th className="px-4 py-3.5">Last Scanned</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {targets.map((target) => {
                  const Icon = TYPE_ICONS[target.type] || Shield;
                  const scoreColor =
                    target.healthScore >= 85
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : target.healthScore >= 65
                      ? 'text-blue-600 dark:text-blue-400'
                      : target.healthScore >= 50
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400';

                  return (
                    <tr
                      key={target._id}
                      className="hover:bg-[#050F20]/70 dark:hover:bg-[#172641]/30 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#263653] dark:border-[#263653] bg-[#050F20] dark:bg-[#172641] text-[#A9B7CE] dark:text-[#F4F7FF] shrink-0">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="font-medium text-[#F4F7FF] dark:text-[#F4F7FF]">
                              {target.label}
                            </p>
                            <p className="text-xs text-[#A9B7CE] dark:text-[#A9B7CE] capitalize">
                              {target.type} · {target.status}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-xs text-[#F4F7FF] dark:text-[#F4F7FF]">
                        {target.value}
                      </td>

                      <td className={`px-4 py-3.5 text-right font-mono font-semibold tabular-nums ${scoreColor}`}>
                        {target.healthScore}/100
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono text-[#F4F7FF] dark:text-[#F4F7FF] tabular-nums">
                        {target.findingCounts.total}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-[#A9B7CE] dark:text-[#A9B7CE] tabular-nums whitespace-nowrap">
                        {target.lastScannedAt
                          ? new Date(target.lastScannedAt).toLocaleDateString()
                          : 'Not yet scanned'}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={scanningId === target._id}
                            onClick={() => void handleScanOne(target)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[#263653] dark:border-[#263653] px-2.5 py-1.5 text-xs font-medium text-[#F4F7FF] dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-300 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <RefreshCw
                              className={`h-3 w-3 ${scanningId === target._id ? 'animate-spin' : ''}`}
                              aria-hidden="true"
                            />
                            <span>{scanningId === target._id ? 'Scanning' : 'Scan Now'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleTogglePause(target)}
                            className="rounded-md border border-[#263653] dark:border-[#263653] p-1.5 text-[#A9B7CE] dark:text-[#F4F7FF] hover:bg-slate-100 dark:hover:bg-[#172641] cursor-pointer"
                            title={target.status === 'active' ? 'Pause monitoring' : 'Resume monitoring'}
                            aria-label={target.status === 'active' ? 'Pause monitoring' : 'Resume monitoring'}
                          >
                            {target.status === 'active' ? (
                              <Pause className="h-3.5 w-3.5" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {confirmDeleteId === target._id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => void handleDelete(target._id)}
                                className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-md border border-[#263653] dark:border-[#263653] px-2 py-1 text-xs text-[#A9B7CE] dark:text-[#F4F7FF] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(target._id)}
                              className="rounded-md border border-[#263653] dark:border-[#263653] p-1.5 text-[#A9B7CE] hover:border-red-300 hover:text-red-600 dark:hover:border-red-800 dark:hover:text-red-400 cursor-pointer"
                              title="Remove asset"
                              aria-label="Remove asset"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
