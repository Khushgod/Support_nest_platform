/**
 * Seed the database with one organization and three role-based test users.
 * Idempotent: re-running replaces the "Acme Corp" org and its users.
 *
 * Run with:  npm run seed
 */
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/utils/auth';
import { Role } from '@/lib/types';

const ORG_NAME = 'Acme Corp';

const TEST_USERS: { email: string; role: Role; full_name: string }[] = [
  { email: 'pm@acme.com', role: 'program_manager', full_name: 'Priya Manager' },
  { email: 'ta@acme.com', role: 'talent_acquisition', full_name: 'Tariq Acquire' },
  { email: 'hr@acme.com', role: 'employee_hr', full_name: 'Hana Resource' },
];

async function main() {
  const passwordHash = await hashPassword('password');

  // Remove any prior Acme Corp org (cascades to its users) for a clean reseed.
  const existing = db
    .prepare('SELECT id FROM Organizations WHERE name = ?')
    .get(ORG_NAME) as { id: string } | undefined;
  if (existing) {
    db.prepare('DELETE FROM Organizations WHERE id = ?').run(existing.id);
  }

  const orgId = randomUUID();

  const seed = db.transaction(() => {
    db.prepare('INSERT INTO Organizations (id, name) VALUES (?, ?)').run(
      orgId,
      ORG_NAME
    );
    const insertUser = db.prepare(
      `INSERT INTO Users (id, organization_id, email, password_hash, role, full_name)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const u of TEST_USERS) {
      insertUser.run(randomUUID(), orgId, u.email, passwordHash, u.role, u.full_name);
    }
  });
  seed();

  console.log(`✓ Seeded "${ORG_NAME}" with ${TEST_USERS.length} users:`);
  for (const u of TEST_USERS) {
    console.log(`   - ${u.email} / password  (${u.role})`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
