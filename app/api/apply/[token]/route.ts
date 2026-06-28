import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { db } from '@/lib/db';
import { encryptFile, calculateHash, getEncryptionKey } from '@/lib/file';
import { parseReport } from '@/lib/genetranslate';
import { isTokenExpired, isTokenUsed } from '@/lib/invite';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const VALID_ND = ['autistic', 'adhd', 'both', 'other'];

function isAllowed(file: File): boolean {
  const n = file.name.toLowerCase();
  return n.endsWith('.pdf') || n.endsWith('.docx');
}

interface CandRow {
  id: string;
  organization_id: string;
  first_name: string;
  invite_token_expires_at: string | null;
  invite_token_used_at: string | null;
}

// PUBLIC: a candidate submits their resume + diagnostic via their invite link.
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const candidate = db
    .prepare(
      `SELECT id, organization_id, first_name, invite_token_expires_at, invite_token_used_at
       FROM Candidates WHERE invite_token = ?`
    )
    .get(params.token) as CandRow | undefined;

  if (!candidate) {
    return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
  }
  if (isTokenUsed(candidate.invite_token_used_at)) {
    return NextResponse.json({ error: 'Already submitted' }, { status: 400 });
  }
  if (isTokenExpired(candidate.invite_token_expires_at)) {
    return NextResponse.json({ error: 'Link expired' }, { status: 400 });
  }

  let neurodivergence: string;
  let yearsExperience: number;
  let resume: File;
  let diagnostic: File;
  try {
    const form = await req.formData();
    neurodivergence = String(form.get('neurodivergence') ?? '');
    yearsExperience = Number(form.get('years_experience') ?? 0);
    const r = form.get('resume');
    const d = form.get('diagnostic');
    if (!(r instanceof File) || !(d instanceof File)) {
      return NextResponse.json(
        { error: 'Resume and diagnostic report are both required' },
        { status: 400 }
      );
    }
    resume = r;
    diagnostic = d;
  } catch {
    return NextResponse.json({ error: 'Could not read submission' }, { status: 400 });
  }

  if (!VALID_ND.includes(neurodivergence)) {
    return NextResponse.json({ error: 'Select a neurodivergence option' }, { status: 400 });
  }
  if (!Number.isFinite(yearsExperience) || yearsExperience < 0) {
    yearsExperience = 0;
  }
  for (const f of [resume, diagnostic]) {
    if (f.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Each file must be under 5MB' }, { status: 400 });
    }
    if (!isAllowed(f)) {
      return NextResponse.json({ error: 'Only PDF and DOCX files allowed' }, { status: 400 });
    }
  }

  const key = getEncryptionKey();
  const relDir = path.join('uploads', candidate.organization_id, candidate.id);
  fs.mkdirSync(path.join(process.cwd(), relDir), { recursive: true });

  const writeEncrypted = (buffer: Buffer, prefix: string): string => {
    const rel = path.join(relDir, `${prefix}_${randomUUID()}.enc`).split(path.sep).join('/');
    fs.writeFileSync(path.join(process.cwd(), rel), encryptFile(buffer, key));
    return rel;
  };

  const now = new Date().toISOString();
  const resumeBuf = Buffer.from(await resume.arrayBuffer());
  const diagBuf = Buffer.from(await diagnostic.arrayBuffer());

  // Store both files encrypted at rest.
  writeEncrypted(resumeBuf, 'resume');
  const diagPath = writeEncrypted(diagBuf, 'diag');

  // DiagnosticReports row for the encrypted diagnostic.
  const reportId = randomUUID();
  db.prepare(
    `INSERT INTO DiagnosticReports
       (id, candidate_id, file_path, original_name, file_size, file_hash, uploaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    reportId, candidate.id, diagPath, diagnostic.name, diagnostic.size,
    calculateHash(diagBuf), now
  );

  // genetranslate from a short-lived temp copy. If it fails, status still advances.
  const ext = diagnostic.name.toLowerCase().endsWith('.docx') ? '.docx' : '.pdf';
  const tmpPath = path.join(os.tmpdir(), `gt-${reportId}${ext}`);
  try {
    fs.writeFileSync(tmpPath, diagBuf);
    const profile = await parseReport(tmpPath, {
      hint: neurodivergence as 'autistic' | 'adhd' | 'both' | 'other',
    });
    db.prepare('UPDATE DiagnosticReports SET parsed_profile = ? WHERE id = ?').run(
      JSON.stringify(profile),
      reportId
    );
  } catch (err) {
    console.error('apply genetranslate error:', (err as Error).message);
  } finally {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
  }

  // Advance the candidate: docs submitted, token consumed.
  db.prepare(
    `UPDATE Candidates
       SET neurodivergence = ?, years_experience = ?, status = 'docs_submitted',
           resume_received_at = ?, diagnostic_received_at = ?, invite_token_used_at = ?
     WHERE id = ?`
  ).run(neurodivergence, yearsExperience, now, now, now, candidate.id);

  return NextResponse.json({ success: true, candidateName: candidate.first_name });
}
