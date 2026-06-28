/**
 * Load scripts/sample-data.sql into the SQLite database, replacing existing
 * data. Works without the sqlite3 CLI (uses better-sqlite3).
 *
 * Run with:  npm run db:load
 */
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/db';

const SRC = path.join(process.cwd(), 'scripts', 'sample-data.sql');

function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`Missing ${SRC}. Run "npm run dump" first.`);
    process.exit(1);
  }
  const sql = fs.readFileSync(SRC, 'utf-8');
  db.exec(sql);
  console.log(`✓ Loaded sample data from ${SRC}`);
}

main();
process.exit(0);
