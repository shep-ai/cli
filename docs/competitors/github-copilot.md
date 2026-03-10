# GitHub Copilot

![GitHub Copilot](images/github-copilot.png)

> The deepest GitHub integration, evolving from autocomplete to full SDLC.

|                 |                                                                    |
| --------------- | ------------------------------------------------------------------ |
| **Website**     | [github.com/features/copilot](https://github.com/features/copilot) |
| **By**          | GitHub (Microsoft)                                                 |
| **Tagline**     | "Your AI pair programmer"                                          |
| **Type**        | IDE extension + Cloud agents                                       |
| **Pricing**     | Free tier / Pro $10/mo / Pro+ $39/mo / Business $19/user/mo        |
| **Open Source** | Spec Kit is open source; Copilot itself is not                     |

---

## What It Does

GitHub Copilot started as autocomplete and evolved into a multi-product suite. **Copilot Workspace** turns natural language into specs, plans, and multi-file code changes. The **Coding Agent** runs autonomously on GitHub issues and submits PRs. **Spec Kit** is an open-source toolkit for spec-driven development.

### Key Products

- **Copilot Chat** — Conversational coding assistant in IDE
- **Copilot Workspace** — Issue → Plan → Multi-file code → PR
- **Copilot Coding Agent** — Autonomous agent that picks up GitHub issues
- **Spec Kit** — Open-source spec-driven development methodology

### Spec Kit Workflow

```
Constitution (principles) → Specify → Plan → Tasks
```

Spec Kit is model-agnostic — works with Claude Code, Gemini CLI, and Copilot.

---

## How Shep Compares

|                       | GitHub Copilot              | Shep                                    |
| --------------------- | --------------------------- | --------------------------------------- |
| **Requirements**      | Spec Kit (static templates) | Interactive AI-driven PRD               |
| **Research phase**    | Not included                | Built-in                                |
| **Implementation**    | Coding Agent (autonomous)   | Agent-agnostic (Claude, Cursor, Gemini) |
| **Approval gates**    | PR review (standard GitHub) | 3 structured gates (PRD, Plan, Merge)   |
| **CI integration**    | Native GitHub Actions       | Automatic fix loop                      |
| **Dashboard**         | GitHub UI                   | Dedicated React Flow canvas             |
| **Parallel features** | Not highlighted             | Git worktree isolation                  |
| **Data location**     | GitHub Cloud                | 100% local                              |
| **Pricing**           | $10-39/mo                   | Free                                    |

### What We Respect

GitHub has unmatched distribution and ecosystem integration. Spec Kit is a generous open-source contribution that validates spec-driven development as a methodology. The Coding Agent picking up issues directly from GitHub's issue tracker is a natural workflow.

### Where Shep Differs

Shep provides a more opinionated, end-to-end lifecycle. Where GitHub offers composable pieces (Workspace, Agent, Spec Kit) that you stitch together, Shep is a single CLI that handles the full flow — including phases like technical research that GitHub doesn't cover.

---

_Sources: [github.com/features/copilot](https://github.com/features/copilot), [Spec Kit](https://github.com/github/spec-kit), [GitHub Blog](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/)_
