/**
 * Seed the database with realistic demo data.
 * Idempotent: re-running replaces the "Acme Corp" org and everything under it.
 *
 * Run with:  npm run seed
 *
 * Data shape:
 *   - 1 org (Acme Corp), 3 users (pm/ta/hr)
 *   - 3 requisitions
 *   - 15 ACTIVE candidates (8 applied, 4 matched, 2 assessing, 1 interviewing)
 *   - 8 HISTORICAL candidates (6 hired→onboard/thrive, 2 rejected) so the PM
 *     dashboard can compute real time-to-offer and retention metrics
 *   - MatchScores for every non-applied candidate
 *   - HiringPhases reflecting each candidate's journey (with timestamps)
 *   - 5 Allyship modules (content arrives in Chunk 3)
 */
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/utils/auth';
import { ALLYSHIP_MODULES } from '@/lib/allyshipContent';
import {
  CandidateStatus,
  Neurodivergence,
  PhaseName,
  Role,
} from '@/lib/types';

const ORG_NAME = 'Acme Corp';

const TEST_USERS: { email: string; role: Role; full_name: string }[] = [
  { email: 'pm@acme.com', role: 'program_manager', full_name: 'Priya Rao' },
  { email: 'ta@acme.com', role: 'talent_acquisition', full_name: 'Arjun Kapoor' },
  { email: 'hr@acme.com', role: 'employee_hr', full_name: 'Sana Mehta' },
];

// Days ago → UTC ISO timestamp string (datetime('now') compatible).
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);
}

const FIRST_NAMES = [
  'Aiden', 'Riya', 'Marcus', 'Lena', 'Sam', 'Noor', 'Devon', 'Mei',
  'Theo', 'Aria', 'Jonah', 'Priscilla', 'Kai', 'Esha', 'Owen',
  'Tara', 'Felix', 'Nadia', 'Ravi', 'Yuki', 'Cole', 'Imani', 'Sven',
];
const LAST_NAMES = [
  'Patel', 'Nguyen', 'Okafor', 'Schmidt', 'Garcia', 'Kim', 'Rossi',
  'Haddad', 'Andersen', 'Mehta', 'Walsh', 'Diallo', 'Tanaka', 'Costa',
  'Bauer', 'Reyes', 'Novak', 'Khan', 'Petrov', 'Sato', 'Murphy', 'Cole', 'Berg',
];
const NDS: Neurodivergence[] = ['autistic', 'adhd', 'both', 'other'];

interface CandidateSpec {
  status: CandidateStatus;
  currentPhase: PhaseName | null; // null = no active phase (rejected)
  reqIndex: number;
  // Days ago the candidate first applied — drives time-to-offer math.
  appliedDaysAgo: number;
  // For hired candidates: days ago they reached the onboard phase.
  onboardDaysAgo?: number;
  scored: boolean; // whether a MatchScore exists
}

function buildCandidateSpecs(): CandidateSpec[] {
  const specs: CandidateSpec[] = [];
  let req = 0;
  const nextReq = () => (req = (req + 1) % 3);

  // ── 15 active candidates ──
  for (let i = 0; i < 8; i++) {
    specs.push({ status: 'applied', currentPhase: 'apply', reqIndex: req, appliedDaysAgo: 3 + i, scored: false });
    nextReq();
  }
  for (let i = 0; i < 4; i++) {
    specs.push({ status: 'matched', currentPhase: 'match', reqIndex: req, appliedDaysAgo: 12 + i, scored: true });
    nextReq();
  }
  for (let i = 0; i < 2; i++) {
    specs.push({ status: 'assessing', currentPhase: 'assess', reqIndex: req, appliedDaysAgo: 20 + i, scored: true });
    nextReq();
  }
  specs.push({ status: 'interviewing', currentPhase: 'interview', reqIndex: req, appliedDaysAgo: 28, scored: true });
  nextReq();

  // ── 6 hired (historical) — 5 thriving, 1 onboarding ──
  for (let i = 0; i < 5; i++) {
    specs.push({
      status: 'offered',
      currentPhase: 'thrive',
      reqIndex: req,
      appliedDaysAgo: 95 + i * 4,
      onboardDaysAgo: 55 + i * 4,
      scored: true,
    });
    nextReq();
  }
  specs.push({
    status: 'offered',
    currentPhase: 'onboard',
    reqIndex: req,
    appliedDaysAgo: 70,
    onboardDaysAgo: 8,
    scored: true,
  });
  nextReq();

  // ── 2 rejected (historical) ──
  for (let i = 0; i < 2; i++) {
    specs.push({ status: 'rejected', currentPhase: null, reqIndex: req, appliedDaysAgo: 40 + i * 5, scored: true });
    nextReq();
  }

  return specs;
}

const PHASE_SEQUENCE: PhaseName[] = [
  'apply', 'match', 'assess', 'interview', 'onboard', 'thrive',
];

