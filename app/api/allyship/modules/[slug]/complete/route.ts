import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { getAuthUserFromRequest } from '@/lib/middleware/auth';
import { getAllyshipProgress } from '@/lib/queries';

// Mark a content module complete. Enforces sequential unlock.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const user = getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const mod = db
    .prepare(
      'SELECT id, "order" AS ord, slug FROM AllyshipModules WHERE slug = ? AND organization_id = ?'
    )
    .get(params.slug, user.organization_id) as
    | { id: string; ord: number; slug: string }
    | undefined;
  if (!mod) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 });
  }

  // The certification quiz is completed via the certification endpoint.
  if (mod.slug === 'certification') {
    return NextResponse.json(
      { error: 'Complete the certification via the quiz' },
      { status: 400 }
    );
  }

  // All earlier modules must be completed first.
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

  db.prepare(
    `INSERT INTO UserAllyshipProgress (id, user_id, module_id, started_at, completed_at)
     VALUES (?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(user_id, module_id) DO UPDATE SET
       completed_at = datetime('now'),
       started_at = COALESCE(started_at, datetime('now'))`
  ).run(randomUUID(), user.id, mod.id);

  return NextResponse.json({
    success: true,
    progress: getAllyshipProgress(user.organization_id, user.id),
  });
}
