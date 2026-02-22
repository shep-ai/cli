# Spec vs Implementation Gaps: PRD Review Questionnaire (Feature 031)

## 1. Confirmed Gaps

Issues where the spec explicitly states something that the implementation does not deliver.

### GAP-01: Test Count Below Spec Requirement

| Attribute              | Value                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| **Severity**           | Critical                                                                                                  |
| **Spec Reference**     | NFR-7, task-7                                                                                             |
| **Spec Says**          | "63+ test cases covering rendering, navigation, selection, badges, progress, processing, accessibility"   |
| **Implementation Has** | ~27 tests in `prd-questionnaire.test.tsx` + 8 in `prd-questionnaire-drawer.test.tsx` = **35 total**       |
| **Gap**                | 28 tests short of spec requirement                                                                        |
| **Impact**             | Confidence in component correctness significantly reduced                                                 |
| **Recommendation**     | Add tests for: auto-advance, step dot navigation, Skip button, empty state, single question, keyboard nav |

### GAP-02: ReviewDrawerShell Has Zero Unit Tests

| Attribute              | Value                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Severity**           | Critical                                                                                                                 |
| **Spec Reference**     | NFR-7 ("All new code SHALL have unit tests following TDD")                                                               |
| **Spec Says**          | TDD mandatory for all new code                                                                                           |
| **Implementation Has** | No test file exists for ReviewDrawerShell                                                                                |
| **Gap**                | Shared infrastructure component used by 2 consumers has no tests                                                         |
| **Impact**             | Regressions in ReviewDrawerShell cascade to PrdQuestionnaireDrawer AND TechDecisionsDrawer                               |
| **Recommendation**     | Create `review-drawer-shell.test.tsx` covering: open/close, header, actions conditional, delete flow, children rendering |

### GAP-03: OpenActionMenu Has Zero Dedicated Unit Tests

| Attribute              | Value                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Severity**           | Critical                                                                                                        |
| **Spec Reference**     | NFR-7                                                                                                           |
| **Spec Says**          | TDD mandatory for all new code                                                                                  |
| **Implementation Has** | No test file. Some indirect coverage through FeatureDrawer tests (menu open, IDE/Terminal clicks)               |
| **Gap**                | No dedicated test file. Copy path, per-item loading/error states, specs disabled, keyboard nav untested         |
| **Impact**             | Clipboard behavior, error states, and disabled logic unverified                                                 |
| **Recommendation**     | Create `open-action-menu.test.tsx` covering: all 4 items, loading/error per item, copy feedback, trigger states |

### GAP-04: TechDecisionsReview Has Zero Unit Tests

| Attribute              | Value                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Severity**           | Critical                                                                                                                       |
| **Spec Reference**     | NFR-7                                                                                                                          |
| **Spec Says**          | TDD mandatory for all new code. Refactored code also needs tests.                                                              |
| **Implementation Has** | No test file for TechDecisionsReview                                                                                           |
| **Gap**                | Markdown rendering, collapsed alternatives toggle, chat refinement, approve, empty state -- all untested                       |
| **Impact**             | Markdown XSS risk unverified. Collapse/expand logic unverified.                                                                |
| **Recommendation**     | Create `tech-decisions-review.test.tsx` covering: card rendering, markdown output, collapse toggle, chat, approve, empty state |

### GAP-05: TechDecisionsDrawer Has Zero Unit Tests

| Attribute              | Value                                                                    |
| ---------------------- | ------------------------------------------------------------------------ |
| **Severity**           | High                                                                     |
| **Spec Reference**     | NFR-7                                                                    |
| **Spec Says**          | TDD mandatory                                                            |
| **Implementation Has** | No test file                                                             |
| **Gap**                | Drawer wrapper composition untested                                      |
| **Impact**             | Props forwarding to ReviewDrawerShell and TechDecisionsReview unverified |
| **Recommendation**     | Create `tech-decisions-drawer.test.tsx` or add integration tests         |

---

## 2. Behavioral Mismatches

### GAP-06: `answeredCount` May Count Stale Selections

| Attribute               | Value                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**            | High                                                                                                                                      |
| **Spec Reference**      | FR-9 ("progress bar showing answered count / total questions ratio")                                                                      |
| **Spec Says**           | Progress = answered / total                                                                                                               |
| **Implementation Does** | `answeredCount = Object.keys(selections).length` -- counts ALL keys in selections, not just keys matching current questions               |
| **Gap**                 | If parent passes selections with orphaned keys (question IDs no longer in data), progress inflates                                        |
| **Scenario**            | After refinement, AI removes question "q3". Parent still has `selections: { q1: "a", q3: "b" }`. Progress shows 2/5 but q3 doesn't exist. |
| **Impact**              | Progress bar shows incorrect percentage. Approve gate may enable incorrectly.                                                             |
| **Recommendation**      | Filter `answeredCount` to only count selections where questionId exists in `data.questions`                                               |

### GAP-07: `decisionName` Type Assertion in TechDecisionsReview

