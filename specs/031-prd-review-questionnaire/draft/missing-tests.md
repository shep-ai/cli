# Missing Tests & Coverage Gaps: PRD Review Questionnaire (Feature 031)

## 1. Current Test Coverage Summary

| Component              | Test File                           | Test Cases | Status                                                 |
| ---------------------- | ----------------------------------- | ---------- | ------------------------------------------------------ |
| PrdQuestionnaire       | `prd-questionnaire.test.tsx`        | ~27        | Partial (missing navigation, auto-advance, edge cases) |
| PrdQuestionnaireDrawer | `prd-questionnaire-drawer.test.tsx` | 8          | Partial (delete only, no drawer mechanics)             |
| FeatureDrawer          | `feature-drawer.test.tsx`           | ~40        | Good (but missing some action menu details)            |
| ReviewDrawerShell      | None                                | 0          | **CRITICAL GAP**                                       |
| OpenActionMenu         | None                                | 0          | **CRITICAL GAP**                                       |
| TechDecisionsReview    | None                                | 0          | **CRITICAL GAP**                                       |
| TechDecisionsDrawer    | None                                | 0          | **GAP**                                                |
| E2E Questionnaire Flow | None                                | 0          | **GAP**                                                |
| **TOTAL**              | 3 files                             | ~75        | Spec requires 63+ for PrdQuestionnaire alone           |

---

## 2. Critical Missing Test Files (Priority 1)

### 2.1 ReviewDrawerShell Unit Tests

**File to create:** `tests/unit/presentation/web/components/common/review-drawer-shell/review-drawer-shell.test.tsx`

**Why critical:** Shared infrastructure used by PrdQuestionnaireDrawer AND TechDecisionsDrawer. Bug here cascades to both review flows.

| #         | Test Case                                                        | Category      |
| --------- | ---------------------------------------------------------------- | ------------- |
| 1         | Renders drawer when `open=true`                                  | Rendering     |
| 2         | Does not render content when `open=false`                        | Rendering     |
| 3         | Displays feature name in header                                  | Rendering     |
| 4         | Feature ID rendered as sr-only                                   | Accessibility |
| 5         | Close button (X) calls `onClose`                                 | Interaction   |
| 6         | OpenActionMenu shown when `repositoryPath` AND `branch` provided | Conditional   |
| 7         | OpenActionMenu hidden when `repositoryPath` missing              | Conditional   |
| 8         | OpenActionMenu hidden when `branch` missing                      | Conditional   |
| 9         | Delete button shown when `onDelete` AND `featureId` provided     | Conditional   |
| 10        | Delete button hidden when `onDelete` missing                     | Conditional   |
| 11        | Delete button hidden when `featureId` missing                    | Conditional   |
| 12        | Delete click opens AlertDialog with feature name                 | Interaction   |
| 13        | Delete cancel closes dialog, does NOT call `onDelete`            | Interaction   |
| 14        | Delete confirm calls `onDelete(featureId)`                       | Interaction   |
| 15        | Delete buttons disabled when `isDeleting=true`                   | State         |
| 16        | Spinner shown during deleting state                              | Visual        |
| 17        | Children rendered in content slot                                | Rendering     |
| 18        | Separator visible between actions and content                    | Rendering     |
| 19        | Passes specPath to OpenActionMenu                                | Props         |
| **Total** | **19 tests**                                                     |               |

---

### 2.2 OpenActionMenu Unit Tests

**File to create:** `tests/unit/presentation/web/components/common/open-action-menu/open-action-menu.test.tsx`

**Why critical:** Used by ReviewDrawerShell (and thus all drawers) and FeatureDrawer. Clipboard, loading, error behaviors untested.

