---
# REQUIRED FIELDS — fill in all of these before opening a PR
name: your-skill-name                        # lowercase, hyphens only
memory_type: procedural                      # procedural | semantic | episodic
domain: culinary-arts                        # see full taxonomy at humanskills.ai/taxonomy.json
subdomain: bread-making                      # more specific area
contributor: "Your Name or GitHub handle"
status: draft                                # leave as draft; reviewer will update after review
---

<!--
  INSTRUCTIONS FOR CONTRIBUTORS
  ─────────────────────────────
  1. Delete these comment blocks before submitting.
  2. Fill in ALL required frontmatter fields above.
  3. Complete the sections below for your memory_type.
  4. See humanskills.ai for full field documentation.

  MEMORY TYPE GUIDE:
  ──────────────────
  procedural  — IF-THEN expert decision rules (when to do X vs Y)
  semantic    — Domain facts an LLM wouldn't reliably know
  episodic    — A concrete experience: situation → action → outcome → lesson
-->

<!-- === PROCEDURAL SKILL TEMPLATE === -->
<!-- Use this section if memory_type: procedural -->

## When
<!-- Trigger conditions: when does this rule apply? Include exclusions. -->

## Decision
<!-- What to do (Preferred) and what NOT to do (Rejected) and why. -->

**Preferred:**

**Rejected:**

**Reasoning:**

## Local Verifiers
<!-- Concrete diagnostics to confirm you're in this situation. -->

-

## Failure Handling
<!-- What to do if the preferred approach doesn't work. -->


<!-- === SEMANTIC SKILL TEMPLATE === -->
<!-- Use this section if memory_type: semantic -->

## Fact
<!-- The precise core claim. Be specific. -->

## Evidence
<!-- How you know this is true. Source, experience, or observation. -->

## Expiry Signal
<!-- When might this become outdated? What would invalidate it? -->


<!-- === EPISODIC SKILL TEMPLATE === -->
<!-- Use this section if memory_type: episodic -->

## Situation
<!-- Context: what were you working on, what tools/conditions, what did you expect? -->

## Action
<!-- What did you do specifically? -->

## Outcome
<!-- What actually happened? Include concrete results if possible. -->

## Lesson
<!-- The IF-THEN rule this episode teaches. -->

## Retrieval Cues
<!-- What future situations should trigger recall of this episode? -->
