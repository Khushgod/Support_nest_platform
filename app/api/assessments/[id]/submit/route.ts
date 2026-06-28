import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/middleware/auth';
import { AssessmentDefinition } from '@/lib/assessment';
import { autoGrade } from '@/lib/grading';

// Submit answers for a candidate. MC auto-grades; free-text → pending review.
// (Candidates aren't users in this MVP, so TA submits on their behalf.)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireRole(req, 'talent_acquisition', 'program_manager');
  if (auth instanceof NextResponse) return auth;

  const { candidateId, answers } = await req.json().catch(() => ({}));
  if (typeof candidateId !== 'string' || typeof answers !== 'object' || !answers) {
    return NextResponse.json(
      { error: 'candidateId and answers are required' },
      { status: 400 }
    );
  }

  const row = db
    .prepare(
      'SELECT assessment_json FROM SkillAssessments WHERE id = ? AND organization_id = ?'
    )
    .get(params.id, auth.organization_id) as { assessment_json: string } | undefined;
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const def = JSON.parse(row.assessment_json) as AssessmentDefinition;
  const grade = autoGrade(def.questions, answers as Record<string, unknown>);

  // Ensure an assignment row exists, then record the submission.
  const existing = db
    .prepare(
      'SELECT id FROM CandidateAssessmentResults WHERE candidate_id = ? AND assessment_id = ?'
    )
    .get(candidateId, params.id) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE CandidateAssessmentResults
       SET answers = ?, status = ?, score = ?, completed_at = datetime('now'),
           graded_at = CASE WHEN ? = 'graded' THEN datetime('now') ELSE graded_at END
       WHERE id = ?`
    ).run(
      JSON.stringify(answers),
      grade.status,
      grade.score,
      grade.status,
      existing.id
    );
  } else {
    const { randomUUID } = await import('crypto');
    db.prepare(
      `INSERT INTO CandidateAssessmentResults
         (id, candidate_id, assessment_id, status, answers, score, assigned_by, completed_at, graded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`
    ).run(
      randomUUID(),
      candidateId,
      params.id,
      grade.status,
      JSON.stringify(answers),
      grade.score,
      auth.id,
      grade.status === 'graded' ? new Date().toISOString() : null
    );
  }

  return NextResponse.json({
    success: true,
    status: grade.status,
    score: grade.score,
    autoGradedCount: grade.autoGradedCount,
    pendingCount: grade.pendingCount,
  });
}