| #         | Test Case                                                          | Category      |
| --------- | ------------------------------------------------------------------ | ------------- |
| 1         | Renders dropdown trigger button                                    | Rendering     |
| 2         | Menu opens on trigger click                                        | Interaction   |
| 3         | Shows 4 menu items: IDE, Terminal, Specs Folder, Copy path         | Rendering     |
| 4         | Separator between action items and Copy path                       | Rendering     |
| 5         | IDE item calls `actions.openInIde` on click                        | Interaction   |
| 6         | Terminal item calls `actions.openInShell` on click                 | Interaction   |
| 7         | Specs Folder calls `actions.openSpecsFolder` when `showSpecs=true` | Interaction   |
| 8         | Specs Folder disabled when `showSpecs=false`                       | State         |
| 9         | Specs Folder disabled when `showSpecs` undefined (default)         | State         |
| 10        | Copy path writes `repositoryPath` to clipboard                     | Interaction   |
| 11        | Copy path shows "Copied!" feedback with Check icon for 2s          | Visual/Timing |
| 12        | Copy path feedback reverts after 2000ms                            | Timing        |
| 13        | Trigger shows Loader2 spinner when any action loading              | State         |
| 14        | Trigger disabled when any action loading                           | State         |
| 15        | Trigger shows CircleAlert when any action has error                | State         |
| 16        | Per-item: IDE shows spinner when `ideLoading`                      | State         |
| 17        | Per-item: Terminal shows spinner when `shellLoading`               | State         |
| 18        | Per-item: Specs shows spinner when `specsLoading`                  | State         |
| 19        | Per-item: IDE shows error icon when `ideError` set                 | State         |
| 20        | Clipboard API failure handled gracefully                           | Error         |
| **Total** | **20 tests**                                                       |               |

---

### 2.3 TechDecisionsReview Unit Tests

**File to create:** `tests/unit/presentation/web/components/common/tech-decisions-review/tech-decisions-review.test.tsx`

**Why critical:** Refactored with markdown rendering (XSS surface) and new collapse/expand interaction. Zero current coverage.

| #         | Test Case                                                                | Category          |
| --------- | ------------------------------------------------------------------------ | ----------------- |
| 1         | Renders header with blue dot and title                                   | Rendering         |
| 2         | Renders summary text                                                     | Rendering         |
| 3         | Renders correct number of decision cards                                 | Rendering         |
| 4         | Decision cards numbered 1, 2, 3...                                       | Rendering         |
| 5         | Decision card shows title                                                | Rendering         |
| 6         | Decision card shows chosen technology                                    | Rendering         |
| 7         | Rationale rendered as markdown (bold text)                               | Markdown          |
| 8         | Rationale rendered as markdown (lists)                                   | Markdown          |
| 9         | Rationale rendered as markdown (code blocks)                             | Markdown          |
| 10        | Markdown links open in new tab with noopener                             | Markdown/Security |
| 11        | XSS in rationale sanitized (script tags)                                 | Security          |
| 12        | "Other Options Considered" collapsed by default                          | State             |
| 13        | Click expands alternatives section                                       | Interaction       |
| 14        | Click again collapses alternatives                                       | Interaction       |
| 15        | Alternatives count shown in header "(N)"                                 | Rendering         |
| 16        | No alternatives section when `rejected.length === 0`                     | Conditional       |
| 17        | Rejected alternatives rendered in styled boxes                           | Rendering         |
| 18        | Chat input visible with placeholder                                      | Rendering         |
| 19        | Chat submit fires `onRefine(text)`                                       | Interaction       |
| 20        | Chat input clears after submit                                           | Interaction       |
| 21        | Empty chat submit blocked                                                | Interaction       |
| 22        | Approve button fires `onApprove()`                                       | Interaction       |
| 23        | Returns null when decisions empty                                        | Edge case         |
| 24        | Processing state disables all controls                                   | State             |
| 25        | Technologies list rendered (if applicable)                               | Rendering         |
| 26        | Per-card collapse is independent (expand card 1, card 2 stays collapsed) | State             |
| **Total** | **26 tests**                                                             |                   |

---

### 2.4 TechDecisionsDrawer Unit Tests

**File to create:** `tests/unit/presentation/web/components/common/tech-decisions-review/tech-decisions-drawer.test.tsx`

| #         | Test Case                                      | Category    |
| --------- | ---------------------------------------------- | ----------- |
| 1         | Wraps TechDecisionsReview in ReviewDrawerShell | Rendering   |
| 2         | Passes review props to TechDecisionsReview     | Props       |
| 3         | Passes drawer props to ReviewDrawerShell       | Props       |
| 4         | Delete button visible when `onDelete` provided | Conditional |
| 5         | Delete callback receives featureId             | Interaction |
| 6         | Delete buttons disabled when `isDeleting`      | State       |
| **Total** | **6 tests**                                    |             |

---

## 3. Missing Test Cases in Existing Files (Priority 2)

### 3.1 PrdQuestionnaire -- Missing from `prd-questionnaire.test.tsx`

