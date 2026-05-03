#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const SOURCE_CC_COMMAND  = path.join(__dirname, "..", "commands", "humanskills-extract.md");
const SOURCE_TAXONOMY    = path.join(__dirname, "..", "taxonomy", "taxonomy.json");

// Helper scripts copied to ~/.claude/utils/ so the slash command can call them
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

// ---------------------------------------------------------------------------
// Claude Code
// ---------------------------------------------------------------------------
const CC_COMMANDS_DIR   = path.join(os.homedir(), ".claude", "commands");
const CC_COMMAND_TARGET = path.join(CC_COMMANDS_DIR, "humanskills-extract.md");
const CC_UTILS_DIR      = path.join(os.homedir(), ".claude", "utils");

try {
  fs.mkdirSync(CC_COMMANDS_DIR, { recursive: true });
  fs.mkdirSync(CC_UTILS_DIR, { recursive: true });
  fs.copyFileSync(SOURCE_CC_COMMAND, CC_COMMAND_TARGET);
  console.log("✓ Claude Code: /humanskills-extract installed to ~/.claude/commands/");

  for (const script of HELPER_SCRIPTS) {
    const src = path.join(__dirname, script);
    const dst = path.join(CC_UTILS_DIR, script);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
    } else {
      console.warn(`⚠ Claude Code: ${script} not found in package, skipping`);
    }
  }
  console.log(`✓ Claude Code: ${HELPER_SCRIPTS.length} helper scripts installed to ~/.claude/utils/`);
} catch (err) {
  console.error("⚠ Claude Code: could not install —", err.message);
}

// ---------------------------------------------------------------------------
// Codex
// ---------------------------------------------------------------------------
const CODEX_SKILL_DIR    = path.join(os.homedir(), ".codex", "skills", "humanskills-extract");
const CODEX_SKILL_TARGET = path.join(CODEX_SKILL_DIR, "SKILL.md");
const CODEX_SCRIPTS_DIR  = path.join(CODEX_SKILL_DIR, "scripts");

try {
  fs.mkdirSync(CODEX_SKILL_DIR, { recursive: true });
  fs.mkdirSync(CODEX_SCRIPTS_DIR, { recursive: true });
  fs.copyFileSync(SOURCE_CC_COMMAND, CODEX_SKILL_TARGET);
  console.log("✓ Codex:       $humanskills-extract installed to ~/.codex/skills/humanskills-extract/");

  for (const script of HELPER_SCRIPTS) {
    const src = path.join(__dirname, script);
    const dst = path.join(CODEX_SCRIPTS_DIR, script);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
    } else {
      console.warn(`⚠ Codex: ${script} not found in package, skipping`);
    }
  }
  console.log(`✓ Codex:       ${HELPER_SCRIPTS.length} helper scripts installed to ~/.codex/skills/humanskills-extract/scripts/`);
} catch (err) {
  console.error("⚠ Codex: could not install —", err.message);
}

// ---------------------------------------------------------------------------
// Cache directory + taxonomy
// ---------------------------------------------------------------------------
const CACHE_DIR    = path.join(os.homedir(), ".humanskills", "cache");
const VERSION_FILE = path.join(CACHE_DIR, ".version");
const CURRENT_VERSION = require(path.join(__dirname, "..", "package.json")).version;

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  for (const entry of fs.readdirSync(p)) {
    const full = path.join(p, entry);
    if (fs.statSync(full).isDirectory()) rmrf(full);
    else fs.unlinkSync(full);
  }
  fs.rmdirSync(p);
}

try {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const previousVersion = fs.existsSync(VERSION_FILE)
    ? fs.readFileSync(VERSION_FILE, "utf-8").trim()
    : null;

  if (previousVersion && previousVersion !== CURRENT_VERSION) {
    rmrf(path.join(CACHE_DIR, "skills"));
    rmrf(path.join(CACHE_DIR, "meta"));
    rmrf(path.join(CACHE_DIR, "sessions"));
    console.log(`✓ Cache:       version ${previousVersion} → ${CURRENT_VERSION}, previous cache cleared`);
  } else if (!previousVersion) {
    console.log(`✓ Cache:       initialized at version ${CURRENT_VERSION}`);
  } else {
    console.log(`✓ Cache:       version ${CURRENT_VERSION} (reusing existing cache)`);
  }

  fs.mkdirSync(path.join(CACHE_DIR, "meta"),     { recursive: true });
  fs.mkdirSync(path.join(CACHE_DIR, "skills"),   { recursive: true });
  fs.mkdirSync(path.join(CACHE_DIR, "sessions"), { recursive: true });
  fs.writeFileSync(VERSION_FILE, CURRENT_VERSION);

  // Copy bundled taxonomy so classify-projects.js can use it offline
  const taxonomyDst = path.join(CACHE_DIR, "taxonomy.json");
  if (fs.existsSync(SOURCE_TAXONOMY)) {
    fs.copyFileSync(SOURCE_TAXONOMY, taxonomyDst);
    console.log("✓ Taxonomy:    bundled taxonomy.json copied to ~/.humanskills/cache/");
  }
} catch (err) {
  console.error("⚠ Cache: could not prepare —", err.message);
}

// ---------------------------------------------------------------------------
// Legacy cleanup — remove old researchskills command files if present
// ---------------------------------------------------------------------------
const LEGACY_FILES = [
  path.join(os.homedir(), ".claude", "commands", "researchskills-extract.md"),
  path.join(os.homedir(), ".claude", "commands", "researchskills-convert.md"),
];
for (const f of LEGACY_FILES) {
  try {
    if (fs.existsSync(f)) {
      fs.unlinkSync(f);
      console.log(`✓ Removed legacy ${f}`);
    }
  } catch (err) {
    console.warn(`⚠ Could not remove legacy file ${f} —`, err.message);
  }
}

console.log("\n  Usage:");
console.log("    Claude Code: /humanskills-extract");
console.log("    Codex:       $humanskills-extract");
console.log("    Docs:        https://humanskills.ai\n");
