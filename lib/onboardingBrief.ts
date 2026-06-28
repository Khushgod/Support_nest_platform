import { llmText } from '@/lib/llm';
import { NeuroProfile, NEURODIVERGENCE_LABELS, Neurodivergence } from '@/lib/types';

export interface OnboardingBrief {
  name: string;
  role: string;
  team: string;
  neurodivergence: string;
  strengths: string[];
  communication: string[];
  accommodations: string[];
  firstWeek: string[];
}

const DEFAULT_FIRST_WEEK = [
  'Walk through role scope with written docs.',
  'Introduce one person or tool per day — avoid overload.',
  'Check in after 3 days: “What’s working? What would help?”',
  'Agree on preferred communication channels and focus hours.',
];

/**
 * Build a one-page brief for a new ND hire's manager, from the candidate's
 * PII-free profile. firstName is the only personal field, and it stays local
 * to the org (it is never sent to the LLM).
 */
export async function generateBrief(input: {
  firstName: string;
  role: string;
  team: string;
  profile: NeuroProfile | null;
  neurodivergence: Neurodivergence;
}): Promise<OnboardingBrief> {
  const nd = input.profile?.neurodivergence ?? input.neurodivergence;
  const ndLabel = NEURODIVERGENCE_LABELS[nd as Neurodivergence] ?? 'Neurodivergent';

  const strengths = input.profile?.strengths?.length
    ? input.profile.strengths
    : ['Systematic thinking', 'Sustained focus', 'Attention to detail'];

  const communication = [
    input.profile?.workStyleProfile?.communication,
    'Direct, specific feedback is helpful.',
  ].filter(Boolean) as string[];

  const accommodations = input.profile?.accommodations?.length
    ? input.profile.accommodations
    : ['Quiet space for focus', 'Async written updates', 'Clear, structured tasks'];

  // Optional LLM-tailored first-week tips (no PII sent — first name excluded).
  let firstWeek = DEFAULT_FIRST_WEEK;
  const llm = await llmText(
    'You are an inclusive-onboarding coach. Return 4 short, practical first-week ' +
      'tips (one line each, no numbering) for a manager of a new neurodivergent hire. ' +
      'No names or PII.',
    `Role: ${input.role} on ${input.team}. Neurodivergence: ${nd}. ` +
      `Strengths: ${strengths.join(', ')}. Accommodations: ${accommodations.join(', ')}.`
  );
  if (llm) {
    const lines = llm
      .split('\n')
      .map((l) => l.replace(/^[\s\-\d.]+/, '').trim())
      .filter((l) => l.length > 0);
    if (lines.length >= 3) firstWeek = lines.slice(0, 5);
  }

  return {
    name: input.firstName,
    role: input.role,
    team: input.team,
    neurodivergence: ndLabel,
    strengths,
    communication,
    accommodations,
    firstWeek,
  };
}
