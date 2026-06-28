import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/middleware/auth';
import { getModuleContent } from '@/lib/allyshipContent';

// Fetch a single module's content (or quiz questions without answers).
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const user = getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const mod = getModuleContent(params.slug);
  if (!mod) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 });
  }

  // For quizzes, strip the correct-answer index before sending to the client.
  const quiz = mod.quiz
    ? {
        passPct: mod.quiz.passPct,
        questions: mod.quiz.questions.map((q) => ({
          prompt: q.prompt,
          options: q.options,
        })),
      }
    : undefined;

  return NextResponse.json({
    slug: mod.slug,
    order: mod.order,
    title: mod.title,
    description: mod.description,
    durationMinutes: mod.durationMinutes,
    type: mod.type,
    contentHtml: mod.contentHtml ?? null,
    quiz,
  });
}
