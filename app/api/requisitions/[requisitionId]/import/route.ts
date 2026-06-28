import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/middleware/auth';
import { parseAndValidateCsv, splitName } from '@/lib/csv';
import { generateInviteToken, getInviteExpiry, getInviteLink } from '@/lib/invite';

const MAX_ROWS = 500;

// POST a CSV of LinkedIn applicants → create pending_docs candidates + invite links.
export async function POST(
  req: NextRequest,
  { params }: { params: { requisitionId: string } }
) {
  const auth = requireRole(req, 'program_manager');
  if (auth instanceof NextResponse) return auth;

  const { requisitionId } = params;

  // Requisition must belong to the PM's organization.
  const requisition = db
    .prepare('SELECT id FROM Requisitions WHERE id = ? AND organization_id = ?')
    .get(requisitionId, auth.organization_id) as { id: string } | undefined;
  if (!requisition) {
    return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
  }

  let csvText: string;
  let filename = 'upload.csv';
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A CSV file is required' }, { status: 400 });
    }
    filename = file.name || filename;
    csvText = await file.text();
  } catch {
    return NextResponse.json({ error: 'Could not read upload' }, { status: 400 });
  }

  const { valid, errors, totalRows } = parseAndValidateCsv(csvText);
  if (totalRows > MAX_ROWS) {
    return NextResponse.json(
      { error: `Too many rows (${totalRows}). Max ${MAX_ROWS} per batch.` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  let duplicateCount = 0;
  const imported: { id: string; name: string; email: string; inviteLink: string }[] = [];

  const dupCheck = db.prepare(
    'SELECT id FROM Candidates WHERE email = ? AND organization_id = ?'
  );
  const insertCand = db.prepare(
    `INSERT INTO Candidates
       (id, organization_id, first_name, last_name, email, status,
        application_source, application_received_at, invite_token,
        invite_token_expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending_docs', 'csv_import', ?, ?, ?, ?)`
  );
  const insertPhase = db.prepare(
    `INSERT INTO HiringPhases (id, candidate_id, requisition_id, phase_name, entered_at)
     VALUES (?, ?, ?, 'apply', ?)`
  );

  // One transaction for the whole batch.
  const runBatch = db.transaction(() => {
    for (const row of valid) {
      if (dupCheck.get(row.email, auth.organization_id)) {
        duplicateCount++;
        continue;
      }
      const candId = randomUUID();
      const token = generateInviteToken();
      const expiry = getInviteExpiry(30);
      const { firstName, lastName } = splitName(row.name);
      insertCand.run(
        candId, auth.organization_id, firstName, lastName, row.email,
        row.applied_date || now, token, expiry, now
      );
      insertPhase.run(randomUUID(), candId, requisitionId, now);
      imported.push({
        id: candId,
        name: row.name,
        email: row.email,
        inviteLink: getInviteLink(token),
      });
    }

    const batchId = randomUUID();
    db.prepare(
      `INSERT INTO BulkImportBatches
         (id, organization_id, requisition_id, uploaded_by, uploaded_at, filename,
          row_count, imported_count, failed_count, duplicate_count, error_log)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      batchId, auth.organization_id, requisitionId, auth.id, now, filename,
      totalRows, imported.length, errors.length, duplicateCount,
      errors.length ? JSON.stringify(errors) : null
    );
    return batchId;
  });

  const batchId = runBatch();

  // Audit (no PII — ids and counts only).
  db.prepare(
    `INSERT INTO AuditLogs (id, user_id, action, resource_type, resource_id)
     VALUES (?, ?, 'bulk_imported_candidates', 'BulkImportBatches', ?)`
  ).run(randomUUID(), auth.id, batchId);

  return NextResponse.json({
    success: true,
    batchId,
    summary: {
      total_rows: totalRows,
      imported: imported.length,
      failed: errors.length,
      duplicates_skipped: duplicateCount,
    },
    candidates: imported,
    errors,
  });
}
