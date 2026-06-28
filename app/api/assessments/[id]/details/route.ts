import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/middleware/auth';
import { AssessmentDefinition } from '@/lib/assessment';

// Full assessment definition + assigned candidates and their statuses (PM/TA).
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireRole(req, 'program_manager', 'talent_acquisition');
  if (auth instanceof NextResponse) return auth;

  const row = db
    .prepare(
      'SELECT id, role_title, assessment_json FROM SkillAssessments WHERE id = ? AND organization_id = ?'
    )
    .get(params.id, auth.organization_id) as
    | { id: string; role_title: string; assessment_json: string }
    | undefined;
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const def = JSON.parse(row.assessment_json) as AssessmentDefinition;

  const assigned = db
    .prepare(
      `SELECT r.candidate_id AS candidateId,
              c.first_name || ' ' || c.last_name AS candidateName,
              r.status, r.score, r.completed_at AS completedAt
       FROM CandidateAssessmentResults r
       JOIN Candidates c ON c.id = r.candidate_id
       WHERE r.assessment_id = ?
       ORDER BY r.assigned_at DESC`
    )
    .all(params.id);

  return NextResponse.json({
    id: row.id,
    roleTitle: row.role_title,
    ...def,
    assigned,
  });
}
