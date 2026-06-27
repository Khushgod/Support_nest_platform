import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/middleware/auth';
import { encryptFile, calculateHash, getEncryptionKey } from '@/lib/file';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
} as const;

function isAllowed(name: string, type: string): boolean {
  if (type in ALLOWED) return true;
  const lower = name.toLowerCase();
  return lower.endsWith('.pdf') || lower.endsWith('.docx');
}

export async function POST(req: NextRequest) {
  // Only Talent Acquisition may upload diagnostic reports.
  const auth = requireRole(req, 'talent_acquisition');
  if (auth instanceof NextResponse) return auth;

  try {
    const form = await req.formData();
    const file = form.get('file');
    const candidateId = form.get('candidateId');

    if (!(file instanceof File) || typeof candidateId !== 'string') {
      return NextResponse.json(
        { error: 'A file and candidateId are required' },
        { status: 400 }
      );
    }

    // Candidate must belong to the uploader's organization.
    const candidate = db
      .prepare('SELECT id FROM Candidates WHERE id = ? AND organization_id = ?')
      .get(candidateId, auth.organization_id) as { id: string } | undefined;
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File must be under 5MB' },
        { status: 400 }
      );
    }
    if (!isAllowed(file.name, file.type)) {
      return NextResponse.json(
        { error: 'Only PDF and DOCX files allowed' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = calculateHash(buffer);
    const encrypted = encryptFile(buffer, getEncryptionKey());

    // Store under uploads/{orgId}/{candidateId}/{uuid}.enc — UUID, not guessable.
    const relDir = path.join('uploads', auth.organization_id, candidateId);
    const absDir = path.join(process.cwd(), relDir);
    fs.mkdirSync(absDir, { recursive: true });

    const fileId = randomUUID();
    const relPath = path.join(relDir, `${fileId}.enc`).split(path.sep).join('/');
    fs.writeFileSync(path.join(process.cwd(), relPath), encrypted);

    const reportId = randomUUID();
    const uploadedAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO DiagnosticReports
         (id, candidate_id, file_path, original_name, file_size, file_hash, uploaded_by, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      reportId, candidateId, relPath, file.name, file.size, fileHash,
      auth.id, uploadedAt
    );

    // Audit (no PII — only resource ids).
    db.prepare(
      `INSERT INTO AuditLogs (id, user_id, action, resource_type, resource_id)
       VALUES (?, ?, 'uploaded_diagnostic_report', 'DiagnosticReports', ?)`
    ).run(randomUUID(), auth.id, reportId);

    return NextResponse.json({
      success: true,
      reportId,
      fileName: file.name,
      uploadedAt,
      fileSize: file.size,
    });
  } catch (error) {
    console.error('upload error:', (error as Error).message);
    return NextResponse.json(
      { error: 'Something went wrong. Try again.' },
      { status: 500 }
    );
  }
}
