## Status

- **Phase:** Planning
- **Updated:** 2026-02-12

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│  ControlCenter (Tier 3 orchestrator)                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  <Panel position="top-left">                          │  │
│  │    ControlCenterToolbar                                │  │
│  │    [Add Feature] [Auto-Layout]                         │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │  FeaturesCanvas                                        │  │
│  │  (existing, stays pure)                                │  │
│  │                                                        │  │
│  │  ┌──────────┐ ┌──────────┐                             │  │
│  │  │FeatureNode│→│FeatureNode│                           │  │
│  │  │(selected) │ │          │                            │  │
│  │  │ ring-2    │ │          │                            │  │
│  │  └──────────┘ └──────────┘                             │  │
│  │       ↑                                                │  │
│  │  RepositoryNode                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  useControlCenterState (custom hook)                         │
│  - Selection tracking (useOnSelectionChange)                 │
│  - Keyboard shortcuts (Escape)                               │
└──────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
Tier 3: features/control-center/     ← NEW orchestrator
            ├── composes FeaturesCanvas (Tier 3)
            ├── adds toolbar via React Flow <Panel>
            └── manages state via useControlCenterState hook

Tier 3: features/features-canvas/    ← EXISTING (stays pure/dumb)
Tier 1: common/feature-node/         ← EXISTING (add selected ring)
Tier 1: common/repository-node/      ← UNCHANGED
```

### Data Flow

```
Props (nodes, edges, callbacks)
     │
     ▼
ControlCenter
     │
     ├──► useControlCenterState(nodes, edges)
     │         │
     │         └── selectedNode (from useOnSelectionChange)
     │
     ├──► FeaturesCanvas (nodes, edges, onNodeClick, onPaneClick)
     │
     └──► ControlCenterToolbar (onAddFeature, onAutoLayout)
