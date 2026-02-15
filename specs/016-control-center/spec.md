## Problem Statement

The FeaturesCanvas (015) renders feature nodes on a React Flow graph but is
purely presentational — it has no selection state, no detail views, no toolbar,
and no way for users to interact beyond basic pan/zoom. The web UI needs an
interactive Control Center that wraps the canvas and adds the orchestration
layer: selecting nodes with visual highlight, toolbar actions for managing
features, and keyboard shortcuts for power users.

## Architecture

```
Tier 3: features/control-center/     ← NEW orchestrator
            ├── composes FeaturesCanvas (canvas layer)
            ├── adds panels/toolbars (UI overlay layer)
            └── manages state + interactions (logic layer)

Tier 3: features/features-canvas/    ← EXISTING (stays pure/dumb)
Tier 1: common/feature-node/         ← EXISTING nodes
```

Key principle: Keep FeaturesCanvas as a pure presentation component. Build the
Control Center as a new Tier 3 component that wraps it and adds interactivity.

### Layout

```
┌─────────────────────────────────────────┐
│ [Toolbar Panel - top-left]              │
├─────────────────────────────────────────┤
│                                         │
│   FeaturesCanvas                        │
│   (React Flow)                          │
│                                         │
└─────────────────────────────────────────┘
```

Toolbar uses React Flow's `<Panel>` component for positioning on top of
the canvas without interfering with pan/zoom.

## Components

### File Structure

```
features/control-center/
├── control-center.tsx              ← Main orchestrator component
├── use-control-center-state.ts     ← Custom hook: selection, keyboard
├── control-center-toolbar.tsx      ← Top toolbar (add, layout)
├── control-center.stories.tsx
└── index.ts
```

### ControlCenter (orchestrator)

- Renders FeaturesCanvas inside a ReactFlowProvider
- Uses `useControlCenterState` hook for all state management
- Passes interaction callbacks (onNodeClick, onPaneClick, onConnect) to canvas
- Renders Panel overlays for toolbar and status bar

### useControlCenterState (custom hook)

Owns:

- Node/edge state (React Flow's `useNodesState`/`useEdgesState`)
- Selected node tracking
- Action handlers:
  - `handleAddFeatureToRepo(repoNodeId)` — creates a new FeatureNode connected to the repo
  - `handleAddFeatureToFeature(featureNodeId)` — creates a new FeatureNode connected to the parent feature
  - `handleAddFeature()` — toolbar action, creates an unconnected feature node
  - `handleSelectNode(nodeId)` / `handleDeselectNode()`

### ControlCenterToolbar (top panel)

- Add feature button
- Auto-layout button
- Filter/search (stretch goal)

## Interaction Layers

| Interaction              | Mechanism                                                           |
| ------------------------ | ------------------------------------------------------------------- |
| Select node              | `onNodeClick` → highlight node                                      |
| Deselect                 | `onPaneClick` → clear selection                                     |
| Add feature from repo    | RepositoryNode (+) button → `handleAddFeatureToRepo(repoNodeId)`    |
| Add feature from feature | FeatureNode (+) button → `handleAddFeatureToFeature(featureNodeId)` |
| Toolbar add feature      | Toolbar button → `handleAddFeature()` (unconnected node)            |
| Auto-layout              | Toolbar button (placeholder only)                                   |
| Keyboard shortcuts       | `useKeyboard` hook for Escape (deselect)                            |

### Contextual Add Flow

When a user clicks the (+) button on a **RepositoryNode**:

1. A new FeatureNode is created with default data (name: "New Feature", state: running, progress: 0)
2. An edge is created from the repo node to the new feature node
3. The new node is positioned to the right of the source node
4. The new node is auto-selected

When a user clicks the (+) button on a **FeatureNode**:

1. Same behavior — creates a child FeatureNode connected via edge
2. Enables building feature hierarchies (repo → feature → sub-feature)

## Changes to Existing Components

| Component      | Change                                                          |
| -------------- | --------------------------------------------------------------- |
| FeaturesCanvas | Extend props — expose onNodeClick, onPaneClick, onRepositoryAdd |
| FeatureNode    | Add selected/highlighted visual state (ring or border glow)     |
| RepositoryNode | Wire onAdd callback through FeaturesCanvas props                |
| ControlCenter  | New — wraps everything                                          |
| Toolbar        | New — built inside control-center/                              |

## Success Criteria

- [ ] `ControlCenter` component in `features/control-center/`
- [ ] `useControlCenterState` hook managing all interactive state
- [ ] Toolbar panel (top) with add-feature button
- [ ] Node selection: click to select, click canvas to deselect
- [ ] Selected node visual highlight (ring/glow on FeatureNode)
- [ ] RepositoryNode (+) creates connected FeatureNode
- [ ] FeatureNode (+) creates connected child FeatureNode
- [ ] New nodes positioned to the right and auto-selected
- [ ] FeaturesCanvas props extended with onNodeClick, onPaneClick, onRepositoryAdd
- [ ] Keyboard shortcut: Escape to deselect
- [ ] Storybook stories: Empty, WithFeatures, WithToolbar, WithNodeActions
- [ ] `pnpm build:storybook` passes
- [ ] `pnpm build:web` passes
- [ ] Components follow tier import rules (013-ui-arch)

## Affected Areas

| Area                                                        | Impact | Reasoning                              |
| ----------------------------------------------------------- | ------ | -------------------------------------- |
| `src/presentation/web/components/features/`                 | High   | New control-center component directory |
| `src/presentation/web/components/features/features-canvas/` | Medium | Extend props for interaction callbacks |
| `src/presentation/web/components/common/feature-node/`      | Low    | Add selected visual state              |
| `src/presentation/web/components/common/repository-node/`   | Low    | Wire onAdd callback through canvas     |

## Dependencies

- **015-feature-flow-canvas** (Complete): FeaturesCanvas and node components
- **013-ui-arch** (Complete): Four-tier component hierarchy
- **014-ui-sidebar** (Complete): Sidebar navigation context

## Scope Boundaries

**In scope:**

- ControlCenter orchestrator wrapping FeaturesCanvas
- State management hook (useControlCenterState)
- Toolbar via React Flow Panel
- Node selection with visual highlight
- Contextual add via RepositoryNode (+) → creates connected FeatureNode
- Contextual add via FeatureNode (+) → creates connected child FeatureNode
- New node positioning (to the right of source) and auto-selection
- Keyboard shortcut (Escape to deselect)
- Storybook stories with mock data
- Extending FeaturesCanvas/FeatureNode/RepositoryNode props as needed

**Out of scope:**

- Backend API integration for feature data
- Real-time updates or WebSocket integration
- Drag-and-drop node creation (nodes added via (+) buttons, not drag)
- Auto-layout algorithm implementation (button placeholder only)
- Node context menu (stretch goal for future)
- Filter/search in toolbar (stretch goal for future)

## Size Estimate

**M** - Creates a new orchestrator component with 3 files (component, hook,
toolbar), modifies 2 existing components (FeaturesCanvas props, FeatureNode
selected state), and requires comprehensive Storybook stories. Moderate
complexity from React Flow Panel integration and state management.

---

_Generated by `/shep-kit:new-feature` — proceed with `/shep-kit:research`_
