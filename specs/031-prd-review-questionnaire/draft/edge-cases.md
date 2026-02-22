# Edge Cases & State Transitions: PRD Review Questionnaire (Feature 031)

## 1. Edge Cases

### 1.1 Race Conditions & Timing

| ID   | Edge Case                              | Steps to Reproduce                                                    | Expected Behavior                                                                                  | Risk     | Component         |
| ---- | -------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------- | ----------------- |
| E-01 | Rapid selection cycling                | Click A, immediately B, immediately C on same step                    | Only last selection persists. Only one auto-advance (from final click). No step skipping.          | High     | PrdQuestionnaire  |
| E-02 | Auto-advance vs manual nav race        | Select option on step 3, then click Previous within 250ms             | Manual navigation wins. User lands on step 2, NOT step 4. setTimeout must be cleared.              | Critical | PrdQuestionnaire  |
| E-03 | Processing starts mid-auto-advance     | Select option, `isProcessing` becomes true before 250ms timeout fires | Auto-advance cancelled. Controls disabled. Selection persists.                                     | Critical | PrdQuestionnaire  |
| E-04 | Double-click on Approve                | All answered, rapidly double-click Approve                            | `onApprove` fires exactly once. Button disables after first click (or parent handles idempotency). | High     | PrdQuestionnaire  |
| E-05 | Double-click on Delete confirm         | In delete dialog, double-click Delete                                 | `onDelete` fires exactly once. Buttons disable on first click.                                     | High     | ReviewDrawerShell |
| E-06 | Copy path while clipboard busy         | Click Copy path twice rapidly                                         | First copy completes. Second should either queue or be ignored. No unhandled promise rejection.    | Medium   | OpenActionMenu    |
| E-07 | Refinement submitted during processing | `isProcessing=true`, try to submit (input disabled)                   | Blocked entirely. No callback. Chat input non-interactive.                                         | Medium   | PrdQuestionnaire  |

### 1.2 Data Boundary Conditions

| ID   | Edge Case                             | Steps to Reproduce                                             | Expected Behavior                                                                                                                                                | Risk   | Component           |
| ---- | ------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------- |
| E-08 | Zero questions                        | `data.questions = []`                                          | Returns `null`. No render. No errors.                                                                                                                            | Medium | PrdQuestionnaire    |
| E-09 | Single question                       | 1 question only                                                | No Previous. No Next/Skip. Only Approve (disabled until answered). 1 step dot.                                                                                   | Medium | PrdQuestionnaire    |
| E-10 | 50+ questions                         | Array with 50 questions                                        | Step dots should not overflow container. Navigation works for all steps. Performance acceptable.                                                                 | Medium | PrdQuestionnaire    |
| E-11 | Question with 0 options               | Question has `options: []`                                     | Step renders with question text. No option buttons. Skip available. No crash.                                                                                    | High   | PrdQuestionnaire    |
| E-12 | Question with 1 option                | Single option in question                                      | Renders option A. Selectable. Auto-advance works.                                                                                                                | Low    | PrdQuestionnaire    |
| E-13 | Question with 10+ options             | Many options                                                   | All render with correct letter prefixes (A-J+). Scrollable if overflow.                                                                                          | Medium | PrdQuestionnaire    |
| E-14 | Empty selections object               | `selections = {}`                                              | All questions unanswered. Progress 0%. Approve disabled.                                                                                                         | Low    | PrdQuestionnaire    |
| E-15 | Stale selections (orphaned keys)      | `selections` has keys for question IDs not in `data.questions` | Orphaned keys ignored. `answeredCount` should only count keys matching current questions. **Verify: does current implementation filter or just count all keys?** | High   | PrdQuestionnaire    |
| E-16 | Zero decisions                        | `decisions = []`                                               | Returns `null`. No render. No errors.                                                                                                                            | Medium | TechDecisionsReview |
| E-17 | Decision with 0 rejected alternatives | No rejected items                                              | No "Other Options Considered" section. No chevron.                                                                                                               | Low    | TechDecisionsReview |
| E-18 | Empty rationale string                | `decision.rationale = ""`                                      | No rationale section rendered. No empty markdown block.                                                                                                          | Medium | TechDecisionsReview |

### 1.3 Text & Content Edge Cases

