# Cline

![Cline](images/cline.gif)

> VS Code agent with 4M+ installs — plan first, then act.

|             |                                                          |
| ----------- | -------------------------------------------------------- |
| **Website** | [cline.bot](https://cline.bot)                           |
| **GitHub**  | [github.com/cline/cline](https://github.com/cline/cline) |
| **Tagline** | "An AI assistant that can use your CLI aNd Editor"       |
| **Type**    | VS Code extension                                        |
| **Pricing** | Free (bring your own API key)                            |
| **License** | Apache 2.0                                               |

---

## What It Does

Cline is a VS Code extension that acts as an autonomous coding agent. It can create and edit files, run terminal commands, use a browser, and extend its own capabilities via MCP tools. Its dual Plan/Act modes let you review the approach before execution.

### Key Features

- **4M+ installs** — One of the most popular AI coding extensions
- **Plan/Act modes** — Review the plan before the agent executes
- **Human-in-the-loop** — Approval for every action (configurable)
- **MCP tool support** — Extend capabilities with custom tools
- **Model-agnostic** — Works with any LLM provider
- **Browser access** — Can navigate and interact with web pages

---

## How Shep Compares

|                       | Cline                       | Shep                               |
| --------------------- | --------------------------- | ---------------------------------- |
| **Interface**         | VS Code extension           | CLI + Web dashboard                |
| **Focus**             | General coding tasks        | Full SDLC lifecycle                |
| **Requirements**      | Not structured              | AI-generated PRD                   |
| **Planning**          | Plan mode (review approach) | Structured plan with approval gate |
| **Approval**          | Per-action (granular)       | Per-phase (PRD, Plan, Merge)       |
| **Parallel features** | Single context              | Git worktree isolation             |
| **CI integration**    | Not included                | Automatic fix loop                 |
| **Dashboard**         | VS Code sidebar             | Interactive web graph              |

### What We Respect

Cline's Plan/Act separation is a great UX pattern — letting you see what the agent intends before it acts builds trust. The MCP tool support makes it infinitely extensible. And 4M installs proves the demand for autonomous agents in the IDE.

### Where Shep Differs

Cline operates at the task level inside VS Code. Shep operates at the feature level across the full lifecycle. Cline's per-action approval is more granular; Shep's per-phase approval is more strategic. Different levels of abstraction for different workflows.

---

_Sources: [cline.bot](https://cline.bot), [GitHub](https://github.com/cline/cline)_
