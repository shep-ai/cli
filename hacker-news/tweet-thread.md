# Twitter Thread for HN Cross-Post

**Post this 3+ hours after HN submission, if gaining traction**

---

## Thread

**Tweet 1 (hook):**
Spent the last year building Shep — an autonomous AI-native SDLC platform that takes features from requirements → merged PR.

Just launched on Hacker News. 🧵 on what makes it different from code completion tools.

[HN link]

---

**Tweet 2 (problem):**
The problem: Modern dev tools give you autocomplete, but you still do all the orchestration.

Write specs. Break down tasks. Manage branches. Review PRs. Context-switch constantly.

For solo devs and small teams, this overhead crushes velocity.

---

**Tweet 3 (solution):**
Shep handles the full lifecycle:

```bash
shep feat new
```

→ AI gathers requirements
→ Generates spec (research, plan, tasks)
→ Creates feature branch
→ Implements with TDD
→ Runs tests, fixes failures
→ Opens PR

One command. Full workflow.

---

**Tweet 4 (architecture):**
Built on Clean Architecture principles:
- Domain layer (pure business logic)
- Application layer (use cases)
- Infrastructure layer (external concerns)
- Presentation layer (CLI, TUI, web)

No spaghetti. Enforced by the tool itself.

---

**Tweet 5 (differentiation):**
Cursor/Copilot: Great for in-editor autocomplete
Aider: Great for CLI-driven changes
Devin: Great for fully autonomous (expensive) workflows

Shep: The middle ground. Autonomous SDLC for solo/small teams. Local-first, spec-driven, multi-interface.

---

**Tweet 6 (tech stack):**
Tech:
- TypeScript + Node.js
- TypeSpec for domain modeling
- Next.js for web UI
- Clean Architecture
- Docker + CI/CD ready
- Agent-agnostic (Claude, OpenAI, etc.)

Open source. MIT license.

---

**Tweet 7 (CTA):**
Try it:

```bash
npx @shepai/cli feat new
```

Repo: https://github.com/shep-ai/cli

Feedback welcome. Building in public. 🚀

---

## Alternative: Single-Tweet Version

Just launched Shep on HN — an autonomous AI-native SDLC platform that takes features from requirements → merged PR.

One command (`shep feat new`), full workflow: spec → branch → tests → PR.

Built for solo devs and small teams who want velocity without the orchestration overhead.

[HN link]
[Repo link]

---

## Engagement Strategy

**If HN thread is active:**
- Reply to interesting HN comments directly from Twitter
- Quote-tweet specific technical discussions
- Showcase community feedback transparently

**If HN thread is quiet:**
- Use single-tweet version
- Focus on tech differentiation, not HN performance
- Save thread version for Reddit/PH launches
