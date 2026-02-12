## Status

- **Phase:** Implementation
- **Updated:** 2026-02-12

## Task List

### Phase 1: Foundation

- [ ] **task-1**: Scaffold control-center directory structure
  - Create `features/control-center/` with 5 files (component, hook, toolbar, stories, index)
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

#### 2B: FeaturesCanvas Interaction and Contextual Add Callbacks

**RED (Write Failing Tests First):**

- [ ] Write test: FeaturesCanvas accepts and passes `onNodeClick` prop
- [ ] Write test: FeaturesCanvas accepts and passes `onPaneClick` prop
- [ ] Write test: FeaturesCanvas wires `onRepositoryAdd` to RepositoryNode `onAdd`
- [ ] Write test: FeaturesCanvas wires `onNodeAction` to FeatureNode `onAction`

**GREEN (Implement to Pass Tests):**

- [ ] Add `onNodeClick`, `onPaneClick`, `onRepositoryAdd`, `onNodeAction` to `FeaturesCanvasProps`
- [ ] Pass `onNodeClick`/`onPaneClick` through to `<ReactFlow>` component
- [ ] Wire `onRepositoryAdd`/`onNodeAction` to nodes in enrichment `useMemo`

**REFACTOR (Clean Up):**

- [ ] Update type exports in index.ts
- [ ] Add Interactive story variant

### Phase 3: State Management Hook (Selection + Contextual Add)

**RED — Selection & Keyboard (Write Failing Tests First):**

- [ ] Write test: returns selectedNode when FeatureNode selected
- [ ] Write test: returns null when no selection
- [ ] Write test: Escape key clears selection

**GREEN — Selection & Keyboard:**

- [ ] Implement `useOnSelectionChange` for selection tracking
- [ ] Add `useEffect` with keydown listener for Escape

**RED — Contextual Add Handlers (Write Failing Tests First):**

- [ ] Write test: `handleAddFeatureToRepo` adds node + edge
- [ ] Write test: `handleAddFeatureToFeature` adds node + edge
- [ ] Write test: `handleAddFeature` adds unconnected node
- [ ] Write test: new node positioned at source.x + 350
- [ ] Write test: new node is auto-selected

**GREEN — Contextual Add Handlers:**

- [ ] Implement add handlers using `useReactFlow` (`addNodes`, `addEdges`, `getNode`)
- [ ] Calculate position from source node position

**REFACTOR (Clean Up):**

- [ ] Ensure all callbacks properly memoized
- [ ] Extract `createDefaultFeatureNode` factory helper
- [ ] Deduplicate add logic between repo/feature handlers

### Phase 4: Toolbar

**RED:**

- [ ] Write test: renders Add Feature button
- [ ] Write test: renders Auto-Layout button (disabled)
- [ ] Write test: calls onAddFeature callback

**GREEN:**

- [ ] Implement toolbar with Panel, Button, Lucide icons

**REFACTOR:**

- [ ] Add Storybook stories (Default, WithCallbacks)

### Phase 5: Orchestrator Integration

**RED:**

- [ ] Write test: renders FeaturesCanvas with nodes and edges
- [ ] Write test: renders toolbar panel
- [ ] Write test: passes onAddFeature to toolbar
- [ ] Write test: wires onRepositoryAdd to FeaturesCanvas
- [ ] Write test: wires onNodeAction to FeaturesCanvas

**GREEN:**

- [ ] Compose all sub-components in ControlCenter
- [ ] Wire useControlCenterState hook
- [ ] Connect callbacks, contextual add handlers, and state

**REFACTOR:**

- [ ] Add comprehensive Storybook stories (Empty, WithFeatures, WithToolbar, WithNodeActions)
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

- [ ] All 7 tasks completed
- [ ] Tests passing (`pnpm test`)
- [ ] Linting clean (`pnpm lint:web`)
- [ ] Types valid (`pnpm typecheck:web`)
- [ ] Storybook builds (`pnpm build:storybook`)
- [ ] Web builds (`pnpm build:web`)
- [ ] Components follow tier import rules (013-ui-arch)
- [ ] PR created and reviewed

---

_Task breakdown for implementation tracking_
