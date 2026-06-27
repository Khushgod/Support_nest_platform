import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/auth';
import {
  getActiveMetrics,
  getCandidatesByPhase,
  getRequisitions,
  getStakeholders,
  getProgramHealth,
  getInclusionRoi,
} from '@/lib/queries';

export async function GET(req: NextRequest) {
  const auth = requireRole(req, 'program_manager');
  if (auth instanceof NextResponse) return auth;

  const orgId = auth.organization_id;
  return NextResponse.json({
    metrics: getActiveMetrics(orgId),
    phases: getCandidatesByPhase(orgId),
    requisitions: getRequisitions(orgId),
    stakeholders: getStakeholders(orgId),
    health: getProgramHealth(orgId),
    roi: getInclusionRoi(orgId),
  });
}
