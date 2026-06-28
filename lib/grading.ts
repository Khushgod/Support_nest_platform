import { AssessmentQuestion } from '@/lib/assessment';

export interface GradeResult {
  score: number | null; // 0..100, or null if manual review still needed
  status: 'submitted' | 'graded';
  autoGradedCount: number;
  pendingCount: number;
}

/**
 * Auto-grade multiple-choice answers. Text/coding answers need manual review.
 * If every question is multiple-choice, we can fully grade on submit.
 *
 * @param questions the assessment's questions
 * @param answers   map of questionId -> answer (number index for MC, string otherwise)
 */
export function autoGrade(
  questions: AssessmentQuestion[],
  answers: Record<string, unknown>
): GradeResult {
  const mc = questions.filter((q) => q.type === 'multiple-choice');
  const manual = questions.filter((q) => q.type !== 'multiple-choice');

  let correct = 0;
  for (const q of mc) {
    const a = answers[q.id];
    const picked = typeof a === 'number' ? a : Number(a);
    if (!Number.isNaN(picked) && picked === q.correct) correct++;
  }

  // Fully auto-gradable (all MC): final score now.
  if (manual.length === 0 && mc.length > 0) {
    return {
      score: Math.round((correct / mc.length) * 100),
      status: 'graded',
      autoGradedCount: mc.length,
      pendingCount: 0,
    };
  }

  // Mixed/free-text: leave for manual grading.
  return {
    score: null,
    status: 'submitted',
    autoGradedCount: mc.length,
    pendingCount: manual.length,
  };
}
