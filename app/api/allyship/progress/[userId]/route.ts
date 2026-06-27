import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/middleware/auth';
import { getAllyshipProgress } from '@/lib/queries';

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const user = getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // A user may only view their own allyship progress (privacy).
  if (params.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const data = getAllyshipProgress(user.organization_id, user.id);
  return NextResponse.json(data);
}
