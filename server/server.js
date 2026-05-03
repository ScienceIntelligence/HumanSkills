'use strict';

const express = require('express');
const cors    = require('cors');
const crypto  = require('crypto');
const path    = require('path');
const fs      = require('fs');
const db      = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

// Taxonomy loaded once at startup, falls back to bundled file
const TAXONOMY_PATH = process.env.TAXONOMY_PATH ||
  path.join(__dirname, '..', 'taxonomy', 'taxonomy.json');
let taxonomy = null;
try {
  taxonomy = JSON.parse(fs.readFileSync(TAXONOMY_PATH, 'utf-8'));
} catch (e) {
  console.warn('⚠ Could not load taxonomy.json:', e.message);
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ ok: true, version: '0.1.0' });
});

// ---------------------------------------------------------------------------
// GET /taxonomy.json
// Serves the bundled taxonomy so classify-projects.js can fetch it
// ---------------------------------------------------------------------------
app.get('/taxonomy.json', (_req, res) => {
  if (!taxonomy) return res.status(503).json({ error: 'Taxonomy not loaded' });
  res.json(taxonomy);
});

// ---------------------------------------------------------------------------
// POST /api/skills
// Accepts a single skill upload from upload-skills.js
//
// Expected body fields (from skill YAML frontmatter + extras):
//   name, memory_type, domain, subdomain, contributor,
//   project_slug, project_name, body, batch_id, consent, test,
//   review_scores: { procedural, semantic, episodic }
// ---------------------------------------------------------------------------
app.post('/api/skills', (req, res) => {
  const b = req.body;

  // Basic validation
  if (!b || typeof b !== 'object') {
    return res.status(400).json({ error: 'Request body must be JSON' });
  }
  if (!b.batch_id || typeof b.batch_id !== 'string') {
    return res.status(400).json({ error: 'batch_id is required' });
  }
  if (!b.body || typeof b.body !== 'string' || b.body.trim().length < 10) {
    return res.status(400).json({ error: 'body is required and must be non-trivial' });
  }

  const id = crypto.randomUUID();
  const scores = b.review_scores || {};

  // Strip review_scores from raw frontmatter before storing
  const { body, review_scores, ...frontmatter } = b;

  try {
    db.prepare(`
      INSERT INTO skills
        (id, batch_id, name, memory_type, domain, subdomain,
         contributor, project_slug, project_name, body,
         consent, test, score_procedural, score_semantic, score_episodic,
         raw_frontmatter)
      VALUES
        (?, ?, ?, ?, ?, ?,
         ?, ?, ?, ?,
         ?, ?, ?, ?, ?,
         ?)
    `).run(
      id,
      b.batch_id,
      b.name            || null,
      b.memory_type     || null,
      b.domain          || null,
      b.subdomain       || null,
      b.contributor     || null,
      b.project_slug    || null,
      b.project_name    || null,
      b.body,
      b.consent         ? 1 : 0,
      b.test            ? 1 : 0,
      scores.procedural != null ? Number(scores.procedural) : null,
      scores.semantic   != null ? Number(scores.semantic)   : null,
      scores.episodic   != null ? Number(scores.episodic)   : null,
      JSON.stringify(frontmatter)
    );
  } catch (err) {
    console.error('DB insert error:', err.message);
    return res.status(500).json({ error: 'Database error' });
  }

  res.status(201).json({ id, status: 'pending_review' });
});

// ---------------------------------------------------------------------------
// GET /api/batches/:batchId
// Returns all skills in a batch (for the review page)
// ---------------------------------------------------------------------------
app.get('/api/batches/:batchId', (req, res) => {
  const skills = db.prepare(
    'SELECT * FROM skills WHERE batch_id = ? ORDER BY created_at ASC'
  ).all(req.params.batchId);

  if (skills.length === 0) {
    return res.status(404).json({ error: 'Batch not found' });
  }

  res.json({
    batch_id: req.params.batchId,
    count: skills.length,
    skills: skills.map(s => ({
      ...s,
      consent: s.consent === 1,
      test: s.test === 1,
      raw_frontmatter: s.raw_frontmatter ? JSON.parse(s.raw_frontmatter) : null,
    })),
  });
});

// ---------------------------------------------------------------------------
// GET /review/batch/:batchId
// Simple HTML review page — shows batch skills in the browser
// ---------------------------------------------------------------------------
app.get('/review/batch/:batchId', (req, res) => {
  const skills = db.prepare(
    'SELECT * FROM skills WHERE batch_id = ? ORDER BY created_at ASC'
  ).all(req.params.batchId);

  if (skills.length === 0) {
    return res.status(404).send('<h1>Batch not found</h1>');
  }

  const rows = skills.map(s => `
    <div style="border:1px solid #ccc;border-radius:8px;padding:16px;margin:16px 0">
      <h3>${s.name || '(unnamed)'} <span style="font-weight:normal;color:#666;font-size:14px">[${s.memory_type || '?'}]</span></h3>
      <p><strong>Domain:</strong> ${s.domain || '?'} / ${s.subdomain || '?'}</p>
      <p><strong>Contributor:</strong> ${s.contributor || 'anonymous'} &nbsp;|&nbsp; <strong>Project:</strong> ${s.project_name || s.project_slug || '?'}</p>
      ${s.score_procedural != null ? `<p><strong>Scores:</strong> procedural=${s.score_procedural} semantic=${s.score_semantic} episodic=${s.score_episodic}</p>` : ''}
      <pre style="background:#f5f5f5;padding:12px;border-radius:4px;white-space:pre-wrap">${escapeHtml(s.body)}</pre>
      <p style="color:#999;font-size:12px">Status: ${s.status} &nbsp;|&nbsp; ${s.test ? '🧪 TEST' : ''} ${s.consent ? '✅ consent' : ''}</p>
    </div>
  `).join('');

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>HumanSkills — Batch Review</title>
  <style>body{font-family:sans-serif;max-width:860px;margin:40px auto;padding:0 20px}</style>
</head>
<body>
  <h1>HumanSkills — Batch Review</h1>
  <p><strong>Batch:</strong> ${escapeHtml(req.params.batchId)} &nbsp;|&nbsp; <strong>${skills.length}</strong> skill(s)</p>
  ${rows}
</body>
</html>`);
});

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✓ humanskills-server listening on port ${PORT}`);
  console.log(`  POST /api/skills       — upload a skill`);
  console.log(`  GET  /api/batches/:id  — batch JSON`);
  console.log(`  GET  /review/batch/:id — batch review page`);
  console.log(`  GET  /taxonomy.json    — skill taxonomy`);
});
