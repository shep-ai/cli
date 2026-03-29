# HN Response Templates

Quick reference for common questions/objections during launch engagement.

---

## "How is this different from Cursor/Copilot?"

Cursor and Copilot are phenomenal for in-editor autocomplete — that's not what Shep solves.

Shep orchestrates the full SDLC: requirements gathering → spec generation → feature branch → implementation → testing → PR. Think of it as an AI team member, not an autocomplete tool.

You use Cursor for line-level completions. You use Shep for feature-level automation.

---

## "How is this different from Aider?"

Aider is great for CLI-driven changes — I'm a big fan.

The difference:
- Aider: You drive the workflow (you decide what to do, Aider executes)
- Shep: Autonomous workflow (it gathers requirements, plans, implements, tests, PRs)

Aider is more hands-on control. Shep is more hands-off orchestration.

Different tools for different workflows. Use what fits your style.

---

## "How is this different from Devin?"

Devin is fully autonomous and impressive, but:
1. Expensive ($500/month)
2. Cloud-only
3. Black-box workflow

Shep is:
1. Local-first (your code, your machine)
2. Spec-driven (every feature has a readable YAML spec)
3. Multi-interface (CLI, TUI, web — pick your workflow)
4. Agent-agnostic (Claude, OpenAI, or any LLM)

Devin is "full autonomy, hands off entirely." Shep is "autonomy with transparency and control."

---

## "This will replace developers"

No. Shep is built for solo devs and small teams who want to move faster on routine features.

You still:
- Define requirements
- Review specs before implementation
- Approve PRs
- Make architectural decisions

Shep augments capacity. It doesn't replace judgment.

Think of it as a junior developer who handles the scaffolding, tests, and grunt work — not a replacement for senior engineers.

---

## "How do you prevent it from writing bad code?"

Three layers:
1. **Spec-driven workflow:** Every feature starts with a YAML spec (research, plan, tasks). You review before implementation.
2. **TDD mandated:** RED → GREEN → REFACTOR cycles. Tests must pass before PR.
3. **Clean Architecture enforcement:** Proper layering (domain → application → infrastructure → presentation). No spaghetti.

You review the spec. You review the PR. Shep accelerates the middle, not the decision-making.

---

## "What about security/secrets?"

Shep is local-first. Your code stays on your machine.

Agent communication goes through APIs (Claude, OpenAI, etc.), but:
- No code is sent to Shep servers (there are none)
- You control which agents/APIs you use
- Secrets live in your env/config, not transmitted

If you're comfortable with Cursor/Copilot's security model, Shep is similar — but more transparent (you can audit what's sent to agents).

---

## "How does it handle complex projects?"

Shep enforces Clean Architecture, which helps with complexity:
- Domain layer: Pure business logic
- Application layer: Use cases
- Infrastructure layer: External concerns (DB, APIs, etc.)
- Presentation layer: CLI, TUI, web

For large features, the spec workflow breaks it down into subtasks. Each task is implemented independently, tested, and integrated.

Is it perfect? No. But the spec → plan → tasks flow helps manage complexity better than "just start coding."

---

## "What's the pricing?"

Open source. MIT license. Free forever.

You pay for agent API usage (Claude, OpenAI, etc.), but there's no Shep subscription.

I'm building this in public. If it gains traction, I'll explore:
- Managed hosting (for teams who want cloud deployment)
- Enterprise features (SSO, audit logs, etc.)

But the core tool is MIT and stays free.

---

## "Can I see a demo?"

Absolutely. Here's the flow:

1. `npx @shepai/cli feat new`
2. AI asks questions (requirements, constraints, etc.)
3. Generates spec (research.yaml, plan.yaml, tasks.yaml)
4. You review/approve
5. Creates feature branch
6. Implements tasks (TDD cycles)
7. Runs tests, fixes failures
8. Opens PR

I'll record a video walkthrough and post it in this thread.

[Action: Record demo and share link]

---

## "How do I contribute?"

Repo: https://github.com/shep-ai/cli

Contribution guide: [link to CONTRIBUTING.md]

We're early, so I'm actively looking for:
- Bug reports
- Feature requests
- Documentation improvements
- Agent adapter implementations (for non-Claude/OpenAI LLMs)

If you want to pair on something, DM me. Always happy to chat.

---

## "What's the roadmap?"

Current focus:
1. Stabilize core SDLC workflow
2. Improve agent orchestration
3. Add more agent adapters (Gemini, Mistral, etc.)
4. Build out web UI features (parallel task tracking, metrics dashboard)

Long-term:
- Team collaboration features (multi-agent coordination)
- CI/CD integration (auto-deploy after merged PRs)
- Plugin system (custom workflows, domain-specific agents)

Open to feedback. Building in public. 🚀

---

## "Why TypeScript? Why not Go/Rust?"

Pragmatic choice:
1. Node.js ecosystem is huge (npm, tooling, libraries)
2. TypeScript has great AI tooling support
3. Faster iteration for early-stage project
4. Cross-platform (CLI, TUI, web in one codebase)

If I were building a production inference engine, I'd use Rust. But for an SDLC orchestrator, TypeScript hits the sweet spot of velocity and ecosystem.

---

## "How do you handle git conflicts?"

Shep creates feature branches and works in isolation. Conflicts are handled like any PR workflow:
1. Shep opens PR
2. You review
3. If conflicts, you resolve (or ask Shep to rebase)
4. Merge when ready

The spec-driven workflow minimizes conflicts (each feature has a clear scope), but conflicts still happen. Shep doesn't magically solve merge conflicts — you're in control.

---

## "This seems too good to be true"

Fair skepticism. Here's what Shep does well:
- Routine feature scaffolding
- TDD cycles for well-defined tasks
- Clean Architecture enforcement
- Spec generation

Here's what it struggles with:
- Vague requirements (garbage in, garbage out)
- Novel algorithms (it's not a research AI)
- Legacy codebases with no structure (Clean Architecture helps, but migration is manual)
- Cross-feature orchestration (still early)

It's not magic. It's automation for the 80% of dev work that's repetitive. The 20% (hard problems, novel solutions) still requires human expertise.

Try it. See for yourself. `npx @shepai/cli feat new`

---

## "I tried it and it failed on X"

Thanks for trying! I'd love to debug this with you.

Can you share:
1. Feature description you gave it
2. Error/failure point
3. Repo context (public? private? what tech stack?)

File an issue: https://github.com/shep-ai/cli/issues

Or DM me and we can pair on it. Early-stage tool, so bugs are expected. Your feedback helps prioritize fixes.

---

## Tone Guidelines

**Do:**
- Be humble, transparent, and technical
- Acknowledge limitations honestly
- Offer to pair/debug with users who hit issues
- Thank commenters for feedback (positive or negative)
- Use specific examples, not marketing fluff

**Don't:**
- Get defensive about criticism
- Oversell capabilities
- Dismiss competing tools
- Use hyperbolic language ("revolutionary", "game-changer", etc.)
- Ignore negative comments (engage respectfully)

**Remember:** HN values technical depth and honesty. You're building in public. Embrace the feedback.
