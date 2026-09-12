import Database from 'better-sqlite3';
import path from 'path';

// Singleton for development
const globalForDb = global as unknown as { db: Database.Database };

export const db = globalForDb.db || new Database(path.join(process.cwd(), 'finova.db'));
if (process.env.NODE_ENV !== 'production') globalForDb.db = db;

// Init schema
db.exec(`
  CREATE TABLE IF NOT EXISTS server_wallets (
    user_id TEXT PRIMARY KEY,
    balance REAL DEFAULT 0,
    last_sequence INTEGER DEFAULT 0,
    last_hash TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp INTEGER,
    event_type TEXT,
    details TEXT
  );

  CREATE TABLE IF NOT EXISTS server_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    amount REAL,
    type TEXT,
    timestamp INTEGER,
    sequence INTEGER,
    prev_hash TEXT,
    new_hash TEXT,
    status TEXT
  );
`);
