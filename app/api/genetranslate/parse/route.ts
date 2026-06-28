import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/middleware/auth';
import { decryptFile, getEncryptionKey } from '@/lib/file';
import { parseReport } from '@/lib/genetranslate';

interface ReportRow {
  id: string;
  candidate_id: string;
  file_path: string;
  original_name: string | null;
  neurodivergence: string;
}

// Re-run genetranslate for an existing report (TA only).
export async function POST(req: NextRequest) {
  const auth = requireRole(req, 'talent_acquisition');
  if (auth instanceof NextResponse) return auth;

  const { reportId } = await req.json().catch(() => ({}));
  if (typeof reportId !== 'string') {
    return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
  }

  const report = db
    .prepare(
      `SELECT d.id, d.candidate_id, d.file_path, d.original_name, c.neurodivergence
       FROM DiagnosticReports d
       JOIN Candidates c ON c.id = d.candidate_id
       WHERE d.id = ? AND c.organization_id = ? AND d.deleted_at IS NULL`
    )
    .get(reportId, auth.organization_id) as ReportRow | undefined;
  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const ext = (report.original_name ?? '').toLowerCase().endsWith('.docx')
    ? '.docx'
    : '.pdf';
  const tmpPath = path.join(os.tmpdir(), `gt-${randomUUID()}${ext}`);
  try {
    const encrypted = fs.readFileSync(path.join(process.cwd(), report.file_path));
    const decrypted = decryptFile(encrypted, getEncryptionKey());
    fs.writeFileSync(tmpPath, decrypted);

    const profile = await parseReport(tmpPath, {
      hint: report.neurodivergence as 'autistic' | 'adhd' | 'both' | 'other',
    });
    db.prepare('UPDATE DiagnosticReports SET parsed_profile = ? WHERE id = ?').run(
      JSON.stringify(profile),
      report.id
    );
    return NextResponse.json({ success: true, parsedProfile: profile });
  } catch (error) {
    console.error('genetranslate parse error:', (error as Error).message);
    return NextResponse.json({ error: 'Could not parse report' }, { status: 500 });
  } finally {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
  }
}
