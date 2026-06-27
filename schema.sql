-- Support Nest — SQLite schema.
-- Executed once on startup by lib/db.ts (idempotent via IF NOT EXISTS).

PRAGMA foreign_keys = ON;

-- ── Core (Chunk 1) ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS Organizations (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Users (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES Organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('program_manager','talent_acquisition','employee_hr')),
  full_name       TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);

-- ── Hiring core (Chunk 2) ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS Requisitions (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES Organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  team            TEXT NOT NULL,
  description     TEXT,
  openings        INTEGER NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','on_hold')),
  created_by      TEXT REFERENCES Users(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_req_org ON Requisitions(organization_id);

CREATE TABLE IF NOT EXISTS Candidates (
  id               TEXT PRIMARY KEY,
  organization_id  TEXT NOT NULL REFERENCES Organizations(id) ON DELETE CASCADE,
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  email            TEXT NOT NULL,
  neurodivergence  TEXT NOT NULL CHECK (neurodivergence IN ('autistic','adhd','both','other')),
  years_experience INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'applied'
                     CHECK (status IN ('applied','matched','assessing','interviewing','offered','rejected')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cand_org ON Candidates(organization_id);

CREATE TABLE IF NOT EXISTS MatchScores (
  id                       TEXT PRIMARY KEY,
  candidate_id             TEXT NOT NULL REFERENCES Candidates(id) ON DELETE CASCADE,
  requisition_id           TEXT NOT NULL REFERENCES Requisitions(id) ON DELETE CASCADE,
  resume_fit_score         REAL NOT NULL,
  neurodiversity_fit_score REAL NOT NULL,
  combined_score           REAL NOT NULL,
  reasoning                TEXT,
  calculated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (candidate_id, requisition_id)
);

CREATE INDEX IF NOT EXISTS idx_match_cand ON MatchScores(candidate_id);

CREATE TABLE IF NOT EXISTS HiringPhases (
  id             TEXT PRIMARY KEY,
  candidate_id   TEXT NOT NULL REFERENCES Candidates(id) ON DELETE CASCADE,
  requisition_id TEXT REFERENCES Requisitions(id) ON DELETE SET NULL,
  phase_name     TEXT NOT NULL CHECK (phase_name IN ('apply','match','assess','interview','onboard','thrive')),
  entered_at     TEXT NOT NULL DEFAULT (datetime('now')),
  exited_at      TEXT
);

CREATE INDEX IF NOT EXISTS idx_phase_cand ON HiringPhases(candidate_id);

-- ── Diagnostic reports (Chunk 2 — file upload) ──────────────────────────────

CREATE TABLE IF NOT EXISTS DiagnosticReports (
  id             TEXT PRIMARY KEY,
  candidate_id   TEXT NOT NULL REFERENCES Candidates(id) ON DELETE CASCADE,
  file_path      TEXT NOT NULL,            -- relative path to the encrypted .enc file
  original_name  TEXT,                     -- original filename (for display)
  file_size      INTEGER,                  -- bytes (plaintext size)
  file_hash      TEXT NOT NULL,            -- SHA256 of plaintext, for dedup
  parsed_profile TEXT,                     -- JSON from genetranslate (Chunk 3)
  uploaded_by    TEXT REFERENCES Users(id) ON DELETE SET NULL,
  uploaded_at    TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at     TEXT                      -- NULL = not deleted (hard-delete audit)
);

CREATE INDEX IF NOT EXISTS idx_report_cand ON DiagnosticReports(candidate_id);

-- ── Assessments (Chunk 3 fills these in) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS SkillAssessments (
  id              TEXT PRIMARY KEY,
  requisition_id  TEXT REFERENCES Requisitions(id) ON DELETE CASCADE,
  role_title      TEXT NOT NULL,
  assessment_json TEXT NOT NULL,
  created_by      TEXT REFERENCES Users(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS CandidateAssessmentResults (
  id            TEXT PRIMARY KEY,
  candidate_id  TEXT NOT NULL REFERENCES Candidates(id) ON DELETE CASCADE,
  assessment_id TEXT NOT NULL REFERENCES SkillAssessments(id) ON DELETE CASCADE,
  answers       TEXT,
  score         REAL,
  completed_at  TEXT
);

CREATE TABLE IF NOT EXISTS InterviewPrepModules (
  id             TEXT PRIMARY KEY,
  candidate_id   TEXT NOT NULL REFERENCES Candidates(id) ON DELETE CASCADE,
  requisition_id TEXT REFERENCES Requisitions(id) ON DELETE SET NULL,
  module_step    TEXT NOT NULL CHECK (module_step IN ('what_to_expect','practice_round','request_accommodations')),
  completed      INTEGER NOT NULL DEFAULT 0,
  completed_at   TEXT
);

-- ── Allyship (Chunk 3 fills these in) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS AllyshipModules (
  id               TEXT PRIMARY KEY,
  organization_id  TEXT REFERENCES Organizations(id) ON DELETE CASCADE,
  slug             TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  content_html     TEXT,
  "order"          INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS UserAllyshipProgress (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  module_id    TEXT NOT NULL REFERENCES AllyshipModules(id) ON DELETE CASCADE,
  started_at   TEXT,
  completed_at TEXT,
  score        REAL,
  UNIQUE (user_id, module_id)
);

-- ── Audit (sensitive-data access log) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS AuditLogs (
  id            TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES Users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  resource_type TEXT,
  resource_id   TEXT,
  timestamp     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON AuditLogs(user_id);
