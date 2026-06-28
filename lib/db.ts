import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Resolve the SQLite file from env, defaulting to ./data/supportnest.db.
const DB_PATH = process.env.DATABASE_URL || './data/supportnest.db';

// Ensure the parent directory exists before opening the database.
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// In dev, Next.js hot-reload re-evaluates modules; cache the connection on
// globalThis so we don't open a new handle on every reload.
const globalForDb = globalThis as unknown as { __db?: Database.Database };

function createDb(): Database.Database {
  const database = new Database(DB_PATH);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');

  // Run schema.sql on startup. CREATE TABLE IF NOT EXISTS makes this idempotent.
  const schemaPath = path.join(process.cwd(), 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  database.exec(schema);

  // Additive migrations for DBs created before the Bulk Import feature.
  // (ALTER TABLE ADD COLUMN can't be guarded with IF NOT EXISTS, so we check
  // table_info first.) Note: pre-existing CHECK constraints on Candidates.status
  // are not rewritten here — rebuild the DB file to pick those up.
  runColumnMigrations(database);

  return database;
}

/** Add columns that may be missing on databases predating the Bulk Import feature. */
function runColumnMigrations(database: Database.Database): void {
  const ensure = (table: string, column: string, ddl: string) => {
    const cols = database
      .prepare(`PRAGMA table_info(${table})`)
      .all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) {
      database.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    }
  };
  ensure('Candidates', 'application_source', "application_source TEXT DEFAULT 'manual'");
  ensure('Candidates', 'application_received_at', 'application_received_at TEXT');
  ensure('Candidates', 'resume_received_at', 'resume_received_at TEXT');
  ensure('Candidates', 'diagnostic_received_at', 'diagnostic_received_at TEXT');
  ensure('Candidates', 'invite_token', 'invite_token TEXT');
  ensure('Candidates', 'invite_token_expires_at', 'invite_token_expires_at TEXT');
  ensure('Candidates', 'invite_token_used_at', 'invite_token_used_at TEXT');
  ensure('Requisitions', 'external_posting_url', 'external_posting_url TEXT');
}

export const db: Database.Database = globalForDb.__db ?? createDb();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__db = db;
}
