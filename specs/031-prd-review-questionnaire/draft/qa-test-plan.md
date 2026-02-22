# QA Test Plan: PRD Review Questionnaire (Feature 031)

## 1. Feature Understanding

### What This Feature Does

A **multi-step PRD questionnaire wizard** for the requirements discovery phase of an AI-native SDLC application. The AI agent generates structured questions with multiple-choice options and AI recommendations. The user reviews them one at a time in a wizard, refines via chat, then approves to finalize requirements.

### Components Delivered

| Component              | Type         | Location                        | Purpose                                                                         |
| ---------------------- | ------------ | ------------------------------- | ------------------------------------------------------------------------------- |
| PrdQuestionnaire       | New (Tier 1) | `common/prd-questionnaire/`     | Multi-step wizard: one question per step, auto-advance, step dots, approve gate |
| PrdQuestionnaireDrawer | New (Tier 1) | `common/prd-questionnaire/`     | Right-slide drawer wrapping the questionnaire                                   |
| ReviewDrawerShell      | New (Tier 1) | `common/review-drawer-shell/`   | Reusable drawer container shared by PRD + Tech Decisions                        |
| OpenActionMenu         | New (Tier 1) | `common/open-action-menu/`      | Dropdown for IDE/Shell/Specs/Copy actions                                       |
| TechDecisionsReview    | Modified     | `common/tech-decisions-review/` | Enhanced with markdown rationale + collapsible alternatives                     |
| TechDecisionsDrawer    | Modified     | `common/tech-decisions-review/` | Refactored to use ReviewDrawerShell                                             |
| FeatureDrawer          | Modified     | `common/feature-drawer/`        | Refactored to use OpenActionMenu                                                |

### Primary Persona

Developer using the system to **review AI-generated requirements** before implementation begins.

### Core Lifecycle Context

The questionnaire appears during the **Requirements** phase. Approval transitions the feature forward. This is a **gating interaction** -- mistakes here propagate downstream to planning, implementation, and review.

---

## 2. Critical Workflows

| #   | Workflow                                                     | Criticality | Description                                                           |
| --- | ------------------------------------------------------------ | ----------- | --------------------------------------------------------------------- |
| W1  | Step-by-step question answering with auto-advance            | Critical    | User selects option, auto-advances 250ms later                        |
| W2  | Navigate back to change previous answer                      | Critical    | Previous button or step dot click to revisit                          |
| W3  | Chat refinement -> AI updates questions -> re-answer         | Critical    | Submit text, processing state, new questions appear with isNew badges |
| W4  | Approve all requirements (gating action)                     | Critical    | Only enabled on last step when ALL questions answered                 |
| W5  | Open drawer -> review -> close without approving             | High        | Non-destructive exit path                                             |
| W6  | Delete feature from drawer while reviewing                   | High        | Destructive action with confirmation dialog                           |
| W7  | Open in IDE/Shell/Specs from action menu                     | Medium      | External tool integration                                             |
| W8  | Tech decisions review with markdown + collapsed alternatives | Medium      | Markdown rendering and toggle behavior                                |
| W9  | Copy repository path to clipboard                            | Low         | Clipboard API with 2s feedback                                        |

---

## 3. Manual Test Matrix

### 3.1 PrdQuestionnaire -- Rendering & Layout

| ID   | Scenario                             | Preconditions                    | Steps                  | Expected Result                                                                                                                             | Risk   |
| ---- | ------------------------------------ | -------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| R-01 | Initial render with 6 questions      | Drawer open, no selections       | Open questionnaire     | First question displayed. 6 step dots: first is active (wider, `bg-primary`), rest dim (`bg-muted-foreground/25`). No progress bar visible. | Low    |
| R-02 | Options display with letter prefixes | First question with 4 options    | Inspect option buttons | Each option shows A, B, C, D prefix in mono font. Label bold. Rationale text below in muted color.                                          | Low    |
| R-03 | "AI Recommended" badge               | Option has `recommended: true`   | Inspect option         | Badge reads "AI Recommended" at `text-[10px]` size. Visible regardless of selection state.                                                  | Low    |
| R-04 | "New" badge with animation           | Option has `isNew: true`         | Inspect option         | Badge "New" with `bg-emerald-600 text-white`. Green highlight animation pulses once (1.5s ease-out from emerald-50 to transparent).         | Medium |
| R-05 | Empty questions array                | `data.questions = []`            | Render component       | Component returns `null`. Nothing rendered. No console errors.                                                                              | Medium |
| R-06 | Single question                      | Only 1 question in array         | Render component       | No Previous button. No Next/Skip. Only Approve button (disabled until answered). 1 active dot.                                              | Medium |
| R-07 | Header hidden (default)              | `showHeader=false` (default)     | Render component       | No header block. No amber dot, no title, no context text.                                                                                   | Low    |
| R-08 | Header visible                       | `showHeader=true`                | Render component       | Header: amber status dot (`bg-amber-500`), question title (`font-bold`), context text (`text-muted-foreground`), bottom border separator.   | Low    |
| R-09 | Progress bar hidden at start         | No selections, not processing    | Inspect bottom bar     | Progress bar `opacity-0`. Chat input and send button visible.                                                                               | Low    |
| R-10 | Long option text (200+ chars)        | Option label/rationale very long | Inspect layout         | Text wraps cleanly. No horizontal overflow. Badges not clipped.                                                                             | Medium |

