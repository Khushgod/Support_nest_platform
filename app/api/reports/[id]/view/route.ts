import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/middleware/auth';
import { decryptFile, getEncryptionKey } from '@/lib/file';

interface ReportRow {
  id: string;
  file_path: string;
  original_name: string | null;
}

// Decrypt and stream the original file back. Role-gated to Talent Acquisition.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireRole(req, 'talent_acquisition');
  if (auth instanceof NextResponse) return auth;

  const report = db
    .prepare(
      `SELECT d.id, d.file_path, d.original_name
       FROM DiagnosticReports d
       JOIN Candidates c ON c.id = d.candidate_id
       WHERE d.id = ? AND c.organization_id = ? AND d.deleted_at IS NULL`
    )
    .get(params.id, auth.organization_id) as ReportRow | undefined;

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  try {
    const abs = path.join(process.cwd(), report.file_path);
    const encrypted = fs.readFileSync(abs);
    const decrypted = decryptFile(encrypted, getEncryptionKey());

    // Audit the view of a sensitive resource.
    db.prepare(
      `INSERT INTO AuditLogs (id, user_id, action, resource_type, resource_id)
       VALUES (?, ?, 'viewed_diagnostic_report', 'DiagnosticReports', ?)`
    ).run(randomUUID(), auth.id, report.id);

    const name = report.original_name ?? 'report';
    const isPdf = name.toLowerCase().endsWith('.pdf');
    return new NextResponse(decrypted as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': isPdf
          ? 'application/pdf'
          : 'application/octet-stream',
        'Content-Disposition': `inline; filename="${name}"`,
      },
    });
  } catch (error) {
    console.error('view error:', (error as Error).message);
    return NextResponse.json({ error: 'Could not read report' }, { status: 500 });
  }
}
