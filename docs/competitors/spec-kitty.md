# Spec Kitty

![Spec Kitty](images/spec-kitty.webp)

> Spec-driven development CLI with kanban dashboard — the closest workflow overlap to Shep.

|             |                                                                                |
| ----------- | ------------------------------------------------------------------------------ |
| **GitHub**  | [github.com/Priivacy-ai/spec-kitty](https://github.com/Priivacy-ai/spec-kitty) |
| **By**      | Priivacy AI                                                                    |
| **Tagline** | "Spec-Driven Development for serious software developers"                      |
| **Type**    | Python CLI                                                                     |
| **Install** | `pip install spec-kitty-cli`                                                   |
| **License** | Open source                                                                    |

---

## What It Does

Spec Kitty is a Python CLI toolkit that structures AI development workflows around specifications, plans, and work packages. It provides a browser-based kanban dashboard for tracking progress and supports multiple agents.

### Lifecycle Coverage

```
Spec → Plan → Tasks (work packages) → Implementation → Review → Merge
```

### Key Features

- **Real-time kanban dashboard** — Browser-based progress tracking
- **Git worktree isolation** — `.worktrees/<feature-slug>` per feature
- **Multi-agent support** — Claude Code, Copilot, Gemini CLI, Cursor, Windsurf, Codex
- **External orchestrator** — Companion `spec-kitty-orchestrator` for multi-agent coordination
- **Specs as change requests** — Specs describe the delta between current and desired state

### Core Philosophy

> "Code is the source of truth for what exists now. Specs describe the change you want."

---

## How Shep Compares

|                         | Spec Kitty                            | Shep                              |
| ----------------------- | ------------------------------------- | --------------------------------- |
| **Language**            | Python                                | TypeScript                        |
| **Interface**           | CLI + kanban dashboard                | CLI + React Flow graph dashboard  |
| **Requirements**        | Manual spec writing                   | AI-generated PRD from description |
| **Research phase**      | Not included                          | Built-in                          |
| **Planning**            | Manual plan creation                  | AI-generated, reviewable          |
| **Approval gates**      | Review step                           | 3 configurable gates              |
| **Visualization**       | Kanban board                          | Interactive node graph            |
| **Agent orchestration** | External orchestrator (separate repo) | Built-in (LangGraph)              |
| **CI integration**      | Not highlighted                       | Automatic fix loop                |

### What We Respect

Spec Kitty's philosophy that "specs describe the delta" is elegant and well-articulated. Their multi-agent support across practically every coding agent on the market shows good design thinking. The kanban dashboard is a clean approach to progress visibility.

### Where Shep Differs

Shep automates more of the upstream work — you describe a feature in natural language, and the AI generates the PRD, conducts technical research, and builds the plan. Spec Kitty requires more manual spec authoring upfront. Shep also has a tighter agent orchestration loop with built-in CI monitoring and fix cycles.

---

_Sources: [GitHub](https://github.com/Priivacy-ai/spec-kitty), [Documentation](https://priivacy-ai.github.io/spec-kitty/)_
