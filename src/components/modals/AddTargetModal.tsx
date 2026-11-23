import React, { useState } from 'react';
import { Globe, Mail, Phone, Shield, UserCheck, X } from 'lucide-react';
import { api } from '../../services/api';
import { TargetType } from '../../types';
import { useToast } from '../../context/ToastContext';

interface AddTargetModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const TARGET_TYPES: Array<{
  type: TargetType;
  label: string;
  placeholder: string;
  hint: string;
  Icon: typeof Mail;
}> = [
  {
    type: 'email',
    label: 'Email',
    placeholder: 'you@example.com',
    hint: 'Check breach archives, marketing brokers & avatar metadata.',
    Icon: Mail,
  },
  {
    type: 'domain',
    label: 'Domain',
    placeholder: 'yourdomain.com',
    hint: 'Audit SPF, DMARC spoofing protection & WHOIS privacy.',
    Icon: Globe,
  },
  {
    type: 'social',
    label: 'Social Handle',
    placeholder: '@username',
    hint: 'Check handle reuse & public profile visibility.',
    Icon: UserCheck,
  },
  {
    type: 'phone',
    label: 'Phone',
    placeholder: '+1 (555) 234-5678',
    hint: 'Evaluate reverse-lookup directories & SMS 2FA exposure.',
    Icon: Phone,
  },
  {
    type: 'alias',
    label: 'Name / Alias',
    placeholder: 'Full Name or Pen Name',
    hint: 'Inspect public search engine footprint & archived records.',
    Icon: Shield,
  },
];

export function AddTargetModal({ open, onClose, onCreated }: AddTargetModalProps) {
  const [type, setType] = useState<TargetType>('email');
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [scanNow, setScanNow] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  if (!open) return null;

  const activeConfig = TARGET_TYPES.find((t) => t.type === type)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!value.trim() || !label.trim()) {
      setError('Please enter both an identifier and a short label.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.targets.create({
        type,
        value: value.trim(),
        label: label.trim(),
        scanNow,
      });
      showToast({
        type: 'success',
        title: scanNow ? 'Asset added and scanned' : 'Asset added to monitoring',
        description:
          scanNow && res.findings
            ? `Found ${res.findings.length} exposure item(s) for ${label.trim()}.`
            : `${label.trim()} is ready to scan.`,
      });
      setValue('');
      setLabel('');
      onCreated();
    } catch (err) {
      setError((err as Error).message || 'Could not add asset.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[#050F20]/50 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-target-title"
        className="relative z-10 w-full max-w-lg rounded-xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="add-target-title"
              className="font-display text-lg font-semibold text-[#F4F7FF] dark:text-[#F4F7FF]"
            >
              Add Asset
            </h2>
            <p className="mt-0.5 text-sm text-[#A9B7CE] dark:text-[#A9B7CE]">
              Pick an email, domain, handle, or phone to check.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#A9B7CE] hover:bg-slate-100 hover:text-[#A9B7CE] dark:hover:bg-[#172641] dark:hover:text-slate-200 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#F4F7FF] dark:text-[#F4F7FF] mb-2">
              Asset Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TARGET_TYPES.map((item) => {
                const Icon = item.Icon;
                const active = type === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setType(item.type)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'border-blue-500 bg-blue-950/40 text-blue-600 dark:border-blue-400 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'border-[#263653] dark:border-[#263653] text-[#F4F7FF] dark:text-[#F4F7FF] hover:bg-[#050F20] dark:hover:bg-[#172641]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">{activeConfig.hint}</p>
          </div>

          <div>
            <label
              htmlFor="target-label"
              className="block text-xs font-medium text-[#F4F7FF] dark:text-[#F4F7FF] mb-1.5"
            >
              Friendly Label
            </label>
            <input
              id="target-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Work Email, Family Domain, Side Project"
              className="w-full rounded-lg border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#050F20] px-3.5 py-2 text-sm text-[#F4F7FF] dark:text-[#F4F7FF] placeholder:text-[#A9B7CE] focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label
              htmlFor="target-value"
              className="block text-xs font-medium text-[#F4F7FF] dark:text-[#F4F7FF] mb-1.5"
            >
              {activeConfig.label} Identifier
            </label>
            <input
              id="target-value"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={activeConfig.placeholder}
              className="w-full rounded-lg border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#050F20] px-3.5 py-2 font-mono text-sm text-[#F4F7FF] dark:text-[#F4F7FF] placeholder:text-[#A9B7CE] focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <label className="flex items-center gap-2.5 rounded-lg border border-[#263653] dark:border-[#263653] bg-[#050F20] dark:bg-[#050F20]/60 px-3.5 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={scanNow}
              onChange={(e) => setScanNow(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-[#F4F7FF] dark:text-[#F4F7FF]">
              Run initial privacy exposure scan immediately
            </span>
          </label>

          {error && (
            <p className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#263653] dark:border-[#263653] px-4 py-2 text-sm font-medium text-[#F4F7FF] dark:text-[#F4F7FF] hover:bg-[#050F20] dark:hover:bg-[#172641] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
            >
              {submitting ? 'Scanning & Saving...' : scanNow ? 'Save & Scan Asset' : 'Save Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