async function main() {
  const passwordHash = await hashPassword('password');

  const existing = db
    .prepare('SELECT id FROM Organizations WHERE name = ?')
    .get(ORG_NAME) as { id: string } | undefined;
  if (existing) {
    db.prepare('DELETE FROM Organizations WHERE id = ?').run(existing.id);
  }

  const orgId = randomUUID();
  const userIds: Record<Role, string> = {
    program_manager: randomUUID(),
    talent_acquisition: randomUUID(),
    employee_hr: randomUUID(),
  };

  const requisitions = [
    { id: randomUUID(), title: 'Data Analyst', team: 'Growth', openings: 2,
      description: 'Analyze growth funnels and build reporting dashboards.' },
    { id: randomUUID(), title: 'QA Tester', team: 'Platform', openings: 5,
      description: 'Manual + exploratory testing for the core platform.' },
    { id: randomUUID(), title: 'Junior Developer', team: 'Engineering', openings: 3,
      description: 'Ship features across the stack with mentorship.' },
  ];

  const specs = buildCandidateSpecs();

  const seed = db.transaction(() => {
    db.prepare('INSERT INTO Organizations (id, name) VALUES (?, ?)').run(orgId, ORG_NAME);

    const insertUser = db.prepare(
      `INSERT INTO Users (id, organization_id, email, password_hash, role, full_name)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const u of TEST_USERS) {
      insertUser.run(userIds[u.role], orgId, u.email, passwordHash, u.role, u.full_name);
    }

    const insertReq = db.prepare(
      `INSERT INTO Requisitions (id, organization_id, title, team, description, openings, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)`
    );
    for (const r of requisitions) {
      insertReq.run(r.id, orgId, r.title, r.team, r.description, r.openings,
        userIds.program_manager, daysAgo(60));
    }

    const insertCand = db.prepare(
      `INSERT INTO Candidates (id, organization_id, first_name, last_name, email, neurodivergence, years_experience, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertMatch = db.prepare(
      `INSERT INTO MatchScores (id, candidate_id, requisition_id, resume_fit_score, neurodiversity_fit_score, combined_score, reasoning, calculated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertPhase = db.prepare(
      `INSERT INTO HiringPhases (id, candidate_id, requisition_id, phase_name, entered_at, exited_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    specs.forEach((spec, i) => {
      const candId = randomUUID();
      const first = FIRST_NAMES[i % FIRST_NAMES.length];
      const last = LAST_NAMES[i % LAST_NAMES.length];
      const nd = NDS[i % NDS.length];
      const years = (i % 8); // 0–7
      const req = requisitions[spec.reqIndex];

      insertCand.run(
        candId, orgId, first, last,
        `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
        nd, years, spec.status, daysAgo(spec.appliedDaysAgo)
      );

      // MatchScore (skip pure applicants — matching happens at the match phase).
      if (spec.scored) {
        const resume = 60 + ((i * 7) % 31);          // 60–90
        const ndFit = 65 + ((i * 11) % 31);          // 65–95
        const combined = Math.round((resume * 0.6 + ndFit * 0.4) * 10) / 10;
        insertMatch.run(
          randomUUID(), candId, req.id, resume, ndFit, combined,
          'Strong pattern-recognition and focus align with role requirements.',
          daysAgo(spec.appliedDaysAgo - 1)
        );
      }

      // HiringPhases: walk the sequence up to (and including) the current phase.
      if (spec.currentPhase) {
        const endIdx = PHASE_SEQUENCE.indexOf(spec.currentPhase);
        const totalSpan = spec.appliedDaysAgo;
        for (let p = 0; p <= endIdx; p++) {
          const phase = PHASE_SEQUENCE[p];
          // Spread phases across the candidate's elapsed time.
          let enteredDaysAgo: number;
          if (phase === 'onboard' && spec.onboardDaysAgo !== undefined) {
            enteredDaysAgo = spec.onboardDaysAgo;
          } else if (phase === 'thrive' && spec.onboardDaysAgo !== undefined) {
            enteredDaysAgo = Math.max(1, spec.onboardDaysAgo - 7);
          } else {
            enteredDaysAgo = Math.round(totalSpan - (totalSpan * p) / (endIdx + 1));
          }
          const isCurrent = p === endIdx;
          const exitedDaysAgo = isCurrent
            ? null
            : PHASE_SEQUENCE[p + 1] === 'onboard' && spec.onboardDaysAgo !== undefined
              ? spec.onboardDaysAgo
              : Math.round(totalSpan - (totalSpan * (p + 1)) / (endIdx + 1));
          insertPhase.run(
            randomUUID(), candId, req.id, phase,
            daysAgo(enteredDaysAgo),
            exitedDaysAgo === null ? null : daysAgo(exitedDaysAgo)
          );
        }
      } else {
        // Rejected: applied then exited.
        insertPhase.run(randomUUID(), candId, req.id, 'apply',
          daysAgo(spec.appliedDaysAgo), daysAgo(spec.appliedDaysAgo - 5));
      }
    });

    // Allyship modules — metadata sourced from lib/allyshipContent.ts.
    const insertModule = db.prepare(
      `INSERT INTO AllyshipModules (id, organization_id, slug, title, description, duration_minutes, content_html, "order")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const m of ALLYSHIP_MODULES) {
      insertModule.run(
        randomUUID(), orgId, m.slug, m.title, m.description,
        m.durationMinutes, m.contentHtml ?? null, m.order
      );
    }
  });
  seed();

  const counts = {
    requisitions: (db.prepare('SELECT COUNT(*) c FROM Requisitions').get() as any).c,
    candidates: (db.prepare('SELECT COUNT(*) c FROM Candidates').get() as any).c,
    matchScores: (db.prepare('SELECT COUNT(*) c FROM MatchScores').get() as any).c,
    phases: (db.prepare('SELECT COUNT(*) c FROM HiringPhases').get() as any).c,
    modules: (db.prepare('SELECT COUNT(*) c FROM AllyshipModules').get() as any).c,
  };

  console.log(`✓ Seeded "${ORG_NAME}"`);
  console.log(`   users: ${TEST_USERS.length}  (pm/ta/hr @acme.com / password)`);
  console.log(`   requisitions: ${counts.requisitions}`);
  console.log(`   candidates: ${counts.candidates}  (15 active + 8 historical)`);
  console.log(`   match scores: ${counts.matchScores}`);
  console.log(`   hiring phases: ${counts.phases}`);
  console.log(`   allyship modules: ${counts.modules}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
