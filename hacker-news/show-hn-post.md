# Show HN Post Draft

## Title
Show HN: Shep AI — One command, full lifecycle, merged PR

## Post Body

I built Shep because I was tired of the context-switching overhead in software projects. You know the drill: write specs, break down tasks, coordinate work, review PRs, manage deployments. It's exhausting.

Shep is an autonomous AI-native SDLC platform. You run `shep feat new` in your repo, and it:
- Gathers requirements via AI conversation
- Generates a detailed specification
- Creates a feature branch with proper git workflow
- Writes implementation following Clean Architecture
- Runs tests and fixes failures autonomously
- Creates a PR when done

Think of it as an AI team member that handles the full development lifecycle, not just code completion.

**Repo:** https://github.com/shep-ai/cli

**Quick start:**
```bash
npx @shepai/cli feat new
```

**What makes it different:**
- **Autonomous SDLC:** Not just autocomplete. Full project lifecycle from requirements → merged PR.
- **Spec-driven workflow:** Every feature starts with a YAML spec (research, plan, tasks). Human-readable, git-trackable.
- **Clean Architecture:** Enforces proper layering (domain → application → infrastructure → presentation). No spaghetti.
- **Multi-interface:** CLI, TUI, and web dashboard. Pick your workflow.
- **Test-driven:** TDD mandated. RED → GREEN → REFACTOR cycles built into the process.
- **Agent-agnostic:** Works with Claude, OpenAI, or any LLM. No vendor lock-in.

**Current state:**
- v1.155.0, actively developed
- ~70 GitHub stars (bootstrapping distribution now)
- pnpm workspace monorepo (CLI + web UI)
- TypeSpec for domain modeling
- Docker + CI/CD ready

**What it's NOT:**
- Not a code editor plugin (it's a CLI/TUI/web tool)
- Not focused on individual autocomplete (it orchestrates entire features)
- Not trying to replace humans (it augments capacity for solo devs and small teams)

**Technical details:**
- TypeScript + Node.js
- Clean Architecture (4 layers: domain, application, infrastructure, presentation)
- TypeSpec for type-safe domain models
- Next.js for web UI
- Docker for deployment
- Conventional commits + semantic-release

I'm happy to answer questions about architecture, agent orchestration, the spec workflow, or anything else. Would love feedback from the HN community.

**Try it:**
```bash
npx @shepai/cli feat new
```

---

## Timing Strategy

**Best posting windows:**
- Tuesday-Thursday
- 8-10am PT (11am-1pm ET, 4-6pm UTC)
- Avoid Monday (inbox overload), Friday (low engagement), weekends

**Target date:** TBD (coordinate with CEO/board on timing)

---

## Engagement Plan

**First 4 hours (critical window):**
- Monitor comments every 15-30 minutes
- Respond to every question/comment within 30-60 minutes
- Be technical, humble, and transparent
- Acknowledge limitations, don't oversell
- Offer video calls to top commenters for deeper feedback

**After 4 hours:**
- Check every 1-2 hours for remainder of day
- Cross-post to Twitter after 3+ hours if gaining traction
- Share update in CEO channel if front-page performance

**Don't:**
- Ask friends to upvote (HN detects this, kills the post)
- Use multiple accounts to engage (instant ban)
- Delete and repost if it flops (wait 6+ months)
- Get defensive about criticism (embrace feedback)

---

## Success Metrics

**Tier 1 (Good):**
- 100+ points
- Front page for 2+ hours
- 500-1K GitHub stars in 48h

**Tier 2 (Great):**
- 200+ points
- Front page for 4+ hours
- 1K-2K stars in 48h

**Tier 3 (Exceptional):**
- 300+ points
- Front page for 8+ hours
- 2K-3K+ stars in 48h

---

## Follow-up Actions

**If it gains traction:**
1. Cross-post to Twitter with HN link
2. Share on LinkedIn (technical, not salesy)
3. Post in relevant dev Slack communities (with context, not spam)
4. Update Reddit posts to reference HN discussion
5. Write "HN launch retrospective" blog post (transparent, data-driven)

**If it flops:**
1. Don't panic — HN is unpredictable
2. Review comment feedback for product insights
3. Wait 6+ months before reposting
4. Focus on Reddit/PH as alternative channels
5. Build more proof points (stars, testimonials, case studies) for next attempt

---

## Pre-Flight Checklist

- [ ] Confirm product is in optimal state (CTO sign-off)
- [ ] Verify README is compelling (DEV-4 done ✅)
- [ ] Ensure top blockers are fixed (DEV-5 done ✅)
- [ ] Test `npx @shepai/cli` quick start flow
- [ ] Review repo for any embarrassing issues (typos, broken links, stale docs)
- [ ] Clear calendar for 4+ hours of engagement
- [ ] Draft tweet thread for cross-posting
- [ ] Notify team in CEO channel before posting
