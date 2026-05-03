# @scienceintelligence/humanskills-extract

> Automatically extract **human skills** from Claude Code / Codex conversation history and submit them to [HumanSkills](https://github.com/ScienceIntelligence/HumanSkills).

## What It Does

When you use Claude Code or Codex for any skilled work — medicine, law, cooking, music, engineering, teaching, sports, crafts, design, science, and more — your conversations contain valuable tacit knowledge: judgment calls, abandoned approaches, technique choices, and reasoning patterns.

`/humanskills-extract` extracts three types of cognitive memory from your sessions, across any human discipline:

- **Procedural memory:** IF-THEN rules for expert decisions (e.g., "IF dough tears when stretched THEN knead more — do not add flour")
- **Semantic memory:** Domain facts that LLMs don't reliably know (e.g., regional legal precedents, undocumented drug interactions, fermentation timing constraints)
- **Episodic memory:** Concrete practitioner experiences capturing what was tried, what failed, and what was learned

## Install

```bash
npm install -g @scienceintelligence/humanskills-extract
```

This installs the command automatically to both platforms:
- **Claude Code** → `~/.claude/commands/humanskills-extract.md`
- **Codex** → `~/.codex/skills/humanskills-extract/SKILL.md`

## Usage

**Claude Code:**
```
/humanskills-extract
```

**Codex** (start with `codex -a never -s danger-full-access`):
```
$humanskills-extract
```

> 💡 **For best results:** use the most powerful model with the highest reasoning effort — **Claude Code:** Opus 4.6 + max effort. **Codex:** GPT-5.4 + x-high. Don't worry about token usage — conversations are heavily compressed before analysis, and per-session extraction is delegated to lighter models behind the scenes. Your chosen model mainly orchestrates the pipeline.

The command runs a 7-stage pipeline:

1. **Scan** — discover all Claude Code and Codex sessions
2. **Classify** — identify skilled projects by discipline (Sonnet), using a taxonomy of 18 domains and 310 subdomains
3. **Confirm** — you choose which projects to scan (multi-select)
4. **Extract** — extract skills per session (Sonnet), organized by cognitive memory type
5. **Clean** — review extracted skills with Opus: reject trivial/harmful content, fix PII, merge duplicates
6. **Score** — assess each skill's value on 3 dimensions with Opus (procedural / semantic / episodic, 0-5)
7. **Finalize** — upload cleaned, scored skills to [humanskills.ai](https://humanskills.ai)

## Output

Each skill is a markdown file with YAML frontmatter, including three review scores:

```yaml
---
name: sourdough-dough-development-diagnosis
memory_type: procedural
domain: culinary-arts
subdomain: bread-making
contributor: anon-7f3b42c9
review_scores:
  procedural: 4   # decision frameworks AI doesn't know
  semantic: 2     # facts/beliefs AI doesn't have
  episodic: 3     # concrete practitioner experiences
---

## When
Mixing and developing sourdough; dough behavior is unclear.

## Decision
Check gluten development via windowpane test, not hydration feel.

## Local Verifiers
- Dough tears rather than stretching thin = under-developed
- Dough stretches translucent without tearing = ready

## Failure Handling
If dough is still tearing after extended kneading: check water temperature — fermentation may be too cold to activate gluten development.
```

## Taxonomy

HumanSkills covers **18 domains** and **310 subdomains**, including:

| Domain | Examples |
|--------|---------|
| `health-and-medicine` | surgery, nursing, mental-health, emergency-medicine |
| `arts-and-creative` | music-performance, painting, film, writing-fiction |
| `culinary-arts` | bread-making, fermentation, bartending, baking-and-pastry |
| `law-and-legal` | criminal-law, contract-law, immigration-law, tax-law |
| `sports-and-physical` | martial-arts, climbing, sailing, yoga-and-pilates |
| `crafts-and-making` | woodworking, 3d-printing, glassblowing, sewing |
| `engineering-and-trades` | plumbing, welding, HVAC, civil-engineering |
| `education-and-teaching` | pedagogy, curriculum-design, tutoring, online-teaching |
| `business-and-management` | entrepreneurship, negotiation, product-management |
| + 9 more | finance, agriculture, language, humanities, sciences... |

## Contributing Back

After extraction, an interactive review page opens at `humanskills.ai/review/batch/<id>` where you can:

- Review and edit skill content
- See the 3-dimension review scores
- Assign domain/subdomain taxonomy
- Submit to HumanSkills

## Uninstall

```bash
npm uninstall -g @scienceintelligence/humanskills-extract
```

## Privacy

- All analysis happens locally via your Claude Code / Codex session
- Session data is read from `~/.claude/projects/` and `~/.codex/` on your machine
- **You choose which projects to scan** — the tool pauses after classification for your selection
- Unselected projects are skipped entirely
- AI auto-strips personal information; you review before submitting
- Nothing is uploaded without your explicit consent

## License

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Part of [HumanSkills](https://github.com/ScienceIntelligence/HumanSkills)

> Building a living library of human expertise — making the tacit knowledge of every discipline accessible to AI and people everywhere.
