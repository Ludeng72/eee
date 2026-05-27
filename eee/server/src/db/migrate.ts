import fs from 'fs';
import path from 'path';
import { getDb, saveDb } from './connection';

export function runMigrations(): void {
  const db = getDb();

  // Create migrations tracking table
  db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      run_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('[migrate] No migrations directory found.');
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const result = db.exec('SELECT name FROM _migrations');
  const applied = new Set<string>();
  if (result.length > 0) {
    for (const row of result[0].values) {
      applied.add(row[0] as string);
    }
  }

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    db.run(sql);
    db.run('INSERT INTO _migrations (name) VALUES (?)', [file]);
    console.log(`[migrate] Applied: ${file}`);
  }

  saveDb();
}
