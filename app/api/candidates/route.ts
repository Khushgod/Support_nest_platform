import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/auth';
import { getOrgCandidates } from '@/lib/queries';

// All candidates in the org (Program Manager pipeline view).
export async function GET(req: NextRequest) {
  const auth = requireRole(req, 'program_manager');
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ candidates: getOrgCandidates(auth.organization_id) });
}
