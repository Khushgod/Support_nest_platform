'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { DEMO_INVITE_TOKEN } from '@/lib/utils/constants';

type Mode = 'login' | 'register';

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Shared login call used by the form and the quick demo buttons.
  async function loginWith(loginEmail: string, loginPassword: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }
      router.push(data.redirectTo || '/dashboard');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (mode === 'login') {
      await loginWith(email, password);
      return;
    }

    // Register flow.
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }
      router.push(data.redirectTo || '/dashboard');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  const DEMO_ACCOUNTS = [
    { label: 'Program Manager', email: 'pm@acme.com' },
    { label: 'Talent Acquisition', email: 'ta@acme.com' },
    { label: 'Employee / HR', email: 'hr@acme.com' },
  ];

  const inputClass =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-3)] focus:border-[var(--violet)] focus:outline-none';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[var(--text)]">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-sm text-[var(--text-3)]">
          {mode === 'login'
            ? 'Sign in to Support Nest'
            : 'Get started with Support Nest'}
        </p>
      </div>

      {mode === 'register' && (
        <div>
          <label className="mb-1 block text-sm text-[var(--text-2)]">
            Full name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
            placeholder="Jane Doe"
            autoComplete="name"
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm text-[var(--text-2)]">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="you@company.com"
          autoComplete="email"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-[var(--text-2)]">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="••••••••"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
        />
      </div>

      {error && (
        <p className="text-sm text-[var(--rose)]" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading
          ? 'Please wait…'
          : mode === 'login'
          ? 'Sign in'
          : 'Create account'}
      </Button>

      {mode === 'login' && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <p className="mb-2 text-center text-xs text-[var(--text-3)]">
            Or jump straight into a demo role (password: <code>password</code>)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                disabled={loading}
                onClick={() => loginWith(a.email, 'password')}
                className="rounded-md bg-[var(--surface-1)] px-2 py-2 text-xs font-medium text-[var(--text-2)] transition-colors hover:bg-[var(--violet)] hover:text-[#0E1018] disabled:opacity-50"
              >
                {a.label}
              </button>
            ))}
          </div>
          <a
            href={`/apply/${DEMO_INVITE_TOKEN}`}
            className="mt-2 block text-center text-xs text-[var(--violet)] hover:underline"
          >
            Test the candidate intake form →
          </a>
        </div>
      )}

      <p className="text-center text-sm text-[var(--text-3)]">
        {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
          className="font-medium text-[var(--violet)] hover:underline"
        >
          {mode === 'login' ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </form>
  );
}
