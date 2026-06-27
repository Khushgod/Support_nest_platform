import { db } from '@/lib/db';
import { PHASE_ORDER, PhaseName } from '@/lib/types';

// ── Program Manager ──────────────────────────────────────────────────────────

export interface PmMetrics {
  activeCandidates: number;
  avgMatchScore: number; // 0–100
  timeToOfferDays: number;
  retentionPct: number; // 0–100
}

/** Headline metrics, all derived from seeded data (no hardcoded values). */
export function getActiveMetrics(orgId: string): PmMetrics {
  const active = db
    .prepare(
      `SELECT COUNT(*) AS c FROM Candidates
       WHERE organization_id = ? AND status != 'rejected'`
    )
    .get(orgId) as { c: number };

  const avg = db
    .prepare(
      `SELECT AVG(m.combined_score) AS a
       FROM MatchScores m
       JOIN Candidates c ON c.id = m.candidate_id
       WHERE c.organization_id = ?`
    )
    .get(orgId) as { a: number | null };

  // Avg days from 'apply' entry to 'onboard' entry for hired candidates.
  const tto = db
    .prepare(
      `SELECT AVG(julianday(o.entered_at) - julianday(a.entered_at)) AS d
       FROM HiringPhases o
       JOIN HiringPhases a ON a.candidate_id = o.candidate_id AND a.phase_name = 'apply'
       JOIN Candidates c ON c.id = o.candidate_id
       WHERE c.organization_id = ? AND o.phase_name = 'onboard'`
    )
    .get(orgId) as { d: number | null };

  // Retention proxy: candidates who reached 'thrive' / those who reached 'onboard'.
  const onboardEver = db
    .prepare(
      `SELECT COUNT(DISTINCT h.candidate_id) AS c
       FROM HiringPhases h JOIN Candidates c ON c.id = h.candidate_id
       WHERE c.organization_id = ? AND h.phase_name = 'onboard'`
    )
    .get(orgId) as { c: number };
  const thriveEver = db
    .prepare(
      `SELECT COUNT(DISTINCT h.candidate_id) AS c
       FROM HiringPhases h JOIN Candidates c ON c.id = h.candidate_id
       WHERE c.organization_id = ? AND h.phase_name = 'thrive'`
    )
    .get(orgId) as { c: number };

  return {
    activeCandidates: active.c,
    avgMatchScore: Math.round(avg.a ?? 0),
    timeToOfferDays: Math.round(tto.d ?? 0),
    retentionPct: onboardEver.c
      ? Math.round((thriveEver.c / onboardEver.c) * 100)
      : 0,
  };
}

/** Count of candidates currently sitting in each phase (exited_at IS NULL). */
export function getCandidatesByPhase(
  orgId: string
): { phase: PhaseName; count: number }[] {
  const rows = db
    .prepare(
      `SELECT h.phase_name AS phase, COUNT(DISTINCT h.candidate_id) AS count
       FROM HiringPhases h
       JOIN Candidates c ON c.id = h.candidate_id
       WHERE c.organization_id = ? AND h.exited_at IS NULL
       GROUP BY h.phase_name`
    )
    .all(orgId) as { phase: PhaseName; count: number }[];

  const map = new Map(rows.map((r) => [r.phase, r.count]));
  return PHASE_ORDER.map((phase) => ({ phase, count: map.get(phase) ?? 0 }));
}

export interface RequisitionRow {
  id: string;
  title: string;
  team: string;
  openings: number;
  status: string;
  candidateCount: number;
}

/** Open requisitions with a count of currently-active candidates on each. */
export function getRequisitions(
  orgId: string,
  requisitionId?: string
): RequisitionRow[] {
  const where = requisitionId ? 'AND r.id = ?' : '';
  const params = requisitionId ? [orgId, requisitionId] : [orgId];
  return db
    .prepare(
      `SELECT r.id, r.title, r.team, r.openings, r.status,
              (SELECT COUNT(DISTINCT h.candidate_id)
               FROM HiringPhases h
               WHERE h.requisition_id = r.id AND h.exited_at IS NULL) AS candidateCount
       FROM Requisitions r
       WHERE r.organization_id = ? ${where}
       ORDER BY r.created_at ASC`
    )
    .all(...params) as RequisitionRow[];
}

