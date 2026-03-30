---
id: sdlc-platform
title: SDLC Platform
sidebar_position: 2
---

# The Shep SDLC Platform

Shep is not just a code generation tool — it's a full **Software Development Lifecycle (SDLC) platform** that automates the end-to-end process of taking a feature from idea to production.

## What is an SDLC Platform?

Traditional software development involves many repeated, structured steps:

1. **Specification** — define what needs to be built
2. **Research** — understand the codebase and constraints
3. **Implementation** — write the code
4. **Testing** — verify correctness
5. **Review** — ensure quality and maintainability
6. **Integration** — merge and deploy

Shep automates each of these stages using AI agents, while keeping humans in the loop for oversight, approval, and course correction.

## How Shep Models the SDLC

### Feature-Centric Workflow

Everything in Shep revolves around **features** — discrete units of intent described in natural language. A feature might be:

- A new capability: `"Add pagination to the user list API"`
- A bug fix: `"Fix race condition in the order processor"`
- A refactor: `"Extract the payment logic into a separate service"`
- A chore: `"Update all dependencies to their latest minor versions"`

### Agent Pipeline

When you create a feature, Shep assembles a pipeline of specialized agents:

| Stage | Agent | Role |
|-------|-------|------|
| Research | Code Explorer | Reads the codebase, finds relevant files, understands patterns |
| Architecture | Code Architect | Designs the approach and creates an implementation plan |
| Implementation | Code Developer | Writes the actual code following the plan and conventions |
| Review | Code Reviewer | Checks for bugs, style issues, and spec compliance |
| Integration | Git Agent | Creates commits, branches, and pull requests |

### Observable Execution

All agent activity is logged and visible in the Shep UI (`shep ui`). You can:

- Watch agents work in real time
- Inspect reasoning traces
- Review tool calls and file changes
- Intervene or redirect at any point

### Git-Native

Shep is designed around git. Every feature runs in its own branch (optionally in a git worktree for complete isolation). Changes are committed incrementally, making it easy to review, revert, or cherry-pick.

## Human-in-the-Loop

Shep is designed to amplify developers, not replace them. You remain in control:

- Review all changes before merging
- Use `shep session` to guide agents interactively
- Approve or reject pull requests like any other contributor
- Configure how much autonomy each agent has

## Continuous Improvement

Shep learns from your feedback. When you accept, reject, or modify agent output, that signal informs future runs — helping agents get better at understanding your codebase's conventions and preferences over time.