```

## Implementation Strategy

**MANDATORY TDD**: All implementation phases with executable code follow RED-GREEN-REFACTOR cycles.

### Phase 1: Foundation (No Tests)

**Goal:** Scaffold the control-center directory structure with empty component shells and barrel exports.

**Steps:**

1. Create `features/control-center/` directory with all component files
2. Add minimal type-safe placeholder exports for each component
3. Set up `index.ts` barrel file with all exports

**Deliverables:** Empty scaffolded directory, compilable with `pnpm typecheck:web`

### Phase 2: Existing Component Updates (TDD Cycles 1-2) [P]

**Goal:** Update FeatureNode with selection visual and extend FeaturesCanvas with interaction callbacks. These two tasks are parallelizable.

#### 2A: FeatureNode Selected Highlight

**TDD Workflow:**

1. **RED:** Write test that FeatureNode renders `ring-2 ring-primary` classes when `selected` prop is true, and does NOT render them when false
2. **GREEN:** Add conditional `ring-2 ring-primary` class to FeatureNode card wrapper using `cn()`, keyed on the `selected` prop from React Flow
3. **REFACTOR:** Ensure ring classes integrate cleanly with existing border styles; update Storybook stories to include Selected variant

#### 2B: FeaturesCanvas Interaction Callbacks

**TDD Workflow:**

1. **RED:** Write test that FeaturesCanvas passes `onNodeClick` and `onPaneClick` through to the underlying ReactFlow component
2. **GREEN:** Add `onNodeClick` and `onPaneClick` to `FeaturesCanvasProps`, pass them to `<ReactFlow>`
3. **REFACTOR:** Update type exports, verify stories still render correctly

**Deliverables:** FeatureNode with selection ring, FeaturesCanvas with interaction callbacks

### Phase 3: State Management Hook (TDD Cycle 3)

**Goal:** Implement `useControlCenterState` — the central state hook for the control center.

**TDD Workflow:**

1. **RED:** Write tests for:
   - Returns selectedNode when a node is selected via useOnSelectionChange
   - Returns null selectedNode when selection is cleared
   - Escape keypress clears selection
2. **GREEN:** Implement hook composing:
   - `useOnSelectionChange` for selection tracking
   - `useEffect` + `keydown` listener for Escape shortcut
   - `useCallback` for memoized event handlers
3. **REFACTOR:** Ensure all callbacks are properly memoized

**Deliverables:** Fully tested `useControlCenterState` hook

### Phase 4: Toolbar (TDD Cycle 4)

**Goal:** Build the toolbar panel sub-component.

**TDD Workflow:**

1. **RED:** Write tests that:
   - Renders "Add Feature" button
   - Renders "Auto-Layout" button (disabled placeholder)
   - Calls `onAddFeature` callback when Add Feature clicked
2. **GREEN:** Implement toolbar as horizontal button bar with Lucide icons (Plus, LayoutGrid), using shadcn/ui Button components inside `<Panel position="top-left">`
3. **REFACTOR:** Add Storybook stories

**Deliverables:** Tested and storied toolbar component

### Phase 5: Orchestrator Integration (TDD Cycle 5)

**Goal:** Wire everything together in the `ControlCenter` component.

**TDD Workflow:**

1. **RED:** Write tests that:
   - Renders FeaturesCanvas with provided nodes and edges
   - Renders toolbar panel
   - Passes onAddFeature through to toolbar
2. **GREEN:** Implement ControlCenter composing:
   - `FeaturesCanvas` with nodes, edges, and interaction callbacks
   - `ControlCenterToolbar` with action handlers
   - All wired through `useControlCenterState`
3. **REFACTOR:** Clean up prop threading; ensure minimal re-renders

**Deliverables:** Full ControlCenter component with Storybook stories (Empty, WithFeatures, WithToolbar)

### Phase 6: Build Validation (No Tests)

**Goal:** Ensure everything compiles and passes quality gates.

**Steps:**

1. `pnpm lint:web` — ESLint passes
2. `pnpm typecheck:web` — TypeScript compiles
3. `pnpm build:storybook` — Storybook builds
4. `pnpm build:web` — Next.js production build passes

**Deliverables:** All builds green

## Files to Create/Modify

### New Files

| File                                                  | Purpose                                |
| ----------------------------------------------------- | -------------------------------------- |
| `features/control-center/control-center.tsx`          | Main orchestrator component            |
| `features/control-center/use-control-center-state.ts` | Custom hook: selection tracking        |
| `features/control-center/control-center-toolbar.tsx`  | Top toolbar (add feature, auto-layout) |
| `features/control-center/control-center.stories.tsx`  | Storybook stories for orchestrator     |
| `features/control-center/index.ts`                    | Barrel exports                         |
| `tests/.../use-control-center-state.test.ts`          | Hook unit tests                        |
| `tests/.../control-center-toolbar.test.tsx`           | Toolbar unit tests                     |
| `tests/.../control-center.test.tsx`                   | Orchestrator integration tests         |

### Modified Files

| File                                                   | Changes                                                   |
| ------------------------------------------------------ | --------------------------------------------------------- |
| `common/feature-node/feature-node.tsx`                 | Add conditional `ring-2 ring-primary` when `selected`     |
| `common/feature-node/feature-node.stories.tsx`         | Add Selected story variant                                |
| `features/features-canvas/features-canvas.tsx`         | Add `onNodeClick`, `onPaneClick` props, pass to ReactFlow |
| `features/features-canvas/features-canvas.stories.tsx` | Add Interactive story with callbacks                      |

## Testing Strategy (TDD: Tests FIRST)

**CRITICAL:** Tests are written FIRST in each TDD cycle.

### Unit Tests (RED -> GREEN -> REFACTOR)

Write FIRST for:

- `useControlCenterState` hook — selection tracking, keyboard shortcuts
- `ControlCenterToolbar` — button rendering, callback invocation
- `FeatureNode` — selected ring visual (addition to existing tests)
- `FeaturesCanvas` — callback prop pass-through (addition to existing tests)

### Storybook Stories (Visual Verification)

Every component has colocated stories:

- `FeatureNode` — add Selected variant to existing stories
- `FeaturesCanvas` — add Interactive variant with callbacks
- `ControlCenterToolbar` — Default, WithCallbacks
- `ControlCenter` — Empty, WithFeatures, WithToolbar

### E2E Tests (Stretch)

Not required for initial implementation. Canvas interaction testing can be added post-merge.

## Risk Mitigation

| Risk                                                                | Mitigation                                           |
| ------------------------------------------------------------------- | ---------------------------------------------------- |
| React Flow Panel conflicts with existing Controls/MiniMap           | Test with Background and Controls present in stories |
| useOnSelectionChange callback not memoized causing re-subscriptions | Wrap in useCallback per React Flow docs              |
| FeatureNode ring conflicts with existing left border                | Test ring + border combination visually in Storybook |

## Rollback Plan

Feature is purely additive UI. Rollback by reverting the feature branch merge. No data migrations, no backend changes, no breaking API changes.

---

_Updated by `/shep-kit:plan` — see tasks.md for detailed breakdown_
