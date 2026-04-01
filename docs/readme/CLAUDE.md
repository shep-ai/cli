# README Development — Guide for Claude

Instructions for working with the README and its supporting docs in this directory.

## Directory Structure

```
docs/readme/
├── CLAUDE.md              ← You are here. How to work with these files.
├── messaging-guide.md     ← LIVING: Positioning, value props, anti-patterns, banned phrases
├── ACTION-ITEMS.md        ← LIVING: Prioritized backlog (README + product actions)
├── feedback.md            ← LOG: All feedback entries, append-only
├── revision-history.md    ← LOG: What changed per iteration and why
└── rationale.md           ← REFERENCE: Original Superset analysis (static)
```

The actual README lives at the **project root** (`/README.md`). This directory contains the process and history around it.

## Rules

### 1. Read `messaging-guide.md` BEFORE Any README Edit

The messaging guide contains **banned phrases and anti-patterns** learned from real feedback. Every item has a "Why" explaining what went wrong. Do not skip this. If you write copy that violates an anti-pattern, you are repeating a mistake we already made and corrected.

Pay special attention to:
- **Banned phrases** — specific words/taglines that are permanently retired
- **Anti-patterns** — framing mistakes with reasoning (e.g., don't lead with spec-driven)
- **Value proposition order** — which pillars come first matters
- **Audience segments** — know who you're writing for

### 2. Read `ACTION-ITEMS.md` Before Proposing Work

Check what's already identified before suggesting new README changes. Your proposed change may already be tracked, may conflict with an existing item, or may have been intentionally deferred.

### 3. Never Store README Snapshots as Files

Past iterations live in **git history**, not as file copies. Do not create `README-NEW-004.md` etc. The root `README.md` is the single source of truth.

### 4. Update Living Docs After Every README Change

After any README edit, update these in the **same session**:

| File | What to update |
|------|---------------|
| `revision-history.md` | Add a row: revision name, headline, key changes |
| `messaging-guide.md` | Add any new anti-patterns or banned phrases discovered during the edit |
| `ACTION-ITEMS.md` | Move completed items to the "Completed" table; add new items if feedback surfaces them |
| `feedback.md` | Only if the edit was driven by new external feedback — append a new entry |

### 5. Feedback Entries Are Append-Only

Never edit or delete past feedback entries in `feedback.md`. They're a historical record. If a concern was addressed, note the resolution in the entry's "Resolved in" field, don't remove the concern.

### 6. Anti-Patterns Are Permanent

Once a phrase or pattern is added to the "Messaging Anti-Patterns" section of `messaging-guide.md`, it stays. These represent real mistakes with real consequences. If you believe an anti-pattern should be reconsidered, flag it to the user — don't silently remove it.

## How to Iterate on the README

### When the User Asks for a README Change

1. Read `messaging-guide.md` (anti-patterns, banned phrases, value prop order)
2. Read `ACTION-ITEMS.md` (is this already tracked?)
3. Read the current `README.md`
4. Make the edit to `/README.md`
5. Update `revision-history.md`, `messaging-guide.md`, and `ACTION-ITEMS.md`

### When New Feedback Arrives

1. Summarize the feedback as a new entry in `feedback.md`
2. Identify README actions and add them to `ACTION-ITEMS.md` with priority and source
3. If the user wants to act on the feedback immediately, follow the iteration steps above
4. If the feedback reveals a new anti-pattern, add it to `messaging-guide.md`

### When Doing a Major Positioning Pivot

1. Update `messaging-guide.md` FIRST — new positioning statement, new value props, new anti-patterns
2. Then rewrite `README.md` following the updated guide
3. Add a row to `revision-history.md` with the pivot rationale
4. Review `ACTION-ITEMS.md` — some items may no longer apply after a pivot; mark them as obsolete

## File-Specific Conventions

### messaging-guide.md
- **Positioning statement** at the top uses the For/Is/That/Unlike/Delivers format
- **Value propositions** are numbered and ordered by priority — order matters
- **Anti-patterns** have: the banned pattern, **Why** it's banned, and **Instead say**
- **Changelog** at the bottom tracks when and why the guide changed

### ACTION-ITEMS.md
- **Priority tiers**: P0 (critical), P1 (high), P2 (medium), P3 (low)
- **Types**: README (copy), PRODUCT (code), CONTENT (video/screenshots)
- **Source column** traces every item to the feedback that created it
- **Completed table** at the bottom — move items here, don't delete them

### feedback.md
- Each entry has: **Source**, **Overall impression**, **Key concerns** (numbered), **Resolved in**
- Number entries sequentially (1, 2, 3...)
- Entries from actual users are more valuable than simulated feedback — note the distinction

### revision-history.md
- One row per README iteration
- Columns: Revision, Git Ref (if committed), Headline (the tagline), Key Change
- "What Got Retired" table tracks removed elements and why — helps prevent regression

## Slash Commands

Quick operations for common README workflows. User says the command, Claude executes the full procedure.

### `/readme:edit <description>`

Edit the README based on a description. Full iteration cycle.

```
User: /readme:edit rewrite the FAQ section to be shorter
```

Steps:
1. Read `messaging-guide.md` — check anti-patterns and banned phrases
2. Read `ACTION-ITEMS.md` — check for related tracked items
3. Read `/README.md`
4. Make the edit
5. Update `revision-history.md` (new row)
6. Update `ACTION-ITEMS.md` (complete relevant items or add new ones)
7. Update `messaging-guide.md` if new anti-patterns were discovered

### `/readme:feedback <paste feedback>`

Process new external feedback and triage into action items.

```
User: /readme:feedback Hey, I tried Shep and the README doesn't mention that...
```

Steps:
1. Append a numbered entry to `feedback.md` with: source, overall impression, key concerns, severity
2. For each concern, create an action item in `ACTION-ITEMS.md` with priority, type, and source
3. If feedback reveals a new anti-pattern, add it to `messaging-guide.md`
4. Present summary to user — ask if they want to act on any items now

### `/readme:simulate <persona>`

Simulate how a persona would react to the current README.

```
User: /readme:simulate senior backend engineer at a fintech startup
```

Steps:
1. Read `/README.md`
2. Read `messaging-guide.md` for current positioning
3. Read `feedback.md` for prior concerns to avoid rehashing
4. Write simulated feedback in the persona's voice
5. Append to `feedback.md` with `(simulated)` tag
6. Add any new action items to `ACTION-ITEMS.md`

### `/readme:status`

Show current state of README work.

```
User: /readme:status
```

Steps:
1. Read `ACTION-ITEMS.md` — report open items by priority
2. Read `revision-history.md` — report latest revision
3. Read `messaging-guide.md` — report current headline and positioning
4. Summarize: what's done, what's open, what's blocked on product changes

### `/readme:check`

Validate the current README against the messaging guide.

```
User: /readme:check
```

Steps:
1. Read `messaging-guide.md` — extract all banned phrases and anti-patterns
2. Read `/README.md`
3. Scan for violations: banned phrases, wrong value prop order, agent-specific bias, retired framing
4. Report findings: violations found (with line numbers) or "clean"

### `/readme:action-items`

Review and triage the action items backlog.

```
User: /readme:action-items
```

Steps:
1. Read `ACTION-ITEMS.md`
2. Present open items grouped by priority
3. Flag any items that may be stale or completed since last review
4. Ask user if they want to reprioritize, close, or act on any items
