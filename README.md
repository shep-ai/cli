<div align="center">

# Shep AI

### AI-assisted feature development with human checkpoints

_Describe a feature in plain English. Shep builds it step by step — researching, planning, coding, and testing — pausing for your approval at every critical decision._

[![CI](https://github.com/shep-ai/cli/actions/workflows/ci.yml/badge.svg)](https://github.com/shep-ai/cli/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@shepai/cli.svg?color=cb3837&logo=npm)](https://www.npmjs.com/package/@shepai/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[How It Works](#how-it-works) · [Quick Start](#quick-start) · [Trust & Safety](#trust--safety) · [CLI Reference](#cli-reference) · [FAQ](#faq)

<br />

<img src="docs/screenshots/cover.png" alt="Shep AI" width="900" />

</div>

---

## Who is Shep for?

Solo developers and small teams who use AI coding agents (Claude Code, Cursor, Gemini CLI) and want structure around the messy parts — turning a feature idea into a clear plan, keeping work isolated per feature, and not losing context when switching between tasks.

Shep is not a replacement for your coding agent. It's the orchestration layer that sits above it: it manages requirements, plans, git branches, and review gates so you can focus on the parts that need human judgment.

---

## How It Works

Every feature moves through a structured pipeline. You control how much autonomy the agent gets.

```
 You describe       Shep generates       Shep researches       Shep writes         Shep codes          Shep opens
 a feature    →     requirements    →    your codebase    →    a plan         →    + tests        →    a PR
                         ▲                                       ▲                                       ▲
                     Gate 1: PRD                             Gate 2: Plan                            Gate 3: Merge
                   (approve/edit)                          (approve/edit)                          (approve/reject)
```

**Three approval gates.** Each one pauses execution and waits for you to review, edit, or approve before the agent continues. You choose which gates to enable:

| Flag | Gate | What you're approving |
|------|------|-----------------------|
| `--allow-prd` | Requirements | Auto-approve the generated PRD |
| `--allow-plan` | Plan | Auto-approve the implementation plan |
| `--allow-merge` | Merge | Auto-approve the final PR |
| `--allow-all` | All three | Fully autonomous — agent handles everything |

**With no flags**, every gate requires your explicit approval. You see exactly what the agent intends to do before it does it.

### What happens when things go wrong

- **CI fails after PR creation.** Shep reads the CI logs, diagnoses the failure, and pushes a fix. It retries up to 3 times before pausing and asking for your input.
- **Agent gets stuck or produces bad output.** The feature enters a `Blocked` state. You get notified and can provide feedback, reject the current phase, or restart from a checkpoint.
- **You don't like the plan.** Reject it with comments. Shep regenerates the plan incorporating your feedback.
- **You want to take over mid-feature.** The code lives in a standard git worktree on a named branch. You can open it in your IDE and work on it directly at any point.

---

## Quick Start

```bash
# Try it instantly — no install needed
npx @shepai/cli

# Or install globally
npm i -g @shepai/cli

# Start Shep — opens the web dashboard at http://localhost:4050
shep
```

### Your first feature

```bash
# With approval gates (recommended to start)
shep feat new "add a /health endpoint that returns uptime and version"

# Shep will pause at each gate for your review.
# Once you're comfortable, try autonomous mode:
shep feat new "add rate limiting to the API" --allow-all --push --pr
```

### Parallel features

Each feature gets its own git worktree — no stashing, no branch conflicts:

```bash
shep feat new "add stripe payments" --push --pr
shep feat new "add dark mode toggle" --push --pr
# Both run simultaneously in isolated worktrees
```

---

## Trust & Safety

Shep runs entirely on your machine. Here's the security model:

| Concern | How Shep handles it |
|---------|-------------------|
| **Data stays local** | All data lives in `~/.shep/` as SQLite databases. Nothing is sent to Shep servers — there are none. |
| **Agent sandboxing** | Shep delegates coding to your chosen agent (Claude Code, Cursor CLI, Gemini CLI). The agent's own permission model applies. Shep does not grant additional permissions. |
| **Git isolation** | Every feature runs in its own git worktree branched from your main branch. Your working directory is never modified. |
| **No credential access** | Shep never reads, stores, or transmits your API keys. Agent authentication is handled by the agent itself. |
| **Review before merge** | Unless you explicitly pass `--allow-merge`, no code is merged without your approval. PRs are created as drafts when using `--pr`. |
| **Audit trail** | Every agent action, approval, and state transition is logged. View with `shep feat logs <id>`. |

**What `--allow-all` actually means:** The agent will auto-approve requirements, auto-approve the plan, and auto-merge the PR. It does _not_ bypass CI — your CI pipeline still runs and must pass. Use this for low-risk tasks on repos with good test coverage, not for changes to production infrastructure.

---

## Features

- **Structured lifecycle** — Requirements, research, planning, implementation, and review as distinct phases, not one opaque prompt
- **Three configurable approval gates** — Full control, full autonomy, or anything in between
- **Parallel features via worktrees** — Multiple features in flight at once with zero branch conflicts
- **Agent-agnostic** — Claude Code, Cursor CLI, or Gemini CLI — swap anytime per feature or per repo
- **Web dashboard** — Interactive graph of repos and features with real-time status, diff review, and approval actions at `localhost:4050`
- **CI fix loop** — When CI fails, the agent reads logs, diagnoses, and retries before asking for help
- **100% local** — SQLite storage, no cloud dependency, no account needed

> **[Full features guide with screenshots →](./docs/FEATURES.md)**

---

## CLI Reference

### Daemon

```
shep                                  Start daemon + onboarding (first run)
shep start [--port <number>]          Start web UI daemon (background, default port 4050)
shep stop                             Stop the running daemon
shep restart                          Restart the daemon
shep status                           Show daemon status and live metrics
shep ui [--port] [--no-open]          Start the web UI in the foreground
```

### Feature Management

```
shep feat new <description>           Create a new feature
      [--repo] [--push] [--pr]
      [--allow-prd] [--allow-plan] [--allow-merge] [--allow-all]
      [--parent] [--fast] [--model] [--attach]
shep feat ls [--repo]                 List features
shep feat show <id>                   Show feature details
shep feat del <id>                    Delete a feature
shep feat resume <id>                 Resume a paused feature
shep feat review <id>                 Review a feature
shep feat approve <id> [--comments]   Approve a feature
shep feat reject <id> [--feedback]    Reject a feature
shep feat logs <id>                   View feature logs
```

### Agent Management

```
shep agent ls                         List agents
shep agent show <id>                  Show agent details
shep agent stop <id>                  Stop a running agent
shep agent logs <id>                  View agent logs
shep agent delete <id>                Delete an agent
shep agent approve <id>               Approve an agent action
shep agent reject <id>                Reject an agent action
```

### Repository & Session Management

```
shep repo ls                          List repositories
shep repo show <id>                   Show repository details
shep session ls                       List sessions
shep session show <id>                Show session details
```

### Settings

```
shep settings                         Launch setup wizard
shep settings show                    Display current configuration
shep settings init                    Initialize settings
shep settings agent                   Configure AI coding agent
shep settings ide                     Configure IDE
shep settings workflow                Configure workflow
shep settings model                   Configure model
```

### Tools

```
shep tools list                       List tools with install status
shep install <tool> [--how]           Install a dev tool
shep ide-open [--ide] [--dir]         Open IDE in directory
```

### Other

```
shep version                          Show version info
shep upgrade                          Upgrade to latest version
shep run <agent> [-p prompt] [-r repo] [-s]   Run an agent directly
```

---

## FAQ

**How is this different from just using Claude Code / Cursor directly?**
Those tools are excellent at writing code given a prompt. Shep adds the layer above: breaking a feature into structured phases, managing requirements and plans as reviewable artifacts, isolating work in git worktrees, and handling the PR/CI lifecycle. Think of it as a project manager for your AI coding agent.

**What happens if the agent writes bad code?**
The same thing that happens in a normal code review. Shep creates a PR. Your CI runs. If tests fail, Shep attempts to fix them. If the fix loop exhausts retries, the feature pauses and you're notified. You can also reject at any approval gate with feedback, and Shep will regenerate.

**Does this work on large codebases?**
Shep's research phase scans your codebase to build context before planning. The quality of the output depends on the underlying agent's ability to handle your repo. If Claude Code or Cursor works well on your codebase directly, Shep will too — it adds structure, not limitations.

**Can I use this on a team?**
Shep runs locally and operates on your git repo. Multiple team members can each run Shep independently. Features are just branches and PRs — your existing review process applies. There is no shared server or collaboration layer today.

**Is my code sent anywhere?**
Not by Shep. Your code is sent to whichever AI agent you configure (Claude, Cursor, Gemini) under that agent's own privacy terms. Shep itself stores everything in local SQLite and makes no network calls.

---

## Architecture

Shep follows Clean Architecture with four layers. If you're interested in contributing or understanding the internals:

| Layer | Path | Responsibility |
|-------|------|---------------|
| Domain | `packages/core/src/domain/` | Business logic, TypeSpec-generated types |
| Application | `packages/core/src/application/` | Use cases, port interfaces |
| Infrastructure | `packages/core/src/infrastructure/` | SQLite, LangGraph agents, DI |
| Presentation | `src/presentation/` | CLI, TUI, Web UI |

> **[Full architecture docs →](./docs/architecture/overview.md)**

---

## Supported Agents & Tools

| Category | Supported |
|----------|-----------|
| AI Agents | Claude Code, Cursor CLI, Gemini CLI |
| IDEs | VS Code, Cursor, Zed, Windsurf, and [more](./docs/FEATURES.md) |
| Required | Git, GitHub CLI |

---

## Contributing

We welcome contributions from humans and AI agents alike.

- **Humans**: See [CONTRIBUTING.md](./CONTRIBUTING.md)
- **AI Agents**: See [CONTRIBUTING-AGENTS.md](./CONTRIBUTING-AGENTS.md)

## License

MIT — see [LICENSE](./LICENSE).