| #         | Missing Test                                                | Category       | Why Important              |
| --------- | ----------------------------------------------------------- | -------------- | -------------------------- |
| 1         | Auto-advance fires after 250ms on selection (not last step) | Timing         | Core FR-7 behavior         |
| 2         | Auto-advance does NOT fire on last step                     | Timing         | Core FR-7 edge case        |
| 3         | Auto-advance cancelled by manual Previous click             | Race condition | Critical UX bug prevention |
| 4         | Auto-advance cancelled by step dot click                    | Race condition | Critical UX bug prevention |
| 5         | Step dot click navigates to correct step                    | Navigation     | FR-14                      |
| 6         | Step dot has `aria-label="Go to question N"`                | Accessibility  | NFR-6 explicit requirement |
| 7         | Previous button disabled on step 1                          | Navigation     | FR-8                       |
| 8         | Next button shows "Next" when question answered             | Navigation     | FR-8                       |
| 9         | Skip button shows "Skip" when question unanswered           | Navigation     | FR-8                       |
| 10        | Skip advances without requiring selection                   | Navigation     | FR-8                       |
| 11        | Returns null when questions array empty                     | Edge case      | FR-15                      |
| 12        | Single question: Approve shown (no Next/Skip)               | Edge case      | Layout                     |
| 13        | Rationale text displayed for each option                    | Rendering      | FR-5                       |
| 14        | Empty chat submit does not fire onRefine                    | Validation     | Input handling             |
| 15        | Enter key submits chat                                      | Interaction    | Keyboard support           |
| 16        | Rapid double-click only fires one onSelect                  | Race condition | Data integrity             |
| 17        | Selection change on current step (A -> C)                   | Interaction    | Override behavior          |
| 18        | All step dots show correct visual states                    | Visual         | FR-14                      |
| 19        | Processing disables step dot navigation                     | State          | FR-10                      |
| 20        | Step preserved across processing toggle                     | State recovery | FR-10                      |
| **Total** | **20 additional tests needed**                              |                |

### 3.2 PrdQuestionnaireDrawer -- Missing from `prd-questionnaire-drawer.test.tsx`

| #         | Missing Test                                              | Category    |
| --------- | --------------------------------------------------------- | ----------- |
| 1         | Drawer renders PrdQuestionnaire inside ReviewDrawerShell  | Integration |
| 2         | Questionnaire props forwarded correctly                   | Props       |
| 3         | Close button fires `onClose`                              | Interaction |
| 4         | Action menu visible when repositoryPath + branch provided | Conditional |
| 5         | Action menu hidden when no repositoryPath                 | Conditional |
| **Total** | **5 additional tests**                                    |             |

### 3.3 FeatureDrawer -- Missing from `feature-drawer.test.tsx`

| #         | Missing Test                                          | Category    |
| --------- | ----------------------------------------------------- | ----------- |
| 1         | Specs Folder item in action menu (showSpecs behavior) | Interaction |
| 2         | Copy path item copies repositoryPath                  | Interaction |
| 3         | Copy path shows "Copied!" feedback                    | Visual      |
| 4         | Error state icon on action menu trigger               | State       |
| 5         | Very long feature name truncation/wrapping            | Layout      |
| **Total** | **5 additional tests**                                |             |

---

## 4. E2E Tests Needed (Priority 3)

**File to create:** `tests/e2e/web/prd-review-questionnaire.spec.ts`

### Flow 1: Complete Questionnaire Review

```
Scenario: User answers all questions and approves
  Given a feature in Requirements phase with 6 PRD questions
  When user opens the PRD review drawer
  Then first question is displayed with options

  When user clicks option B on question 1
  Then option B is highlighted
  And after 250ms, question 2 is displayed

  When user answers all 6 questions by navigating through
  Then step dots show all answered
  And Approve button is enabled on last step

  When user clicks Approve
  Then onApprove callback fires
  And feature transitions to next lifecycle phase
```

### Flow 2: Refinement Cycle

```
Scenario: User refines requirements via chat
  Given 3 of 6 questions answered
  When user types "Add security requirements" and clicks Send
  Then processing state activates (controls disabled, indeterminate progress)

  When processing completes with updated questions
  Then new options show "New" badge with animation
  And previous selections are preserved for unchanged questions
  And user can continue answering
```

### Flow 3: Delete During Review

