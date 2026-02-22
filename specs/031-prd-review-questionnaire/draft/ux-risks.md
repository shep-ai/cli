# UX & Interaction Risks: PRD Review Questionnaire (Feature 031)

## 1. UX Assessment Matrix

| Aspect                             | Rating | Evidence                                                                                   |
| ---------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| Step progression clarity           | Good   | Step dots + Previous/Next make navigation intuitive                                        |
| Action-required visibility         | Medium | Approve only on last step -- user must navigate there to discover it                       |
| Product vs Tech review distinction | Weak   | Both use identical ReviewDrawerShell chrome. No color/icon/label differentiation in header |
| Processing feedback                | Good   | Indeterminate progress + disabled controls clearly signal "waiting"                        |
| Destructive action safety          | Good   | Delete requires AlertDialog confirmation with feature name                                 |
| Auto-advance discoverability       | Weak   | 250ms auto-advance has no visual cue. User may be surprised.                               |
| Error recovery                     | Weak   | No error states for failed refinements, failed actions, or network issues                  |
| Undo/rollback capability           | None   | No undo for selections. No way to clear an answer.                                         |

---

## 2. Interaction Risks

### UX-01: Auto-Advance Interrupts Reading (High)

**Problem:** After selecting an option, the user has only 250ms before being moved to the next step. This is faster than most users can read the rationale of their selected option or review remaining options on that step.

**Impact:** Users feel rushed. They can't confirm they made the right choice before being moved away. Creates anxiety about selection accuracy.

**Evidence:** 250ms is approximately the time for a single eye saccade. Most users need 1-2 seconds to process a selection confirmation visually.

**Suggestions:**

1. Increase delay to 600-800ms (allows visual confirmation)
2. Show a brief "Selected!" micro-animation during the delay
3. Don't auto-advance at all -- let user click Next
4. Make auto-advance configurable or disable on first use until user discovers it

---

### UX-02: No Summary Before Approve (High)

**Problem:** Before approving requirements, users cannot see all their selections at once. They must navigate step-by-step to review. The Approve button appears on the last step with no overview of all previous answers.

**Impact:** Users approve without full confidence. In an SDLC tool where requirements drive everything downstream, this creates a high-cost mistake surface.

**Suggestions:**

1. Add a summary/review step after the last question showing all selections
2. Show a compact sidebar with all Q&A pairs visible while on the last step
3. Add a "Review All" button that opens a modal with all answers before approving
4. At minimum, show the answered count and unanswered count near the Approve button

---

### UX-03: Skip Has No Warning (High)

**Problem:** Skipping a question moves forward with no indication that unanswered questions block approval. User may skip several questions, reach the last step, find Approve disabled, and not understand why.

**Impact:** Confusion. User has to backtrack through all steps to find which ones they skipped. Step dots differentiate answered/unanswered but the dots are small and the color difference is subtle.

**Suggestions:**

1. Show a warning when skipping: "Skipping -- you'll need to answer this before approving"
2. Add an unanswered counter: "3 of 6 answered" near navigation
3. Make unanswered step dots more visually distinct (e.g., hollow with border vs filled)
4. On the last step, show which questions are unanswered with links to jump there

---

### UX-04: Refinement Feedback is Opaque (Medium)

**Problem:** After submitting a chat refinement, the only feedback is the processing animation. User doesn't know: What changed? Which questions were affected? Were new options added? Were questions restructured?

**Impact:** User has to manually compare before/after by navigating through all steps. The `isNew` badge helps for new options but doesn't cover modified questions, removed options, or reordered items.

**Suggestions:**

1. After refinement, show a brief changelog: "2 questions updated, 1 new option added"
2. Auto-navigate to the first changed question
3. Highlight changed questions in the step dots (e.g., pulsing dot)
4. Show a diff view or "What changed" summary panel

---

### UX-05: Product vs Tech Review Indistinguishable (Medium)

