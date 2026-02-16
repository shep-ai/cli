## Technology Decisions

### 1. Drawer Library: Vaul vs Existing Sheet (Radix Dialog)

**Chosen:** Vaul-based shadcn Drawer (new dependency + new Tier 0 component)

**Rejected:**

- **Existing Sheet component (Radix Dialog)** — Inherently modal: traps focus, adds overlay, blocks background interaction. Lacks swipe/touch gesture support.
- **Custom CSS-only sliding panel** — Requires reimplementing accessibility, animation, and gesture support from scratch.

**Rationale:** Vaul provides native support for `direction='right'`, `modal={false}`, controlled `open/onOpenChange`, and built-in ARIA attributes. The ~3-5KB gzipped bundle impact is minimal. The shadcn/ui Drawer wraps Vaul with styling patterns consistent with existing `components/ui/` primitives.

### 2. Drawer Modality: Modal vs Non-Modal

**Chosen:** Non-modal (`modal={false}`) with no overlay

**Rejected:**

- **Modal with overlay** — Blocks canvas interaction (panning, zooming, node selection).
- **Modal with transparent overlay** — Still blocks pointer events.

**Rationale:** `modal={false}` keeps the canvas fully interactive. Users can pan/zoom, click different nodes to switch content, and click the pane to close the drawer.

### 3. Drawer Layout Strategy

**Chosen:** Vaul portal rendering with fixed positioning

**Rejected:**

- **Flex sibling layout** — Fights Vaul's portal model.
- **CSS transform on canvas** — Causes ReactFlow viewport recalculation and layout shift.

**Rationale:** Fixed positioning overlays the right 384px of the canvas. Canvas remains interactive via `modal={false}`. Matches Figma/Miro inspector panel behavior.

### 4. Drawer Open/Close State Management

**Chosen:** Derive from `selectedNode !== null` — no new state

**Rejected:**

- **Separate `isDrawerOpen` boolean** — Redundant, must sync with selectedNode.
- **useReducer** — Over-engineered for single nullable value.

**Rationale:** `open={selectedNode !== null}`. `handleNodeClick` opens, `clearSelection` closes, clicking different node switches content in-place. Zero new state variables.

### 5. FeatureDrawer Props Interface

**Chosen:** `selectedNode: FeatureNodeData | null` and `onClose: () => void`

**Rejected:**

- **Individual feature field props** — Wide interface, loses null semantics.
- **React Context** — Over-engineered for single consumer.
- **Internal data fetching** — Violates NFR-6 testability.

**Rationale:** Pure, testable. Null = closed. Non-null = open with data. Maps to existing `useControlCenterState` return values.

### 6. Content Section Organization

**Chosen:** Three inline sections (Header, Status, Details)

**Rejected:**

- **Separate sub-components per section** — Premature abstraction.
- **Tabbed interface** — Hides information, adds navigation overhead.

**Rationale:** ~80-100 lines JSX in single file. Sections delimited by Separator. Within 150-line guideline.

### 7. Styling Reuse

**Chosen:** Import `featureNodeStateConfig` and `lifecycleDisplayLabels` directly

**Rejected:**

- **Duplicate constants** — DRY violation, drift risk.
- **Shared theme abstraction** — Premature indirection.

**Rationale:** Existing configs are the single source of truth. Ensures visual consistency between node and drawer.

### 8. Testing Strategy

**Chosen:** Storybook stories + Vitest unit tests

**Rejected:**

- **E2E only** — Too slow for exhaustive state combinations.
- **React Testing Library only** — Misses visual regression.

**Rationale:** Stories cover all visual states (mandatory per project conventions). Vitest tests verify rendering logic.

## Library Analysis

| Library                  | Purpose                             | Decision                  | Reasoning                                                                                        |
| ------------------------ | ----------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------ |
| vaul                     | Headless drawer with swipe gestures | **Add**                   | Required by shadcn/ui Drawer. Provides direction, modal, controlled state, ARIA. ~3-5KB gzipped. |
| radix-ui (Dialog)        | Existing Sheet foundation           | **Keep (not for drawer)** | Sheet stays for modal dialogs. Drawer uses Vaul for non-modal inspector panel.                   |
| class-variance-authority | Variant-based styling               | **Reuse**                 | Already installed. May use for direction variants in drawer.tsx.                                 |
| lucide-react             | Icons                               | **Reuse**                 | Already installed. XIcon for close button, state icons from config.                              |
| @xyflow/react            | Canvas                              | **No change**             | Canvas unmodified. Drawer is a sibling component.                                                |