```
Scenario: User deletes feature from review drawer
  Given drawer open with 2 questions answered
  When user clicks delete button
  Then confirmation dialog shows feature name

  When user confirms deletion
  Then feature is deleted
  And drawer closes
  And feature removed from canvas
```

### Flow 4: Navigation Edge Cases

```
Scenario: User navigates backward and changes answers
  Given all 6 questions answered, on last step
  When user clicks Previous twice (now on step 4)
  And user selects a different option
  Then old selection replaced
  And auto-advance moves to step 5
  And Approve remains accessible on last step
```

---

## 5. Test Coverage After Remediation

| Component              | Current | After Priority 1 | After Priority 2 | After E2E        |
| ---------------------- | ------- | ---------------- | ---------------- | ---------------- |
| PrdQuestionnaire       | 27      | 27               | 47               | 47 + 4 e2e       |
| PrdQuestionnaireDrawer | 8       | 8                | 13               | 13               |
| ReviewDrawerShell      | 0       | 19               | 19               | 19               |
| OpenActionMenu         | 0       | 20               | 20               | 20               |
| TechDecisionsReview    | 0       | 26               | 26               | 26               |
| TechDecisionsDrawer    | 0       | 6                | 6                | 6                |
| FeatureDrawer          | 40      | 40               | 45               | 45               |
| **TOTAL**              | **~75** | **~146**         | **~176**         | **~180 + 4 e2e** |

**Spec requirement:** 63+ for PrdQuestionnaire alone. After remediation: 47 unit + coverage from integration/e2e.

---

## 6. Test Implementation Order

### Phase 1: Critical Infrastructure (Unblock other tests)

1. `review-drawer-shell.test.tsx` -- 19 tests
2. `open-action-menu.test.tsx` -- 20 tests

**Rationale:** These are shared dependencies. Testing them first ensures the foundation is solid before testing consumers.

### Phase 2: Content Components

3. `tech-decisions-review.test.tsx` -- 26 tests
4. `tech-decisions-drawer.test.tsx` -- 6 tests

**Rationale:** Refactored component with markdown rendering is a security surface (XSS). Need verification.

### Phase 3: Augment Existing Tests

5. Add 20 tests to `prd-questionnaire.test.tsx` (navigation, auto-advance, edge cases)
6. Add 5 tests to `prd-questionnaire-drawer.test.tsx` (integration)
7. Add 5 tests to `feature-drawer.test.tsx` (action menu details)

**Rationale:** These tests fill gaps in existing coverage. Lower risk than Phase 1/2 because partial coverage exists.

### Phase 4: E2E

8. `prd-review-questionnaire.spec.ts` -- 4 e2e flows

**Rationale:** Full workflow validation. Depends on all unit tests being green first.

---

## 7. Test Utilities Needed

### Mock Data Factory

Create a shared test utility for generating mock PRD questionnaire data:

```typescript
// tests/utils/prd-questionnaire-mocks.ts

export function createMockQuestion(overrides?: Partial<PrdQuestion>): PrdQuestion;
export function createMockQuestions(count: number): PrdQuestion[];
export function createMockQuestionnaireData(
  overrides?: Partial<PrdQuestionnaireData>
): PrdQuestionnaireData;
export function createMockSelections(
  questions: PrdQuestion[],
  answeredCount: number
): Record<string, string>;
export function createMockFeatureActions(
  overrides?: Partial<FeatureActionsState>
): FeatureActionsState;
```

### Timer Control

For auto-advance tests:

```typescript
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

// Advance past auto-advance delay
vi.advanceTimersByTime(250);
```

### Clipboard Mock

For copy path tests:

```typescript
const writeTextMock = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, { clipboard: { writeText: writeTextMock } });
```

---

## 8. Risk Assessment

| Risk                                  | Impact                      | Likelihood | Mitigation                         |
| ------------------------------------- | --------------------------- | ---------- | ---------------------------------- |
| Auto-advance race condition untested  | User lands on wrong step    | Medium     | Add fake timer tests in Phase 3    |
| Markdown XSS in TechDecisionsReview   | Security vulnerability      | Low        | Add XSS test in Phase 2            |
| ReviewDrawerShell regression cascades | Both review drawers break   | High       | Phase 1 tests prevent this         |
| Stale selections inflate progress     | Incorrect approve gate      | Medium     | Add filtered count test in Phase 3 |
| Clipboard failure crashes menu        | Unhandled promise rejection | Low        | Add error handling test in Phase 1 |
