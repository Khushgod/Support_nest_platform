import { llmText } from '@/lib/llm';
import { Neurodivergence, NeuroProfile } from '@/lib/types';

export interface CandidateProfile {
  neurodivergence: Neurodivergence;
  yearsExperience: number;
  profile?: NeuroProfile | null; // genetranslate output, if available
}

export interface RequisitionProfile {
  title: string;
  team: string;
  description: string;
}

export interface MatchResult {
  score: number; // 0..100 combined
  neurodiversityFit: number; // 0..100
  skillsFit: number; // 0..100
  reasoning: string;
  strengths: string[];
  gaps: string[];
}

type RoleArchetype = 'detail-oriented' | 'technical' | 'creative' | 'general';

function roleArchetype(req: RequisitionProfile): RoleArchetype {
  const t = `${req.title} ${req.description}`.toLowerCase();
  if (/data|analyst|qa|test|quality|research|audit/.test(t)) return 'detail-oriented';
  if (/develop|engineer|program|software|technical|code/.test(t)) return 'technical';
  if (/design|content|market|creative|brand/.test(t)) return 'creative';
  return 'general';
}

// Base neurodiversity-fit by archetype (the platform's core thesis).
const ND_FIT: Record<Neurodivergence, Record<RoleArchetype, number>> = {
  autistic: { 'detail-oriented': 92, technical: 84, creative: 70, general: 74 },
  adhd: { 'detail-oriented': 72, technical: 86, creative: 88, general: 78 },
  both: { 'detail-oriented': 86, technical: 85, creative: 80, general: 78 },
  other: { 'detail-oriented': 75, technical: 75, creative: 75, general: 75 },
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Score a candidate against a role. Neurodiversity fit (60%) + skills fit (40%).
 * Reasoning is LLM-generated when available, with a deterministic fallback.
 */
export async function calculateMatch(
  candidate: CandidateProfile,
  req: RequisitionProfile
): Promise<MatchResult> {
  const archetype = roleArchetype(req);
  const neurodiversityFit = clamp(ND_FIT[candidate.neurodivergence][archetype]);

  // Skills fit: experience + overlap between profile strengths/traits and role text.
  const roleText = `${req.title} ${req.description}`.toLowerCase();
  const signals = [
    ...(candidate.profile?.strengths ?? []),
    ...(candidate.profile?.traits ?? []),
  ].map((s) => s.toLowerCase());
  const overlap = signals.filter((s) =>
    s.split(/\W+/).some((w) => w.length > 3 && roleText.includes(w))
  ).length;
  const skillsFit = clamp(
    48 + Math.min(candidate.yearsExperience * 6, 30) + Math.min(overlap * 6, 22)
  );

  const score = clamp(neurodiversityFit * 0.6 + skillsFit * 0.4);

  const strengths = (candidate.profile?.strengths ?? [
    'Systematic thinking',
    'Sustained focus',
  ]).slice(0, 3);

  const gaps: string[] = [];
  if (candidate.yearsExperience < 2) gaps.push('Early-career: limited years of experience');
  if (skillsFit < 65) gaps.push('Verify role-specific skills via assessment');
  if (overlap === 0) gaps.push('No diagnostic profile on file yet — upload to refine match');
  if (gaps.length === 0) gaps.push('No significant gaps identified');

  // Reasoning via LLM (PII-free inputs only), with deterministic fallback.
  const fallback =
    `${candidate.neurodivergence} profile aligns ~${neurodiversityFit}% with this ` +
    `${archetype.replace('-', ' ')} role; resume/skills fit ~${skillsFit}%. ` +
    `Combined match ${score}%.`;

  const reasoning =
    (await llmText(
      'You are a neurodiversity hiring assistant. Write ONE concise sentence (max 30 words) ' +
        'explaining why this candidate fits the role. No PII. Be specific and encouraging.',
      `Role: ${req.title} (${req.team}). Archetype: ${archetype}. ` +
        `Candidate neurodivergence: ${candidate.neurodivergence}. ` +
        `Strengths: ${strengths.join(', ')}. ` +
        `Neuro fit ${neurodiversityFit}%, skills fit ${skillsFit}%, combined ${score}%.`
    )) ?? fallback;

  return { score, neurodiversityFit, skillsFit, reasoning: reasoning.trim(), strengths, gaps };
}
