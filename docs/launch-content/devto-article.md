# Dev.to Article: Shep AI — From Requirements to Merged PR in One Command

**Target Date**: April 3, 2026 (2 days after HN launch)
**Goal**: Technical deep-dive for developer community
**Format**: Long-form article (1,500-2,000 words)
**Tags**: #ai #devtools #cleanarchitecture #typescript #opensource

---

## Article Content

### Title
Show HN: Shep AI — One command, full lifecycle, merged PR

### Cover Image
[Demo GIF placeholder: requirements → plan → code → tests → PR → CI passing]

### Meta Description
An autonomous AI-native SDLC platform that handles the full software development lifecycle — from requirements gathering to merged PRs.

---

## Introduction

I built Shep because I was tired of the context-switching overhead in software projects. You know the drill: write specs, break down tasks, coordinate work, review PRs, manage deployments. It's exhausting, especially for solo devs and small teams.

Most AI coding tools speed up typing, but YOU still manage the project. You gather requirements. You write specs. You design the architecture. You review PRs. You fix failing CI.

**The AI is an assistant. You're still the project manager.**

Shep inverts this model: Shep is the project manager. You're the product owner.

---

## What Shep Does

Give it a feature request:

```bash
shep feat new "add Stripe subscription billing"
```

It handles:

1. **Requirements gathering** (AI conversation to clarify scope)
2. **Spec generation** (YAML specs with acceptance criteria)
3. **Implementation planning** (task breakdown, dependencies)
4. **Parallel execution** (git worktrees for concurrent work)
5. **TDD workflow** (red → green → refactor)
6. **CI monitoring** (auto-fixes failures, retries flaky tests)
7. **PR creation** (formatted commit messages, linked issues)

You review the PR. If approved, merge. If not, give feedback and it iterates.

---

## Technical Architecture

Shep is built on three principles:

### 1. Clean Architecture

Domain logic is isolated from infrastructure. This means:

- Swap Claude for GPT-4 in one line
- Test everything without mocks
- No vendor lock-in

Four layers:
- **Domain**: Core business entities (Feature, Spec, Task)
- **Application**: Use cases (CreateFeature, GeneratePlan, RunTests)
- **Infrastructure**: External systems (Git, SQLite, AI agents, CI/CD)
- **Presentation**: CLI, TUI, Web Dashboard

Dependencies point inward only. The domain never imports from infrastructure.

### 2. TypeSpec-First Domain Modeling

All entities, value objects, and enums are defined in TypeSpec:

```typespec
model Feature {
  id: string;
  title: string;
  status: FeatureStatus;
  spec: Spec;
  tasks: Task[];
}

enum FeatureStatus {
  requirements,
  planning,
  implementation,
  review,
  merged,
  cancelled
}
```

Generate TypeScript types automatically. Single source of truth. No drift between types and runtime.

### 3. Agent Orchestration via LangGraph

Complex workflows (plan → research → implement) are directed graphs, not linear chains. Agents collaborate, not just chain.

Example workflow:
```
requirements_node → spec_node → plan_node → research_node
                                           ↓
                              implementation_node → test_node → pr_node
```

Nodes are stateful. Agents can loop, backtrack, and collaborate.

---

## What Makes Shep Different

| Feature | Cursor/Copilot | Aider | Devin | **Shep** |
|---------|----------------|-------|-------|----------|
| **Scope** | Code completion | Pair programming | Black-box autonomy | Transparent autonomy |
| **Requirements** | You write them | You write them | You write them | **AI gathers them** |
| **Planning** | You plan | You plan | Hidden | **Spec-driven YAML** |
| **Implementation** | Suggests code | Writes code | Writes code | **Full TDD workflow** |
| **Testing** | You write tests | You write tests | Unknown | **RED → GREEN → REFACTOR** |
| **CI/CD** | You handle failures | You handle failures | Unknown | **Auto-fixes, retries** |
| **Visibility** | Full (editor) | Full (git) | None (black box) | **Full (specs, git, dashboard)** |
| **Cost** | $20-100/mo | Free (API costs) | $500/mo | **API costs only** ($0.20-2/feature) |

---

## Real-World Use Case

### Example: "Add dark mode to settings page"

**With Cursor/Copilot**:
- You: write requirements doc
- You: design component structure
- AI: suggests code
- You: write tests
- You: fix failing CI
- **Time**: 2-3 hours

**With Aider**:
- You: write requirements
- You: plan component architecture
- Aider: writes the code
- You: write tests, fix CI
- **Time**: 1-2 hours

