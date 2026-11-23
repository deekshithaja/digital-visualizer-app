import React, { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Download, Info, Search, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import { DemoBreachCheckResult, DemoBreachDatasetInfo } from '../types';
import { useToast } from '../context/ToastContext';
import { SkeletonCard } from '../components/common/SkeletonCard';

interface ShellContext {
  refreshKey: number;
}

const SEVERITY_BADGE: Record<DemoBreachCheckResult['severity'], string> = {
  high: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60',
  medium:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
  low: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/60',
  none: 'bg-slate-100 text-[#F4F7FF] border-[#263653] dark:bg-[#172641] dark:text-[#F4F7FF] dark:border-[#263653]',
};

export function BreachCheckPage() {
  const { refreshKey } = useOutletContext<ShellContext>();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [datasetInfo, setDatasetInfo] = useState<DemoBreachDatasetInfo | null>(null);
  const [history, setHistory] = useState<DemoBreachCheckResult[]>([]);
  const [latestResult, setLatestResult] = useState<DemoBreachCheckResult | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [infoRes, historyRes] = await Promise.all([
        api.breaches.datasetInfo(),
        api.breaches.list(),
      ]);
      setDatasetInfo(infoRes);
      setHistory(historyRes.breaches);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Could not load breach check data',
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshKey]);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = email.trim();
    if (!cleaned) return;
    setChecking(true);
    try {
      const res = await api.breaches.check(cleaned);
      setLatestResult(res);
      await loadData();
      showToast({
        type: res.found ? 'info' : 'success',
        title: res.found ? 'Simulated breach record matched' : 'No demo breach record found',
        description: 'Result tagged as SIMULATED DEMO DATA.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Check failed',
        description: (err as Error).message,
      });
    } finally {
      setChecking(false);
    }
  };

  const handleExportSimulated = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      provenance: 'simulated',
      badge: 'SIMULATED DEMO DATA',
      dataset: datasetInfo?.dataset_name || null,
      disclaimer: datasetInfo?.disclaimer || null,
      results: history,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulated-breach-checks-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast({ type: 'success', title: 'Exported simulated breach checks' });
  };

  if (loading && !datasetInfo) {
    return (
      <div className="space-y-6">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dataset Provenance & Disclaimer */}
      <section className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              SIMULATED DEMO DATA
            </span>
            <span className="text-xs font-mono text-amber-900/80 dark:text-amber-200/80">
              provenance: {datasetInfo?.provenance || 'simulated'}
            </span>
          </div>

          {datasetInfo && (
            <span className="text-xs font-mono text-amber-900/80 dark:text-amber-200/80 tabular-nums">
              {datasetInfo.seeded_record_count} / {datasetInfo.record_count} demo records loaded
            </span>
          )}
        </div>

        <p className="mt-2.5 text-sm text-amber-950 dark:text-amber-100">
          {datasetInfo?.disclaimer ||
            '100% synthetic demo dataset for testing only. Results are not real-world breach records.'}
        </p>

        {datasetInfo && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-amber-900/80 dark:text-amber-200/80">
            <span>Dataset: {datasetInfo.dataset_name}</span>
            <span>Sources: {datasetInfo.breach_sources.join(', ')}</span>
          </div>
        )}
      </section>

      {/* Email Breach Check Form */}
      <section className="rounded-2xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] p-6">
        <h2 className="font-display text-base font-semibold text-[#F4F7FF] dark:text-[#F4F7FF]">
          Check an Email (Demo Dataset)
        </h2>
        <p className="mt-1 text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">
          Personal details are masked and plaintext demo credentials are never stored or returned.
        </p>

        <form onSubmit={handleCheck} className="mt-4 flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="arjun.nair71@example.in"
            required
            className="flex-1 rounded-xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#050F20] px-3.5 py-2.5 text-sm text-[#F4F7FF] dark:text-[#F4F7FF] placeholder:text-[#A9B7CE] focus:border-teal-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={checking}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span>{checking ? 'Checking...' : 'Check Email'}</span>
          </button>
        </form>

        {latestResult && <BreachResultCard result={latestResult} />}
      </section>

      {/* Saved Results History */}
      <section className="rounded-2xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#263653] dark:border-[#263653] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-base font-semibold text-[#F4F7FF] dark:text-[#F4F7FF]">
              Saved Demo Checks ({history.length})
            </h2>
            <span className="rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
              SIMULATED DEMO DATA
            </span>
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={handleExportSimulated}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#263653] dark:border-[#263653] px-3 py-1.5 text-xs font-medium text-[#F4F7FF] dark:text-slate-200 hover:bg-[#050F20] dark:hover:bg-[#172641] cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Export JSON</span>
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[#A9B7CE] dark:text-[#A9B7CE]">
            Run an email check above to view masked demo results here.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {history.map((item, idx) => (
              <div
                key={item._id || `${item.masked_fields.email}-${idx}`}
                className="px-5 py-4 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                      {item.badge}
                    </span>
                    <span className="font-mono text-sm font-medium text-[#F4F7FF] dark:text-[#F4F7FF]">
                      {item.masked_fields.email}
                    </span>
                    <span
                      className={`rounded border px-2 py-0.5 text-[11px] font-medium uppercase ${
                        SEVERITY_BADGE[item.severity]
                      }`}
                    >
                      {item.severity === 'none' ? 'No match' : `${item.severity} severity`}
                    </span>
                  </div>

                  <span className="text-xs font-mono text-[#A9B7CE] dark:text-[#A9B7CE] tabular-nums">
                    {new Date(item.checkedAt).toLocaleDateString()}
                  </span>
                </div>

                {item.found ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-[#A9B7CE] dark:text-[#F4F7FF] pt-1">
                    <div>
                      <span className="text-[#A9B7CE] block">Breach Source</span>
                      <span className="font-medium text-[#F4F7FF] dark:text-[#F4F7FF]">
                        {item.breach_source}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#A9B7CE] block">Breach Date & Status</span>
                      <span className="font-mono">
                        {item.breach_date} · {item.account_status}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#A9B7CE] block">Masked Identifiers</span>
                      <span className="font-mono">
                        {item.masked_fields.phone || '—'} · {item.masked_fields.username || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#A9B7CE] block">Exposed Classes</span>
                      <span>{item.exposed_data_classes.join(', ')}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">{item.message}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BreachResultCard({ result }: { result: DemoBreachCheckResult }) {
  return (
    <div className="mt-5 rounded-xl border border-[#263653] dark:border-[#263653] bg-[#050F20]/70 dark:bg-[#050F20]/60 p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
            {result.badge}
          </span>
          {result.found ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F4F7FF] dark:text-[#F4F7FF]">
              <ShieldAlert className="h-4 w-4 text-amber-600" aria-hidden="true" />
              {result.breach_source}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#F4F7FF] dark:text-[#F4F7FF]">
              <CheckCircle2 className="h-4 w-4 text-teal-600" aria-hidden="true" />
              {result.masked_fields.email}
            </span>
          )}
        </div>

        <span
          className={`rounded border px-2.5 py-0.5 text-xs font-medium uppercase ${
            SEVERITY_BADGE[result.severity]
          }`}
        >
          {result.severity === 'none' ? 'Not in demo dataset' : `${result.severity} severity`}
        </span>
      </div>

      {result.found ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs pt-1">
          <div>
            <span className="text-[#A9B7CE] dark:text-[#A9B7CE] block">Masked Email</span>
            <span className="font-mono text-[#F4F7FF] dark:text-[#F4F7FF]">
              {result.masked_fields.email}
            </span>
          </div>
          <div>
            <span className="text-[#A9B7CE] dark:text-[#A9B7CE] block">Masked Phone</span>
            <span className="font-mono text-[#F4F7FF] dark:text-[#F4F7FF]">
              {result.masked_fields.phone || '—'}
            </span>
          </div>
          <div>
            <span className="text-[#A9B7CE] dark:text-[#A9B7CE] block">Masked Username / IP</span>
            <span className="font-mono text-[#F4F7FF] dark:text-[#F4F7FF]">
              {result.masked_fields.username || '—'} · {result.masked_fields.ip_address || '—'}
            </span>
          </div>
          <div>
            <span className="text-[#A9B7CE] dark:text-[#A9B7CE] block">Breach Date</span>
            <span className="font-mono text-[#F4F7FF] dark:text-[#F4F7FF]">
              {result.breach_date}
            </span>
          </div>
          <div>
            <span className="text-[#A9B7CE] dark:text-[#A9B7CE] block">Account Status</span>
            <span className="font-mono text-[#F4F7FF] dark:text-[#F4F7FF]">
              {result.account_status}
            </span>
          </div>
          <div>
            <span className="text-[#A9B7CE] dark:text-[#A9B7CE] block">Exposed Data Classes</span>
            <span className="text-[#F4F7FF] dark:text-[#F4F7FF]">
              {result.exposed_data_classes.join(', ')}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 text-sm text-[#F4F7FF] dark:text-[#F4F7FF]">
          <Info className="h-4 w-4 text-[#A9B7CE] shrink-0 mt-0.5" aria-hidden="true" />
          <p>{result.message}</p>
        </div>
      )}

      <p className="text-[11px] text-[#A9B7CE] dark:text-[#A9B7CE] border-t border-[#263653] dark:border-[#263653] pt-2.5">
        Provenance: <span className="font-mono">{result.provenance}</span> · Dataset:{' '}
        <span className="font-mono">{result.dataset}</span> — {result.disclaimer}
      </p>
    </div>
  );
}
