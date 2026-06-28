import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUserFromRequest } from '@/lib/middleware/auth';

// New ND hires (currently onboarding or thriving) for the HR "My team" view.
export async function GET(req: NextRequest) {
  const user = getAuthUserFromRequest(req);
  if (!user || user.role !== 'employee_hr') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rows = db
    .prepare(
      `SELECT DISTINCT c.id, c.first_name, c.last_name, c.neurodivergence,
              r.title AS role, r.team AS team, h.phase_name AS phase
       FROM Candidates c
       JOIN HiringPhases h ON h.candidate_id = c.id AND h.exited_at IS NULL
       LEFT JOIN Requisitions r ON r.id = h.requisition_id
       WHERE c.organization_id = ? AND h.phase_name IN ('onboard','thrive')
       ORDER BY c.first_name`
    )
    .all(user.organization_id);

  return NextResponse.json({ hires: rows });
}
