import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/middleware/auth';

// Manually grade a free-text/coding submission (PM/TA).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; candidateId: string } }
) {
  const auth = requireRole(req, 'program_manager', 'talent_acquisition');
  if (auth instanceof NextResponse) return auth;

  const { score, feedback } = await req.json().catch(() => ({}));
  if (typeof score !== 'number' || score < 0 || score > 100) {
    return NextResponse.json(
      { error: 'score (0-100) is required' },
      { status: 400 }
    );
  }

  const assessment = db
    .prepare('SELECT id FROM SkillAssessments WHERE id = ? AND organization_id = ?')
    .get(params.id, auth.organization_id);
  if (!assessment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const info = db
    .prepare(
      `UPDATE CandidateAssessmentResults
       SET score = ?, feedback = ?, status = 'graded', graded_at = datetime('now')
       WHERE assessment_id = ? AND candidate_id = ?`
    )
    .run(score, typeof feedback === 'string' ? feedback : null, params.id, params.candidateId);

  if (info.changes === 0) {
    return NextResponse.json({ error: 'No result to grade' }, { status: 404 });
  }
  return NextResponse.json({ success: true, score });
}
