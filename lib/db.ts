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

  return database;
}

export const db: Database.Database = globalForDb.__db ?? createDb();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__db = db;
}
