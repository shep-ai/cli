# Shep AI Messaging Guide

Core messaging framework for consistent communication across README, website, npm, social media, and docs.

**Last updated**: README-NEW-003 iteration (positioning pivot to parallel sessions + configurability)

---

## Positioning Statement

**For** developers who run AI coding agents and juggle multiple features at once,
**Shep is** a session manager that runs agents in isolated worktrees with automated git and CI workflows,
**that** handles branches, commits, pushes, PRs, CI watching, and failure retries — all configurable,
**unlike** running agents manually (which gives you code but leaves you to manage everything around it),
**Shep** lets you run 10 features in parallel from one dashboard without losing context or stepping on your own branches.

## Core Messages

### Primary Headline

> **Run multiple AI agents in parallel. Each in its own worktree.**

This communicates the core value in one line: parallel sessions + isolation.

### Supporting Tagline

> Manage 10 features at once — isolated branches, automatic commits, CI watching, and PRs — from a dashboard or the terminal.

### One-Liner (npm, package managers, search results)

> Run parallel AI agent sessions in isolated worktrees with automatic commits, PRs, and CI — fully configurable

### Elevator Pitch (30 seconds)

> Shep is a CLI that manages your AI coding agent sessions. You give it a prompt, it creates an isolated git worktree, runs your agent, commits the changes, pushes, and opens a PR. Run 10 of these in parallel — each feature isolated, each with its own branch. Shep watches CI and retries failures automatically. Everything is configurable: push, PR, merge, CI watch, retries, timeouts. For complex features, turn on spec-driven mode to get requirements and planning phases with approval gates. Everything stays local, every action is logged.

---

## Key Value Propositions

Use these four pillars consistently. **Order matters — lead with #1.**

### 1. Parallel Sessions
**Message**: "Run 10 features at once. Each gets its own worktree. Monitor from one dashboard."
**Proof point**: `shep feat new "X" --push --pr` three times — three isolated agents running simultaneously.
**Why this is #1**: This is the daily experience. It's what users feel every session.

### 2. Everything Configurable
**Message**: "Push, PR, merge, CI watch, retries, timeouts, model — configure per feature or set defaults."
**Proof point**: `shep settings workflow` for defaults, flags per feature for overrides.
**Why this is #2**: Configurability is trust. It says "we don't force a workflow on you."

### 3. Agent-Agnostic
**Message**: "Your agent, your choice. Swap per feature, per repo, anytime."
**Proof point**: Claude Code, Cursor CLI, Gemini CLI — if it runs in a terminal, Shep can orchestrate it.

### 4. Optional Structure (Spec-Driven)
**Message**: "For complex features, enable requirements, research, and planning with approval gates."
**Proof point**: `--no-fast` enables the full pipeline. YAML artifacts you review before code is written.
**Why this is #4**: It's a power feature, not the default experience. Don't lead with it.

---

## Messaging Anti-Patterns (Lessons Learned)

These are mistakes we've made in past iterations. **Do not repeat them.**

### BANNED: "Prompt to PR in one command"
**Why**: Implies magic reliability. On non-trivial codebases, the agent won't always produce a clean PR in one shot. This sets expectations we can't meet and makes senior engineers distrust us immediately. It's the exact "overselling" that Reviewer A flagged.
**Instead say**: "Shep handles commits, pushes, PRs, and CI — you configure how much automation you want."

### BANNED: Leading with spec-driven / SDLC / structured lifecycle
**Why**: The spec-driven pipeline (requirements → research → plan → implement) is optional and advanced. Leading with it makes Shep look heavyweight and rigid. Most users want the simple flow: prompt → implement → commit → PR.
**Instead say**: Mention spec-driven mode as an optional feature for complex work. Never in the hero or tagline.

### BANNED: "Pausing for your approval at every critical decision"
**Why**: Makes Shep sound slow and cautious. The default flow is fast — no gates, no pauses. Approval gates are opt-in via spec-driven mode. Leading with "pausing" contradicts the parallel/speed message.
**Instead say**: "Configure how much automation you want — from manual review to fully autonomous."

### BANNED: Singling out one agent (especially Claude Code)
**Why**: Shep is agent-agnostic. Mentioning Claude Code specifically in examples, caveats, or trust sections makes it look like a Claude Code wrapper. All agents must appear equally or generically.
**Instead say**: "Your agent" or list all three together: "Claude Code, Cursor CLI, or Gemini CLI."

### BANNED: "Ship Features, Not Prompts"
**Why**: Was the tagline for the spec-driven positioning. With the pivot to session management + configurability, it no longer fits. "Ship features" implies the full lifecycle; the new focus is on managing parallel sessions with configurable automation.
**Retired in**: README-NEW-003.

