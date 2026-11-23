import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

export function SettingsPage() {
  const { user, updateProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [briefingTone, setBriefingTone] = useState<'calm' | 'concise'>(
    user?.preferences?.briefingTone || 'calm'
  );
  const [scanFrequency, setScanFrequency] = useState<'weekly' | 'monthly' | 'manual'>(
    user?.preferences?.scanFrequency || 'weekly'
  );
  const [emailAlerts, setEmailAlerts] = useState(user?.preferences?.emailAlerts ?? true);
  const [saving, setSaving] = useState(false);

  const [confirmText, setConfirmText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        preferences: {
          theme,
          briefingTone,
          scanFrequency,
          emailAlerts,
        },
      });
      showToast({
        type: 'success',
        title: 'Preferences saved',
        description: 'Your Cybersecurity Officer briefing style has been updated.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Save failed',
        description: (err as Error).message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText.trim().toUpperCase() !== 'DELETE') return;
    setDeleting(true);
    try {
      await api.auth.deleteAccount();
      await logout();
      showToast({
        type: 'info',
        title: 'Account deleted',
        description: 'All monitored assets and reports have been erased.',
      });
      navigate('/login');
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Could not delete account',
        description: (err as Error).message,
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] p-6 space-y-6"
      >
        <div>
          <h2 className="font-display text-lg font-semibold text-[#F4F7FF] dark:text-[#F4F7FF]">
            Preferences
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="settings-name"
              className="block text-xs font-medium text-[#F4F7FF] dark:text-[#F4F7FF] mb-1.5"
            >
              Display Name
            </label>
            <input
              id="settings-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-lg border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#050F20] px-3.5 py-2 text-sm text-[#F4F7FF] dark:text-[#F4F7FF] focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#F4F7FF] dark:text-[#F4F7FF] mb-1.5">
              Account Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full rounded-lg border border-[#263653] dark:border-[#263653] bg-[#050F20] dark:bg-[#050F20]/60 px-3.5 py-2 text-sm text-[#A9B7CE] dark:text-[#A9B7CE]"
            />
          </div>
        </div>

        <div className="border-t border-[#263653] dark:border-[#263653] pt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#F4F7FF] dark:text-[#F4F7FF] mb-2">
              Appearance Theme
            </label>
            <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-[#172641] p-1">
              {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTheme(mode)}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-medium capitalize transition-colors cursor-pointer ${
                    theme === mode
                      ? 'bg-[#172641] dark:bg-[#101B32] text-[#F4F7FF] dark:text-[#F4F7FF] shadow-xs'
                      : 'text-[#A9B7CE] dark:text-[#A9B7CE] hover:text-[#F4F7FF] dark:hover:text-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#F4F7FF] dark:text-[#F4F7FF] mb-2">
              Officer Briefing Tone
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBriefingTone('calm')}
                className={`rounded-lg border p-3.5 text-left transition-colors cursor-pointer ${
                  briefingTone === 'calm'
                    ? 'border-blue-500 bg-blue-950/40/70 dark:border-blue-400 dark:bg-blue-950/40'
                    : 'border-[#263653] dark:border-[#263653] hover:bg-[#050F20] dark:hover:bg-[#172641]'
                }`}
              >
                <p className="text-sm font-semibold text-[#F4F7FF] dark:text-[#F4F7FF]">
                  Calm & Guiding
                </p>
                <p className="mt-0.5 text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">
                  Warm plain-English explanations tailored for everyday confidence.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setBriefingTone('concise')}
                className={`rounded-lg border p-3.5 text-left transition-colors cursor-pointer ${
                  briefingTone === 'concise'
                    ? 'border-blue-500 bg-blue-950/40/70 dark:border-blue-400 dark:bg-blue-950/40'
                    : 'border-[#263653] dark:border-[#263653] hover:bg-[#050F20] dark:hover:bg-[#172641]'
                }`}
              >
                <p className="text-sm font-semibold text-[#F4F7FF] dark:text-[#F4F7FF]">
                  Direct & Concise
                </p>
                <p className="mt-0.5 text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">
                  Shorter metric-first summaries highlighting key pillars.
                </p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label
                htmlFor="scan-frequency"
                className="block text-xs font-medium text-[#F4F7FF] dark:text-[#F4F7FF] mb-1.5"
              >
                Automated Sweep Cadence
              </label>
              <select
                id="scan-frequency"
                value={scanFrequency}
                onChange={(e) => setScanFrequency(e.target.value as 'weekly' | 'monthly' | 'manual')}
                className="w-full rounded-lg border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#050F20] px-3 py-2 text-sm text-[#F4F7FF] dark:text-[#F4F7FF] focus:border-blue-500 focus:outline-none"
              >
                <option value="weekly">Weekly automated check</option>
                <option value="monthly">Monthly summary check</option>
                <option value="manual">Manual scans only</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex w-full items-center gap-2.5 rounded-lg border border-[#263653] dark:border-[#263653] px-3.5 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-[#F4F7FF] dark:text-[#F4F7FF]">
                  Alert on new critical exposures
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-[#263653] dark:border-[#263653] pt-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60 transition-colors cursor-pointer"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <section className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-[#172641] dark:bg-[#101B32] p-6">
        <h3 className="font-display text-base font-semibold text-red-700 dark:text-red-400">
          Delete Account
        </h3>
        <p className="mt-1 text-sm text-[#A9B7CE] dark:text-[#A9B7CE]">
          Permanently remove your account and scan history.
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 dark:border-red-800 px-3.5 py-2 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Delete My Account</span>
          </button>
        ) : (
          <div className="mt-4 space-y-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/30 p-4">
            <p className="text-xs font-medium text-red-800 dark:text-red-300">
              Type <span className="font-mono font-bold">DELETE</span> to permanently erase your account.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="rounded-lg border border-red-300 dark:border-red-800 bg-[#172641] dark:bg-[#050F20] px-3 py-1.5 font-mono text-xs text-[#F4F7FF] dark:text-[#F4F7FF] focus:outline-none"
              />
              <button
                type="button"
                disabled={deleting || confirmText.trim().toUpperCase() !== 'DELETE'}
                onClick={() => void handleDeleteAccount()}
                className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? 'Erasing...' : 'Confirm Permanent Deletion'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setConfirmText('');
                }}
                className="rounded-lg border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] px-3 py-1.5 text-xs text-[#F4F7FF] dark:text-[#F4F7FF] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
