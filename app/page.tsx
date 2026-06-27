import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/middleware/auth';
import { LoginForm } from '@/components/LoginForm';
import { ROLE_HOME } from '@/lib/types';

// Login lives at the root. If already authenticated, jump to the role home.
export default function HomePage() {
  const user = getAuthUser();
  if (user) {
    redirect(ROLE_HOME[user.role] ?? '/dashboard');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo / branding */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--violet)] text-base font-bold text-[#0E1018]">
            SN
          </div>
          <span className="text-xl font-semibold text-[var(--text)]">
            Support Nest
          </span>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-[var(--text-3)]">
          Hiring OS for neurodivergent talent
        </p>
      </div>
    </main>
  );
}
