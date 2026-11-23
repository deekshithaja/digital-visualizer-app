import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, loginDemo, dbError } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemo = async () => {
    setError('');
    setDemoLoading(true);
    try {
      await loginDemo();
      showToast({
        type: 'info',
        title: 'Welcome to the demo',
      });
      navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'Demo login failed.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050F20] dark:bg-[#050F20] text-[#F4F7FF] dark:text-[#F4F7FF] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] p-7 sm:p-9 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-[#F4F7FF] dark:text-[#F4F7FF]">
            Digital Footprint
          </h1>
          <p className="mt-1 text-sm text-[#A9B7CE] dark:text-[#A9B7CE]">
            See your online exposure & stay protected.
          </p>
        </div>

        <button
          type="button"
          disabled={demoLoading}
          onClick={() => void handleDemo()}
          className="mt-7 flex w-full items-center justify-between rounded-xl border border-blue-300 dark:border-blue-600/80 bg-blue-950/40/70 dark:bg-blue-950/40 px-4 py-3.5 text-left hover:bg-blue-950/40 dark:hover:bg-blue-950/70 transition-colors cursor-pointer"
        >
          <div>
            <p className="text-sm font-semibold text-blue-300 dark:text-blue-300">
              {demoLoading ? 'Opening demo...' : 'Try Demo Account'}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Explore Elena Vance’s sample profile
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-300 shrink-0" aria-hidden="true" />
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200 dark:bg-[#172641]" />
          <span className="text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">or sign in</span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-[#172641]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-medium text-[#F4F7FF] dark:text-[#F4F7FF] mb-1.5"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#050F20] px-3.5 py-2.5 text-sm text-[#F4F7FF] dark:text-[#F4F7FF] placeholder:text-[#A9B7CE] focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-medium text-[#F4F7FF] dark:text-[#F4F7FF] mb-1.5"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#050F20] px-3.5 py-2.5 text-sm text-[#F4F7FF] dark:text-[#F4F7FF] placeholder:text-[#A9B7CE] focus:border-blue-500 focus:outline-none"
            />
          </div>

          {(error || dbError) && (
            <p className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300">
              {error || dbError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#A9B7CE] dark:text-[#A9B7CE]">
          Don’t have an account?{' '}
          <Link
            to="/register"
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
