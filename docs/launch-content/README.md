# Launch Content Overview

**Project**: shep-ai/cli Growth Campaign
**Goal**: 70 → 10,000 GitHub stars
**Owner**: CMO
**Status**: Ready for HN launch (April 1-3)

---

## Content Inventory

### ✅ Complete & Ready

#### 1. Hacker News Launch
- **File**: `hacker-news/show-hn-post.md`
- **Status**: Ready to post
- **Target Date**: April 1-3, 9:00 AM PT
- **Post Type**: Show HN
- **Title**: "Show HN: Shep – Autonomous AI SDLC platform (open-source Devin alternative)"
- **Character count**: Within HN limits
- **Strategy**: Technical credibility, transparent comparison, conversation starter

#### 2. LinkedIn Post
- **File**: `docs/launch-content/linkedin-post.md`
- **Status**: Ready to post
- **Target Date**: April 2, 10:00 AM PT (day after HN)
- **Format**: Long-form thought leadership (1,300-1,500 chars)
- **Angle**: Engineering leadership perspective
- **Hashtags**: #AIEngineering #DevTools #SDLC #EngineeringLeadership #OpenSource
- **Target Metrics**: 5K+ impressions, 100+ reactions, 50+ shares

#### 3. Twitter Thread
- **File**: `docs/launch-content/twitter-thread.md`
- **Status**: Draft ready (pending visual assets for max impact)
- **Target Date**: April 1-3 (coordinated with HN)
- **Format**: 7-tweet thread with demo GIF
- **Hook**: "I just shipped a full feature in 3 minutes"
- **Blocked by**: DEV-17 (demo GIF for Tweet 1)
- **Target Metrics**: 1K+ impressions, 50+ retweets, 100+ likes

#### 4. Newsletter Outreach Strategy
- **File**: `docs/launch-content/newsletter-outreach.md`
- **Status**: Complete, ready to execute
- **Target Date**: April 5-30 (after HN settles)
- **Target Newsletters**: 10 top dev newsletters (3.5M+ combined reach)
  - Tier 1: TLDR, Console, DevTools Weekly, JS Weekly, React Status
  - Tier 2: Software Lead Weekly, Pointer.io, Frontend Focus, Pragmatic Engineer, Changelog
- **Templates**: 3 pitch templates (technical, product, leadership)
- **Tracking**: UTM-tagged links, response templates
- **Target**: 3+ newsletter features

#### 5. Newsletter Tracking System
- **File**: `docs/launch-content/newsletter-tracking.md`
- **Status**: Complete
- **Purpose**: Track submissions, responses, features, traffic
- **Metrics**: Status per newsletter, traffic attribution, lessons learned
- **Timeline**: 4-week execution plan (April 5-30)

---

### 🚧 In Progress

#### 6. Reddit Campaign
- **Task**: DEV-12
- **Status**: Blocked on DEV-17 (visual assets)
- **Target Subreddits**: r/programming, r/ExperiencedDevs, r/sideproject, r/MachineLearning
- **Target Date**: April 8-10 (after HN + visual assets ready)
- **Blocked by**: Demo GIF, architecture diagram (DEV-17)
- **Owner**: CMO
- **Next Step**: Wait for CTO to complete DEV-17

---

### 📋 Queued

#### 7. Product Hunt Launch
- **Task**: DEV-13
- **Status**: Todo, after HN + Reddit
- **Target Date**: TBD (after Reddit traction validated)
- **Dependencies**: HN + Reddit performance data
- **Owner**: CMO

#### 8. Content Calendar
- **Task**: DEV-15
- **Status**: Todo
- **Purpose**: Sustained content strategy post-launch
- **Owner**: CMO

#### 9. Metrics Dashboard
- **Task**: DEV-16
- **Status**: Todo
- **Purpose**: Track growth metrics, traffic attribution, conversion funnel
- **Owner**: CMO

---

## Launch Dependencies

### Critical Path Blockers

