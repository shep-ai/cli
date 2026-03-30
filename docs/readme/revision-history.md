# README Revision History

Full README content lives in git history. This file tracks the intent and key changes per iteration.

| Revision | Git Ref | Headline | Key Change |
|----------|---------|----------|------------|
| **Original** | `31941dab6` | "AI-assisted feature development with human checkpoints" | Pre-rewrite. Docs-heavy, architecture-forward, no clear user definition. |
| **v1** (README-NEW) | — | "Ship Features, Not Prompts" | Superset-inspired rewrite. Benefit-first, "Why Shep?" section, trust table, failure handling section. |
| **v2** (README-NEW-001) | — | "Ship Features, Not Prompts" + calibration | Reviewer A feedback: honest calibration line, plan.yaml example, "Agent mistakes" trust row, CI caveats, moved "What Goes Wrong" above Features. |
| **v3** (README-NEW-002) | — | Same + prerequisites | Reviewer B feedback: prerequisites section, sandbox warning, permissions honesty (`--dangerously-skip-permissions` disclosed), stop feature in CLI/FAQ, agent-agnostic fix. |
| **v4** (README-NEW-003) | — | "Run multiple AI agents in parallel. Each in its own worktree." | **Major pivot.** Session management + configurability as lead. Spec-driven moved to optional `--no-fast`. "Prompt to PR" banned. Configuration table added. |
| **v4.1** | HEAD | Same | Added repo/directory context to Quick Start (`cd` to repo, non-git init, `--repo` for cross-repo). New cover screenshot from dashboard. |

## What Got Retired and Why

| Element | Retired In | Reason |
|---------|-----------|--------|
| "AI-assisted feature development with human checkpoints" | v1 | Passive, forgettable, reads like internal docs |
| "Ship Features, Not Prompts" | v4 | Implied full SDLC; new focus is session management |
| "Pausing for your approval at every critical decision" | v4 | Made Shep sound slow; approval gates are opt-in |
| "Works best on repos with clear conventions..." under tagline | v4 | Defensive disclaimer as first impression |
| "Prompt to PR in one command" | v4 | Oversells; implies magic reliability |
| Spec-driven pipeline as primary flow | v4 | It's optional (`--no-fast`), not the default experience |
| 6-phase pipeline diagram as "How It Works" | v4 | Replaced with simple 5-step default flow |
| Leading with requirements/planning/approval gates | v4 | Most users want the simple flow first |
