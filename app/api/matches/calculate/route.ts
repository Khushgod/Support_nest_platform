import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/middleware/auth';
import { calculateMatch } from '@/lib/matching';
import { Neurodivergence, NeuroProfile } from '@/lib/types';

interface CandRow {
  id: string;
  neurodivergence: Neurodivergence;
  years_experience: number;
}
interface ReqRow {
  id: string;
  title: string;
  team: string;
  description: string | null;
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, 'talent_acquisition', 'program_manager');
  if (auth instanceof NextResponse) return auth;

  // Accept body OR query params (the spec shows ?candidateId=&requisitionId=).
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  const candidateId = body.candidateId ?? url.searchParams.get('candidateId');
  const requisitionId = body.requisitionId ?? url.searchParams.get('requisitionId');

  if (!candidateId || !requisitionId) {
    return NextResponse.json(
      { error: 'candidateId and requisitionId are required' },
      { status: 400 }
    );
  }

  const candidate = db
    .prepare(
      'SELECT id, neurodivergence, years_experience FROM Candidates WHERE id = ? AND organization_id = ?'
    )
    .get(candidateId, auth.organization_id) as CandRow | undefined;
  const requisition = db
    .prepare(
      'SELECT id, title, team, description FROM Requisitions WHERE id = ? AND organization_id = ?'
    )
    .get(requisitionId, auth.organization_id) as ReqRow | undefined;

  if (!candidate || !requisition) {
    return NextResponse.json(
      { error: 'Candidate or requisition not found' },
      { status: 404 }
    );
  }

  // Latest parsed diagnostic profile, if any.
  const reportRow = db
    .prepare(
      `SELECT parsed_profile FROM DiagnosticReports
       WHERE candidate_id = ? AND deleted_at IS NULL AND parsed_profile IS NOT NULL
       ORDER BY uploaded_at DESC LIMIT 1`
    )
    .get(candidateId) as { parsed_profile: string } | undefined;
  const profile: NeuroProfile | null = reportRow
    ? JSON.parse(reportRow.parsed_profile)
    : null;

  const result = await calculateMatch(
    {
      neurodivergence: candidate.neurodivergence,
      yearsExperience: candidate.years_experience,
      profile,
    },
    {
      title: requisition.title,
      team: requisition.team,
      description: requisition.description ?? '',
    }
  );

  // Upsert into MatchScores.
  db.prepare(
    `INSERT INTO MatchScores
       (id, candidate_id, requisition_id, resume_fit_score, neurodiversity_fit_score, combined_score, reasoning, calculated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(candidate_id, requisition_id) DO UPDATE SET
       resume_fit_score = excluded.resume_fit_score,
       neurodiversity_fit_score = excluded.neurodiversity_fit_score,
       combined_score = excluded.combined_score,
       reasoning = excluded.reasoning,
       calculated_at = excluded.calculated_at`
  ).run(
    randomUUID(),
    candidateId,
    requisitionId,
    result.skillsFit,
    result.neurodiversityFit,
    result.score,
    result.reasoning
  );

  return NextResponse.json({
    candidateId,
    requisitionId,
    score: result.score,
    reasoning: result.reasoning,
    strengths: result.strengths,
    gaps: result.gaps,
  });
}