| ID   | Edge Case                           | Steps to Reproduce                            | Expected Behavior                                           | Risk   | Component           |
| ---- | ----------------------------------- | --------------------------------------------- | ----------------------------------------------------------- | ------ | ------------------- |
| E-19 | XSS in option label                 | Option label: `<script>alert('xss')</script>` | Rendered as text. No script execution.                      | High   | PrdQuestionnaire    |
| E-20 | HTML entities in option text        | Label: `&amp; &lt; &gt; "quotes"`             | Rendered correctly as literal characters.                   | Medium | PrdQuestionnaire    |
| E-21 | Markdown injection in rationale     | Rationale with `![img](evil.com)`             | Sanitized. No external image loading.                       | High   | TechDecisionsReview |
| E-22 | Very long feature name (200+ chars) | Feature name overflows drawer header          | Truncates or wraps. Delete/action buttons still accessible. | Medium | ReviewDrawerShell   |
| E-23 | Unicode in option labels            | Emoji, CJK characters, RTL text               | Renders correctly. Layout not broken.                       | Medium | PrdQuestionnaire    |
| E-24 | Very long chat input (1000+ chars)  | Type extremely long refinement text           | Submits successfully. No truncation. Input clears.          | Medium | PrdQuestionnaire    |

### 1.4 Environment & Browser Edge Cases

| ID   | Edge Case                            | Steps to Reproduce                             | Expected Behavior                                                                     | Risk   | Component         |
| ---- | ------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------- | ------ | ----------------- |
| E-25 | Clipboard API unavailable            | HTTP context (non-secure) or denied permission | Copy path fails gracefully. No unhandled rejection. User sees error feedback.         | Medium | OpenActionMenu    |
| E-26 | Browser back during drawer open      | Drawer open, press browser Back                | Drawer closes OR route changes. No white screen. No stale state.                      | High   | ReviewDrawerShell |
| E-27 | Page reload during questionnaire     | Mid-review, reload page                        | State lost (expected for controlled component). Drawer closed. Parent re-initializes. | Medium | PrdQuestionnaire  |
| E-28 | Multiple drawers open simultaneously | Open PRD drawer, then Tech Decisions           | Only one drawer visible. Previous closes. Or clear spec on stacking behavior.         | Medium | ReviewDrawerShell |
| E-29 | Drawer open, data deleted externally | Feature deleted by another tab/process         | Drawer handles gracefully. Close or show error state. No crash on stale data.         | High   | ReviewDrawerShell |

### 1.5 Cross-Component Interaction

| ID   | Edge Case                              | Steps to Reproduce                                 | Expected Behavior                                                                                                                   | Risk     | Component         |
| ---- | -------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------- |
| E-30 | Delete during processing               | `isProcessing=true`, click delete                  | Delete should work (processing = refinement, delete = independent concern). Or should it block? **Ambiguous in spec.**              | High     | ReviewDrawerShell |
| E-31 | Close drawer during processing         | `isProcessing=true`, click X                       | Drawer closes. Processing continues in background (parent responsibility). No visual artifact.                                      | Medium   | ReviewDrawerShell |
| E-32 | Reopen drawer after close              | Close mid-review, reopen                           | State preserved by parent (controlled component). Current step may reset to 0 (internal state). **Verify step reset behavior.**     | High     | PrdQuestionnaire  |
| E-33 | Questions change after refinement      | Parent updates `data.questions` with different IDs | New questions render. `isNew` badges animate. Selections for removed questions orphaned in parent state. **Parent must reconcile.** | Critical | PrdQuestionnaire  |
| E-34 | Action menu during delete confirmation | Delete dialog open, try opening action menu        | Dialog should be modal. Action menu should not be accessible.                                                                       | Medium   | ReviewDrawerShell |

---

## 2. State Transition Diagrams

### 2.1 PrdQuestionnaire State Machine

```
                    +------------------+
                    |  EMPTY (0 qs)    |----> render null
                    +------------------+

+------------------+   select    +------------------+   select all  +------------------+
|  UNANSWERED      |------------>|  PARTIALLY       |-------------->|  ALL ANSWERED    |
|  (step 1)        |             |  ANSWERED         |               |  (last step)     |
|                  |<------------|  (step N)         |<--------------|                  |
|  Progress: 0%    |  Previous   |  Progress: X%     |  change ans   |  Progress: 100%  |
|  Bar: hidden     |             |  Bar: visible     |               |  Bar: hidden     |
|  Nav: Skip       |             |  Nav: Next/Skip   |               |  Nav: Approve    |
+------------------+             +------------------+               +------------------+
       |                                |                                   |
       |        onRefine                |       onRefine                    |   onRefine
       v                                v                                   v
+--------------------------------------------------------------------------+
|  PROCESSING (isProcessing=true)                                          |
|  - ALL controls disabled (options, nav, chat, approve)                   |
|  - Indeterminate progress bar animation                                  |
|  - Selections preserved                                                  |
|  - Current step preserved                                                |
|  - Returns to EXACT previous state when isProcessing=false               |
+--------------------------------------------------------------------------+
```

**Transition Validation Checklist:**

