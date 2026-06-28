import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/middleware/auth';

// Assign an assessment to a candidate (TA only).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireRole(req, 'talent_acquisition');
  if (auth instanceof NextResponse) return auth;

  const { candidateId } = await req.json().catch(() => ({}));
  if (typeof candidateId !== 'string') {
    return NextResponse.json({ error: 'candidateId is required' }, { status: 400 });
  }

  // Both assessment and candidate must belong to the org.
  const assessment = db
    .prepare('SELECT id FROM SkillAssessments WHERE id = ? AND organization_id = ?')
    .get(params.id, auth.organization_id);
  const candidate = db
    .prepare('SELECT id FROM Candidates WHERE id = ? AND organization_id = ?')
    .get(candidateId, auth.organization_id);
  if (!assessment || !candidate) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Idempotent assign (UNIQUE candidate+assessment).
  db.prepare(
    `INSERT INTO CandidateAssessmentResults
       (id, candidate_id, assessment_id, status, assigned_by)
     VALUES (?, ?, ?, 'assigned', ?)
     ON CONFLICT(candidate_id, assessment_id) DO NOTHING`
  ).run(randomUUID(), candidateId, params.id, auth.id);

  return NextResponse.json({ success: true });
}
