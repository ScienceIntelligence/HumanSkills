'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'humanskills.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS skills (
    id               TEXT PRIMARY KEY,
    batch_id         TEXT NOT NULL,
    name             TEXT,
    memory_type      TEXT,
    domain           TEXT,
    subdomain        TEXT,
    contributor      TEXT,
    project_slug     TEXT,
    project_name     TEXT,
    body             TEXT,
    consent          INTEGER DEFAULT 0,
    test             INTEGER DEFAULT 0,
    status           TEXT DEFAULT 'pending_review',
    score_procedural REAL,
    score_semantic   REAL,
    score_episodic   REAL,
    raw_frontmatter  TEXT,
    created_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_skills_batch_id    ON skills(batch_id);
  CREATE INDEX IF NOT EXISTS idx_skills_contributor ON skills(contributor);
  CREATE INDEX IF NOT EXISTS idx_skills_domain      ON skills(domain);
  CREATE INDEX IF NOT EXISTS idx_skills_status      ON skills(status);
`);

module.exports = db;
