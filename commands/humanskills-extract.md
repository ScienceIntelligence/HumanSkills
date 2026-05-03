# /humanskills-extract

Extract human skills from the user's Claude Code session history for **HumanSkills**.

**Run automatically with THREE pauses for user consent:** once after classifying projects (Stage 2.5 — choose which projects to scan), once after scoring to offer local installation (Stage 6.5 — store skills in Claude/Codex), and once before upload (Stage 7 — choose whether to submit). Report progress at each milestone.

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
  └─ claude -p sonnet   │  ← Sonnet CLI call per session, inside the script
clean-skills.js        ─┤  ← Opus reviews: reject low-quality, fix PII, merge duplicates
score-skills.js        ─┤  ← Opus scores: 3-dim value assessment
store-local.js         ─┤  ← optional: install skills into Claude/Codex
finalize.js            ─┘

You (main agent)       ← call scripts, read summaries, report
```

Helper scripts (installed at `~/.claude/utils/`):

| Script | What it does |
|--------|-------------|
| `scan-sessions.js` | Discover sessions, extract metadata, filter, group by project |
| `classify-projects.js` | Classify projects by discipline via Sonnet, pick domain/subdomain |
| `extract-skills.js` | **The core loop**: format each session → call `claude -p --model sonnet` → validate + cache skills |
| `validate-skills.js` | Validate skill markdown and cache to `~/.humanskills/cache/skills/` |
| `clean-skills.js` | Review extracted skills with Opus: reject trivial/harmful, fix PII, merge duplicates |
| `score-skills.js` | Score surviving skills with Opus on 3 dimensions: procedural, semantic, episodic value |
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
node ~/.claude/utils/scan-sessions.js
```

Reads `~/.humanskills/cache/work-list.json` output. Report: `"Found N sessions across M projects."`

---

## Stage 2 — Classify Projects

**YOU MUST call this script. Do NOT classify projects yourself.**

```bash
node ~/.claude/utils/classify-projects.js ~/.humanskills/cache/work-list.json --cc --verbose
```

For test mode, add `--test`.

The script calls Sonnet to classify each project by discipline and picks domain/subdomain from the HumanSkills taxonomy (18 domains, 310 subdomains covering all human fields). It also filters out shallow sessions via `skip_patterns`.

Output: `~/.humanskills/cache/classification.json`.

Read the output file. For each project with `type: "skilled"`, use its `skill_session_ids` (NOT `session_ids`), `domain`, `subdomain`, and `project_name` in later stages. Do NOT include skipped sessions.

The script generates an AI-summarized `project_name` for each project (e.g. "Emergency Triage Decision Making", "Jazz Improvisation Techniques", "Sourdough Bread Fermentation") instead of using the raw folder name. Use this `project_name` in Stage 6 finalize. If `project_name` is null, fall back to the `slug`.

Report: `"Classified N projects. Proceeding with M."`

---

## Stage 2.5 — Project Consent Gate

**PAUSE and ask the user.** After classification, show all discovered projects and let the user choose which to scan.

Read `~/.humanskills/cache/classification.json` and display:

```
Select which projects to scan for skills (all skilled projects selected — deselect any you don't want to include):

  [x] 1. Emergency Triage Decision Making   (4 sessions, skilled, health-and-medicine/emergency-medicine)
  [x] 2. Jazz Improvisation Techniques      (3 sessions, skilled, arts-and-creative/music-performance)
  [ ] 3. Personal Website                   (3 sessions, trivial)
  [x] 4. Sourdough Bread Fermentation       (2 sessions, skilled, culinary-arts/bread-making)

Enter numbers to toggle, or press Enter to continue:
```

All skilled projects are pre-selected by default. Users can deselect individual projects by number.

**YOU MUST STOP HERE AND WAIT FOR THE USER TO RESPOND.** Use AskUserQuestion to present the project list and block until the user replies. Do NOT continue to Stage 3 without an explicit user response.

Only pass user-approved projects to Stage 3+. Remove deselected project session IDs from all subsequent `--session-ids` arguments.

Report: `"Proceeding with N projects (M sessions) after user confirmation."`

---

## Stage 3 — Extract Skills Per Session

### MANDATORY: Use --single-batch and loop. NEVER run all at once.

The extraction script MUST be called in a loop with `--single-batch`. Each call processes ONE batch (~5 parallel Sonnet calls) then exits. You call it again in a new Bash tool call. This keeps the user informed of progress and prevents the UI from freezing.

**FORBIDDEN patterns (will cause long freezes):**
- `run_in_background: true` — user sees nothing for 10+ minutes
- Omitting `--single-batch` — script runs all batches internally, no progress visible
- Using Monitor tool to watch output — still freezes, just with delayed notifications

**REQUIRED pattern:**

```bash
# REPEAT this exact Bash call in a loop. Each call = 1 batch.
node ~/.claude/utils/extract-skills.js ~/.humanskills/cache/work-list.json \
  --cc \
  --domain <domain> \
  --subdomain <subdomain> \
  --contributor "$(git config user.name)" \
  --session-ids <ALL-skill-session-ids-csv> \
  --single-batch \
  --verbose
```

