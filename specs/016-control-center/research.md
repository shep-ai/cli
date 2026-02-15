## Status

- **Phase:** Research
- **Updated:** 2026-02-12

## Technology Decisions

### 1. Canvas Overlay Positioning

**Options considered:**

1. **React Flow `<Panel>` component** — Built-in component with 8 position slots, renders above viewport
2. **Custom absolute-positioned divs** — Manual CSS positioning over the canvas
3. **CSS Grid overlay layout** — Grid wrapper with canvas in one cell, overlays in others

**Decision:** React Flow `<Panel>` component

**Rationale:** Panel is the idiomatic React Flow approach. It's used internally by `<Controls>` and `<MiniMap>`. Panels don't interfere with pan/zoom, accept standard div props for styling, and require no additional dependencies. Position slots map directly to our layout needs:

- `top-left` → Toolbar
- `top-right` → Detail panel
- `bottom-left` → Status bar

### 2. State Management Approach

**Options considered:**

1. **Custom hook composing React Flow hooks** — `useControlCenterState` wrapping `useNodesState`, `useEdgesState`, `useOnSelectionChange`, plus `useState` for panel visibility
2. **Zustand store** — External store for cross-component state
3. **React Context provider** — Context wrapping the control center
4. **Lift state to parent page** — Page component owns all state

**Decision:** Custom hook (`useControlCenterState`)

**Rationale:** React Flow already provides `useNodesState`, `useEdgesState`, and `useOnSelectionChange`. These hooks must be used inside a `<ReactFlowProvider>`. A custom hook composing them with local `useState` for panel visibility keeps state co-located and testable. No external dependency needed. The hook can be extracted to context later if state sharing becomes necessary.

### 3. Node Selection Tracking

**Options considered:**

1. **React Flow built-in selection** — Nodes have a `selected` prop set by React Flow on click
2. **Custom `onNodeClick` handler** — Manual tracking of selected node ID in state
3. **External selection library** — Third-party selection management

**Decision:** React Flow built-in selection + `useOnSelectionChange`

**Rationale:** React Flow handles selection internally — clicking a node sets `node.selected = true`. The `useOnSelectionChange` hook fires when selection changes, providing the selected nodes array. Custom nodes receive `selected` as a prop. This avoids duplicating selection state and stays in sync with React Flow's internal model. The hook callback opens/closes the detail panel.

### 4. Selected Node Visual Highlight

**Options considered:**

1. **Tailwind `ring` utility** — `ring-2 ring-blue-500` when `selected` prop is true
2. **CSS box-shadow** — Custom shadow on selection
3. **Wrapper div with border** — Additional DOM element
4. **Framer Motion animated border** — Animated highlight effect

**Decision:** Tailwind `ring-2 ring-blue-500`

**Rationale:** FeatureNode already uses Tailwind classes and receives props from React Flow including `selected`. A conditional ring class is minimal (one `cn()` addition), performant, and visually distinct from the existing left border. No new dependencies or DOM changes needed.

### 5. Keyboard Shortcuts

**Options considered:**

1. **Native `useEffect` with `keydown` listener** — Simple event listener in custom hook
2. **`react-hotkeys-hook` library** — Declarative hotkey binding
3. **React Flow built-in keyboard handling** — `deleteKeyCode` prop

**Decision:** Native `useEffect` with `keydown` listener

**Rationale:** Only one shortcut needed initially (Escape to deselect). A `useEffect` with `addEventListener('keydown')` is 5 lines of code. Adding a library for one shortcut is unnecessary. React Flow's built-in `deleteKeyCode` handles node deletion but doesn't cover custom logic. Can revisit if shortcuts grow beyond 3-4.

### 6. Programmatic Node and Edge Creation

**Options considered:**

1. **`useReactFlow` hook** — Built-in `addNodes()` and `addEdges()` methods
2. **Manual `setNodes`/`setEdges` state updates** — Spread existing state and append
3. **External graph manipulation library** — Third-party graph management

**Decision:** `useReactFlow` hook (`addNodes`/`addEdges`)

