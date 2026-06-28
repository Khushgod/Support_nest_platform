import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { getAuthUserFromRequest } from '@/lib/middleware/auth';
import { getModuleContent } from '@/lib/allyshipContent';
import { getAllyshipProgress } from '@/lib/queries';

// Submit the certification quiz. Auto-grades; >= passPct marks it complete.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const user = getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const content = getModuleContent(params.slug);
  if (!content || content.type !== 'quiz' || !content.quiz) {
    return NextResponse.json({ error: 'Not a quiz module' }, { status: 400 });
  }

  const mod = db
    .prepare(
      'SELECT id, "order" AS ord FROM AllyshipModules WHERE slug = ? AND organization_id = ?'
    )
    .get(params.slug, user.organization_id) as
    | { id: string; ord: number }
    | undefined;
  if (!mod) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 });
  }

  // All prior modules must be complete before certification.
  const priorIncomplete = db
    .prepare(
      `SELECT COUNT(*) AS n
       FROM AllyshipModules m
       LEFT JOIN UserAllyshipProgress p
         ON p.module_id = m.id AND p.user_id = ?
       WHERE m.organization_id = ? AND m."order" < ? AND p.completed_at IS NULL`
    )
    .get(user.id, user.organization_id, mod.ord) as { n: number };
  if (priorIncomplete.n > 0) {
    return NextResponse.json(
      { error: 'Complete the previous modules first' },
      { status: 400 }
    );
  }

  const { answers } = await req.json().catch(() => ({}));
  if (typeof answers !== 'object' || !answers) {
    return NextResponse.json({ error: 'answers are required' }, { status: 400 });
  }

  const qs = content.quiz.questions;
  let correct = 0;
  qs.forEach((q, i) => {
    const a = (answers as Record<string, unknown>)[String(i)];
    const picked = typeof a === 'number' ? a : Number(a);
    if (picked === q.correct) correct++;
  });
  const score = Math.round((correct / qs.length) * 100);
  const passed = score >= content.quiz.passPct;

  // Record progress: store the score; only mark complete (certified) if passed.
  db.prepare(
    `INSERT INTO UserAllyshipProgress (id, user_id, module_id, started_at, completed_at, score)
     VALUES (?, ?, ?, datetime('now'), ?, ?)
     ON CONFLICT(user_id, module_id) DO UPDATE SET
       started_at = COALESCE(started_at, datetime('now')),
       completed_at = ?,
       score = excluded.score`
  ).run(
    randomUUID(),
    user.id,
    mod.id,
    passed ? new Date().toISOString() : null,
    score,
    passed ? new Date().toISOString() : null
  );

  return NextResponse.json({
    success: true,
    score,
    passed,
    progress: getAllyshipProgress(user.organization_id, user.id),
  });
}
