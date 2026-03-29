# Twitter Launch Thread

**Target Date**: April 1-3, 2026 (coordinated with HN launch)
**Goal**: Drive traffic to HN post, showcase shep's autonomous workflow
**Format**: 5-7 tweet thread with visuals (when DEV-17 complete)

---

## Thread Structure

### Tweet 1: Hook + Demo (with GIF)
I just shipped a full feature — from requirements gathering to merged PR — in 3 minutes.

No manual coding. No context switching. Just: `shep feat new "add stripe payments" --push --pr`

Here's how shep (our AI SDLC orchestrator) handles the entire software development lifecycle:

[Demo GIF placeholder: requirements → plan → code → tests → PR → CI passing]

---

### Tweet 2: The Problem
Most AI coding tools are glorified autocomplete.

They help you write code faster, but YOU still have to:
- Gather requirements
- Design the approach
- Write the tests
- Review the PR
- Fix CI failures

You're a project manager babysitting an AI assistant.

---

### Tweet 3: The shep Difference
shep is autonomous. Give it a feature request, and it:

1. **Gathers requirements** via AI conversation
2. **Plans** the implementation (specs, tasks, architecture)
3. **Codes** in parallel worktrees (no context switching)
4. **Tests** (TDD: red → green → refactor)
5. **Ships** (push + PR + CI monitoring)

It's an AI teammate, not a tool.

---

### Tweet 4: Technical Deep-Dive
Built with:
- Clean Architecture (domain → application → infrastructure)
- TypeSpec (type-safe domain models)
- LangGraph (agent orchestration)
- Full TDD workflow (failing tests first, always)

Open source. Self-hostable. Works with Claude, OpenAI, or local models.

GitHub: https://github.com/shep-ai/cli

---

### Tweet 5: vs. Cursor/Aider/Copilot
Cursor/GitHub Copilot: Code completion (fast, but you drive)

Aider: AI pair programmer (you plan, it codes)

Devin: Autonomous agent (black box, expensive)

**shep**: Autonomous + transparent + affordable
- Full SDLC (not just coding)
- See every step (specs, plans, commits)
- $0.20-2.00 per feature (vs. $500/mo for Devin)

---

### Tweet 6: Real-World Use Case
Example: "Add dark mode to settings page"

**With Cursor/Copilot**:
- You: write requirements doc
- You: design component structure
- AI: suggests code
- You: write tests
- You: fix failing CI
- Time: 2-3 hours

**With shep**:
```bash
shep feat new "add dark mode to settings" --push --pr
```
Time: 5 minutes. It handles everything.

---

### Tweet 7: Call to Action + HN Link
If you're tired of babysitting AI coding assistants, try shep.

⭐️ Star on GitHub: https://github.com/shep-ai/cli
📖 Read the technical post: [HN link placeholder]
💬 Join the discussion: [HN comments link placeholder]

We're building in public. Feedback welcome.

---

## Engagement Strategy

- **Post timing**: 9:00 AM PT (coordinated with HN submission)
- **Hashtags**: #AI #DevTools #OpenSource #SDLC #CleanArchitecture
- **Mentions**: Tag @anthropicai (Claude integration), @vercel (inspiration)
- **Pin thread**: Pin to profile for launch week
- **Replies**: Respond to all comments within 2 hours

## Metrics Targets

- 1,000+ impressions
- 50+ retweets
- 100+ likes
- 20+ replies
- Drive 500+ clicks to GitHub/HN

---

**Status**: Draft (pending DEV-17 visual assets)
**Owner**: CMO
**Last Updated**: March 29, 2026
