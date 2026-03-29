# Developer Newsletter Outreach Strategy

**Task**: DEV-14 - Newsletter Outreach Campaign
**Owner**: CMO
**Target Date**: April 5-10, 2026 (after HN + Reddit launches)
**Goal**: Get shep featured in 3-5 top developer newsletters

---

## Target Newsletter List (Tier 1 - High Priority)

### 1. TLDR Newsletter (3.5M+ subscribers)
- **URL**: https://tldr.tech
- **Focus**: Tech/developer news, curated daily
- **Submission**: https://tldr.tech/submit
- **Best Fit**: Launch announcement with unique angle (autonomous SDLC)
- **Pitch Angle**: "AI that manages your entire SDLC, not just code completion"
- **Estimated Reach**: 500K+ clicks if featured

### 2. Console (50K+ subscribers)
- **URL**: https://console.dev
- **Focus**: Developer tools and open-source projects
- **Submission**: https://console.dev/submit or email team@console.dev
- **Best Fit**: Perfect match - they feature developer tools weekly
- **Pitch Angle**: Open-source AI SDLC orchestrator with Clean Architecture
- **Estimated Reach**: 10K+ clicks if featured

### 3. DevTools Weekly (40K+ subscribers)
- **URL**: https://www.devtoolsweekly.com
- **Focus**: Curated developer tools and resources
- **Submission**: Email devtoolsweekly@gmail.com
- **Best Fit**: Strong match - weekly developer tool spotlight
- **Pitch Angle**: Autonomous development workflow, TypeSpec-first modeling
- **Estimated Reach**: 8K+ clicks if featured

### 4. JavaScript Weekly (170K+ subscribers)
- **URL**: https://javascriptweekly.com
- **Focus**: JavaScript ecosystem, Node.js, TypeScript
- **Submission**: https://javascriptweekly.com/submit
- **Best Fit**: Good match (shep is TypeScript-based, Node.js CLI)
- **Pitch Angle**: TypeScript CLI for autonomous feature development
- **Estimated Reach**: 20K+ clicks if featured

### 5. React Status (100K+ subscribers)
- **URL**: https://react.statuscode.com
- **Focus**: React ecosystem, Next.js, UI tooling
- **Submission**: Email react@cooperpress.com
- **Best Fit**: Moderate fit (shep has Next.js web dashboard)
- **Pitch Angle**: Next.js dashboard for visualizing AI-driven development
- **Estimated Reach**: 15K+ clicks if featured

---

## Target Newsletter List (Tier 2 - Good Fit)

### 6. Software Lead Weekly (35K+ subscribers)
- **URL**: https://softwareleadweekly.com
- **Focus**: Engineering leadership, team productivity
- **Submission**: Email oren@softwareleadweekly.com
- **Best Fit**: Great for engineering manager angle
- **Pitch Angle**: Scale your team with AI that automates SDLC grunt work

### 7. Pointer.io (15K+ subscribers)
- **URL**: https://www.pointer.io
- **Focus**: Software engineering, best practices, architecture
- **Submission**: https://www.pointer.io/submit
- **Best Fit**: Strong match - architecture-focused audience
- **Pitch Angle**: Clean Architecture meets AI orchestration

### 8. Frontend Focus (100K+ subscribers)
- **URL**: https://frontendfoc.us
- **Focus**: HTML, CSS, web UX, frontend tooling
- **Submission**: Email frontend@cooperpress.com
- **Best Fit**: Moderate fit (web dashboard angle)
- **Pitch Angle**: React Flow-based dashboard for development visualization

### 9. The Pragmatic Engineer (400K+ subscribers)
- **URL**: https://newsletter.pragmaticengineer.com
- **Focus**: Engineering culture, senior developer insights
- **Submission**: Not open submission - requires relationship building
- **Best Fit**: High value but difficult to get featured
- **Pitch Angle**: AI-native SDLC as the future of development workflows

### 10. Changelog News (50K+ subscribers)
- **URL**: https://changelog.com/news
- **Focus**: Open-source news, developer podcasts
- **Submission**: https://changelog.com/news/submit
- **Best Fit**: Strong match - open-source focus
- **Pitch Angle**: Open-source alternative to Devin ($500/mo → $0.20/feature)

---

## Newsletter Pitch Templates

### Template A: Technical Deep-Dive (Console, Pointer, Software Lead)

**Subject**: [Feature Request] shep — Open-source AI SDLC orchestrator with Clean Architecture

Hi [Editor Name],

I'm the CMO at shep, an open-source AI-native SDLC platform that automates the full software development lifecycle — from requirements gathering to PR creation.

Unlike typical AI coding tools (Cursor, Copilot) that focus on code completion, shep manages the entire workflow autonomously:

- Requirements gathering via AI conversation
- Spec generation (YAML specs with acceptance criteria)
- Implementation planning with task breakdown
- Parallel execution using git worktrees
- Full TDD workflow (red → green → refactor)
- CI monitoring and auto-fixes

**Why this might interest [Newsletter Name] readers:**

1. **Clean Architecture in practice**: We built shep with strict layering (domain → application → infrastructure → presentation). The architecture is battle-tested and production-ready.

2. **TypeSpec-first domain modeling**: All entities, value objects, and enums defined in TypeSpec. Single source of truth, auto-generated TypeScript types.

3. **Agent orchestration via LangGraph**: Complex workflows are directed graphs, not linear chains. Agents collaborate and handle dependencies intelligently.

4. **Open-source transparency**: Unlike Devin ($500/mo black box), shep is fully open-source. Self-hostable. API costs only ($0.20-2.00 per feature).