export interface Stakeholder {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export function getStakeholders(orgId: string): Stakeholder[] {
  return db
    .prepare(
      `SELECT id, full_name, email, role FROM Users
       WHERE organization_id = ? ORDER BY full_name ASC`
    )
    .all(orgId) as Stakeholder[];
}

export interface PhaseHealth {
  phase: PhaseName;
  everEntered: number;
  conversionPct: number; // vs. the previous phase
}

/** Funnel conversion: how many candidates ever reached each phase. */
export function getProgramHealth(orgId: string): PhaseHealth[] {
  const rows = db
    .prepare(
      `SELECT h.phase_name AS phase, COUNT(DISTINCT h.candidate_id) AS n
       FROM HiringPhases h
       JOIN Candidates c ON c.id = h.candidate_id
       WHERE c.organization_id = ?
       GROUP BY h.phase_name`
    )
    .all(orgId) as { phase: PhaseName; n: number }[];

  const map = new Map(rows.map((r) => [r.phase, r.n]));
  let prev = 0;
  return PHASE_ORDER.map((phase, i) => {
    const everEntered = map.get(phase) ?? 0;
    const conversionPct =
      i === 0 || prev === 0 ? 100 : Math.round((everEntered / prev) * 100);
    prev = everEntered || prev;
    return { phase, everEntered, conversionPct };
  });
}

export interface InclusionRoi {
  hires: number;
  candidatesProcessed: number;
  retentionPct: number;
  avgMatchScore: number;
}

/** Outcome-based Inclusion ROI (derived from data, not a fabricated budget). */
export function getInclusionRoi(orgId: string): InclusionRoi {
  const hires = db
    .prepare(
      `SELECT COUNT(DISTINCT h.candidate_id) AS c
       FROM HiringPhases h JOIN Candidates c ON c.id = h.candidate_id
       WHERE c.organization_id = ? AND h.phase_name IN ('onboard','thrive')`
    )
    .get(orgId) as { c: number };
  const processed = db
    .prepare('SELECT COUNT(*) AS c FROM Candidates WHERE organization_id = ?')
    .get(orgId) as { c: number };
  const metrics = getActiveMetrics(orgId);
  return {
    hires: hires.c,
    candidatesProcessed: processed.c,
    retentionPct: metrics.retentionPct,
    avgMatchScore: metrics.avgMatchScore,
  };
}

// ── Talent Acquisition ───────────────────────────────────────────────────────

export interface PipelineCandidate {
  id: string;
  first_name: string;
  last_name: string;
  neurodivergence: string;
  years_experience: number;
  status: string;
  matchScore: number | null;
  assessmentStatus: 'not_started' | 'in_progress' | 'completed';
  requisitionId: string | null;
  requisitionTitle: string | null;
  hasReport: boolean;
}

/** Active pipeline (excludes rejected) with match score + current requisition. */
export function getPipelineCandidates(orgId: string): PipelineCandidate[] {
  return db
    .prepare(
      `SELECT
         c.id, c.first_name, c.last_name, c.neurodivergence,
         c.years_experience, c.status,
         (SELECT m.combined_score FROM MatchScores m
            WHERE m.candidate_id = c.id ORDER BY m.calculated_at DESC LIMIT 1) AS matchScore,
         (SELECT h.requisition_id FROM HiringPhases h
            WHERE h.candidate_id = c.id AND h.exited_at IS NULL
            ORDER BY h.entered_at DESC LIMIT 1) AS requisitionId,
         (SELECT EXISTS(SELECT 1 FROM DiagnosticReports d
            WHERE d.candidate_id = c.id AND d.deleted_at IS NULL)) AS hasReport
       FROM Candidates c
       WHERE c.organization_id = ?
         AND c.status IN ('applied','matched','assessing','interviewing')
       ORDER BY c.created_at DESC`
    )
    .all(orgId)
    .map((row: any) => {
      const reqTitle = row.requisitionId
        ? (db
            .prepare('SELECT title FROM Requisitions WHERE id = ?')
            .get(row.requisitionId) as { title: string } | undefined)?.title ?? null
        : null;
      const assessmentStatus: PipelineCandidate['assessmentStatus'] =
        row.status === 'assessing'
          ? 'in_progress'
          : row.status === 'interviewing' || row.status === 'offered'
            ? 'completed'
            : 'not_started';
      return {
        id: row.id,
        first_name: row.first_name,
        last_name: row.last_name,
        neurodivergence: row.neurodivergence,
        years_experience: row.years_experience,
        status: row.status,
        matchScore: row.matchScore ?? null,
        assessmentStatus,
        requisitionId: row.requisitionId ?? null,
        requisitionTitle: reqTitle,
        hasReport: Boolean(row.hasReport),
      };
    });
}

// ── Employee / HR (allyship) ─────────────────────────────────────────────────

export interface AllyshipModuleRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  order: number;
  startedAt: string | null;
  completedAt: string | null;
  score: number | null;
}

export interface AllyshipProgress {
  modules: AllyshipModuleRow[];
  completedCount: number;
  totalCount: number;
  progressPct: number;
  minutesInvested: number;
  certified: boolean;
}

/** A user's allyship progress + the module library for their org. */
export function getAllyshipProgress(
  orgId: string,
  userId: string
): AllyshipProgress {
  const modules = db
    .prepare(
      `SELECT
         m.id, m.slug, m.title, m.description, m.duration_minutes, m."order" AS "order",
         p.started_at AS startedAt, p.completed_at AS completedAt, p.score AS score
       FROM AllyshipModules m
       LEFT JOIN UserAllyshipProgress p
         ON p.module_id = m.id AND p.user_id = ?
       WHERE m.organization_id = ?
       ORDER BY m."order" ASC`
    )
    .all(userId, orgId) as AllyshipModuleRow[];

  const completed = modules.filter((m) => m.completedAt);
  const minutesInvested = completed.reduce(
    (sum, m) => sum + (m.duration_minutes || 0),
    0
  );
  const certified = modules.some(
    (m) => m.slug === 'certification' && m.completedAt
  );

  return {
    modules,
    completedCount: completed.length,
    totalCount: modules.length,
    progressPct: modules.length
      ? Math.round((completed.length / modules.length) * 100)
      : 0,
    minutesInvested,
    certified,
  };
}
