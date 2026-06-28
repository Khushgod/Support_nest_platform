'use client';

import { usePathname } from 'next/navigation';
import { AuthUser, ROLE_LABELS } from '@/lib/types';

interface PageMeta {
  title: string;
  crumb: string;
}

// Title + breadcrumb per route. Falls back to a generic title.
const PAGE_META: Record<string, PageMeta> = {
  '/dashboard': { title: 'Program overview', crumb: 'Acme Corp · Neuroinclusion cohort 2026 Q2' },
  '/requisitions': { title: 'Requisitions', crumb: 'Acme Corp · Open roles' },
  '/candidates': { title: 'Candidates', crumb: 'Acme Corp · Pipeline' },
  '/stakeholders': { title: 'Stakeholders', crumb: 'Acme Corp · Team' },
  '/roi': { title: 'Inclusion ROI', crumb: 'Acme Corp · Outcomes' },
  '/pipeline': { title: 'Talent pipeline', crumb: 'Acme Corp · Active requisitions' },
  '/genetranslate': { title: 'genetranslate', crumb: 'Acme Corp · Diagnostic parsing' },
  '/assessments': { title: 'Skill assessments', crumb: 'Assessment library' },
  '/interview-prep': { title: 'Interview prep', crumb: 'Candidate readiness' },
  '/allyship': { title: 'Allyship training', crumb: 'Acme Corp · Your learning path' },
  '/modules': { title: 'Module library', crumb: 'All allyship modules' },
  '/certificates': { title: 'Certificates', crumb: 'Your certifications' },
  '/my-team': { title: 'My team', crumb: 'Upcoming ND hires' },
};

function metaFor(pathname: string): PageMeta {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  const match = Object.keys(PAGE_META).find((p) => pathname.startsWith(p + '/'));
  return match ? PAGE_META[match] : { title: 'Support Nest', crumb: '' };
}

export function Topbar({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const { title, crumb } = metaFor(pathname);

  return (
    <header className="flex h-16 flex-none items-center justify-between border-b border-[var(--border)] bg-[var(--bg)] px-6">
      <div>
        {crumb && <p className="text-xs text-[var(--text-3)]">{crumb}</p>}
        <h1 className="text-lg font-semibold text-[var(--text)]">{title}</h1>
      </div>
      <div className="text-right">
        <p className="text-sm text-[var(--text)]">
          {user.name || user.email?.split('@')[0] || 'User'}
        </p>
        <p className="text-xs text-[var(--text-3)]">{ROLE_LABELS[user.role]}</p>
      </div>
    </header>
  );
}