We just launched on Hacker News [link placeholder] and are seeing strong traction from engineering teams tired of babysitting AI assistants.

**Metrics:**
- ~70 GitHub stars (growing fast post-launch)
- Active development with 150+ releases
- Built by [founding team context]

Would you be interested in featuring shep in an upcoming [Newsletter Name] issue? Happy to provide:
- Technical writeup tailored to your audience
- Demo GIF or screenshots
- Access to the team for Q&A

Let me know if this is a good fit!

Best,
[CMO Name]
CMO, shep
https://github.com/shep-ai/cli

---

### Template B: Product Launch Angle (TLDR, Changelog, JavaScript Weekly)

**Subject**: [Submission] shep — Autonomous AI SDLC platform (open-source Devin alternative)

Hi [Newsletter Name] team,

We just launched shep on Hacker News — an open-source AI SDLC orchestrator that handles the full development workflow autonomously.

**Quick pitch:**
- Give it a feature request: `shep feat new "add stripe billing"`
- It gathers requirements, writes specs, implements (with TDD), and creates a PR
- You review and merge. That's it.

**Why this matters:**
- **Autonomous, not assistive**: shep is a project manager, not autocomplete
- **Transparent**: Every decision is visible in git (specs, plans, commits)
- **Affordable**: $0.20-2.00 per feature vs. $500/mo for Devin
- **Open-source**: Self-hostable, works with Claude/OpenAI/local models

**Hacker News traction** [link placeholder]:
- [X comments / Y points in Z hours]
- Strong signal from engineering leaders dealing with slow feature velocity

**GitHub**: https://github.com/shep-ai/cli (currently ~70 stars, growing)

Would love to be featured in [Newsletter Name]. Let me know if you need more details!

Thanks,
[CMO Name]
CMO, shep

---

### Template C: Engineering Leadership Angle (Software Lead Weekly, Pragmatic Engineer)

**Subject**: How we built an AI SDLC orchestrator that eliminates development grunt work

Hi [Editor Name],

I wanted to share something we've been building that might resonate with [Newsletter Name] readers: shep, an AI-native SDLC platform that automates the repetitive work engineers hate.

**The leadership problem we're solving:**

Engineering teams waste 40-60% of their time on:
- Writing boilerplate
- Context switching between features
- Babysitting CI/CD pipelines
- Writing specs for straightforward features
- Managing parallel work streams

AI coding tools (Cursor, Copilot) help with typing speed, but they don't eliminate the grunt work. **You're still the project manager.**

**The shep approach:**

We inverted the model: shep is the project manager. Your team is the product owner.

```bash
shep feat new "add OAuth integration"
```

shep handles requirements, planning, coding, testing, CI monitoring, and PR creation. Your team reviews and merges.

**Engineering leadership benefits:**
1. **Scale without hiring**: One engineer + shep can match a 3-person team's velocity
2. **Reduce context switching**: shep manages parallel features in git worktrees
3. **Enforce best practices**: TDD, Clean Architecture, and spec-driven development by default
4. **Onboard juniors faster**: They review AI-generated code instead of writing from scratch

We just launched on Hacker News [link] and are getting strong interest from VPEs and CTOs.

Would this be interesting to feature in [Newsletter Name]? Happy to write a case study on how engineering leaders are using shep to scale their teams.

Best,
[CMO Name]
CMO, shep
https://github.com/shep-ai/cli

---

## Outreach Timeline

### Phase 1: Immediate Submissions (April 5-7)
- TLDR Newsletter (self-service submission)
- Changelog News (self-service submission)
- JavaScript Weekly (self-service submission)
- DevTools Weekly (email pitch)

### Phase 2: Relationship Building (April 8-10)
- Console (personalized email with HN traction data)
- Pointer.io (submission with architecture deep-dive)
- Software Lead Weekly (leadership angle)
- Frontend Focus (Next.js dashboard angle)

### Phase 3: Long-Term Cultivation (April 11-30)
- React Status (follow-up with web dashboard screenshots)
- Pragmatic Engineer (build relationship first, no cold pitch)
- Additional niche newsletters based on HN feedback

---

## Submission Checklist

For each newsletter submission, include:

- [x] Compelling subject line (template-based)
- [x] Brief pitch (2-3 sentences max)
- [x] Unique angle for their audience
- [x] HN link with traction data (once available)
- [x] GitHub star count (updated daily)
- [x] Demo GIF or architecture diagram
- [x] Contact info (email + Twitter)
- [x] Offer to provide additional materials

---

## Success Metrics

**Primary KPI**: Get featured in 3+ newsletters (April 5-30)

**Stretch Goal**: Get featured in TLDR or JavaScript Weekly (500K+ reach)

**Tracking**:
- Submissions sent: [tracked in spreadsheet]
- Responses received: [tracked in spreadsheet]
- Features confirmed: [tracked in spreadsheet]
- Traffic driven: [tracked via UTM params]

---

## Next Steps (DEV-14)

1. **April 5**: Send Tier 1 submissions (TLDR, Console, DevTools, JS Weekly, Changelog)
2. **April 6**: Monitor HN post traction, update pitches with metrics
3. **April 7**: Send Tier 2 submissions (Pointer, Software Lead, Frontend Focus)
4. **April 8**: Follow up on non-responses with updated traction data
5. **April 9-10**: Build relationships with editors who responded
6. **April 11+**: Track features published, measure traffic impact

---

**Status**: Ready to execute
**Blocked by**: None (can start immediately after HN launch)
**Owner**: CMO
**Last Updated**: March 29, 2026
