import React, { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CheckCircle2, CheckSquare, Plus, Search, X } from 'lucide-react';
import { api } from '../services/api';
import { RemediationTask, TaskStatus } from '../types';
import { useToast } from '../context/ToastContext';
import { RiskBadge } from '../components/common/RiskBadge';
import { EmptyState } from '../components/common/EmptyState';
import { SkeletonCard } from '../components/common/SkeletonCard';

interface ShellContext {
  refreshKey: number;
  triggerRefresh: () => void;
}

export function ActionCenterPage() {
  const { refreshKey, triggerRefresh } = useOutletContext<ShellContext>();
  const { showToast } = useToast();

  const [actions, setActions] = useState<RemediationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'active' | TaskStatus | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStep, setNewStep] = useState('');
  const [creating, setCreating] = useState(false);

  const loadActions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.actions.list();
      setActions(res.actions);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Could not load action tasks',
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadActions();
  }, [loadActions, refreshKey]);

  const handleToggleStep = async (task: RemediationTask, stepId: string) => {
    const nextSteps = task.steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s));
    setSavingId(task._id);
    try {
      const res = await api.actions.update(task._id, { steps: nextSteps });
      setActions((prev) =>
        prev.map((a) => (a._id === task._id ? { ...a, ...res.action } : a))
      );
      if (res.action.status === 'completed') {
        showToast({
          type: 'success',
          title: 'Remediation completed',
          description: `Privacy Health Score is now ${res.overallScore}/100.`,
        });
      }
      triggerRefresh();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Failed to update step',
        description: (err as Error).message,
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleSetStatus = async (task: RemediationTask, status: TaskStatus) => {
    setSavingId(task._id);
    try {
      const res = await api.actions.update(task._id, { status });
      setActions((prev) =>
        prev.map((a) => (a._id === task._id ? { ...a, ...res.action } : a))
      );
      showToast({
        type: status === 'completed' ? 'success' : 'info',
        title: status === 'completed' ? 'Action marked complete' : 'Task status updated',
        description: `Privacy Health Score: ${res.overallScore}/100.`,
      });
      triggerRefresh();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Update failed',
        description: (err as Error).message,
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newStep.trim()) return;
    setCreating(true);
    try {
      const res = await api.actions.create({
        title: newTitle.trim(),
        description: newDesc.trim() || 'Custom personal privacy checklist item.',
        category: 'accountSecurity',
        severity: 'medium',
        estimatedMinutes: 5,
        steps: newStep
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setActions((prev) => [res.action, ...prev]);
      setNewTitle('');
      setNewDesc('');
      setNewStep('');
      setShowNewForm(false);
      showToast({ type: 'success', title: 'Custom security task added' });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Could not create task',
        description: (err as Error).message,
      });
    } finally {
      setCreating(false);
    }
  };

  const filtered = actions.filter((a) => {
    if (statusFilter === 'active' && (a.status === 'completed' || a.status === 'dismissed')) {
      return false;
    } else if (statusFilter !== 'active' && statusFilter !== 'all' && a.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        (a.targetLabel || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const potentialGain = actions
    .filter((a) => a.status === 'todo' || a.status === 'in_progress')
    .reduce((acc, a) => acc + a.impactPoints, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-sm text-[#A9B7CE] dark:text-[#A9B7CE] tabular-nums">
          Up to <strong className="font-mono text-blue-600 dark:text-blue-400">+{potentialGain} pts</strong> available from open steps.
        </p>

        <button
          type="button"
          onClick={() => setShowNewForm((s) => !s)}
          className="inline-flex items-center gap-2 rounded-xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] px-3.5 py-2 text-xs sm:text-sm font-medium text-[#F4F7FF] dark:text-slate-200 hover:bg-[#050F20] dark:hover:bg-[#172641] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          {showNewForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span>{showNewForm ? 'Close' : 'Add Task'}</span>
        </button>
      </div>

      {showNewForm && (
        <form
          onSubmit={handleCreateCustom}
          className="rounded-xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] p-5 space-y-4"
        >
          <h3 className="font-display text-sm font-semibold text-[#F4F7FF] dark:text-[#F4F7FF]">
            Add Custom Privacy Checklist
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#F4F7FF] dark:text-[#F4F7FF] mb-1">
                Task Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Enable credit freeze at all 3 bureaus"
                required
                className="w-full rounded-lg border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#050F20] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#F4F7FF] dark:text-[#F4F7FF] mb-1">
                Short Description
              </label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Prevents unauthorized new credit lines"
                className="w-full rounded-lg border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#050F20] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#F4F7FF] dark:text-[#F4F7FF] mb-1">
              Checklist Steps (one per line)
            </label>
            <textarea
              rows={3}
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              placeholder={'Create free freeze at Equifax\nCreate free freeze at Experian\nCreate free freeze at TransUnion'}
              required
              className="w-full rounded-lg border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#050F20] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60 cursor-pointer"
            >
              {creating ? 'Saving...' : 'Create Task'}
            </button>
          </div>
        </form>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 dark:bg-[#172641] p-1 w-fit">
          {(
            [
              { id: 'active', label: 'Action Needed' },
              { id: 'completed', label: 'Completed' },
              { id: 'dismissed', label: 'Dismissed' },
              { id: 'all', label: 'All' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-[#172641] dark:bg-[#101B32] text-[#F4F7FF] dark:text-[#F4F7FF] shadow-xs'
                  : 'text-[#A9B7CE] dark:text-[#A9B7CE] hover:text-[#F4F7FF] dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#A9B7CE]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter checklist..."
            className="w-full rounded-lg border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] pl-8 pr-3 py-1.5 text-xs text-[#F4F7FF] dark:text-[#F4F7FF] placeholder:text-[#A9B7CE] focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {loading && actions.length === 0 ? (
        <div className="space-y-4">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks in this view"
          description="Check another filter tab or scan an asset to generate tailored privacy recommendations."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((task) => {
            const doneSteps = task.steps.filter((s) => s.done).length;
            const isCompleted = task.status === 'completed';

            return (
              <article
                key={task._id}
                className="rounded-2xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <RiskBadge severity={task.severity} />
                      <span className="text-xs text-[#A9B7CE] dark:text-[#A9B7CE] tabular-nums">
                        {task.targetLabel} · +{task.impactPoints} pts · {doneSteps}/{task.steps.length} done
                      </span>
                    </div>
                    <h3
                      className={`font-display text-base font-semibold ${
                        isCompleted
                          ? 'text-[#A9B7CE] dark:text-[#A9B7CE] line-through'
                          : 'text-[#F4F7FF] dark:text-[#F4F7FF]'
                      }`}
                    >
                      {task.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isCompleted ? (
                      <>
                        {task.status !== 'dismissed' && (
                          <button
                            type="button"
                            disabled={savingId === task._id}
                            onClick={() => void handleSetStatus(task, 'dismissed')}
                            className="rounded-lg border border-[#263653] dark:border-[#263653] px-3 py-1.5 text-xs font-medium text-[#A9B7CE] dark:text-[#A9B7CE] hover:bg-[#050F20] dark:hover:bg-[#172641] cursor-pointer whitespace-nowrap"
                          >
                            Dismiss
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={savingId === task._id}
                          onClick={() => void handleSetStatus(task, 'completed')}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Complete All</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={savingId === task._id}
                        onClick={() => void handleSetStatus(task, 'todo')}
                        className="rounded-lg border border-[#263653] dark:border-[#263653] px-3 py-1.5 text-xs font-medium text-[#F4F7FF] dark:text-[#F4F7FF] hover:bg-[#050F20] dark:hover:bg-[#172641] cursor-pointer whitespace-nowrap"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-slate-100 dark:border-[#263653] pt-3.5">
                  {task.steps.map((step) => (
                    <label
                      key={step.id}
                      className="flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-[#050F20] dark:hover:bg-[#172641]/40 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={step.done}
                        disabled={savingId === task._id}
                        onChange={() => void handleToggleStep(task, step.id)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span
                        className={`text-sm leading-relaxed ${
                          step.done
                            ? 'text-[#A9B7CE] dark:text-[#A9B7CE] line-through'
                            : 'text-[#F4F7FF] dark:text-[#F4F7FF]'
                        }`}
                      >
                        {step.label}
                      </span>
                    </label>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
