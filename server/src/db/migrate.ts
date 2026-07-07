import fs from "node:fs";
import path from "node:path";
import { sqlite } from "./client.js";


export function runMigration() {
  fs.mkdirSync(path.dirname(process.env.DATABASE_PATH ?? "./data/dev.db"), { recursive: true });

  sqlite.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student','moderator'))
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  course_id TEXT NOT NULL REFERENCES courses(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_user_course_unique ON enrollments(user_id, course_id);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id),
  author_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  saves_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS posts_course_created_idx ON posts(course_id, created_at);

CREATE TABLE IF NOT EXISTS saves (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  post_id TEXT NOT NULL REFERENCES posts(id),
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS saves_user_post_unique ON saves(user_id, post_id);
CREATE INDEX IF NOT EXISTS saves_user_active_updated_idx ON saves(user_id, active, updated_at);
`);
}

if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  runMigration();
  console.log("Migration complete:", process.env.DATABASE_PATH ?? "./data/dev.db");
}
