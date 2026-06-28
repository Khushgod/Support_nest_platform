import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/middleware/auth';
import { AssessmentDefinition, AssessmentSummary } from '@/lib/assessment';

// List assessments for the org (PM + TA).
export async function GET(req: NextRequest) {
  const auth = requireRole(req, 'program_manager', 'talent_acquisition');
  if (auth instanceof NextResponse) return auth;

  const rows = db
    .prepare(
      `SELECT id, role_title, assessment_json, created_at
       FROM SkillAssessments WHERE organization_id = ?
       ORDER BY created_at DESC`
    )
    .all(auth.organization_id) as {
    id: string;
    role_title: string;
    assessment_json: string;
    created_at: string;
  }[];

  const assessments: AssessmentSummary[] = rows.map((r) => {
    const def = JSON.parse(r.assessment_json) as AssessmentDefinition;
    return {
      id: r.id,
      title: def.title,
      description: def.description,
      roleTitle: r.role_title,
      questionCount: def.questions?.length ?? 0,
      createdAt: r.created_at,
    };
  });

  return NextResponse.json({ assessments });
}
