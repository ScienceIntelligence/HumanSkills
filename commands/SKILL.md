---
name: "humanskills-extract"
description: "Extract human skills from conversation history into HumanSkills skill files. Works for any discipline — medicine, law, cooking, music, engineering, sports, teaching, crafts, and more."
---
# /humanskills-extract

Extract human skills from the user's Codex session history for **HumanSkills**.

**Run automatically with THREE pauses for user consent:** once after classifying projects (Stage 2.5 — choose which projects to scan), once after scoring to offer local installation (Stage 6.5 — store skills in Claude/Codex), and once before upload (Stage 7 — choose whether to submit). Report progress at each milestone.

> **Prerequisite:** This skill spawns nested `codex exec` calls that need full network and filesystem access. Start Codex with: `codex -a never -s danger-full-access` (or `--dangerously-bypass-approvals-and-sandbox`). If the parent session is sandboxed, nested calls will fail with network errors.

You extract three types of cognitive memory from any human-AI conversation — across any discipline (medicine, law, cooking, music, engineering, sports, teaching, crafts, design, science, and more):
- **Procedural** — IF-THEN rules for expert decisions in any field: when to use one technique vs another, how to diagnose a situation, what to do when conditions change. NOT generic advice or trivial steps.
- **Semantic** — Domain knowledge an LLM wouldn't reliably know: local constraints, unpublished practices, corrections to common misconceptions, hard-won field-specific facts. NOT obvious or widely documented information.
- **Episodic** — Meaningful turning points: an approach abandoned after it failed, an unexpected outcome that changed direction, a lesson learned the hard way. NOT routine task completions.

Everything else — discovery, formatting, validation, upload — is done by helper scripts. Do not reimplement their work.

---

## Pipeline

```
scan-sessions.js       ─┐
classify-projects.js   ─┤
extract-skills.js      ─┤  deterministic scripts (you call them)
  └─ codex exec         │  ← Codex exec call per session, inside the script
clean-skills.js        ─┤  ← review: reject trivial/harmful, fix PII, merge duplicates
score-skills.js        ─┤  ← score: 3-dim value assessment
store-local.js         ─┤  ← optional: install skills into Claude/Codex
finalize.js            ─┘

You (main agent)       ← call scripts, read summaries, report
```

Helper scripts (installed at `~/.codex/skills/humanskills-extract/scripts/`):

| Script | What it does |
|--------|-------------|
| `scan-sessions.js` | Discover sessions, extract metadata, filter, group by project |
| `classify-projects.js` | Classify projects by discipline via Codex, pick domain/subdomain |
| `extract-skills.js` | **The core loop**: format each session → call `codex exec` → validate + cache skills |
| `validate-skills.js` | Validate skill markdown and cache to `~/.humanskills/cache/skills/` |
| `clean-skills.js` | Review extracted skills: reject trivial/harmful, fix PII, merge duplicates |
| `score-skills.js` | Score surviving skills on 3 dimensions: procedural, semantic, episodic value |
| `store-local.js` | Install extracted skills into user's local Claude/Codex config |
| `finalize.js` | Collect cached skills → upload to humanskills.ai |

---

## Arguments

- `--test` (alias: `test`): Test mode. Accept all sessions regardless of skill depth. Tag all output as test data.
- No argument: Production mode. Only sessions with genuine extractable skills proceed.

Detect mode at start. Announce: `"Running in TEST MODE"` or `"Running in production mode"`.

---

## Stage 1 — Scan

```bash
mkdir -p ~/.humanskills/cache/meta ~/.humanskills/cache/skills
node ~/.codex/skills/humanskills-extract/scripts/scan-sessions.js
```

Reads `~/.humanskills/cache/work-list.json` output. Report: `"Found N sessions across M projects."`

---

## Stage 2 — Classify Projects

**YOU MUST call this script. Do NOT classify projects yourself.**

```bash
node ~/.codex/skills/humanskills-extract/scripts/classify-projects.js ~/.humanskills/cache/work-list.json --codex --verbose
```

For test mode, add `--test`.

The script calls Codex to classify each project by discipline and picks domain/subdomain from the HumanSkills taxonomy (18 domains, 310 subdomains). It also filters out shallow sessions via `skip_patterns`.

Output: `~/.humanskills/cache/classification.json`.

Read the output file. For each project with `type: "skilled"`, use its `skill_session_ids` (NOT `session_ids`), `domain`, `subdomain`, and `project_name` in later stages. Do NOT include skipped sessions.

The script generates an AI-summarized `project_name` for each project (e.g. "Emergency Triage Decision Making", "Jazz Improvisation Techniques") instead of using the raw folder name. Use this `project_name` in Stage 6 finalize. If `project_name` is null, fall back to the `slug`.

