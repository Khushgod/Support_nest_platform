import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/middleware/auth';

// View a candidate's result for an assessment (PM/TA).
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; candidateId: string } }
) {
  const auth = requireRole(req, 'program_manager', 'talent_acquisition');
  if (auth instanceof NextResponse) return auth;

  // Scope by org via the assessment.
  const assessment = db
    .prepare('SELECT id FROM SkillAssessments WHERE id = ? AND organization_id = ?')
    .get(params.id, auth.organization_id);
  if (!assessment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const result = db
    .prepare(
      `SELECT status, answers, score, feedback, completed_at AS completedAt, graded_at AS gradedAt
       FROM CandidateAssessmentResults
       WHERE assessment_id = ? AND candidate_id = ?`
    )
    .get(params.id, params.candidateId) as
    | {
        status: string;
        answers: string | null;
        score: number | null;
        feedback: string | null;
        completedAt: string | null;
        gradedAt: string | null;
      }
    | undefined;

  if (!result) {
    return NextResponse.json({ error: 'No result' }, { status: 404 });
  }

  return NextResponse.json({
    ...result,
    answers: result.answers ? JSON.parse(result.answers) : null,
  });
}
