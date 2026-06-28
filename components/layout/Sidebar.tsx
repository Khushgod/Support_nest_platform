'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthUser, ROLE_LABELS, Role } from '@/lib/types';

interface NavItem {
  label: string;
  href: string;
}

// Role-scoped navigation. Roles only ever see their own routes (see CLAUDE.md).
const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  program_manager: [
    { label: 'Overview', href: '/dashboard' },
    { label: 'Requisitions', href: '/requisitions' },
    { label: 'Candidates', href: '/candidates' },
    { label: 'Stakeholders', href: '/stakeholders' },
    { label: 'Inclusion ROI', href: '/roi' },
  ],
  talent_acquisition: [
    { label: 'Pipeline', href: '/pipeline' },
    { label: 'genetranslate', href: '/genetranslate' },
    { label: 'Assessments', href: '/assessments' },
    { label: 'Interview prep', href: '/interview-prep' },
  ],
  employee_hr: [
    { label: 'My training', href: '/allyship' },
    { label: 'Module library', href: '/modules' },
    { label: 'Certificates', href: '/certificates' },
    { label: 'My team', href: '/my-team' },
  ],
};

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function Sidebar({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const nav = NAV_BY_ROLE[user.role] ?? [];

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-[var(--border)] bg-[var(--surface-1)]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--violet)] text-sm font-bold text-[#0E1018]">
          SN
        </div>
        <span className="font-semibold text-[var(--text)]">Support Nest</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-[var(--surface-2)] text-[var(--text)]'
                  : 'text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer: user info + logout */}
      <div className="border-t border-[var(--border)] p-3">
        <div className="mb-2 flex items-center gap-2 px-1">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-semibold text-[var(--violet)]">
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--text)]">
              {user.name}
            </p>
            <p className="truncate text-xs text-[var(--text-3)]">
              {ROLE_LABELS[user.role]} · {user.email}
            </p>
          </div>
        </div>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--text-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--rose)]"
          >
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
