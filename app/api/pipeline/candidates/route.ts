import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/auth';
import { getPipelineCandidates, getRequisitions } from '@/lib/queries';

export async function GET(req: NextRequest) {
  const auth = requireRole(req, 'talent_acquisition');
  if (auth instanceof NextResponse) return auth;

  const orgId = auth.organization_id;
  const candidates = getPipelineCandidates(orgId);

  return NextResponse.json({
    candidates,
    requisitions: getRequisitions(orgId),
    // The "shortlist" is the highest-scoring slice of the active pipeline.
    shortlist: [...candidates]
      .filter((c) => c.matchScore != null)
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
      .slice(0, 5)
      .map((c) => c.id),
  });
}
