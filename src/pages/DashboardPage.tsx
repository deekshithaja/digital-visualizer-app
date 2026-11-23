import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Network,
  RefreshCw,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../services/api';
import { DashboardOverview } from '../types';
import { ScoreGauge } from '../components/common/ScoreGauge';
import { RiskBadge } from '../components/common/RiskBadge';
import { SkeletonCard } from '../components/common/SkeletonCard';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

interface ShellContext {
  refreshKey: number;
  triggerRefresh: () => void;
  openAddTarget: () => void;
}

const CATEGORY_META = [
  {
    key: 'accountSecurity' as const,
    label: 'Account Security',
  },
  {
    key: 'brokerExposure' as const,
    label: 'Data Brokers',
  },
  {
    key: 'publicMetadata' as const,
    label: 'Public Profiles',
  },
  {
    key: 'domainHygiene' as const,
    label: 'Domains',
  },
];

export function DashboardPage() {
  const { refreshKey, triggerRefresh, openAddTarget } = useOutletContext<ShellContext>();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const { showToast } = useToast();

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const overview = await api.dashboard.overview();
      setData(overview);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Could not load briefing',
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview, refreshKey]);

  const handleFullSweep = async () => {
    setSweeping(true);
    try {
      const res = await api.targets.sweep();
      showToast({
        type: 'success',
        title: 'Full footprint sweep complete',
        description: `Updated Privacy Health Score: ${res.overallScore}/100.`,
      });
      triggerRefresh();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Sweep could not complete',
        description: (err as Error).message,
      });
    } finally {
      setSweeping(false);
    }
  };

  const handleQuickCompleteTask = async (taskId: string) => {
    setCompletingTaskId(taskId);
    try {
      const res = await api.actions.update(taskId, { status: 'completed' });
      showToast({
        type: 'success',
        title: 'Action marked complete',
        description: `Privacy Health Score is now ${res.overallScore}/100.`,
      });
      triggerRefresh();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Update failed',
        description: (err as Error).message,
      });
    } finally {
      setCompletingTaskId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <SkeletonCard className="lg:col-span-4" lines={4} />
          <SkeletonCard className="lg:col-span-8" lines={4} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      </div>
    );
  }

  if (!data || data.targetsCount === 0) {
    return (
      <div className="py-8">
        <EmptyState
          icon={Shield}
          title="Add your first asset"
          description="Start by adding an email, domain, or social handle to check your exposure."
          actionLabel="Add Asset"
          onAction={openAddTarget}
        />
      </div>
    );
  }

  const historyPoints = data.scoreHistory.slice(-8);

  return (
    <div className="space-y-6">
      {/* Focal Anchor: Score Gauge + Concise Summary */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-4 rounded-2xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] p-6 flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">
            <span>Privacy Score</span>
            <span className="tabular-nums">{data.targetsCount} assets</span>
          </div>

          <div className="my-2">
            <ScoreGauge score={data.overallScore} postureLabel={data.briefing.postureLabel} />
          </div>

          <div className="w-full grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-[#263653] pt-4 text-center">
            <div>
              <p className="font-mono text-base font-semibold text-[#F4F7FF] dark:text-[#F4F7FF] tabular-nums">
                {data.findingCounts.total}
              </p>
              <p className="text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">Open</p>
            </div>
            <div>
              <p className="font-mono text-base font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {data.resolvedFindingsCount}
              </p>
              <p className="text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">Fixed</p>
            </div>
            <div>
              <p className="font-mono text-base font-semibold text-[#F4F7FF] dark:text-[#F4F7FF] tabular-nums">
                {data.completedTasksCount}
              </p>
              <p className="text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">Tasks Done</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 rounded-2xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">
              <span>Last check {data.lastScanAt ? new Date(data.lastScanAt).toLocaleDateString() : 'Today'}</span>
              <span>Top focus: {data.briefing.weakestCategoryLabel}</span>
            </div>

            <h2 className="mt-3 font-display text-xl sm:text-2xl font-semibold text-[#F4F7FF] dark:text-[#F4F7FF] text-balance">
              {data.briefing.headline}
            </h2>

            <div className="mt-4 rounded-xl border border-[#263653] dark:border-[#263653] bg-[#050F20]/80 dark:bg-[#050F20]/60 px-4 py-3.5 text-sm text-[#F4F7FF] dark:text-[#F4F7FF]">
              <span className="font-medium text-blue-600 dark:text-blue-300">Recommended next: </span>
              {data.briefing.topRecommendation}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={sweeping}
              onClick={() => void handleFullSweep()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`h-4 w-4 ${sweeping ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{sweeping ? 'Scanning...' : 'Scan All Assets'}</span>
            </button>

            <Link
              to="/map"
              className="inline-flex items-center gap-2 rounded-xl border border-[#263653] dark:border-[#263653] px-4 py-2.5 text-sm font-medium text-[#F4F7FF] dark:text-[#F4F7FF] hover:bg-[#050F20] dark:hover:bg-[#172641] transition-colors whitespace-nowrap"
            >
              <Network className="h-4 w-4" aria-hidden="true" />
              <span>Exposure Map</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 4 Exposure Pillar Sub-Scores */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CATEGORY_META.map((cat) => {
          const val = data.categoryScores[cat.key];
          const barColor =
            val >= 82
              ? 'bg-emerald-600'
              : val >= 65
              ? 'bg-blue-500'
              : val >= 50
              ? 'bg-amber-600'
              : 'bg-red-600';

          return (
            <div
              key={cat.key}
              className="rounded-2xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] p-5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium text-[#F4F7FF] dark:text-[#F4F7FF]">
                  {cat.label}
                </h3>
                <span className="font-mono text-sm font-semibold text-[#F4F7FF] dark:text-[#F4F7FF] tabular-nums">
                  {val}
                </span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-slate-100 dark:bg-[#172641] overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${val}%`, transition: 'width 400ms ease' }}
                />
              </div>
            </div>
          );
        })}
      </section>

      {/* 30-Day Findings Discovered Line Chart */}
      <FindingsTrendSection trend={data.findingsTrend || []} />

      {/* Priority Action Plan + Score History */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-[#263653] dark:border-[#263653] px-5 py-4">
            <h2 className="font-display text-base font-semibold text-[#F4F7FF] dark:text-[#F4F7FF]">
              Next Steps
            </h2>
            <Link
              to="/actions"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
            >
              <span>See all</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {data.priorityTasks.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-600" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-[#F4F7FF] dark:text-[#F4F7FF]">
                All priority actions completed
              </p>
              <p className="mt-1 text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">
                Run a fresh scan anytime or add more assets to monitor.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {data.priorityTasks.map((task) => (
                <div
                  key={task._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-[#050F20]/70 dark:hover:bg-[#172641]/30 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <RiskBadge severity={task.severity} />
                      <span className="text-xs text-[#A9B7CE] dark:text-[#A9B7CE] tabular-nums">
                        {task.targetLabel} · +{task.impactPoints} pts · ~{task.estimatedMinutes}m
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[#F4F7FF] dark:text-[#F4F7FF]">
                      {task.title}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={completingTaskId === task._id}
                    onClick={() => void handleQuickCompleteTask(task._id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#050F20] px-3 py-1.5 text-xs font-medium text-[#F4F7FF] dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{completingTaskId === task._id ? 'Saving...' : 'Mark Done'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Score History & Audit Feed */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-[#F4F7FF] dark:text-[#F4F7FF]">
                Score Trajectory
              </h2>
              <span className="text-xs text-[#A9B7CE] dark:text-[#A9B7CE] tabular-nums">
                Last {historyPoints.length} scan{historyPoints.length === 1 ? '' : 's'}
              </span>
            </div>

            {historyPoints.length > 0 ? (
              <div className="mt-4">
                <ScoreTrajectoryChart points={historyPoints} />
              </div>
            ) : (
              <p className="mt-4 text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">
                Run scans over time to track how your Privacy Health Score improves.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] p-5">
            <h2 className="font-display text-base font-semibold text-[#F4F7FF] dark:text-[#F4F7FF]">
              Recent Activity
            </h2>
            <div className="mt-3.5 space-y-3">
              {data.recentLogs.slice(0, 4).map((log) => (
                <div
                  key={log._id}
                  className="flex items-start justify-between gap-3 text-xs border-b border-slate-100 dark:border-[#263653]/80 pb-2.5 last:border-b-0 last:pb-0"
                >
                  <p className="text-[#F4F7FF] dark:text-[#F4F7FF] leading-relaxed">{log.summary}</p>
                  <span className="shrink-0 font-mono text-[#A9B7CE] dark:text-[#A9B7CE] tabular-nums">
                    {new Date(log.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ScoreTrajectoryChart({
  points,
}: {
  points: Array<{ id: string; date: string; score: number; label: string }>;
}) {
  const width = 420;
  const height = 140;
  const padX = 22;
  const padY = 18;

  const coords = points.map((pt, idx) => {
    const x =
      points.length === 1
        ? width / 2
        : padX + (idx / (points.length - 1)) * (width - padX * 2);
    const y = padY + ((100 - pt.score) / 100) * (height - padY * 2);
    return { ...pt, x, y };
  });

  const linePath = coords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x} ${height - padY} L ${coords[0].x} ${
          height - padY
        } Z`
      : '';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36 overflow-visible">
      <defs>
        <linearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0F766E" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0F766E" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {[25, 50, 75, 100].map((tick) => {
        const y = padY + ((100 - tick) / 100) * (height - padY * 2);
        return (
          <g key={tick}>
            <line
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              className="stroke-slate-100 dark:stroke-slate-800"
              strokeWidth={1}
            />
            <text
              x={0}
              y={y + 3}
              className="fill-slate-400 dark:fill-slate-500 text-[9px] font-mono tabular-nums"
            >
              {tick}
            </text>
          </g>
        );
      })}

      {areaPath && <path d={areaPath} fill="url(#scoreAreaGrad)" />}
      {coords.length > 1 && (
        <path d={linePath} fill="none" stroke="#0F766E" strokeWidth={2.2} strokeLinecap="round" />
      )}

      {coords.map((c) => (
        <g key={c.id}>
          <circle
            cx={c.x}
            cy={c.y}
            r={4}
            className="fill-blue-600 stroke-white dark:stroke-slate-900"
            strokeWidth={2}
          />
          <text
            x={c.x}
            y={height - 2}
            textAnchor="middle"
            className="fill-slate-500 dark:fill-slate-400 text-[9px] font-mono tabular-nums"
          >
            {new Date(c.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </text>
        </g>
      ))}
    </svg>
  );
}

function FindingsTrendSection({
  trend,
}: {
  trend: Array<{ date: string; label: string; discovered: number; resolved: number }>;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const totalDiscovered = trend.reduce((sum, item) => sum + item.discovered, 0);
  const totalResolved = trend.reduce((sum, item) => sum + item.resolved, 0);

  const gridStroke = isDark ? '#1E293B' : '#E2E8F0';
  const tickFill = isDark ? '#94A3B8' : '#64748B';
  const discoveredStroke = isDark ? '#14B8A6' : '#0F766E';
  const resolvedStroke = isDark ? '#4ADE80' : '#16A34A';

  return (
    <section className="rounded-2xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <h2 className="font-display text-base font-semibold text-[#F4F7FF] dark:text-[#F4F7FF]">
          Findings (Last 30 Days)
        </h2>

        <div className="flex items-center gap-3 text-xs text-[#A9B7CE] dark:text-[#A9B7CE] tabular-nums shrink-0">
          <span>
            <strong className="font-mono text-[#F4F7FF] dark:text-[#F4F7FF]">{totalDiscovered}</strong>{' '}
            found
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="font-mono text-emerald-700 dark:text-emerald-400">{totalResolved}</strong>{' '}
            fixed
          </span>
        </div>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="label"
              interval={4}
              tick={{ fill: tickFill, fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={{ stroke: gridStroke }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: tickFill, fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const row = payload[0]?.payload as {
                  date: string;
                  label: string;
                  discovered: number;
                  resolved: number;
                };
                return (
                  <div className="rounded-lg border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] px-3.5 py-2.5 shadow-sm text-xs">
                    <p className="font-medium text-[#F4F7FF] dark:text-[#F4F7FF] mb-1.5">
                      {row.label} ({row.date})
                    </p>
                    <div className="space-y-1 tabular-nums">
                      <p className="flex items-center justify-between gap-4 text-[#F4F7FF] dark:text-[#F4F7FF]">
                        <span>Findings discovered</span>
                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {row.discovered}
                        </span>
                      </p>
                      <p className="flex items-center justify-between gap-4 text-[#F4F7FF] dark:text-[#F4F7FF]">
                        <span>Resolved</span>
                        <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                          {row.resolved}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="plainline"
              wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
            />
            <Line
              type="monotone"
              dataKey="discovered"
              name="Findings Discovered"
              stroke={discoveredStroke}
              strokeWidth={2.25}
              dot={{ r: 2.5, fill: discoveredStroke, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="resolved"
              name="Resolved"
              stroke={resolvedStroke}
              strokeWidth={1.75}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
