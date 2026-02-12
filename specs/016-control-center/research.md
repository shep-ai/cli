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

### 5. Detail Panel Component

**Options considered:**

1. **Custom div inside React Flow Panel** — `<Panel position="top-right">` containing a styled div with CSS transitions
2. **shadcn/ui Sheet** — Radix-based slide-out sheet with overlay
3. **Radix Dialog/Drawer** — Lower-level primitives

**Decision:** Custom div inside React Flow Panel

**Rationale:** The shadcn/ui Sheet creates a full-page overlay with backdrop (`bg-black/50`) that blocks canvas interaction — wrong UX pattern for a detail panel that should coexist with the canvas. A custom div inside `<Panel position="top-right">` with Tailwind transition classes (`translate-x-0`/`translate-x-full`, `opacity-0`/`opacity-100`) provides slide-in without blocking pan/zoom. The panel lives within React Flow's coordinate system and doesn't create portal/overlay conflicts.

### 6. Keyboard Shortcuts

**Options considered:**

1. **Native `useEffect` with `keydown` listener** — Simple event listener in custom hook
2. **`react-hotkeys-hook` library** — Declarative hotkey binding
3. **React Flow built-in keyboard handling** — `deleteKeyCode` prop

**Decision:** Native `useEffect` with `keydown` listener

**Rationale:** Only one shortcut needed initially (Escape to deselect/close panel). A `useEffect` with `addEventListener('keydown')` is 5 lines of code. Adding a library for one shortcut is unnecessary. React Flow's built-in `deleteKeyCode` handles node deletion but doesn't cover custom panel logic. Can revisit if shortcuts grow beyond 3-4.

## Library Analysis

| Library              | Version          | Purpose                        | Status                                |
| -------------------- | ---------------- | ------------------------------ | ------------------------------------- |
| `@xyflow/react`      | ^12.10.0         | Canvas, Panel, selection hooks | Already installed                     |
| `shadcn/ui Sheet`    | (radix-ui 1.4.3) | Slide-out panel                | Rejected — overlay blocks canvas      |
| `react-hotkeys-hook` | N/A              | Keyboard shortcuts             | Rejected — overkill for 1 shortcut    |
| `framer-motion`      | N/A              | Animations                     | Rejected — CSS transitions sufficient |

**No new dependencies required.** All decisions use existing packages (`@xyflow/react`, Tailwind CSS).

## Security Considerations

No security implications identified. This feature is purely presentational UI with no backend integration, user input handling, or data persistence.

## Performance Implications

- **Node enrichment memoization**: The existing `useMemo` in FeaturesCanvas for node enrichment should be preserved. The control center adds selection state which React Flow handles internally — no additional re-render overhead.
- **Panel rendering**: React Flow Panel uses CSS positioning, not portal rendering. Panels are only re-rendered when their content changes, not on every canvas pan/zoom.
- **useOnSelectionChange**: The callback must be memoized with `useCallback` (documented requirement from React Flow). Failure to memoize causes unnecessary re-subscriptions.
- **Detail panel transitions**: CSS transitions via Tailwind (`transition-transform duration-300`) are GPU-accelerated and don't trigger layout reflows.

## Open Questions

All questions resolved.

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