**Rationale:** React Flow provides `useReactFlow()` with `addNodes()` and `addEdges()` for appending to the graph without replacing state. The hook also exposes `getNode()` to look up the source node's position for calculating new node placement. Manual `setNodes` requires spreading existing state which is error-prone. The hook is already available inside `ReactFlowProvider`. This is needed for the contextual (+) add actions on RepositoryNode and FeatureNode.

### 7. New Node Positioning Strategy

**Options considered:**

1. **Offset from source node** — Place new node at `x + 350, same y` relative to source
2. **Random placement** — Random position within viewport
3. **Center of viewport** — Always place at viewport center
4. **Auto-layout on every add** — Re-layout entire graph after each addition

**Decision:** Offset from source node position (`x + 350`, same `y`)

**Rationale:** Placing to the right of the source (350px offset = 288px node width + 62px gap) gives immediate visual feedback of parent-child relationship. If multiple children share the same position, a y-offset based on existing children count prevents overlap. Auto-layout on every add would be jarring. Viewport center loses the connection context.

## Library Analysis

| Library              | Version  | Purpose                                      | Status                             |
| -------------------- | -------- | -------------------------------------------- | ---------------------------------- |
| `@xyflow/react`      | ^12.10.0 | Canvas, Panel, selection hooks, useReactFlow | Already installed                  |
| `react-hotkeys-hook` | N/A      | Keyboard shortcuts                           | Rejected — overkill for 1 shortcut |

**No new dependencies required.** All decisions use existing packages (`@xyflow/react`, Tailwind CSS).

## Security Considerations

No security implications identified. This feature is purely presentational UI with no backend integration, user input handling, or data persistence.

## Performance Implications

- **Node enrichment memoization**: The existing `useMemo` in FeaturesCanvas for node enrichment should be preserved. The control center adds selection state which React Flow handles internally — no additional re-render overhead.
- **Panel rendering**: React Flow Panel uses CSS positioning, not portal rendering. Panels are only re-rendered when their content changes, not on every canvas pan/zoom.
- **useOnSelectionChange**: The callback must be memoized with `useCallback` (documented requirement from React Flow). Failure to memoize causes unnecessary re-subscriptions.
- **addNodes/addEdges**: These methods batch updates internally. Adding a node + edge in sequence is efficient and does not cause double renders.

### 8. Lifecycle Phase Alignment with Domain

**Options considered:**

1. **Map FeatureLifecyclePhase 1:1 to domain SdlcLifecycle** — Use matching values (requirements, research, implementation, review, deploy, maintain) with display labels
2. **Keep UI-specific simplified phases** — Continue using invented phases ('plan', 'test', 'maintenance')
3. **Create a separate presentation-layer enum** — New enum decoupled from domain

**Decision:** Map 1:1 to domain SdlcLifecycle

**Rationale:** The UI phases ('plan', 'test', 'maintenance') have no domain counterpart. The lifecycleMap collapsed Research→requirements and Maintain→deploy, losing information. A 1:1 mapping with a display label map (`maintain` → "COMPLETED", `deploy` → "DEPLOY & QA") keeps the UI accurate while providing human-readable names.

### 9. Feature State Derivation from agent_runs

**Options considered:**

1. **LEFT JOIN features with agent_runs** — Query real status from DB
2. **Read feature.yaml from disk** — Parse spec files for progress
3. **Hardcode all features as running** — Current approach (broken)

**Decision:** LEFT JOIN features with agent_runs

**Rationale:** The feature-agent graph updates `agent_runs.status` as it progresses but does NOT update `feature.lifecycle` (stays at "Requirements"). Both tables live in `~/.shep/data`. A simple SQL JOIN provides real operational state without filesystem coupling. Maps: running→running, completed→done, failed→error, waiting_approval→action-required.

**Key finding:** Agent graph nodes do NOT update `feature.lifecycle` in the DB. The `agent_runs.status` column is the real source of truth for operational state.

### 10. Maintain Lifecycle Semantics

**Decision:** Maintain = Completed (done state, "COMPLETED" display label)

**Rationale:** A feature in the Maintain lifecycle has been fully implemented, reviewed, and deployed. From the control center perspective, this is completed work. Emerald done state gives clear visual feedback.

## Open Questions

All questions resolved.

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
