import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/middleware/auth';

interface ReportRow {
  id: string;
  file_path: string;
  uploaded_by: string | null;
  candidate_id: string;
  organization_id: string;
}

function loadReportForOrg(id: string, orgId: string): ReportRow | undefined {
  return db
    .prepare(
      `SELECT d.id, d.file_path, d.uploaded_by, d.candidate_id, c.organization_id
       FROM DiagnosticReports d
       JOIN Candidates c ON c.id = d.candidate_id
       WHERE d.id = ? AND c.organization_id = ?`
    )
    .get(id, orgId) as ReportRow | undefined;
}

// Hard-delete: remove the encrypted file from disk and the DB row entirely.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireRole(req, 'talent_acquisition');
  if (auth instanceof NextResponse) return auth;

  const report = loadReportForOrg(params.id, auth.organization_id);
  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }
  // Only the uploader may delete their own upload.
  if (report.uploaded_by && report.uploaded_by !== auth.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const abs = path.join(process.cwd(), report.file_path);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (error) {
    console.error('delete file error:', (error as Error).message);
    // Continue to remove the DB row regardless.
  }

  db.prepare('DELETE FROM DiagnosticReports WHERE id = ?').run(report.id);
  db.prepare(
    `INSERT INTO AuditLogs (id, user_id, action, resource_type, resource_id)
     VALUES (?, ?, 'deleted_diagnostic_report', 'DiagnosticReports', ?)`
  ).run(randomUUID(), auth.id, report.id);

  return NextResponse.json({ success: true });
}
