import {config} from './config.mjs';
// @ts-ignore
import Database from 'better-sqlite3';

export const db = new Database(config.db);
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`CREATE TABLE IF NOT EXISTS Users (
    uuid TEXT PRIMARY KEY,
	nickname TEXT NOT NULL,
	session_token TEXT NOT NULL,
	latest_ip TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
) WITHOUT ROWID`);

db.exec(`CREATE TABLE IF NOT EXISTS Messages (
	uuid TEXT PRIMARY KEY,
	author_uuid TEXT NOT NULL,
	message TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	FOREIGN KEY (author_uuid) REFERENCES Users(uuid) ON DELETE SET NULL
) WITHOUT ROWID`);