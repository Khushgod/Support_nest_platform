import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUserFromRequest } from '@/lib/middleware/auth';
import { generateBrief } from '@/lib/onboardingBrief';
import { Neurodivergence, NeuroProfile } from '@/lib/types';

interface CandRow {
  id: string;
  first_name: string;
  neurodivergence: Neurodivergence;
  role: string | null;
  team: string | null;
}

// Personalized onboarding brief for a new ND hire (HR only).
export async function GET(
  req: NextRequest,
  { params }: { params: { candidateId: string } }
) {
  const user = getAuthUserFromRequest(req);
  if (!user || user.role !== 'employee_hr') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const cand = db
    .prepare(
      `SELECT c.id, c.first_name, c.neurodivergence,
              r.title AS role, r.team AS team
       FROM Candidates c
       LEFT JOIN HiringPhases h ON h.candidate_id = c.id AND h.exited_at IS NULL
       LEFT JOIN Requisitions r ON r.id = h.requisition_id
       WHERE c.id = ? AND c.organization_id = ?
       LIMIT 1`
    )
    .get(params.candidateId, user.organization_id) as CandRow | undefined;

  if (!cand) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const reportRow = db
    .prepare(
      `SELECT parsed_profile FROM DiagnosticReports
       WHERE candidate_id = ? AND deleted_at IS NULL AND parsed_profile IS NOT NULL
       ORDER BY uploaded_at DESC LIMIT 1`
    )
    .get(cand.id) as { parsed_profile: string } | undefined;
  const profile: NeuroProfile | null = reportRow
    ? JSON.parse(reportRow.parsed_profile)
    : null;

  const brief = await generateBrief({
    firstName: cand.first_name,
    role: cand.role ?? 'New role',
    team: cand.team ?? 'the team',
    profile,
    neurodivergence: cand.neurodivergence,
  });

  return NextResponse.json({ brief });
}