| Attribute               | Value                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Severity**            | Medium                                                                                                                                                             |
| **Spec Reference**      | FR-23, FR-24                                                                                                                                                       |
| **Spec Says**           | Decision card shows title + chosen                                                                                                                                 |
| **Implementation Does** | Uses `(decision as unknown as { decisionName?: string }).decisionName` -- a type assertion suggesting the TypeSpec model and runtime data have inconsistent shapes |
| **Gap**                 | Type safety bypassed. If `decisionName` is removed or renamed, no compile error.                                                                                   |
| **Impact**              | Silent rendering failure -- field may be undefined, card shows no decision name                                                                                    |
| **Recommendation**      | Fix TypeSpec model or update component to use correct field name without assertion                                                                                 |

---

## 3. Spec Ambiguities (Not Clearly Specified)

### AMB-01: Auto-Advance Cancellation

| Attribute          | Value                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Spec Reference** | FR-7                                                                                                            |
| **Spec Says**      | "Auto-advance to next step after 250ms delay"                                                                   |
| **Ambiguity**      | Spec does not say what happens if user navigates manually during the 250ms window. Should timeout be cancelled? |
| **Implementation** | Needs verification -- does it clear the timeout on manual navigation?                                           |
| **Risk**           | Race condition (see edge case E-02)                                                                             |

### AMB-02: Delete During Processing

| Attribute          | Value                                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Spec Reference** | FR-10, FR-19                                                                                                                              |
| **Spec Says**      | Processing disables all interactive elements. Delete has its own confirmation.                                                            |
| **Ambiguity**      | Should delete be blocked during processing? Or is delete independent of processing?                                                       |
| **Implementation** | Delete button is in ReviewDrawerShell (outside PrdQuestionnaire). Processing state is inside PrdQuestionnaire. Delete likely still works. |
| **Risk**           | User deletes feature while AI is refining requirements -- results in orphaned processing                                                  |

### AMB-03: Drawer Close During Processing

| Attribute          | Value                                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Spec Reference** | FR-10                                                                                                                |
| **Spec Says**      | Processing disables controls inside the component                                                                    |
| **Ambiguity**      | Does processing disable the drawer close button (X)? The close button is in ReviewDrawerShell, not PrdQuestionnaire. |
| **Implementation** | Close button likely NOT disabled during processing (different component scope)                                       |
| **Risk**           | User closes drawer, processing continues silently, results lost                                                      |

### AMB-04: Step Reset on Drawer Reopen

| Attribute          | Value                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **Spec Reference** | FR-4                                                                                                                              |
| **Spec Says**      | Multi-step wizard with internal `currentStep` state                                                                               |
| **Ambiguity**      | When drawer is closed and reopened, does `currentStep` reset to 0? It's internal state (`useState`), so it will reset on remount. |
| **Implementation** | Component likely remounts on drawer reopen -> step resets to 0                                                                    |
| **Risk**           | User at step 5, closes drawer, reopens -> back at step 1. Selections preserved but step position lost. Potentially confusing.     |

### AMB-05: Multiple Review Drawers

| Attribute          | Value                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Spec Reference** | FR-17, FR-18                                                                                                                |
| **Spec Says**      | ReviewDrawerShell is a reusable drawer                                                                                      |
| **Ambiguity**      | What happens if both PrdQuestionnaireDrawer and TechDecisionsDrawer are open simultaneously? Non-modal drawers can overlap. |
| **Implementation** | Both use `modal={false}`. No mutual exclusion logic.                                                                        |
| **Risk**           | Visual overlap. Confusing UX. Z-index fights.                                                                               |

---

## 4. What Exists in Spec But NOT Implemented

| #   | Spec Item                                        | Status             | Notes                                                   |
| --- | ------------------------------------------------ | ------------------ | ------------------------------------------------------- |
| 1   | 63+ unit test cases (NFR-7)                      | Not Met            | Only ~35 tests total                                    |
| 2   | TDD red-green-refactor for all new code          | Partially Met      | Components exist but 3 of 6 new components have 0 tests |
| 3   | Step dot `aria-label="Go to question N"` (FR-14) | Needs Verification | Spec is explicit but tests don't verify                 |
| 4   | `aria-label` on chat input (NFR-6)               | Tested             | Single test case confirms                               |

## 5. What Is Implemented But NOT in Spec

| #   | Implementation Detail                                | Notes                                                                                       |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | `COPY_FEEDBACK_DELAY = 2000` constant                | Hardcoded 2s feedback delay. Not specified in spec.                                         |
| 2   | `modal={false}` on DropdownMenu in OpenActionMenu    | Non-blocking dropdown. Spec doesn't specify modal behavior for menus.                       |
| 3   | `decisionName` type assertion in TechDecisionsReview | Type workaround not in any spec. Suggests model inconsistency.                              |
| 4   | CometSpinner in FeatureDrawer                        | Custom spinner for running state. Not related to this feature but present in modified code. |

---

## 6. Summary

| Category                | Count | Severity Distribution                         |
| ----------------------- | ----- | --------------------------------------------- |
| Confirmed Gaps          | 7     | 4 Critical, 2 High, 1 Medium                  |
| Ambiguities             | 5     | 1 Critical (race condition), 2 High, 2 Medium |
| Spec-not-implemented    | 4     | 2 Critical (test count, missing test files)   |
| Implemented-not-in-spec | 4     | All Low (implementation details)              |
