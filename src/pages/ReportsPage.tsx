import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Download, FileText } from 'lucide-react';
import { api, getStoredToken } from '../services/api';
import { ScanReport } from '../types';
import { useToast } from '../context/ToastContext';
import { EmptyState } from '../components/common/EmptyState';
import { SkeletonTableRows } from '../components/common/SkeletonCard';

interface ShellContext {
  refreshKey: number;
  openAddTarget: () => void;
}

export function ReportsPage() {
  const { refreshKey, openAddTarget } = useOutletContext<ShellContext>();
  const { showToast } = useToast();

  const [reports, setReports] = useState<ScanReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.reports.list();
      setReports(res.reports);
      if (res.reports.length > 0) {
        setSelectedReport((prev) => prev || res.reports[0]);
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Could not load scan reports',
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadReports();
  }, [loadReports, refreshKey]);

  const handleDownload = async (reportId: string, format: 'markdown' | 'json') => {
    try {
      const token = getStoredToken();
      const res = await fetch(api.reports.exportUrl(reportId, format), {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `footprint-briefing-${reportId.slice(0, 8)}.${format === 'markdown' ? 'md' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast({ type: 'success', title: `Downloaded ${format.toUpperCase()} briefing` });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Export failed',
        description: (err as Error).message,
      });
    }
  };

  if (loading && reports.length === 0) {
    return (
      <div className="rounded-xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32]">
        <SkeletonTableRows rows={5} />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No scan reports recorded yet"
        description="Add and scan an asset to generate your first downloadable Cybersecurity Officer briefing."
        actionLabel="Add Asset"
        onAction={openAddTarget}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <section className="lg:col-span-7 rounded-2xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] overflow-hidden">
        <div className="border-b border-[#263653] dark:border-[#263653] px-5 py-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-[#F4F7FF] dark:text-[#F4F7FF]">
            Past Scans ({reports.length})
          </h2>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {reports.map((report) => {
            const active = selectedReport?._id === report._id;
            return (
              <button
                key={report._id}
                type="button"
                onClick={() => setSelectedReport(report)}
                className={`flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-blue-950/40/60 dark:bg-blue-950/30'
                    : 'hover:bg-[#050F20] dark:hover:bg-[#172641]/40'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#F4F7FF] dark:text-[#F4F7FF] truncate">
                    {report.targetLabel}
                  </p>
                  <p className="mt-0.5 text-xs text-[#A9B7CE] dark:text-[#A9B7CE] tabular-nums">
                    {new Date(report.createdAt).toLocaleDateString()} · {report.findingsFound} items
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                    {report.overallScore}/100
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {selectedReport && (
        <aside className="lg:col-span-5 rounded-2xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] p-6 space-y-5">
          <div>
            <p className="text-xs text-[#A9B7CE] dark:text-[#A9B7CE] tabular-nums">
              {selectedReport.scope === 'full' ? 'Full Footprint Sweep' : 'Single Asset Scan'} ·{' '}
              {new Date(selectedReport.createdAt).toLocaleDateString()}
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold text-[#F4F7FF] dark:text-[#F4F7FF]">
              {selectedReport.targetLabel}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-[#263653] dark:border-[#263653] bg-[#050F20] dark:bg-[#050F20]/60 p-4">
            <div>
              <p className="text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">Overall Score</p>
              <p className="mt-0.5 font-mono text-2xl font-semibold text-[#F4F7FF] dark:text-[#F4F7FF] tabular-nums">
                {selectedReport.overallScore}/100
              </p>
            </div>
            <div>
              <p className="text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">Severity Mix</p>
              <p className="mt-1 font-mono text-xs text-[#F4F7FF] dark:text-[#F4F7FF] tabular-nums">
                {selectedReport.criticalCount} Crit · {selectedReport.highCount} High ·{' '}
                {selectedReport.mediumCount} Med · {selectedReport.lowCount} Low
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#A9B7CE] dark:text-[#A9B7CE]">
              Executive Briefing
            </h4>
            <p className="mt-2 text-sm text-[#F4F7FF] dark:text-[#F4F7FF] leading-relaxed">
              {selectedReport.summary}
            </p>
          </div>

          <div className="space-y-2 border-t border-[#263653] dark:border-[#263653] pt-4 text-xs">
            <div className="flex justify-between">
              <span className="text-[#A9B7CE] dark:text-[#A9B7CE]">Account Security</span>
              <span className="font-mono font-semibold tabular-nums">
                {selectedReport.categoryScores.accountSecurity}/100
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A9B7CE] dark:text-[#A9B7CE]">Broker Exposure</span>
              <span className="font-mono font-semibold tabular-nums">
                {selectedReport.categoryScores.brokerExposure}/100
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A9B7CE] dark:text-[#A9B7CE]">Public Metadata</span>
              <span className="font-mono font-semibold tabular-nums">
                {selectedReport.categoryScores.publicMetadata}/100
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A9B7CE] dark:text-[#A9B7CE]">Domain Hygiene</span>
              <span className="font-mono font-semibold tabular-nums">
                {selectedReport.categoryScores.domainHygiene}/100
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => void handleDownload(selectedReport._id, 'markdown')}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-600 cursor-pointer whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Export Markdown</span>
            </button>
            <button
              type="button"
              onClick={() => void handleDownload(selectedReport._id, 'json')}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#263653] dark:border-[#263653] px-3.5 py-2 text-xs font-medium text-[#F4F7FF] dark:text-slate-200 hover:bg-[#050F20] dark:hover:bg-[#172641] cursor-pointer whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Export JSON</span>
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
