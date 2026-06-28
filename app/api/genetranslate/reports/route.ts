import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/middleware/auth';

interface Row {
  id: string;
  original_name: string | null;
  uploaded_at: string;
  parsed_profile: string | null;
  first_name: string;
  last_name: string;
}

// List uploaded reports with their parsed profiles (TA only).
export async function GET(req: NextRequest) {
  const auth = requireRole(req, 'talent_acquisition');
  if (auth instanceof NextResponse) return auth;

  const rows = db
    .prepare(
      `SELECT d.id, d.original_name, d.uploaded_at, d.parsed_profile,
              c.first_name, c.last_name
       FROM DiagnosticReports d
       JOIN Candidates c ON c.id = d.candidate_id
       WHERE c.organization_id = ? AND d.deleted_at IS NULL
       ORDER BY d.uploaded_at DESC`
    )
    .all(auth.organization_id) as Row[];

  const reports = rows.map((r) => ({
    id: r.id,
    candidateName: `${r.first_name} ${r.last_name}`,
    reportName: r.original_name,
    uploadedAt: r.uploaded_at,
    profile: r.parsed_profile ? JSON.parse(r.parsed_profile) : null,
  }));

  return NextResponse.json({ reports });
}