- [ ] UNANSWERED -> PARTIALLY ANSWERED: select fires, progress updates, bar appears
- [ ] PARTIALLY -> ALL ANSWERED: last selection, progress hits 100%, bar hides
- [ ] ALL ANSWERED -> PARTIALLY: change selection via navigate + deselect? (not supported -- single-select means changing, not removing)
- [ ] Any state -> PROCESSING: all controls lock, animation starts
- [ ] PROCESSING -> previous state: exact restoration (step, selections, progress)
- [ ] UNANSWERED -> EMPTY: not possible (questions are immutable props)
- [ ] Any state -> APPROVED: only from ALL ANSWERED via Approve button

### 2.2 ReviewDrawerShell State Machine

```
CLOSED --(open=true)--> OPEN --(X click / onClose)--> CLOSED
                          |
                          +---(click delete)---> CONFIRMING_DELETE
                          |                         |
                          |                    +----+----+
                          |                  Cancel    Confirm
                          |                    |         |
                          |                    v         v
                          |                  OPEN    DELETING (isDeleting=true)
                          |                                |
                          |                          parent closes
                          |                                |
                          |                             CLOSED
                          |
                          +---(action menu)---> MENU_OPEN
                                                    |
                                               action click
                                                    |
                                             EXECUTING_ACTION
                                                    |
                                              success/error
                                                    |
                                                  OPEN
```

**Transition Validation Checklist:**

- [ ] CLOSED -> OPEN: drawer slides in, content rendered
- [ ] OPEN -> CLOSED: drawer slides out, no state leak
- [ ] OPEN -> CONFIRMING: dialog appears, drawer stays open behind
- [ ] CONFIRMING -> OPEN (cancel): dialog dismissed, no side effects
- [ ] CONFIRMING -> DELETING: `onDelete` fires, spinner, buttons disabled
- [ ] DELETING -> CLOSED: parent decides when to close
- [ ] OPEN -> MENU_OPEN: dropdown renders over drawer content
- [ ] MENU_OPEN -> EXECUTING: action fires, menu closes
- [ ] EXECUTING -> OPEN: action completes, drawer returns to normal

### 2.3 OpenActionMenu Copy Path State

```
IDLE --(click Copy)--> COPYING --(success)--> FEEDBACK ("Copied!", 2s) --> IDLE
                          |
                          +---(error)---> ERROR_STATE --> IDLE
```

**Transition Validation Checklist:**

- [ ] IDLE -> COPYING: clipboard write initiated
- [ ] COPYING -> FEEDBACK: Check icon + "Copied!" text for 2000ms
- [ ] FEEDBACK -> IDLE: reverts to default Copy icon + text
- [ ] COPYING -> ERROR: graceful handling if clipboard fails
- [ ] Rapid re-click during FEEDBACK: previous timer cleared, new copy initiated

### 2.4 TechDecisionsReview Alternatives Toggle

```
COLLAPSED (default) --(click header)--> EXPANDED
EXPANDED --(click header)--> COLLAPSED
```

Per-card state. Each card maintains its own collapsed/expanded state independently.

**Validation:**

- [ ] All cards start collapsed
- [ ] Expanding card 2 does not affect card 1
- [ ] Chevron rotates correctly in both directions
- [ ] Animation smooth on expand/collapse

---

## 3. Race Condition Test Scenarios

These scenarios require careful timing control (use `vi.useFakeTimers()` in tests, manual timing in QA):

### RC-01: Auto-Advance vs Previous Button

```
Timeline:
  t=0ms    User clicks option on step 3
  t=100ms  User clicks Previous button
  t=250ms  Auto-advance timeout fires

Expected: User is on step 2 (Previous wins). Auto-advance cancelled.
Risk: If setTimeout not cleared, user jumps to step 4 after 250ms.
```

### RC-02: Auto-Advance vs Step Dot Click

```
Timeline:
  t=0ms    User clicks option on step 2
  t=150ms  User clicks step dot 5
  t=250ms  Auto-advance timeout fires

Expected: User is on step 5 (dot click wins). Auto-advance cancelled.
```

### RC-03: Selection During Processing Transition

```
Timeline:
  t=0ms    isProcessing becomes false (recovery)
  t=10ms   User rapidly clicks option before UI fully re-renders
  t=250ms  Auto-advance fires

Expected: Selection registered. Auto-advance works. No stale processing state.
```

### RC-04: Double Submit Refinement

```
Timeline:
  t=0ms    User types text, clicks Send
  t=50ms   Input clears, onRefine fires
  t=100ms  User clicks Send again (input now empty)

Expected: Second click blocked (empty input). Only one onRefine call.
```

### RC-05: Delete During Action Execution

```
Timeline:
  t=0ms    User clicks "Open in IDE" (action loading)
  t=100ms  User clicks Delete button

Expected: Delete dialog opens. IDE action continues in background.
          Delete confirmation should not be blocked by loading action.
```