1. **HN Launch** (no blockers)
   - Post ready
   - Product functional (`npx @shepai/cli feat new`)
   - Competitive analysis merged (PR #484)
   - Can launch immediately

2. **Twitter Thread** (minor blocker)
   - Blocked by: DEV-17 demo GIF for Tweet 1
   - Workaround: Can post without GIF, but impact reduced
   - Decision: Wait for demo GIF (due April 5)

3. **Reddit Campaign** (hard blocker)
   - Blocked by: DEV-17 visual assets (demo GIF + arch diagram)
   - Cannot proceed without visuals (Reddit heavily visual)
   - Timeline: April 8-10 (after DEV-17 complete)

4. **Newsletter Outreach** (no blockers)
   - Ready to execute April 5
   - Can start immediately after HN settles
   - No dependencies

---

## Execution Timeline

### Week 1: April 1-7
- **April 1-3**: HN launch (9 AM PT)
- **April 2**: LinkedIn post (10 AM PT)
- **April 5**: Newsletter Tier 1 submissions (5 newsletters)
- **April 5**: CTO delivers DEV-17 visual assets
- **April 6**: Newsletter Tier 2 submissions (5 newsletters)
- **April 7**: Twitter thread (with demo GIF)

### Week 2: April 8-14
- **April 8-10**: Reddit campaign (4 subreddits)
- **April 10-14**: Newsletter follow-ups
- **April 14**: Assess traction, decide on Product Hunt timing

### Week 3: April 15-21
- **April 15-21**: Product Hunt launch (if HN + Reddit traction strong)
- **April 15-21**: Newsletter features published (track traffic)

### Week 4: April 22-30
- **April 22-30**: Content calendar (sustained growth)
- **April 22-30**: Metrics dashboard (track everything)

---

## Content Quality Checklist

All content pieces follow these principles:

- ✅ **Technical credibility**: No marketing fluff, engineer-to-engineer
- ✅ **Transparent comparisons**: Honest about tradeoffs vs. Cursor/Aider/Devin
- ✅ **Genuinely useful**: Every piece provides value, not just promotion
- ✅ **Call to action**: Clear next step (star on GitHub, read HN post, try shep)
- ✅ **Trackable**: UTM parameters for traffic attribution
- ✅ **Audience-specific**: Tailored for each channel (HN ≠ LinkedIn ≠ Twitter)

---

## Asset Inventory

### Visual Assets Status

- ✅ **Architecture diagram**: `docs/screenshots/architecture-diagram.png`
- ✅ **Dashboard screenshots**: `docs/screenshots/features-guide/` (18 screenshots)
- ✅ **TUI/CLI screenshots**: Existing in features-guide
- 🚧 **Demo GIF**: Blocked on DEV-17 (recording plan ready at `docs/demo-recording-plan.md`)

### Written Assets Status

- ✅ **HN post**: `hacker-news/show-hn-post.md`
- ✅ **LinkedIn post**: `docs/launch-content/linkedin-post.md`
- ✅ **Twitter thread**: `docs/launch-content/twitter-thread.md`
- ✅ **Newsletter outreach**: `docs/launch-content/newsletter-outreach.md`
- ✅ **Newsletter tracking**: `docs/launch-content/newsletter-tracking.md`
- ✅ **Competitive analysis**: `docs/COMPETITIVE_ANALYSIS.md` (merged PR #484)
- 🚧 **Reddit posts**: Pending DEV-17 visual assets

---

## Next Actions (CMO)

1. **April 1-3**: Monitor HN launch, respond to comments
2. **April 2**: Post LinkedIn content
3. **April 5**: Execute newsletter Tier 1 submissions
4. **April 6**: Execute newsletter Tier 2 submissions
5. **April 7**: Post Twitter thread (after DEV-17 complete)
6. **April 8-10**: Execute Reddit campaign (after DEV-17 complete)

---

**Last Updated**: 2026-03-29
**Owner**: CMO (1ecae7f9-ead7-44bb-9d17-1ecdfcb794d2)
**Status**: Ready for launch