**Problem:** PrdQuestionnaireDrawer and TechDecisionsDrawer both use ReviewDrawerShell with identical visual chrome. The only difference is the content inside. A user switching between the two may not immediately know which review type they're looking at.

**Impact:** Cognitive overhead. In a workflow where both reviews may be required for the same feature, users could confuse which one they've already approved.

**Suggestions:**

1. Color-code the drawer header (e.g., amber for PRD, blue for Tech)
2. Add a review type label/badge in the header ("PRD Review" vs "Tech Review")
3. Use different icons in the drawer header per review type
4. Apply subtle background tint to the entire drawer based on type

---

### UX-06: No Undo for Selections (Medium)

**Problem:** Once a user selects an option and auto-advances, the only way to change it is to navigate back. There's no "clear selection" action, no undo shortcut, no reset button.

**Impact:** If a user accidentally clicks the wrong option, they must: notice the mistake (hard in 250ms), navigate back, select the correct option, and navigate forward again. The cognitive load of error recovery is high relative to the cost of the error.

**Suggestions:**

1. Add a "Clear" or "Reset" action per question (small X next to selected option)
2. Add Ctrl+Z / Cmd+Z keyboard shortcut for undo
3. Show selected option with a subtle "click to change" affordance on revisit
4. After auto-advance, show a toast: "Selected B. Undo?" with a brief window

---

### UX-07: Fixed Drawer Width (Medium)

**Problem:** ReviewDrawerShell is hardcoded to `w-xl` width. On smaller screens, split-screen setups, or when the canvas behind the drawer needs to remain visible, this may consume too much horizontal space.

**Impact:** On 1280px screens, `w-xl` (576px) takes ~45% of viewport. Users can't see the feature canvas while reviewing.

**Suggestions:**

1. Use responsive width: `max-w-xl w-full md:w-xl`
2. Add a resize handle for user-adjustable width
3. Consider a min-width with flexible max
4. On mobile, use full-screen sheet instead of side drawer

---

### UX-08: No Keyboard Shortcuts (Low)

**Problem:** No keyboard shortcuts for common actions. Navigation requires mouse clicks on Previous/Next or small step dots.

**Impact:** Power users (developers) expect keyboard-first interactions. Clicking tiny step dots is imprecise.

**Suggestions:**

1. Left/Right arrow keys for Previous/Next step navigation
2. Number keys (1-9) to jump to specific steps
3. Enter to confirm selection (select focused option)
4. Escape to close drawer
5. Ctrl+Enter to submit chat refinement

---

### UX-09: Processing State Doesn't Block Drawer Close (Medium)

**Problem:** When `isProcessing=true`, all controls inside PrdQuestionnaire are disabled. But the drawer close button (X) is in ReviewDrawerShell -- a different component scope. The close button is NOT disabled during processing.

**Impact:** User can close drawer while AI is refining, losing the processing context. When they reopen, `currentStep` resets to 0 (remount), and the processing state may or may not persist depending on parent state management.

**Suggestions:**

1. Pass `isProcessing` to ReviewDrawerShell and disable close during processing
2. Show a warning on close during processing: "AI is refining requirements. Close anyway?"
3. Keep processing state visible after reopen via parent state persistence

---

## 3. Cognitive Load Analysis

### Information Hierarchy

```
Drawer Header
  Feature Name                    -- Clear, prominent
  Feature ID (sr-only)            -- Hidden (accessibility only)
  Action Menu (dropdown)          -- Compact, discoverable on click
  Delete (inline icon)            -- Subtle, requires confirmation

Questionnaire Area
  Question Text                   -- Primary focus, font-semibold
  Step Dots (top-right)           -- Secondary, small, requires squinting
  Option Buttons                  -- Dominant interactive element
    Letter Prefix (A, B, C)       -- Clear ordering cue
    Label                         -- Scannable
    Badges (Recommended, New)     -- Visual pop, draws attention
    Rationale                     -- Secondary, muted, easy to skip

Navigation Bar
  Previous / Next-Skip / Approve  -- Clear primary action
  Progress Bar                    -- Subtle, auto-hides

Action Bar (bottom)
  Chat Input                      -- Clear affordance
  Send Button                     -- Minimal
```

