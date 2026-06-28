import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/middleware/auth';
import { AssessmentQuestion } from '@/lib/assessment';

// Create an assessment (Program Manager only).
export async function POST(req: NextRequest) {
  const auth = requireRole(req, 'program_manager');
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const { title, roleTitle, description, requisitionId, questions } = body ?? {};

  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json(
      { error: 'At least one question is required' },
      { status: 400 }
    );
  }

  // Normalize questions and assign ids.
  const normalized: AssessmentQuestion[] = questions.map((q: any) => ({
    id: randomUUID(),
    type: ['text', 'multiple-choice', 'coding'].includes(q.type) ? q.type : 'text',
    prompt: String(q.prompt ?? ''),
    options: Array.isArray(q.options)
      ? q.options.map((o: unknown) => String(o)).filter(Boolean)
      : undefined,
    correct: typeof q.correct === 'number' ? q.correct : undefined,
    rubric: typeof q.rubric === 'string' ? q.rubric : undefined,
  }));

  const id = randomUUID();
  const def = {
    title: title.trim(),
    description: String(description ?? ''),
    questions: normalized,
  };

  db.prepare(
    `INSERT INTO SkillAssessments
       (id, organization_id, requisition_id, role_title, assessment_json, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    auth.organization_id,
    typeof requisitionId === 'string' ? requisitionId : null,
    String(roleTitle ?? title).trim(),
    JSON.stringify(def),
    auth.id
  );

  return NextResponse.json({ success: true, id });
}