**Loop logic:**
1. Run the command above (foreground Bash, NOT background)
2. Read the output. Report to user: "Batch N/M done: X skills extracted, Y calls remaining"
3. If output says `0 Sonnet calls remaining` or `All sessions already cached` → **stop, go to Stage 4**
4. Otherwise → run the **same command again** (it auto-skips cached segments)

Pass ALL skill session IDs from Stage 2. Do NOT drop sessions or pick a subset.

If you need to process multiple projects with different domains, call the script once per project with `--session-ids` filtering to that project's sessions.

---

## Stage 4 — Clean Skills

Run Opus to review all extracted skills: reject trivial or harmful content, fix PII leaks, merge duplicates.

```bash
node ~/.claude/utils/clean-skills.js \
  --cc \
  --session-ids <ALL-skill-session-ids-csv> \
  --verbose
```

This spawns a Claude Code instance with Opus that directly reads, deletes, and edits skill files on disk.

Report: `"Clean: kept N, rejected M, merged K."`

---

## Stage 5 — Score Skills

Run Opus to assess the value of each surviving skill on 3 dimensions.

```bash
node ~/.claude/utils/score-skills.js \
  --cc \
  --session-ids <ALL-skill-session-ids-csv> \
  --verbose
```

This spawns a Claude Code instance with Opus that reads each skill and writes `review_scores` (procedural, semantic, episodic — each 0-5) into the YAML frontmatter.

Report: `"Scored N skills. Avg: procedural X.X, semantic X.X, episodic X.X."`

---

## Stage 6 — Finalize Per Project (collect only, no upload yet)

Use the AI-generated `project_name` from classification.json (Stage 2). Do NOT use the raw folder name.

**Do NOT pass `--upload` here.** Collect skills locally first. Upload requires explicit user consent in Stage 7.

```bash
node ~/.claude/utils/finalize.js \
  --session-ids <ALL-skill-session-ids-csv> \
  --domain <domain> \
  --subdomain <subdomain> \
  --contributor "$(git config user.name)" \
  --project-name "<project_name from classification>" \
  --project-slug "<slug>"
```

---

## Stage 6.5 — Store Skills Locally (Optional)

**Third consent gate.** After finalize collects skills, ask the user whether to install them into their local AI coding tool so the skills are available as context in future sessions.

Use AskUserQuestion to present the options:
- Question: "Install extracted skills into your local AI coding tool?"
- Option A: "Yes, install to Claude Code" — stores skills to `~/.claude/commands/humanskills/<slug>.md`
- Option B: "Yes, install to Codex" — stores skills to `~/.codex/skills/humanskills-<slug>/SKILL.md`
- Option C: "Yes, install to both"
- Option D: "No, skip local install"

**YOU MUST STOP HERE AND WAIT FOR THE USER TO RESPOND.** Do NOT continue to Stage 7 without an explicit user response.

If the user picks A, B, or C, run:

```bash
node ~/.claude/utils/store-local.js \
  --target <claude|codex|both> \
  --session-ids <ALL-skill-session-ids-csv>
```

Report: `"Installed N skills to <target>. M already up-to-date."`

If the user picks D, skip and continue to Stage 7.

---

## Stage 7 — Consent and Upload

**Fourth consent gate.** Pause and ask the user before uploading anything.

Show the user what was extracted:

```
═══════════════════════════════════════════════════════
  /humanskills-extract — Extraction Complete!
═══════════════════════════════════════════════════════

Extracted N skills from M sessions across P projects:
  • Episodic:   E skills
  • Semantic:   S skills
  • Procedural: Pr skills

Disciplines covered: <list of domains>

Review (Opus):
  • Kept: K / Rejected: R / Merged: G
  • Avg scores: procedural X.X, semantic X.X, episodic X.X

⚠ Nothing has been uploaded yet. Your skills are saved
  locally. Would you like to submit them to HumanSkills
  for reviewer review?

  Skills will be stored on humanskills.ai and reviewed
  by a maintainer before publication (CC-BY 4.0).
═══════════════════════════════════════════════════════
```

Then use AskUserQuestion to get explicit consent:
- Question: "Submit your extracted skills to HumanSkills for review?"
- Option A: "Yes, submit for review" — re-run finalize with `--upload`
- Option B: "No, keep local only" — skip upload, tell user where files are saved

If the user consents, re-run finalize with `--upload`.

**Headless/SSH detection:** If running over SSH (SSH_CONNECTION or SSH_CLIENT env vars set) or on a headless Linux server (no DISPLAY), the upload script automatically detects this and:
- Disables browser opening
- Prints the review URL for the user to visit from any browser

When the user has consented via the prompt above, pass `--consent` to include `consent: true` in the upload payload.

```bash
node ~/.claude/utils/finalize.js \
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

If headless, also show:
```
  (Sign in with GitHub on the review page to claim credit and submit.)
```
