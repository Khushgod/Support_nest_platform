import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/middleware/auth';
import { getAllyshipProgress } from '@/lib/queries';

// List all modules for the current user (with their progress).
export async function GET(req: NextRequest) {
  const user = getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = getAllyshipProgress(user.organization_id, user.id);
  return NextResponse.json(data);
}
