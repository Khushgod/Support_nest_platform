import { db } from '@/lib/db';
import { isTokenExpired, isTokenUsed } from '@/lib/invite';
import { CandidateIntakeForm } from '@/components/CandidateIntakeForm';

interface CandRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  invite_token_expires_at: string | null;
  invite_token_used_at: string | null;
  organization_id: string;
}

function ErrorCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-8 text-center">
      <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--violet)] text-sm font-bold text-[#0E1018]">
        SN
      </div>
      <h1 className="text-lg font-semibold text-[var(--text)]">{title}</h1>
      <p className="mt-2 text-sm text-[var(--text-2)]">{body}</p>
    </div>
  );
}

export default function ApplyPage({ params }: { params: { token: string } }) {
  const candidate = db
    .prepare(
      `SELECT id, first_name, last_name, email, status,
              invite_token_expires_at, invite_token_used_at, organization_id
       FROM Candidates WHERE invite_token = ?`
    )
    .get(params.token) as CandRow | undefined;

  if (!candidate) {
    return (
      <ErrorCard
        title="This link is not valid"
        body="Contact the hiring team if you believe this is an error."
      />
    );
  }
  if (candidate.status === 'docs_submitted' || isTokenUsed(candidate.invite_token_used_at)) {
    return (
      <ErrorCard
        title="You've already submitted your application"
        body="Contact the hiring team for updates."
      />
    );
  }
  if (isTokenExpired(candidate.invite_token_expires_at)) {
    return (
      <ErrorCard
        title="This link has expired"
        body="Please ask the hiring team for a new invite."
      />
    );
  }

  // Role/company context via the candidate's apply-phase requisition.
  const ctx = db
    .prepare(
      `SELECT r.title AS roleTitle, r.team AS team, o.name AS company
       FROM HiringPhases hp
       JOIN Requisitions r ON r.id = hp.requisition_id
       JOIN Organizations o ON o.id = r.organization_id
       WHERE hp.candidate_id = ?
       ORDER BY hp.entered_at ASC LIMIT 1`
    )
    .get(candidate.id) as
    | { roleTitle: string; team: string; company: string }
    | undefined;

  return (
    <CandidateIntakeForm
      token={params.token}
      name={`${candidate.first_name} ${candidate.last_name}`.trim()}
      email={candidate.email}
      roleTitle={ctx?.roleTitle ?? 'this role'}
      team={ctx?.team ?? ''}
      company={ctx?.company ?? 'the company'}
    />
  );
}
