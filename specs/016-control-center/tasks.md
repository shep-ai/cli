## Status

- **Phase:** Implementation
- **Updated:** 2026-02-12

## Task List

### Phase 1: Foundation

- [ ] **task-1**: Scaffold control-center directory structure
  - Create `features/control-center/` with 7 files (component, hook, toolbar, detail panel, status bar, stories, index)
  - Add minimal type-safe placeholder exports
  - Verify `pnpm typecheck:web` passes

### Phase 2: Existing Component Updates [P]

#### 2A: FeatureNode Selected Highlight

**RED (Write Failing Tests First):**

- [ ] Write test: FeatureNode renders `ring-2 ring-primary` when `selected=true`
- [ ] Write test: FeatureNode does NOT render ring classes when `selected=false`

**GREEN (Implement to Pass Tests):**

- [ ] Add conditional `cn()` class for ring highlight keyed on `selected` prop

**REFACTOR (Clean Up):**

- [ ] Verify ring integrates with existing `border-l-4` styles
- [ ] Add Selected story variant to `feature-node.stories.tsx`

#### 2B: FeaturesCanvas Interaction Callbacks

**RED (Write Failing Tests First):**

- [ ] Write test: FeaturesCanvas accepts and passes `onNodeClick` prop
- [ ] Write test: FeaturesCanvas accepts and passes `onPaneClick` prop

**GREEN (Implement to Pass Tests):**

- [ ] Add `onNodeClick` and `onPaneClick` to `FeaturesCanvasProps`
- [ ] Pass callbacks through to `<ReactFlow>` component

**REFACTOR (Clean Up):**

- [ ] Update type exports in index.ts
- [ ] Add Interactive story variant

### Phase 3: State Management Hook

**RED (Write Failing Tests First):**

- [ ] Write test: returns selectedNode when FeatureNode selected
- [ ] Write test: returns null when no selection
- [ ] Write test: isDetailPanelOpen true when FeatureNode selected
- [ ] Write test: isDetailPanelOpen false when RepositoryNode selected
- [ ] Write test: featureSummary computes correct counts
- [ ] Write test: featureSummary returns zeros when no features
- [ ] Write test: Escape key clears selection

**GREEN (Implement to Pass Tests):**

- [ ] Implement `useOnSelectionChange` for selection tracking
- [ ] Derive `isDetailPanelOpen` from selection type
- [ ] Compute `featureSummary` via `useMemo`
- [ ] Add `useEffect` with keydown listener for Escape

**REFACTOR (Clean Up):**

- [ ] Extract `computeFeatureSummary` as pure helper
- [ ] Ensure all callbacks properly memoized

### Phase 4: Sub-components [P]

#### 4A: ControlCenterToolbar

**RED:**

- [ ] Write test: renders Add Feature button
- [ ] Write test: renders Auto-Layout button (disabled)
- [ ] Write test: calls onAddFeature callback

**GREEN:**

- [ ] Implement toolbar with Panel, Button, Lucide icons

**REFACTOR:**

- [ ] Add Storybook stories (Default, WithCallbacks)

#### 4B: ControlCenterDetailPanel

**RED:**

- [ ] Write test: renders feature name when open
- [ ] Write test: renders lifecycle and state when open
- [ ] Write test: does not show content when closed
- [ ] Write test: calls onClose when close button clicked
- [ ] Write test: renders description when provided

**GREEN:**

- [ ] Implement panel with feature info, close button, CSS transitions

**REFACTOR:**

- [ ] Add Storybook stories (Open, Closed, WithDescription, RunningState, ErrorState)
- [ ] Reuse colors from feature-node-state-config

#### 4C: ControlCenterStatusBar

**RED:**

- [ ] Write test: renders total feature count
- [ ] Write test: renders state breakdown counts
- [ ] Write test: renders "No features" when empty

**GREEN:**

- [ ] Implement status bar with summary and state badges

**REFACTOR:**

- [ ] Add Storybook stories (Empty, WithFeatures, MixedStates)

### Phase 5: Orchestrator Integration

**RED:**

- [ ] Write test: renders FeaturesCanvas with nodes and edges
- [ ] Write test: renders toolbar panel
- [ ] Write test: renders status bar panel
- [ ] Write test: shows detail panel when node selected
- [ ] Write test: hides detail panel when selection cleared
- [ ] Write test: passes onAddFeature to toolbar

**GREEN:**

- [ ] Compose all sub-components in ControlCenter
- [ ] Wire useControlCenterState hook
- [ ] Connect callbacks and state

**REFACTOR:**

- [ ] Add comprehensive Storybook stories (Empty, WithFeatures, SelectedNode, WithToolbar)
- [ ] Verify no unnecessary re-renders

### Phase 6: Build Validation

- [ ] `pnpm lint:web` passes
- [ ] `pnpm typecheck:web` passes
- [ ] `pnpm build:storybook` passes
- [ ] `pnpm build:web` passes
- [ ] All unit tests pass (`pnpm test:unit`)

## TDD Notes

- **MANDATORY**: All phases with code follow RED -> GREEN -> REFACTOR
- **RED**: Write failing tests FIRST (never skip this!)
- **GREEN**: Write minimal code to pass tests
- **REFACTOR**: Improve code while keeping tests green

## Progress Tracking (CRITICAL)

- **Update checkboxes FREQUENTLY** - as soon as each item is complete!
- **Don't batch updates** - check off items immediately, not at the end
- **Commit task.md updates** along with code changes to show progress

## Acceptance Checklist

Before marking feature complete:

- [ ] All 9 tasks completed
- [ ] Tests passing (`pnpm test`)
- [ ] Linting clean (`pnpm lint:web`)
- [ ] Types valid (`pnpm typecheck:web`)
- [ ] Storybook builds (`pnpm build:storybook`)
- [ ] Web builds (`pnpm build:web`)
- [ ] Components follow tier import rules (013-ui-arch)
- [ ] PR created and reviewed

---

_Task breakdown for implementation tracking_
