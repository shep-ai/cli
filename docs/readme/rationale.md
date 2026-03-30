# README Rewrite: Rationale & Analysis

## Why Rewrite

The previous README was solid on content but read like internal documentation. It buried the value proposition in implementation details and spoke to contributors more than potential users. After studying Superset's messaging (both GitHub README and superset.sh), it became clear that their approach — benefit-first, action-oriented, visually clean — was significantly more compelling.

## What Superset Does Well

### 1. Instant Positioning

> "The Code Editor for AI Agents."

Six words. You immediately know what it is and who it's for. No ambiguity. Our old subtitle — "AI-assisted feature development with human checkpoints" — was accurate but passive and forgettable.

### 2. Benefits Before Features

Superset leads with what you GET, not what the tool IS:

- "Run dozens of agents at once" (benefit) vs. "Parallel Execution" (feature)
- "Changes are isolated" (benefit) vs. "Worktree Isolation" (feature)
- "Open in any IDE" (benefit) vs. "IDE Integration" (feature)

The feature name is secondary. The outcome is primary.

### 3. Social Proof & Trust Signals

Superset includes testimonials, company logos, and GitHub stars prominently. This builds credibility before the user even reads the docs. We don't have the same social proof volume yet, but we can structure the README to accommodate it as it grows.

### 4. Clean Visual Hierarchy

```
Hero (what it is) → How it works (3-4 panels) → Social proof → FAQ → CTA
```

No clutter. No architecture diagrams in the README. No contributor guides competing with user-facing content.

### 5. Confidence in Tone

"If it runs in a terminal, it runs on Superset." — Bold, memorable. Our tone was more hedging and explanatory.

## Key Differences Between Shep and Superset

| Dimension | Superset | Shep |
|-----------|----------|------|
| **Core metaphor** | Code editor / terminal multiplexer | Project manager / orchestration layer |
| **Unit of work** | Agent session | Feature (with lifecycle) |
| **Primary value** | Parallel execution | Structured development lifecycle |
| **Human involvement** | Monitor agents | Approve at gates |
| **Output** | Code changes in worktrees | Merged PRs with specs, plans, audit trails |
| **Scope** | Run agents better | Manage the full journey from idea to PR |

This is critical: **Shep is NOT competing with Superset**. They solve adjacent but different problems. Superset is about running agents efficiently. Shep is about managing the development process that agents participate in.

## Positioning Strategy

### The Old Framing (Weak)

> "AI-assisted feature development with human checkpoints"

Problems:
- "AI-assisted" is vague (everything is AI-assisted now)
- "feature development" is generic
- "human checkpoints" sounds like a safety caveat, not a feature

### The New Framing (Strong)

> "Ship Features, Not Prompts"

Why this works:
- **Contrasts with status quo**: Everyone is writing prompts. We're shipping features.
- **Implies structure**: "Features" implies requirements, plans, PRs — not one-shot generation
- **Action-oriented**: "Ship" is a verb. It implies completion, not just generation.
- **Concise**: Three words after "Ship"

### Supporting Tagline

> "Describe what you want. Shep handles requirements, planning, coding, and review — pausing for your approval at every critical decision."

This keeps the human-in-the-loop message but frames it as a benefit ("pausing for your approval") rather than a limitation.

## Structural Decisions

### What Moved Out of README

1. **Architecture section** — Moved to link. Users don't care about Clean Architecture layers when deciding to try the tool.
2. **Detailed CLI reference** — Condensed to essential commands. Full reference linked separately.
3. **Contributing section** — Minimal mention, link to separate doc.
4. **Settings commands** — Not relevant to first impression.

### What Moved Into README

1. **"Why Shep?" section** — Positioned against the pain of raw agent usage.
2. **Stronger FAQ** — Addresses the real objections (why not just use Claude Code directly?)
3. **Agent support with "works with any" framing** — Borrowed from Superset's universal compatibility messaging.
4. **Trust & Safety as a first-class section** — Not buried, not an afterthought.

### What Changed in Tone

| Before | After |
|--------|-------|
| "Shep is not a replacement for your coding agent" | "Your agent writes the code. Shep manages everything around it." |
| "AI-assisted feature development" | "Ship features, not prompts" |
| "Human checkpoints" | "You approve at every critical decision" |
| "Clean Architecture with four layers" | (Removed from README entirely) |
| "We welcome contributions from humans and AI agents alike" | (Simplified to link) |

## npm Package Description

### Current
> "Autonomous AI Native SDLC Platform - Automate the development cycle from idea to deploy"

### Proposed
> "Ship features, not prompts — structured AI development with requirements, plans, and approval gates"

Rationale: The current description uses jargon ("SDLC Platform", "Autonomous") that means nothing to someone browsing npm. The new version communicates the value in plain language.

## What We Can Learn From Superset Going Forward

1. **Testimonials**: As users adopt Shep, collect and display testimonials prominently
2. **Company logos**: Social proof from recognizable organizations
3. **Video/GIF demos**: Show the dashboard, show the workflow, don't just describe it
4. **Changelog visibility**: Superset links changelog prominently — shows active development
5. **Community links**: Discord/Twitter/GitHub discussions — shows life beyond the repo
