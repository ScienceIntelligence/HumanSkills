#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const HELPER_SCRIPTS = [
  "platform.js",
  "scan-sessions.js",
  "classify-projects.js",
  "format-session.js",
  "extract-skills.js",
  "validate-skills.js",
  "clean-skills.js",
  "score-skills.js",
  "upload-skills.js",
  "finalize.js",
  "store-local.js",
];

// --- Claude Code ---
const CC_COMMAND_TARGET = path.join(os.homedir(), ".claude", "commands", "humanskills-extract.md");
const CC_UTILS_DIR      = path.join(os.homedir(), ".claude", "utils");

try {
  if (fs.existsSync(CC_COMMAND_TARGET)) {
    fs.unlinkSync(CC_COMMAND_TARGET);
    console.log("✓ Claude Code: /humanskills-extract removed");
  }
  for (const script of HELPER_SCRIPTS) {
    const p = path.join(CC_UTILS_DIR, script);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  console.log("✓ Claude Code: helper scripts removed");
} catch (_) { /* ignore */ }

// --- Codex ---
const CODEX_SKILL_DIR    = path.join(os.homedir(), ".codex", "skills", "humanskills-extract");
const CODEX_SKILL_TARGET = path.join(CODEX_SKILL_DIR, "SKILL.md");
const CODEX_SCRIPTS_DIR  = path.join(CODEX_SKILL_DIR, "scripts");

try {
  if (fs.existsSync(CODEX_SKILL_TARGET)) {
    fs.unlinkSync(CODEX_SKILL_TARGET);
    console.log("✓ Codex: /humanskills-extract SKILL.md removed");
  }
  for (const script of HELPER_SCRIPTS) {
    const p = path.join(CODEX_SCRIPTS_DIR, script);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  try {
    if (fs.readdirSync(CODEX_SCRIPTS_DIR).length === 0) fs.rmdirSync(CODEX_SCRIPTS_DIR);
    if (fs.readdirSync(CODEX_SKILL_DIR).length === 0)   fs.rmdirSync(CODEX_SKILL_DIR);
  } catch (_) { /* best effort */ }
  console.log("✓ Codex: helper scripts removed");
} catch (_) { /* ignore */ }

// Note: cache directory ~/.humanskills/cache/ is intentionally preserved,
// so reinstalling retains previously extracted subtrees.