**Assessment:** The hierarchy is mostly good. Primary issue is that **step dots are too small and subtle** for their importance (they're the only way to see overall progress at a glance and navigate directly).

### Visual State Distinctness

| State                     | Visual Signal                         | Distinct?                               |
| ------------------------- | ------------------------------------- | --------------------------------------- |
| Default option            | `border-slate-200` or `border-border` | Yes -- neutral                          |
| Selected option           | `border-primary bg-primary/5`         | Yes -- clear highlight                  |
| Recommended option        | Badge "AI Recommended"                | Yes -- badge pops                       |
| New option                | Badge "New" (emerald) + animation     | Yes -- animation draws eye              |
| Disabled (processing)     | Grayed out, pointer-events-none       | Yes -- clearly disabled                 |
| Active step dot           | Wider (`w-4`), `bg-primary`           | Subtle -- easy to miss among small dots |
| Answered step dot         | `bg-primary/50`                       | Subtle -- similar to active but dimmer  |
| Unanswered step dot       | `bg-muted-foreground/25`              | Very subtle -- nearly invisible         |
| Progress bar (partial)    | Colored fill bar, `opacity-100`       | Yes -- visible                          |
| Progress bar (hidden)     | `opacity-0`                           | Correct -- intentionally invisible      |
| Progress bar (processing) | Indeterminate animation               | Yes -- clear movement                   |

**Key Finding:** Step dot differentiation between active, answered, and unanswered is the weakest visual signal in the entire component. Users rely on these dots to understand overall progress, but the differences are subtle (size + opacity variations on tiny elements).

---

## 4. Accessibility Risks

| Risk                                | Severity | Details                                                                                                                                                                  |
| ----------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Focus management after auto-advance | High     | After 250ms auto-advance, where does focus go? If it stays on the now-invisible previous option, keyboard users are lost. Focus should move to first option of new step. |
| Step dot size (click target)        | Medium   | Step dots are very small (`w-1.5` / `w-4` for active). Touch targets below 44x44px WCAG guideline.                                                                       |
| Screen reader step announcements    | Medium   | When step changes, is the new question text announced? Needs `aria-live` region or focus management.                                                                     |
| Color-only state indication         | Medium   | Selected state uses `border-primary bg-primary/5`. Users with color vision deficiency may not distinguish selected from unselected. Consider adding a checkmark or icon. |
| Processing state announcement       | Low      | When `isProcessing` toggles, screen reader users need an announcement.                                                                                                   |

---

## 5. Recommendations Priority

| Priority | Recommendation                             | Effort  | Impact                                                  |
| -------- | ------------------------------------------ | ------- | ------------------------------------------------------- |
| 1        | Add summary/review step before Approve     | Medium  | High -- reduces incorrect approvals                     |
| 2        | Increase auto-advance delay to 600ms       | Trivial | High -- reduces accidental advances                     |
| 3        | Show unanswered count near Approve button  | Low     | High -- eliminates "why is Approve disabled?" confusion |
| 4        | Differentiate PRD vs Tech drawer headers   | Low     | Medium -- reduces review type confusion                 |
| 5        | Add keyboard navigation (arrows for steps) | Low     | Medium -- power user productivity                       |
| 6        | Improve step dot visual distinctness       | Low     | Medium -- better progress visibility                    |
| 7        | Add focus management after auto-advance    | Low     | Medium -- accessibility compliance                      |
| 8        | Show refinement changelog                  | Medium  | Medium -- reduces post-refinement confusion             |
| 9        | Disable drawer close during processing     | Trivial | Medium -- prevents lost processing context              |
| 10       | Add undo for selections                    | Medium  | Low -- nice-to-have                                     |
