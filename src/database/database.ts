import sqlite3 from 'sqlite3';
import { config } from '../config/config';
import * as fs from 'fs';
import * as path from 'path';


const dbPath = config.databasePath;
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new sqlite3.Database(dbPath, (err: Error | null) => {
  if (err) {
    console.error('Veritabani baglanti hatasi:', err.message);
  } else {
    console.log('Veritabani baglantisi basarili');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS log_channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id TEXT UNIQUE NOT NULL,
        channel_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
       db.run(`
         CREATE TABLE IF NOT EXISTS tkm_scores (
          user_id TEXT PRIMARY KEY,
          wins INTEGER DEFAULT 0,
          losses INTEGER DEFAULT 0,
          draws INTEGER DEFAULT 0,
          matches INTEGER DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    db.run(`
      CREATE TABLE IF NOT EXISTS log_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_name TEXT NOT NULL,
        user_id TEXT,
        user_tag TEXT,
        action TEXT NOT NULL,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS dashboard_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        is_active INTEGER NOT NULL DEFAULT 1,
        banned INTEGER NOT NULL DEFAULT 0,
        ban_reason TEXT,
        force_password_change INTEGER NOT NULL DEFAULT 0,
        last_login_at DATETIME,
        last_login_ip TEXT,
        discord_id TEXT,
        discord_username TEXT,
        discord_access_token TEXT,
        discord_refresh_token TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS guild_guard_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT UNIQUE NOT NULL,
        anti_ban_enabled INTEGER NOT NULL DEFAULT 0,
        anti_ban_limit INTEGER NOT NULL DEFAULT 3,
        anti_ban_window_seconds INTEGER NOT NULL DEFAULT 60,
        anti_ban_punishment TEXT NOT NULL DEFAULT 'ban',
        updated_by INTEGER,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });
}