## Problem Statement

The FeaturesCanvas (015) renders feature nodes on a React Flow graph but is
purely presentational — it has no selection state, no detail views, no toolbar,
and no way for users to interact beyond basic pan/zoom. The web UI needs an
interactive Control Center that wraps the canvas and adds the orchestration
layer: selecting nodes to see details, toolbar actions for managing features,
a status bar for summary information, and keyboard shortcuts for power users.

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
│ [Toolbar Panel - top]                   │
├────────────────────────────┬────────────┤
│                            │  Detail    │
│   FeaturesCanvas           │  Panel     │
│   (React Flow)             │  (right)   │
│                            │            │
├────────────────────────────┴────────────┤
│ [Status Bar Panel - bottom]             │
└─────────────────────────────────────────┘
```

Toolbar, detail panel, and status bar use React Flow's `<Panel>` component
for positioning on top of the canvas without interfering with pan/zoom.

## Components

### File Structure

```
features/control-center/
├── control-center.tsx              ← Main orchestrator component
├── use-control-center-state.ts     ← Custom hook: nodes, edges, selection, panels
├── control-center-toolbar.tsx      ← Top toolbar (add, filter, layout)
├── control-center-detail-panel.tsx ← Right panel for selected feature
├── control-center-status-bar.tsx   ← Bottom status summary
├── control-center.stories.tsx
└── index.ts
```

### ControlCenter (orchestrator)

- Renders FeaturesCanvas inside a ReactFlowProvider
- Uses `useControlCenterState` hook for all state management
- Passes interaction callbacks (onNodeClick, onPaneClick, onConnect) to canvas
- Renders Panel overlays for toolbar, detail panel, status bar

### useControlCenterState (custom hook)

Owns:

- Node/edge state (React Flow's `useNodesState`/`useEdgesState`)
- Selected node tracking
- Panel open/close state
- Action handlers (add, delete, connect, etc.)

### ControlCenterToolbar (top panel)

- Add feature button
- Auto-layout button
- Filter/search (stretch goal)

### ControlCenterDetailPanel (right panel)

- Shows when a feature node is selected
- Displays feature details: name, description, lifecycle, progress, state
- Slide-in animation from right
- Close button / click-away to dismiss

### ControlCenterStatusBar (bottom panel)

- Feature count summary (e.g., "5 features: 2 running, 1 done, 2 blocked")
- Aggregate progress

## Interaction Layers

| Interaction        | Mechanism                                        |
| ------------------ | ------------------------------------------------ |
| Select node        | `onNodeClick` → highlight + show detail panel    |
| Deselect           | `onPaneClick` → clear selection + hide panel     |
| Node context menu  | `onNodeContextMenu` → right-click actions        |
| Canvas actions     | Toolbar buttons (add feature, auto-layout)       |
| Feature detail     | Slide-out panel when node selected               |
| Keyboard shortcuts | `useKeyboard` hook for Escape (deselect), Delete |

## Changes to Existing Components

| Component       | Change                                                      |
| --------------- | ----------------------------------------------------------- |
| FeaturesCanvas  | Extend props — expose onNodeClick, onPaneClick, onConnect   |
| FeatureNode     | Add selected/highlighted visual state (ring or border glow) |
| RepositoryNode  | No change                                                   |
| ControlCenter   | New — wraps everything                                      |
| Toolbar, Detail | New — built inside control-center/                          |

## Success Criteria

- [ ] `ControlCenter` component in `features/control-center/`
- [ ] `useControlCenterState` hook managing all interactive state
- [ ] Toolbar panel (top) with add-feature button
- [ ] Detail panel (right) showing selected feature info, slide-in/out
- [ ] Status bar panel (bottom) with feature count summary
- [ ] Node selection: click to select, click canvas to deselect
- [ ] Selected node visual highlight (ring/glow on FeatureNode)
- [ ] FeaturesCanvas props extended with onNodeClick, onPaneClick
- [ ] Keyboard shortcut: Escape to deselect
- [ ] Storybook stories: Empty, WithFeatures, SelectedNode, WithToolbar
- [ ] `pnpm build:storybook` passes
- [ ] `pnpm build:web` passes
- [ ] Components follow tier import rules (013-ui-arch)

## Affected Areas

| Area                                                        | Impact | Reasoning                              |
| ----------------------------------------------------------- | ------ | -------------------------------------- |
| `src/presentation/web/components/features/`                 | High   | New control-center component directory |
| `src/presentation/web/components/features/features-canvas/` | Medium | Extend props for interaction callbacks |
| `src/presentation/web/components/common/feature-node/`      | Low    | Add selected visual state              |

## Dependencies

- **015-feature-flow-canvas** (Complete): FeaturesCanvas and node components
- **013-ui-arch** (Complete): Four-tier component hierarchy
- **014-ui-sidebar** (Complete): Sidebar navigation context

## Scope Boundaries

**In scope:**

- ControlCenter orchestrator wrapping FeaturesCanvas
- State management hook (useControlCenterState)
- Toolbar, detail panel, status bar via React Flow Panel
- Node selection with visual highlight
- Keyboard shortcut (Escape to deselect)
- Storybook stories with mock data
- Extending FeaturesCanvas/FeatureNode props as needed

**Out of scope:**

- Backend API integration for feature data
- Real-time updates or WebSocket integration
- Drag-and-drop node creation or edge creation
- Auto-layout algorithm implementation (button placeholder only)
- Node context menu (stretch goal for future)
- Filter/search in toolbar (stretch goal for future)
- Editing feature details inline in detail panel

## Size Estimate

**L** - Creates a new orchestrator component with 5 files (component, hook,
toolbar, detail panel, status bar), modifies 2 existing components
(FeaturesCanvas props, FeatureNode selected state), and requires comprehensive
Storybook stories. Moderate complexity from React Flow Panel integration and
state management coordination.

---

_Generated by `/shep-kit:new-feature` — proceed with `/shep-kit:research`_