Report: `"Classified N projects. Proceeding with M."`

---

## Stage 2.5 — Project Consent Gate

**PAUSE and ask the user.** After classification, show all discovered projects and let the user choose which to scan.

Read `~/.humanskills/cache/classification.json` and display:

```
Select which projects to scan for skills (all skilled projects selected — deselect any you don't want):

  [x] 1. Emergency Triage Decision Making   (4 sessions, skilled, health-and-medicine/emergency-medicine)
  [x] 2. Jazz Improvisation Techniques      (3 sessions, skilled, arts-and-creative/music-performance)
  [ ] 3. Personal Website                   (3 sessions, trivial)
  [x] 4. Sourdough Bread Fermentation       (2 sessions, skilled, culinary-arts/bread-making)

Enter numbers to toggle, or press Enter to continue:
```

All skilled projects are pre-selected by default. Users can deselect individual projects by number.

**YOU MUST STOP HERE AND WAIT FOR THE USER TO RESPOND.** Use `ask` (Codex) or `AskUserQuestion` (Claude Code) to present the project list and block until the user replies. Do NOT continue to Stage 3 without an explicit user response.

Only pass user-approved projects to Stage 3+. Remove deselected project session IDs from all subsequent `--session-ids` arguments.

Report: `"Proceeding with N projects (M sessions) after user confirmation."`

---

## Stage 3 — Extract Skills Per Session

### MANDATORY: Use --single-batch and loop. NEVER run all at once.

The extraction script MUST be called in a loop with `--single-batch`. Each call processes ONE batch (~5 parallel Codex calls) then exits. You call it again in a new tool call. This keeps the user informed of progress and prevents the UI from freezing.

**REQUIRED pattern:**

```bash
# REPEAT this exact call in a loop. Each call = 1 batch.
node ~/.codex/skills/humanskills-extract/scripts/extract-skills.js ~/.humanskills/cache/work-list.json \
  --codex \
  --domain <domain> \
  --subdomain <subdomain> \
  --contributor "$(git config user.name)" \
  --session-ids <ALL-skill-session-ids-csv> \
  --single-batch \
  --verbose
```

**Loop logic:**
1. Run the command above (foreground, NOT background)
2. Read the output. Report to user: "Batch N/M done: X skills extracted, Y calls remaining"
3. If output says `0 Codex calls remaining` or `All sessions already cached` → **stop, go to Stage 4**
4. Otherwise → run the **same command again** (it auto-skips cached segments)

---

## Stage 4 — Clean Skills

```bash
node ~/.codex/skills/humanskills-extract/scripts/clean-skills.js \
  --codex \
  --session-ids <ALL-skill-session-ids-csv> \
  --verbose
```

Report: `"Clean: kept N, rejected M, merged K."`

---

## Stage 5 — Score Skills

```bash
node ~/.codex/skills/humanskills-extract/scripts/score-skills.js \
  --codex \
  --session-ids <ALL-skill-session-ids-csv> \
  --verbose
```

Report: `"Scored N skills. Avg: procedural X.X, semantic X.X, episodic X.X."`

---

## Stage 6 — Finalize Per Project (collect only, no upload yet)

```bash
node ~/.codex/skills/humanskills-extract/scripts/finalize.js \
  --session-ids <ALL-skill-session-ids-csv> \
  --domain <domain> \
  --subdomain <subdomain> \
  --contributor "$(git config user.name)" \
  --project-name "<project_name from classification>" \
  --project-slug "<slug>"
```

---

## Stage 6.5 — Store Skills Locally (Optional)

Ask the user:
- Option A: "Yes, install to Claude Code" → `~/.claude/commands/humanskills/<slug>.md`
- Option B: "Yes, install to Codex" → `~/.codex/skills/humanskills-<slug>/SKILL.md`
- Option C: "Yes, install to both"
- Option D: "No, skip local install"

```bash
node ~/.codex/skills/humanskills-extract/scripts/store-local.js \
  --target <claude|codex|both> \
  --session-ids <ALL-skill-session-ids-csv>
```

---

## Stage 7 — Consent and Upload

Show summary, then ask for explicit upload consent. If yes:

```bash
node ~/.codex/skills/humanskills-extract/scripts/finalize.js \
  --session-ids <ALL-skill-session-ids-csv> \
  --domain <domain> \
  --subdomain <subdomain> \
  --contributor "$(git config user.name)" \
  --project-name "<project_name from classification>" \
  --project-slug "<slug>" \
  --upload \
  --consent
```

Then show:
```
Review your skills:
  → https://humanskills.ai/review/batch/<batchId>
```
