import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { register, dbError } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password needs at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await register(fullName.trim(), email.trim(), password);
      showToast({
        type: 'success',
        title: 'Account created',
      });
      navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'Could not create account.');
    } finally {
      setSubmitting(false);
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
            Create Account
          </h1>
          <p className="mt-1 text-sm text-[#A9B7CE] dark:text-[#A9B7CE]">
            Your private privacy checkup space.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <label
              htmlFor="reg-name"
              className="block text-xs font-medium text-[#F4F7FF] dark:text-[#F4F7FF] mb-1.5"
            >
              Your Name
            </label>
            <input
              id="reg-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alex Morgan"
              required
              className="w-full rounded-xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#050F20] px-3.5 py-2.5 text-sm text-[#F4F7FF] dark:text-[#F4F7FF] placeholder:text-[#A9B7CE] focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="reg-email"
              className="block text-xs font-medium text-[#F4F7FF] dark:text-[#F4F7FF] mb-1.5"
            >
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#050F20] px-3.5 py-2.5 text-sm text-[#F4F7FF] dark:text-[#F4F7FF] placeholder:text-[#A9B7CE] focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="reg-password"
              className="block text-xs font-medium text-[#F4F7FF] dark:text-[#F4F7FF] mb-1.5"
            >
              Password (8+ characters)
            </label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={8}
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
            {submitting ? 'Creating account...' : 'Get Started'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#A9B7CE] dark:text-[#A9B7CE]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
