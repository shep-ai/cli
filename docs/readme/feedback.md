# README Feedback Log

All external and simulated feedback collected during README iterations.

---

## 1. Reviewer A — Cold Outreach Reply (Pre-Rewrite)

**Source**: Email reply to outreach. Senior engineer / engineering lead with multi-agent workflow experience.

**Overall**: Negative. "The gap between the pitch and the actual proof is too large to ignore."

**Key concerns**:
1. **Scope vs. maturity mismatch** — promises end-to-end SDLC but no evidence it works reliably
2. **"One command" is the wrong target** — serious teams want narrow tools with clear boundaries, not magic
3. **Weak trust & security** — doesn't address adversarial cases (hallucinated deps, vuln injection)
4. **No evidence on edge cases** — no case studies, no failure documentation
5. **Methodology feels brittle** — pipeline looks like a rigid chain where any break kills the flow

**What he wanted**: Narrower positioning, explicit trust model, proof on hard problems, clear user definition, predictable failure modes.

**Resolved in**: README-NEW (positioning), README-NEW-001 (caveats, plan example, trust honesty)

---

## 2. Reviewer A (Simulated) — Reaction to README-NEW

**Source**: Simulated review of first rewrite using Reviewer A's persona and concerns.

**Overall**: "Much better. Getting there." Called approval gates "genuinely differentiated" and "What Goes Wrong" section "the best part."

**Key concerns**:
1. **Tagline still overpromises** — suggested honest calibration line underneath
2. **"What Goes Wrong" should be higher** — before features, not after
3. **Trust table missing adversarial case** — "what if agent introduces a vulnerability?"
4. **No example artifacts shown** — show a plan, don't just describe it
5. **CI auto-fix needs caveats** — "Shep can't fix what it can't diagnose"
6. **Large codebase FAQ is a dodge** — needs concrete numbers
7. **No demo / video** — highest-impact trust-builder, no copy change can substitute

**Resolved in**: README-NEW-001 (all items 1-6 addressed)

---

## 3. Reviewer B — Hands-On Trial

**Source**: Actual product trial. Installed, ran features, hit real walls. Most valuable feedback.

**Overall**: Positive. "Really impressive polish and scope." Impressed by GUI + CLI.

**Issues found**:
1. **Agent auth UX** (High) — onboarding page said "authenticate" but didn't say how
2. **Sandbox mode thrashing** (Critical) — agent spiraled 3 min on sandbox-blocked `npm install`, tried 10+ workarounds before human could intervene
3. **`--dangerously-skip-permissions` used silently** (Critical for trust) — contradicted "Shep doesn't grant additional permissions" claim
4. **No way to stop in-progress feature** (High) — chat agent claimed to stop but didn't actually work
5. **IntelliJ not supported** (Low) — uses JetBrains IDE

**Key takeaway**: The sandbox spiral validated Reviewer A's "brittle pipeline" concern with a real example. Trust section was misleading about permissions.

**Resolved in**: README-NEW-002 (prerequisites, sandbox warning, permissions honesty, stop feature, agent-agnostic fix)

---

## 4. Internal Review — Positioning Pivot

**Source**: User (project owner) direction after README-NEW-002.

**Key feedback**:
1. **"Prompt to PR in one command" is a NO** — implies magic reliability, oversells
2. **Stop leading with spec-driven / SDLC** — it's optional, not the core experience
3. **Focus on parallel session management** — managing multiple features is the primary value
4. **Everything is configurable** — push, PR, CI watch, retries, timeouts — make this visible
5. **Don't like the tagline about pausing/approvals** — makes Shep sound slow

**Resolved in**: README-NEW-003 (major positioning pivot to parallel sessions + configurability)
