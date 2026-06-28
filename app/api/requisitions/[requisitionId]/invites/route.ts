import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/middleware/auth';
import { getInviteLink, deriveInviteStatus, InviteStatus } from '@/lib/invite';

interface CandRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  neurodivergence: string | null;
  status: string;
  invite_token: string | null;
  invite_token_expires_at: string | null;
  invite_token_used_at: string | null;
  resume_received_at: string | null;
  diagnostic_received_at: string | null;
  created_at: string;
  combined_score: number | null;
}

// List candidates for a requisition (via HiringPhases) with invite + match info.
export async function GET(
  req: NextRequest,
  { params }: { params: { requisitionId: string } }
) {
  const auth = requireRole(req, 'program_manager', 'talent_acquisition');
  if (auth instanceof NextResponse) return auth;

  const { requisitionId } = params;
  const requisition = db
    .prepare('SELECT id, title, team FROM Requisitions WHERE id = ? AND organization_id = ?')
    .get(requisitionId, auth.organization_id) as
    | { id: string; title: string; team: string }
    | undefined;
  if (!requisition) {
    return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
  }

  const rows = db
    .prepare(
      `SELECT DISTINCT c.id, c.first_name, c.last_name, c.email, c.neurodivergence,
              c.status, c.invite_token, c.invite_token_expires_at, c.invite_token_used_at,
              c.resume_received_at, c.diagnostic_received_at, c.created_at,
              ms.combined_score
       FROM Candidates c
       JOIN HiringPhases hp ON hp.candidate_id = c.id
       LEFT JOIN MatchScores ms
         ON ms.candidate_id = c.id AND ms.requisition_id = ?
       WHERE hp.requisition_id = ? AND c.organization_id = ?
       ORDER BY c.created_at DESC`
    )
    .all(requisitionId, requisitionId, auth.organization_id) as CandRow[];

  const candidates = rows.map((c) => {
    const inviteStatus: InviteStatus = deriveInviteStatus(c);
    return {
      id: c.id,
      name: `${c.first_name} ${c.last_name}`.trim(),
      email: c.email,
      neurodivergence: c.neurodivergence,
      status: c.status,
      inviteStatus,
      inviteLink: c.invite_token ? getInviteLink(c.invite_token) : null,
      resumeReceived: Boolean(c.resume_received_at),
      diagnosticReceived: Boolean(c.diagnostic_received_at),
      matchScore: c.combined_score ?? null,
    };
  });

  const metrics = {
    total: candidates.length,
    pending_docs: candidates.filter((c) => c.status === 'pending_docs').length,
    docs_submitted: candidates.filter((c) => c.status === 'docs_submitted').length,
    matched: candidates.filter((c) => c.matchScore != null).length,
  };

  // Past import batches for this requisition.
  const batches = db
    .prepare(
      `SELECT id, filename, uploaded_at, row_count, imported_count, failed_count, duplicate_count
       FROM BulkImportBatches
       WHERE requisition_id = ? AND organization_id = ?
       ORDER BY uploaded_at DESC`
    )
    .all(requisitionId, auth.organization_id);

  return NextResponse.json({
    requisition: { id: requisition.id, title: requisition.title, team: requisition.team },
    candidates,
    metrics,
    batches,
  });
}