### BANNED: "Works best on repos with clear conventions and good test coverage"
**Why**: Defensive disclaimer as the first thing users read. Undermines confidence. If caveats are needed, put them in context (e.g., CI auto-fix section), not under the tagline.
**Instead say**: Add caveats inline where relevant, not as a global warning.

### AVOID: Framing Shep as a "project manager for your AI agent"
**Why**: Makes it sound like a planning tool, not a session manager. The "project manager" framing pushed us toward spec-driven messaging. Use it sparingly if at all.
**Prefer**: "Session manager" or "orchestration layer" or just describe what it does concretely.

---

## Differentiation Statements

### vs. Using Agents Directly
> "Your agent writes the code. But who manages the branches? Who commits, pushes, opens PRs, watches CI, and retries failures — for five features at once? Shep does."

### vs. Superset
> "Superset is a terminal for agents — tabs and worktrees. Shep manages the workflow: commits, pushes, PRs, CI watching, auto-fix. They're complementary."

### vs. AI Code Editors (Cursor, Windsurf)
> "Code editors help you write code faster inside a single session. Shep manages multiple sessions in parallel with isolated branches and automated git workflows."

---

## Tone Guidelines

| Do | Don't |
|----|-------|
| Be direct and confident | Hedge with "might", "could", "should" |
| Lead with what it does, concretely | Lead with abstract value propositions |
| Show the command, then explain | Explain without showing |
| Say "you" and "your" | Say "users" or "developers" abstractly |
| Emphasize configurability and control | Imply one rigid workflow |
| Mention spec-driven as optional | Present spec-driven as the default |
| Treat all agents equally | Single out any one agent |

### Voice Examples

**Good**: "Run five features at once. Each gets its own worktree."
**Bad**: "Shep supports parallel feature development through git worktree isolation."

**Good**: "Shep watches CI. When it fails, the agent reads the logs and pushes a fix."
**Bad**: "Shep provides CI/CD integration with automatic failure detection and remediation."

**Good**: "Configure per feature or set defaults. Push, PR, merge, CI — your call."
**Bad**: "Shep offers a highly configurable workflow automation platform."

**Good**: "For complex features, enable spec-driven mode for requirements and planning phases."
**Bad**: "Shep manages the full SDLC lifecycle with six structured phases."

---

## Banned Words & Phrases

These are overused in AI tooling, set wrong expectations, or conflict with our positioning:

**Overpromising:**
- "Prompt to PR" / "idea to PR" / "one command" (implies magic reliability)
- "Ship features" as tagline (implies full SDLC, not session management)
- "Autonomous" without context (say what it automates specifically)
- "End-to-end" (vague, implies everything works perfectly)

**Marketing fluff:**
- "Revolutionary" / "game-changing" / "next-generation"
- "Leverage" (use "use")
- "Utilize" (use "use")
- "Cutting-edge"
- "Seamless" (everything claims to be seamless)
- "Empower" (just say what it does)
- "AI-native" / "AI-first" (meaningless differentiation)

**Wrong framing:**
- "Platform" in isolation (say what kind)
- "SDLC" in user-facing copy (internal jargon)
- "Full lifecycle" as lead message (spec-driven is optional)
- "Human checkpoints" / "pausing for approval" as primary value (makes it sound slow)

---

## Audience Segments

### Primary: Developer Running Multiple Agent Sessions

**Pain**: "I have three features going at once and it's chaos — branches collide, I forget to push, CI is broken and I don't notice, and I lose context switching between them."

**Message**: "Shep gives each feature its own world — isolated worktree, automatic commits, CI watching. Manage them all from one dashboard."

### Secondary: Developer Who Wants More Automation

**Pain**: "Every time I use my AI agent, I still have to manually commit, push, open a PR, and watch CI. It's repetitive busywork."

**Message**: "Shep handles the git workflow around your agent: commits, pushes, PRs, CI watch, and auto-fix. Configure what to automate."

### Tertiary: Developer Who Wants Structure for Complex Features

**Pain**: "For big features, I need to think through requirements and a plan before coding. My agent jumps straight to implementation."

**Message**: "Enable spec-driven mode. Shep generates requirements, research, and a plan — all as YAML you review before code is written."

---

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| README-NEW | "Ship Features, Not Prompts" positioning | Superset-inspired rewrite |
| README-NEW-001 | Added caveats, plan example, honest trust section | Reviewer A feedback (original + simulated) |
| README-NEW-002 | Prerequisites, sandbox warning, permissions honesty, stop feature | Reviewer B hands-on feedback |
| README-NEW-002 (fix) | Removed Claude Code-specific bias throughout | Internal review |
| README-NEW-003 | **Major pivot**: session management + configurability as lead. Spec-driven moved to optional. "Prompt to PR" banned. | User direction — don't oversell, focus on parallel sessions |
