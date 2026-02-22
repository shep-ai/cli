# QA Review: PRD Review Questionnaire (Feature 031)

**Date:** 2026-02-22
**Status:** Draft -- ready for iteration
**Feature Branch:** `feat/prd-review-questionnaire`

---

## Documents

| Document                               | Purpose                                                                   | Key Findings                                                           |
| -------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [qa-test-plan.md](./qa-test-plan.md)   | Full manual test matrix (75 test cases across 10 sections)                | Core workflows covered. Approve gate is the highest-risk area.         |
| [edge-cases.md](./edge-cases.md)       | 34 edge cases + 5 race condition scenarios + state transition diagrams    | Auto-advance race with manual navigation is the critical risk.         |
| [spec-gaps.md](./spec-gaps.md)         | 7 confirmed gaps + 5 ambiguities + drift analysis                         | 4 Critical gaps: test count, 3 components with zero tests.             |
| [ux-risks.md](./ux-risks.md)           | 9 UX risks + accessibility audit + cognitive load analysis                | Auto-advance too fast, no summary before approve, skip has no warning. |
| [missing-tests.md](./missing-tests.md) | Test coverage gap analysis + 176 recommended tests + implementation order | Current: ~75 tests. After remediation: ~180 unit + 4 e2e.              |

---

## Top 10 Findings (Action Required)

### Critical (Must Fix Before Merge)

| #   | Finding                                                                     | Document   | ID          |
| --- | --------------------------------------------------------------------------- | ---------- | ----------- |
| 1   | **ReviewDrawerShell has 0 unit tests** -- shared by both review drawers     | spec-gaps  | GAP-02      |
| 2   | **OpenActionMenu has 0 unit tests** -- clipboard, loading/error untested    | spec-gaps  | GAP-03      |
| 3   | **TechDecisionsReview has 0 unit tests** -- markdown XSS surface unverified | spec-gaps  | GAP-04      |
| 4   | **Test count 35 vs 63+ spec requirement**                                   | spec-gaps  | GAP-01      |
| 5   | **Auto-advance race condition untested** -- manual nav during 250ms timeout | edge-cases | E-02, RC-01 |

### High (Should Fix Before Merge)

| #   | Finding                                                                        | Document  | ID     |
| --- | ------------------------------------------------------------------------------ | --------- | ------ |
| 6   | **answeredCount may count stale selections** (orphaned question IDs)           | spec-gaps | GAP-06 |
| 7   | **No summary/review screen before Approve** -- users approve blind             | ux-risks  | UX-02  |
| 8   | **Skip has no warning** -- unanswered questions block approve silently         | ux-risks  | UX-03  |
| 9   | **250ms auto-advance too fast** -- interrupts reading                          | ux-risks  | UX-01  |
| 10  | **decisionName type assertion** in TechDecisionsReview -- type safety bypassed | spec-gaps | GAP-07 |

---

## Test Remediation Plan

### Phase 1: Critical Infrastructure (Est. 2-3h)

- Create `review-drawer-shell.test.tsx` (19 tests)
- Create `open-action-menu.test.tsx` (20 tests)

### Phase 2: Content Components (Est. 2h)

- Create `tech-decisions-review.test.tsx` (26 tests)
- Create `tech-decisions-drawer.test.tsx` (6 tests)

### Phase 3: Augment Existing (Est. 2h)

- Add 20 tests to `prd-questionnaire.test.tsx`
- Add 5 tests to `prd-questionnaire-drawer.test.tsx`
- Add 5 tests to `feature-drawer.test.tsx`

### Phase 4: E2E (Est. 1-2h)

- Create `prd-review-questionnaire.spec.ts` (4 flows)

**Total: ~101 new tests across 4 phases**

---

## How to Use These Documents

1. **For manual QA session:** Follow [qa-test-plan.md](./qa-test-plan.md) test matrix sequentially
2. **For writing unit tests:** Follow [missing-tests.md](./missing-tests.md) Phase 1-3 order
3. **For reviewing the PR:** Check [spec-gaps.md](./spec-gaps.md) for drift from requirements
4. **For UX feedback:** Review [ux-risks.md](./ux-risks.md) recommendations with design team
5. **For testing edge cases:** Use [edge-cases.md](./edge-cases.md) race condition scenarios with fake timers