## Security Considerations

- **No security concerns.** Pure presentational component displaying data already in client-side state.
- **XSS prevention:** All data rendered via React JSX which auto-escapes HTML. No `dangerouslySetInnerHTML`.
- **No sensitive data exposure:** Feature metadata in the drawer is already visible on canvas nodes.

## Performance Implications

- **Animation:** Vaul uses GPU-accelerated CSS transforms. Completes well within 300ms NFR-1 requirement.
- **Canvas isolation:** Drawer rendered via portal, outside ReactFlow DOM tree. Drawer re-renders do not trigger canvas re-renders. FeaturesCanvas does not consume selectedNode.
- **Content switching:** Only drawer content re-renders when selectedNode changes. No unmount/remount.
- **Bundle impact:** Vaul ~3-5KB gzipped. FeatureDrawer ~100-150 lines reusing existing primitives.
- **No layout thrashing:** Fixed-position drawer does not affect document flow.

## Architecture Notes

### Component Hierarchy

```
ControlCenterInner (Tier 3 - features/)
├── FeaturesCanvas (Tier 3 - features/)
│   └── FeatureNode (Tier 1 - common/)
└── FeatureDrawer (Tier 1 - common/)  ← NEW
    └── Drawer (Tier 0 - ui/)         ← NEW
        └── Vaul primitives
```

### Integration Point

`ControlCenterInner` renders `FeatureDrawer` as a sibling to `FeaturesCanvas`, passing
`selectedNode` and `clearSelection` from the existing `useControlCenterState` hook.
No changes needed to the hook itself.

```tsx
// control-center-inner.tsx (modified)
return (
  <>
    <FeaturesCanvas {...canvasProps} />
    <FeatureDrawer selectedNode={selectedNode} onClose={clearSelection} />
  </>
);
```

### File Structure

```
components/
├── ui/
│   ├── drawer.tsx              ← NEW Tier 0 (shadcn/ui Drawer wrapping Vaul)
│   └── drawer.stories.tsx      ← NEW stories
└── common/
    ├── feature-drawer/
    │   ├── feature-drawer.tsx  ← NEW Tier 1
    │   ├── feature-drawer.stories.tsx ← NEW stories
    │   └── index.ts           ← NEW barrel export
    └── index.ts               ← MODIFIED (add FeatureDrawer export)
```

### Data Flow

```
User clicks FeatureNode on canvas
  → handleNodeClick (useControlCenterState)
  → setSelectedNode(node.data as FeatureNodeData)
  → ControlCenterInner re-renders
  → FeatureDrawer receives selectedNode !== null
  → Vaul Drawer opens (open={true})
  → Drawer content renders feature details

User clicks canvas pane / Escape / close button
  → clearSelection / onOpenChange(false)
  → setSelectedNode(null)
  → ControlCenterInner re-renders
  → FeatureDrawer receives selectedNode === null
  → Vaul Drawer closes (open={false})
```

### Vaul Configuration

```tsx
<Drawer
  direction="right"
  modal={false}
  open={selectedNode !== null}
  onOpenChange={(open) => {
    if (!open) onClose();
  }}
>
  <DrawerContent className="fixed inset-y-0 right-0 h-full w-96">
    {/* Three sections: Header, Status, Details */}
  </DrawerContent>
</Drawer>
```

### Composed Primitives

The FeatureDrawer composes these existing Tier 0 primitives:

- **Badge** — State badge with icon and styled background
- **Separator** — Between Header, Status, and Details sections
- **Button** — Close button (ghost variant, icon size)

### Dark Mode

All colors use Tailwind CSS v4 semantic tokens (`bg-background`, `text-foreground`,
`border`, `text-muted-foreground`). State colors from `featureNodeStateConfig` use
Tailwind utility classes that adapt via the project's `@custom-variant dark` setup.
No hardcoded color values.

---

_Research complete — proceed with planning phase_