### 3.2 PrdQuestionnaire -- Selection & Navigation

| ID   | Scenario                               | Preconditions                 | Steps                                    | Expected Result                                                                                                           | Risk     |
| ---- | -------------------------------------- | ----------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------- |
| N-01 | Select an option                       | Step 1, no selection          | Click option B                           | Option B highlighted (`border-primary bg-primary/5`). `onSelect(qId, optId)` fires. After 250ms, auto-advances to step 2. | Critical |
| N-02 | Auto-advance timing                    | Step 1, no selection          | Click option, measure delay              | 250ms delay before advancing. Selected option highlighted during delay.                                                   | High     |
| N-03 | No auto-advance on last step           | On step 6 of 6                | Select option                            | Highlighted. No advance. Approve button becomes enabled (if all now answered).                                            | Critical |
| N-04 | Change selection on current step       | Step 1, option A selected     | Click option C                           | A deselected. C highlighted. `onSelect` fires. Auto-advance re-triggers (250ms).                                          | High     |
| N-05 | Previous button navigates back         | On step 3                     | Click Previous                           | Step 2 displayed. Selection still visible. Previous still enabled.                                                        | High     |
| N-06 | Previous disabled on step 1            | On step 1                     | Inspect Previous button                  | Disabled. Not clickable. Visually dimmed.                                                                                 | Medium   |
| N-07 | Next button (answered question)        | Step 2 answered, not last     | Inspect nav                              | Button reads "Next". Click advances to step 3.                                                                            | Medium   |
| N-08 | Skip button (unanswered question)      | Step 2 NOT answered, not last | Inspect nav                              | Button reads "Skip". Click advances to step 3 without selection.                                                          | High     |
| N-09 | Step dot click navigation              | 6 dots visible, on step 1     | Click dot 4                              | Navigates to step 4. Active dot shifts. Previous dots show answered/unanswered states.                                    | High     |
| N-10 | Step dot visual states                 | 3 of 6 answered, on step 4    | Inspect dots                             | Answered: `bg-primary/50`. Active (4): wider `w-4`, `bg-primary`. Unanswered: `bg-muted-foreground/25`.                   | Medium   |
| N-11 | Rapid double-click on option           | Step 1                        | Double-click option A                    | Only ONE `onSelect` fires. Only ONE auto-advance. No step skipping.                                                       | High     |
| N-12 | Click option then immediately Previous | Step 2                        | Click option, then Previous within 250ms | Manual nav should win. User on step 1, NOT step 3.                                                                        | Critical |

### 3.3 PrdQuestionnaire -- Approve Gate

| ID   | Scenario                            | Preconditions                     | Steps                    | Expected Result                                    | Risk     |
| ---- | ----------------------------------- | --------------------------------- | ------------------------ | -------------------------------------------------- | -------- |
| A-01 | Approve only on last step           | On step 6 of 6                    | Inspect nav area         | Approve button visible. No Next/Skip.              | Critical |
| A-02 | Approve disabled (not all answered) | 5 of 6 answered, on last step     | Inspect Approve          | Disabled. Not clickable.                           | Critical |
| A-03 | Approve enabled (all answered)      | All 6 answered, on last step      | Inspect Approve          | Enabled. Shows `finalAction.label` + Check icon.   | Critical |
| A-04 | Approve fires callback              | All answered, click Approve       | Click                    | `onApprove(finalAction.id)` fires with correct ID. | Critical |
| A-05 | Approve absent on non-last steps    | Step 3, all answered              | Inspect nav              | Shows Next, NOT Approve.                           | High     |
| A-06 | Navigate away and back to last step | All answered, last step, Previous | Click Previous then Next | Approve still enabled. Selections preserved.       | Medium   |

### 3.4 PrdQuestionnaire -- Progress Bar

