## Status

- **Phase:** Complete
- **Updated:** 2026-02-15

## Task List

### Phase 1: Foundation

- [x] **task-1**: Scaffold control-center directory structure
  - Create `features/control-center/` with 5 files (component, hook, toolbar, stories, index)
  - Add minimal type-safe placeholder exports
  - Verify `pnpm typecheck:web` passes

### Phase 2: Existing Component Updates [P]

#### 2A: FeatureNode Selected Highlight

**RED (Write Failing Tests First):**

- [x] Write test: FeatureNode renders `ring-2 ring-primary` when `selected=true`
- [x] Write test: FeatureNode does NOT render ring classes when `selected=false`

**GREEN (Implement to Pass Tests):**

- [x] Add conditional `cn()` class for ring highlight keyed on `selected` prop

**REFACTOR (Clean Up):**

- [x] Verify ring integrates with existing `border-l-4` styles
- [x] Add Selected story variant to `feature-node.stories.tsx`

#### 2B: FeaturesCanvas Interaction and Contextual Add Callbacks

**RED (Write Failing Tests First):**

- [x]Write test: FeaturesCanvas accepts and passes `onNodeClick` prop
- [x]Write test: FeaturesCanvas accepts and passes `onPaneClick` prop
- [x]Write test: FeaturesCanvas wires `onRepositoryAdd` to RepositoryNode `onAdd`
- [x]Write test: FeaturesCanvas wires `onNodeAction` to FeatureNode `onAction`

**GREEN (Implement to Pass Tests):**

- [x]Add `onNodeClick`, `onPaneClick`, `onRepositoryAdd`, `onNodeAction` to `FeaturesCanvasProps`
- [x]Pass `onNodeClick`/`onPaneClick` through to `<ReactFlow>` component
- [x]Wire `onRepositoryAdd`/`onNodeAction` to nodes in enrichment `useMemo`

**REFACTOR (Clean Up):**

- [x]Update type exports in index.ts
- [x]Add Interactive story variant

### Phase 3: State Management Hook (Selection + Contextual Add)

**RED — Selection & Keyboard (Write Failing Tests First):**

- [x]Write test: returns selectedNode when FeatureNode selected
- [x]Write test: returns null when no selection
- [x]Write test: Escape key clears selection

**GREEN — Selection & Keyboard:**

- [x]Implement `useOnSelectionChange` for selection tracking
- [x]Add `useEffect` with keydown listener for Escape

**RED — Contextual Add Handlers (Write Failing Tests First):**

- [x]Write test: `handleAddFeatureToRepo` adds node + edge
- [x]Write test: `handleAddFeatureToFeature` adds node + edge
- [x]Write test: `handleAddFeature` adds unconnected node
- [x]Write test: new node positioned at source.x + 350
- [x]Write test: new node is auto-selected

**GREEN — Contextual Add Handlers:**

- [x]Implement add handlers using `useReactFlow` (`addNodes`, `addEdges`, `getNode`)
- [x]Calculate position from source node position

**REFACTOR (Clean Up):**

- [x]Ensure all callbacks properly memoized
- [x]Extract `createDefaultFeatureNode` factory helper
- [x]Deduplicate add logic between repo/feature handlers

### Phase 4: Toolbar — REMOVED

~~Toolbar was removed in favor of contextual (+) node actions and empty state CTA
for a cleaner canvas-first UX (task-5 removed).~~

### Phase 5: Orchestrator Integration

**RED:**

- [x]Write test: renders FeaturesCanvas with nodes and edges
- [x]Write test: shows empty state when no nodes provided
- [x]Write test: wires onRepositoryAdd to FeaturesCanvas
- [x]Write test: wires onNodeAction to FeaturesCanvas

**GREEN:**

- [x]Compose all sub-components in ControlCenter
- [x]Wire useControlCenterState hook
- [x]Connect callbacks, contextual add handlers, and state

**REFACTOR:**

- [x]Add comprehensive Storybook stories (Empty, WithFeatures, WithToolbar, WithNodeActions)
- [x]Verify no unnecessary re-renders

### Phase 6: Clean Architecture Data Layer

- [x] Replace lib/shep-data.ts with ListFeaturesUseCase
- [x] page.tsx resolves use case from DI container
- [x] pnpm typecheck passes

### Phase 7: Build Validation

- [x]`pnpm lint:web` passes
- [x]`pnpm typecheck:web` passes
- [x]`pnpm build:storybook` passes
- [x]`pnpm build:web` passes
- [x]All unit tests pass (`pnpm test:unit`)

### Phase 8: Lifecycle Alignment

**RED:**

- [x]Write test: lifecycleDisplayLabels maps maintain to COMPLETED
- [x]Write test: lifecycleDisplayLabels maps deploy to DEPLOY & QA

**GREEN:**

- [x]Update FeatureLifecyclePhase type union (plan→research, test→review, maintenance→maintain)
- [x]Add lifecycleDisplayLabels const in feature-node-state-config.ts
- [x]Update feature-node.tsx to use lifecycleDisplayLabels[data.lifecycle]
- [x]Fix lifecycleMap in page.tsx to 1:1 domain mapping

**REFACTOR:**

- [x]Export lifecycleDisplayLabels from index.ts

### Phase 9: Agent State Integration

**RED:**

- [x]Write test: deriveState returns done for maintain lifecycle
- [x]Write test: deriveState returns done for completed agent status
- [x]Write test: deriveState returns error for failed agent status
- [x]Write test: deriveState returns action-required for waiting_approval

**GREEN:**

- [x]Extend getFeatures() SQL with LEFT JOIN agent_runs
- [x]Add agentStatus/agentError to Feature interface and fromRow
- [x]Implement deriveState() in page.tsx
- [x]Use deriveState when building FeatureNodeData

**REFACTOR:**

- [x]Ensure error messages propagate from agent_runs.error

### Phase 10: Story Updates

- [x]Replace old lifecycle values in all story data (plan→research, test→review, maintenance→maintain)
- [x]Update allLifecycles array
- [x]Verify AllLifecycles story shows correct display labels
- [x]pnpm build:storybook passes

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

- [x]All 11 tasks completed
- [x]Tests passing (`pnpm test`)
- [x]Linting clean (`pnpm lint:web`)
- [x]Types valid (`pnpm typecheck:web`)
- [x]Storybook builds (`pnpm build:storybook`)
- [x]Web builds (`pnpm build:web`)
- [x]Components follow tier import rules (013-ui-arch)
- [x]PR created and reviewed

---

_Task breakdown for implementation tracking_