**With Shep**:
```bash
shep feat new "add dark mode to settings" --push --pr
```
- Shep: gathers requirements (theme system, component updates, persistence)
- Shep: generates spec YAML
- Shep: plans implementation (state management, CSS variables, storage)
- Shep: writes components + tests (TDD: tests first, then code)
- Shep: runs tests, fixes failures
- Shep: creates PR with proper commit messages
- **Time**: 5 minutes (hands-off)

---

## Current State & Roadmap

**Current** (v1.155.0):
- ✅ Full CLI + TUI + Web Dashboard
- ✅ Spec-driven workflow (YAML specs, git-tracked)
- ✅ TDD enforcement (tests first, always)
- ✅ Multi-agent support (Claude, OpenAI, local models)
- ✅ Docker deployment + CI/CD
- ✅ TypeSpec domain modeling

**Next 3 Months**:
- 🎯 Plugin system for custom workflows
- 🎯 GitHub Actions integration
- 🎯 Team collaboration features (multi-user workspaces)
- 🎯 Advanced agent orchestration (parallel task execution)
- 🎯 Cost optimization (caching, incremental planning)

---

## How to Try It

### Quick Start

```bash
# Install globally
npm install -g @shepai/cli

# Or use npx (no install)
npx @shepai/cli feat new
```

### Example Feature Request

```bash
shep feat new "add user profile page with avatar upload"
```

Shep will:
1. Ask clarifying questions (storage? image processing? permissions?)
2. Generate a spec YAML
3. Create a feature branch
4. Implement the feature (component + tests + API)
5. Run tests, fix failures
6. Create a PR

### Web Dashboard

```bash
shep web
```

Opens a visual dashboard showing:
- Feature graph (dependencies, parallel work)
- Real-time agent activity
- Spec review + approval
- PR integration

---

## Technical Details

**Stack**:
- TypeScript + Node.js
- Clean Architecture (4 layers)
- TypeSpec (type-safe domain models)
- Next.js (web UI)
- SQLite (local-first data)
- Docker (deployment)
- Conventional commits + semantic-release

**Repo**: https://github.com/shep-ai/cli

---

## Tradeoffs & Limitations

### What Shep Does Well
- Complex features with clear requirements
- Greenfield projects with flexible architecture
- Solo devs and small teams
- Projects that enforce TDD

### What Shep Struggles With
- Quick typo fixes (spec overhead is overkill)
- Legacy codebases with no tests (needs TDD infrastructure)
- Projects with unclear requirements (GIGO — garbage in, garbage out)
- Enterprise codebases with complex auth/permissions (agents can't access internal systems)

### What We're Working On
- Reducing overhead for simple changes (skip spec for trivial fixes)
- Better legacy codebase support (auto-generate missing tests)
- Incremental adoption (start with one module, expand over time)
- Better cost estimation (predict API costs before execution)

---

## Why Open Source?

1. **Transparency**: Show how autonomous agents actually work (no black boxes)
2. **Trust**: Let developers inspect, audit, and contribute
3. **Flexibility**: Self-host, customize, extend
4. **Community**: Learn from real-world use cases, not synthetic benchmarks

We believe autonomous AI tools should be open, auditable, and under developer control — not SaaS black boxes.

---

## Join the Community

- ⭐️ **Star on GitHub**: https://github.com/shep-ai/cli
- 💬 **Discuss on HN**: [Link to HN post]
- 🐦 **Follow on Twitter**: [@shepai_cli]
- 📧 **Newsletter**: [shep.dev/newsletter]

We're building in public. Feedback, issues, and PRs welcome.

---

## Conclusion

Shep is not trying to replace developers. It's trying to eliminate the grunt work so you can focus on architecture, design, and product decisions.

If you're a solo dev drowning in context-switching, or a small team that wants to ship faster without sacrificing quality, give Shep a try.

```bash
npx @shepai/cli feat new
```

I'd love to hear your feedback.

---

**Published**: April 3, 2026
**Author**: CMO, Shep AI
**GitHub**: https://github.com/shep-ai/cli
**Tags**: #ai #devtools #cleanarchitecture #typescript #opensource

---

## Publishing Checklist

- [ ] Adapt HN discussion highlights into article
- [ ] Add real code snippets from shep repo
- [ ] Include screenshots/GIFs (when DEV-17 complete)
- [ ] Cross-link to HN discussion
- [ ] Share on Twitter after publishing
- [ ] Cross-post to Hashnode, Medium (same content)
- [ ] Monitor comments, respond within 24 hours

**Status**: Draft ready (pending HN launch + visual assets)
**Owner**: CMO
**Last Updated**: March 29, 2026
