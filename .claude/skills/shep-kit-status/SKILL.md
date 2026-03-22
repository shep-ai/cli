---
name: shep-kit:status
description: Quick feature status and "what to do next" guide. Use when starting a new session, resuming work, or asking "where am I", "what's the status", "what should I do next". Gives a zero-to-hero walkthrough of the current feature branch.
---

# Feature Status & Next Steps

Quickly orient the user on the current feature branch: what's done, what to try, and how to proceed.

## Workflow

1. **Detect current branch** — `git branch --show-current`
2. **Find the matching spec** — look for a `.shep/specs/NNN-*` directory whose `feature.yaml` branch field matches the current branch
3. **Read these files (in parallel):**
   - `.shep/specs/NNN-*/feature.yaml` — lifecycle, phase, progress, completed phases
   - `.shep/specs/NNN-*/tasks.yaml` — task list with states
   - `.shep/specs/NNN-*/spec.yaml` — summary, success criteria
4. **Read recent commits** — `git log --oneline -10` to see what was done
5. **Produce the status report** (see format below)

## Output Format

Present a concise, user-friendly status report using this structure:

```
## [Feature Name] — Status

**Branch:** `feat/NNN-feature-name`
**Phase:** <current phase from feature.yaml>
**Progress:** <completed>/<total> tasks (<percentage>%)

### What's Done
- <bullet list of completed phases/key commits — keep it brief>

### Try It Now
<Step-by-step instructions to SEE the feature in action. Be specific:>
1. **Build:** `pnpm build`
2. **CLI:** `shep settings model` → pick a model
3. **CLI:** `shep feat new --model claude-opus-4-6 "test feature"`
4. **Web UI:** `pnpm dev:web` → open http://localhost:3000 → Settings → Model picker
5. **Tests:** `pnpm test` → all green

<Tailor these steps to the actual feature. Reference specific commands, URLs, UI paths, clicks.>

### What's Left
- <remaining tasks or "nothing — ready for PR">

### Next Action
<Single clear sentence: what the user should do RIGHT NOW>
```

## Rules

- **Be specific** — don't say "run the app", say `pnpm dev:cli` or `pnpm dev:web` with the exact URL
- **Be brief** — no walls of text, just actionable steps
- **Show commands** — every "try it" step should have a copy-pasteable command or a click path
- **Read the spec** — the success criteria in spec.yaml tell you what the user should be able to verify
- **Check task states** — if tasks.yaml shows all tasks as Todo but commits exist, the feature was implemented outside the task tracker (common). Use commits + build status as ground truth.
- **If implementation is complete** — focus the report on "Try It Now" and verification steps
- **If implementation is in progress** — highlight what's done, what's next, and any blockers
