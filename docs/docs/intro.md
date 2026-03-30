---
id: intro
title: Introduction
sidebar_position: 1
slug: /
---

# Shep

**Shep** is an AI-powered Software Development Lifecycle (SDLC) automation platform. It turns your ideas into working code by orchestrating AI agents to research, implement, review, and deploy features — all from a single CLI command.

## What is Shep?

Shep integrates directly into your development workflow, acting as an AI engineering team that works alongside you. Given a feature description or task, Shep will:

1. **Analyze** your codebase to understand existing patterns and architecture
2. **Plan** the implementation with a structured approach
3. **Implement** the changes following your project's conventions
4. **Review** the output for quality and correctness
5. **Deploy** via git commits, branches, and pull requests

## Key Features

- **Autonomous feature development** — describe what you want, Shep builds it
- **Multi-agent orchestration** — specialized agents for research, coding, and review
- **Full git integration** — branches, commits, worktrees, and PRs
- **Interactive UI** — built-in web dashboard for monitoring agent sessions
- **Extensible tools** — configurable toolset per project or agent
- **IDE integration** — native support for launching AI coding sessions

## Quick Example

```bash
# Install Shep
npm install -g shep

# Add a new feature to your repo
shep feat "Add user authentication with JWT tokens"

# Watch the agent work in the UI
shep ui
```

## Next Steps

- [Install Shep](/getting-started/installation) — get up and running in minutes
- [Quick Start](/getting-started/quick-start) — your first automated feature
- [Concepts](/concepts) — understand the Shep SDLC model
- [CLI Reference](/cli-reference) — full command documentation
