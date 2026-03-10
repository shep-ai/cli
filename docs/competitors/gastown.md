# Gas Town

> Steve Yegge's multi-agent fleet orchestrator — and the 8-stage autonomy model that maps the frontier.

|             |                                                                        |
| ----------- | ---------------------------------------------------------------------- |
| **GitHub**  | [github.com/steveyegge/gastown](https://github.com/steveyegge/gastown) |
| **By**      | Steve Yegge                                                            |
| **Tagline** | "Multi-agent workspace manager"                                        |
| **Type**    | Agent orchestrator                                                     |
| **Pricing** | Free (open source) — but agent API costs add up fast                   |
| **License** | Open source                                                            |

---

## What It Does

Gas Town manages colonies of 20-30 parallel Claude Code agents with a Mad Max-themed role hierarchy (Mayor, Polecats, Witness, Deacon, "Boot the Dog"). It uses Git-backed persistent state and is itself 100% "vibe coded" — Yegge says he has never seen the code.

### Key Features

- **Massive parallelism** — 20-30 simultaneous Claude Code agents
- **Role hierarchy** — Specialized agents with coordination protocols
- **Git-backed state** — Persistent memory across sessions (the "MEOW stack")
- **100% vibe coded** — The orchestrator was built entirely by AI agents

### Cost Warning

Running 12-30 parallel agents burns through API credits fast. Early adopters reported ~$100/hour.

---

## The 8-Stage Developer-Agent Evolution Model

This is Gas Town's most influential contribution — a framework for understanding where you are on the autonomy spectrum:

| Stage | Name                         | What It Looks Like                            |
| ----- | ---------------------------- | --------------------------------------------- |
| **1** | Near-Zero AI                 | Maybe code completions, sometimes ask Chat    |
| **2** | Agent in IDE, permissions on | Sidebar agent asks to run each tool           |
| **3** | Agent in IDE, YOLO mode      | Permissions off, agent gets wider latitude    |
| **4** | Wide agent in IDE            | Agent fills the screen, code is just diffs    |
| **5** | CLI, single agent, YOLO      | Diffs scroll by, you may or may not look      |
| **6** | CLI, multi-agent, YOLO       | 3-5 parallel instances, you are very fast     |
| **7** | Hand-managed fleet           | 10+ agents, pushing limits of hand-management |
| **8** | Custom orchestrator          | You build your own orchestration layer        |

Gas Town targets developers at Stages 6-8. Yegge recommends being "at least level 6, with about half of the XP needed to reach level 7" before appreciating it.

### Where Shep Fits

**Shep is a Stage 8 tool** — a custom orchestrator that manages the full lifecycle. But unlike Gas Town's approach of raw agent parallelism, Shep adds structure:

- **Lifecycle stages** instead of free-form agent colonies
- **Approval gates** instead of pure YOLO
- **Spec-driven workflow** instead of ad-hoc task assignment
- **Agent-agnostic design** instead of Claude-only

Shep makes Stage 8 accessible to developers at Stages 4-6 by providing the orchestration layer they'd otherwise have to build themselves.

---

## How Shep Compares

|                   | Gas Town                       | Shep                                      |
| ----------------- | ------------------------------ | ----------------------------------------- |
| **Philosophy**    | Maximum parallelism, raw power | Structured lifecycle, controlled autonomy |
| **Agent count**   | 20-30 parallel                 | 1 per feature (parallel via worktrees)    |
| **Agent support** | Claude Code only               | Claude Code, Cursor CLI, Gemini CLI       |
| **Workflow**      | Ad-hoc task assignment         | Spec-driven lifecycle                     |
| **Human control** | Minimal (YOLO-oriented)        | Configurable (3 gates or hands-free)      |
| **Dashboard**     | Not highlighted                | Interactive React Flow graph              |
| **Cost**          | ~$100/hour at scale            | Free (agent API costs only)               |

### What We Respect

Yegge's 8-stage model is the clearest framework for understanding the AI development autonomy spectrum. Gas Town pushes the frontier of what's possible with massive agent parallelism. The willingness to vibe-code the orchestrator itself is a bold statement about where the field is heading.

### Where Shep Differs

Gas Town optimizes for raw throughput at the frontier. Shep optimizes for reliability and control across the full lifecycle. Gas Town is an experiment in maximum autonomy; Shep is a production tool that balances autonomy with oversight.

---

_Sources: [GitHub](https://github.com/steveyegge/gastown), [Welcome to Gas Town (Medium)](https://steve-yegge.medium.com/welcome-to-gas-town-4f25ee16dd04), [Maggie Appleton analysis](https://maggieappleton.com/gastown)_
