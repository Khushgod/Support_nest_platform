import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/middleware/auth';
import { generateInviteToken, getInviteExpiry, getInviteLink } from '@/lib/invite';

// Issue a fresh invite token for a candidate (e.g. after the old one expired).
export async function POST(
  req: NextRequest,
  { params }: { params: { candidateId: string } }
) {
  const auth = requireRole(req, 'program_manager', 'talent_acquisition');
  if (auth instanceof NextResponse) return auth;

  const candidate = db
    .prepare(
      'SELECT id, status FROM Candidates WHERE id = ? AND organization_id = ?'
    )
    .get(params.candidateId, auth.organization_id) as
    | { id: string; status: string }
    | undefined;
  if (!candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
  }
  if (candidate.status === 'docs_submitted') {
    return NextResponse.json(
      { error: 'Candidate has already submitted documents' },
      { status: 400 }
    );
  }

  const token = generateInviteToken();
  const expiry = getInviteExpiry(30);
  db.prepare(
    `UPDATE Candidates
       SET invite_token = ?, invite_token_expires_at = ?, invite_token_used_at = NULL
     WHERE id = ?`
  ).run(token, expiry, candidate.id);

  return NextResponse.json({
    success: true,
    inviteLink: getInviteLink(token),
    expiresAt: expiry,
  });
}