| ID   | Scenario                  | Preconditions        | Steps            | Expected Result                                                                  | Risk   |
| ---- | ------------------------- | -------------------- | ---------------- | -------------------------------------------------------------------------------- | ------ |
| P-01 | No selections             | Fresh questionnaire  | Inspect progress | `opacity-0` (hidden). Width 0%.                                                  | Low    |
| P-02 | Partial (3/6)             | 3 questions answered | Inspect progress | `opacity-100` (visible). Width 50%. Smooth CSS transition.                       | Medium |
| P-03 | All (6/6)                 | All answered         | Inspect progress | `opacity-0` (hidden). Width 100%.                                                | Medium |
| P-04 | Processing state          | `isProcessing=true`  | Inspect progress | `opacity-100`. Indeterminate sweep animation (infinite).                         | High   |
| P-05 | Partial to all transition | 5/6 answered         | Answer last      | Width transitions 83% -> 100%, then fades out (`opacity-0` with `duration-200`). | Medium |

### 3.5 PrdQuestionnaire -- Chat Refinement

| ID   | Scenario                         | Preconditions                    | Steps         | Expected Result                                               | Risk   |
| ---- | -------------------------------- | -------------------------------- | ------------- | ------------------------------------------------------------- | ------ |
| C-01 | Submit via Send button           | Type "Add security requirements" | Click Send    | `onRefine("Add security requirements")` fires. Input clears.  | High   |
| C-02 | Submit via Enter key             | Type text                        | Press Enter   | Same as C-01.                                                 | High   |
| C-03 | Empty submit blocked             | Input empty                      | Click Send    | Nothing happens. `onRefine` NOT fired.                        | Medium |
| C-04 | Input disabled during processing | `isProcessing=true`              | Try typing    | Input disabled. Send disabled.                                | High   |
| C-05 | Aria label present               | Render                           | Inspect input | `aria-label="Ask AI to refine requirements"`.                 | Low    |
| C-06 | Long input text (500+ chars)     | Type very long text              | Submit        | `onRefine` fires with full text. No truncation. Input clears. | Medium |

### 3.6 PrdQuestionnaire -- Processing State

| ID    | Scenario                 | Preconditions                     | Steps                    | Expected Result                                                        | Risk     |
| ----- | ------------------------ | --------------------------------- | ------------------------ | ---------------------------------------------------------------------- | -------- |
| PR-01 | All options disabled     | `isProcessing=true`               | Click any option         | All disabled. No selection change. No callback.                        | Critical |
| PR-02 | Navigation disabled      | `isProcessing=true`               | Click Previous/Next/Skip | All disabled. Step dots non-interactive.                               | Critical |
| PR-03 | Approve disabled         | `isProcessing=true`, all answered | Click Approve            | Disabled.                                                              | Critical |
| PR-04 | Chat disabled            | `isProcessing=true`               | Type, click Send         | Input disabled. Send disabled.                                         | High     |
| PR-05 | Visual indicator         | `isProcessing=true`               | Observe                  | Indeterminate progress animation visible.                              | Medium   |
| PR-06 | Recovery from processing | false -> true -> false            | Observe                  | All controls re-enabled. Selections preserved. Current step preserved. | Critical |

### 3.7 ReviewDrawerShell

| ID   | Scenario                   | Preconditions                        | Steps             | Expected Result                                                      | Risk     |
| ---- | -------------------------- | ------------------------------------ | ----------------- | -------------------------------------------------------------------- | -------- |
| D-01 | Drawer opens right-side    | `open=true`                          | Observe           | Slides from right. Width `w-xl`. Non-modal (background interactive). | High     |
| D-02 | Close button               | Drawer open                          | Click X top-right | `onClose()` fires. Drawer slides closed.                             | High     |
| D-03 | Header with feature name   | Drawer open                          | Inspect header    | Feature name as title.                                               | Low      |
| D-04 | Feature ID sr-only         | Drawer with featureId                | Inspect DOM       | Feature ID present, screen-reader only.                              | Low      |
| D-05 | Action menu shown          | `repositoryPath` + `branch` provided | Inspect header    | OpenActionMenu trigger visible.                                      | Medium   |
| D-06 | Action menu hidden         | No `repositoryPath`                  | Inspect header    | No OpenActionMenu.                                                   | Medium   |
| D-07 | Delete button shown        | `onDelete` + `featureId` provided    | Inspect header    | Trash icon button visible.                                           | High     |
| D-08 | Delete button hidden       | No `onDelete`                        | Inspect header    | No delete button.                                                    | Medium   |
| D-09 | Delete confirmation dialog | Click delete                         | Observe           | AlertDialog with feature name/ID. Cancel + Delete buttons.           | Critical |
| D-10 | Delete cancel              | In dialog, click Cancel              | Observe           | Dialog closes. `onDelete` NOT called. Feature still visible.         | Critical |
| D-11 | Delete confirm             | In dialog, click Delete              | Observe           | `onDelete(featureId)` fires.                                         | Critical |
| D-12 | Delete loading             | `isDeleting=true`                    | Inspect           | Spinner on button. Cancel + Delete disabled.                         | High     |
| D-13 | Children rendered          | Content as children                  | Inspect           | Children visible below separator. Scrollable on overflow.            | Medium   |
| D-14 | Separator visible          | Drawer with actions + content        | Inspect           | Separator line between actions and content.                          | Low      |

