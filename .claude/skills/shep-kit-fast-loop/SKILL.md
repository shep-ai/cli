---
name: shep-kit:fast-loop
description: Use when the user wants rapid implementation iteration without tests, builds, or commits. Triggers include "fast loop", "fast iteration", "just code", "no tests", "iterate quickly", or when the user says they have a dev server running and want to check results manually.
---

# Fast Loop — Rapid Iteration Mode

Skip TDD, builds, and commits. Just edit code, let the dev server hot-reload, and iterate based on user feedback.

## What This Overrides

This skill **temporarily suspends** these CLAUDE.md mandates for the duration of the session:

- **TDD** — no tests required during fast-loop
- **Spec-driven** — no spec required, user drives direction
- **Storybook stories** — not required during iteration
- **Commit format** — no commits until user says "done"

## Rules

1. **Edit code only** — no `pnpm test`, no `pnpm build`, no `git commit`
2. **Small, focused changes** — one thing at a time so the user can verify each step
3. **Trust the dev server** — assume hot-reload picks up changes (Next.js, Vite, etc.)
4. **Wait for user feedback** — after each change, pause and let the user check the result
5. **No over-engineering** — do exactly what the user asks, nothing more
6. **When user says "done"** — remind them to run `pnpm validate` and tests before committing

## Flow

```
User describes change → Edit files → User checks dev server → Repeat
```

## Exit

When the user is satisfied, suggest:

```bash
pnpm validate        # lint + format + typecheck
pnpm test:unit       # catch regressions
```

Then offer `/shep-kit:commit-pr` or `/commit` to wrap up.
