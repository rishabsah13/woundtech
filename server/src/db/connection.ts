import { DatabaseSync } from "node:sqlite";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";


const schema = readFileSync(fileURLToPath(new URL('./schema.sql', import.meta.url)), 'utf8');
export type DB = DatabaseSync;

export function createDb(file = process.env.DB_FILE ?? 'visits.db'): DB {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;'); // off by default in SQLite, and set per connection
  db.exec(schema);
  return db;
}

export function transaction<T>(db: DB, fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}