### 3.8 OpenActionMenu

| ID   | Scenario                 | Preconditions       | Steps                | Expected Result                                                         | Risk   |
| ---- | ------------------------ | ------------------- | -------------------- | ----------------------------------------------------------------------- | ------ |
| M-01 | Dropdown opens           | Click trigger       | Observe              | 4 items: IDE, Terminal, Specs Folder, Copy path. Separator before Copy. | Medium |
| M-02 | Open in IDE              | Menu open           | Click "IDE"          | `actions.openInIde()` fires. Menu closes.                               | Medium |
| M-03 | Open in Terminal         | Menu open           | Click "Terminal"     | `actions.openInShell()` fires.                                          | Medium |
| M-04 | Open Specs Folder        | `showSpecs=true`    | Click "Specs Folder" | `actions.openSpecsFolder()` fires.                                      | Medium |
| M-05 | Specs disabled           | `showSpecs=false`   | Inspect item         | Disabled. Not clickable. Visually dimmed.                               | Medium |
| M-06 | Copy path with feedback  | Menu open           | Click "Copy path"    | Clipboard write. Check icon + "Copied!" for 2s. Reverts.                | High   |
| M-07 | Loading state on trigger | Any action loading  | Inspect trigger      | Loader2 spinner. Button disabled.                                       | Medium |
| M-08 | Error state on trigger   | Action error set    | Inspect trigger      | CircleAlert icon (red).                                                 | Medium |
| M-09 | Per-item loading         | `shellLoading=true` | Open menu            | Terminal item shows spinner. Others normal.                             | Medium |
| M-10 | Per-item error           | `ideError` set      | Open menu            | IDE item shows CircleAlert.                                             | Medium |
| M-11 | Keyboard navigation      | Menu open           | Arrow Down, Enter    | Navigates items. Enter selects.                                         | Medium |

### 3.9 TechDecisionsReview

| ID   | Scenario                         | Preconditions                   | Steps      | Expected Result                                                           | Risk     |
| ---- | -------------------------------- | ------------------------------- | ---------- | ------------------------------------------------------------------------- | -------- |
| T-01 | Numbered decision cards          | 4 decisions                     | Inspect    | Cards numbered 1-4 in circles. Title + chosen visible.                    | Medium   |
| T-02 | Markdown rationale               | Rationale has bold, lists, code | Inspect    | Bold rendered. Lists indented. Code blocks `bg-muted`.                    | High     |
| T-03 | Links in markdown                | Rationale has `[text](url)`     | Click link | New tab, `noopener noreferrer`.                                           | Medium   |
| T-04 | Collapsed alternatives (default) | 3 rejected alternatives         | Inspect    | "Other Options Considered (3)" visible. Section collapsed. Chevron right. | High     |
| T-05 | Expand alternatives              | Click header                    | Observe    | Section expands. Rejected items shown. Chevron rotates.                   | High     |
| T-06 | Collapse alternatives            | Expanded, click header          | Observe    | Collapses. Chevron reverts.                                               | Medium   |
| T-07 | No alternatives                  | 0 rejected                      | Inspect    | No "Other Options" section at all.                                        | Medium   |
| T-08 | Chat refinement                  | Type text, click refine         | Observe    | `onRefine(text)` fires. Input clears.                                     | High     |
| T-09 | Approve plan                     | Click Approve                   | Observe    | `onApprove()` fires.                                                      | Critical |
| T-10 | Empty decisions                  | `decisions=[]`                  | Render     | Returns `null`. No errors.                                                | Medium   |
| T-11 | Processing state                 | `isProcessing=true`             | Inspect    | Buttons/inputs disabled. Loading indicator.                               | High     |

### 3.10 FeatureDrawer -- OpenActionMenu Integration

| ID   | Scenario                      | Preconditions               | Steps          | Expected Result                                             | Risk   |
| ---- | ----------------------------- | --------------------------- | -------------- | ----------------------------------------------------------- | ------ |
| F-01 | Menu replaces inline buttons  | Drawer open, repo + branch  | Inspect header | OpenActionMenu dropdown. No inline IDE/Shell/Specs buttons. | High   |
| F-02 | Menu hidden without repo info | No repositoryPath           | Inspect        | No action menu.                                             | Medium |
| F-03 | Status/progress still works   | Feature with lifecycle data | Open drawer    | Lifecycle label, state badge, progress bar all correct.     | Medium |
| F-04 | Delete still works            | onDelete provided           | Click delete   | Confirmation -> confirm -> `onDelete` fires.                | High   |
