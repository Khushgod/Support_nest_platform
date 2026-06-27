-- Support Nest — SQLite schema.
-- Executed once on startup by lib/db.ts (idempotent via IF NOT EXISTS).
-- Chunk 1 ships Organizations + Users; later chunks extend this file.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS Organizations (
  id         TEXT PRIMARY KEY,            -- UUID
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Users (
  id              TEXT PRIMARY KEY,        -- UUID
  organization_id TEXT NOT NULL REFERENCES Organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  password_hash   TEXT NOT NULL,           -- bcrypt hash, never plaintext
  role            TEXT NOT NULL CHECK (role IN ('program_manager','talent_acquisition','employee_hr')),
  full_name       TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  -- Email is unique within an organization (see CLAUDE.md data model).
  UNIQUE (organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);
