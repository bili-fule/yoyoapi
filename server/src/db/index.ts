import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { dirname } from 'path'
import { config } from '../config.js'

const dbDir = dirname(config.dbPath)
mkdirSync(dbDir, { recursive: true })

const db = new Database(config.dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function initDB(): void {
  // Clean up orphan table from prior code version
  db.exec(`DROP TABLE IF EXISTS format_routes;`)
  // Remove redundant index (duplicates UNIQUE constraint on api_keys.key)
  db.exec(`DROP INDEX IF EXISTS idx_api_keys_key;`)

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT DEFAULT '',
      role INTEGER DEFAULT 1,
      quota INTEGER DEFAULT 0,
      used_quota INTEGER DEFAULT 0,
      qq_id TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      key TEXT UNIQUE NOT NULL,
      name TEXT DEFAULT '',
      status INTEGER DEFAULT 1,
      last_used_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'openai',
      base_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      models TEXT NOT NULL DEFAULT '[]',
      priority INTEGER DEFAULT 1,
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS verify_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      type TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      api_key_id INTEGER,
      channel_id INTEGER,
      model TEXT,
      target_format TEXT,
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      quota_cost INTEGER DEFAULT 0,
      ip TEXT,
      success INTEGER DEFAULT 1,
      error_msg TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
    CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_verify_codes_email ON verify_codes(email);
  `)
}

export default db
