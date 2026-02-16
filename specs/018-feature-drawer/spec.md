## Problem Statement

When users click a feature node on the ReactFlow canvas, there is no detail panel to inspect
or manage the feature. The `selectedNode` state is already tracked in `useControlCenterState`
(via `handleNodeClick` and `clearSelection`) but is not connected to any visible UI. Users
need a sliding drawer panel that shows feature details and will eventually host feature
management actions (edit, run agent, view logs, etc.).

The feature node itself shows truncated information (name limited to one line, description
to two lines). Users have no way to see full details, and the node's compact layout cannot
accommodate the level of detail needed for feature inspection.

## Success Criteria

- [ ] Clicking a feature node on the canvas opens a right-side drawer panel
- [ ] The drawer displays the feature's name, featureId, description, lifecycle phase, state, and progress
- [ ] The drawer uses consistent styling from featureNodeStateConfig (colors, icons, labels)
- [ ] The drawer closes when pressing Escape, clicking the canvas pane, or clicking the drawer's close button
- [ ] Clicking a different feature node updates the drawer content in-place without close/reopen animation
- [ ] The drawer does NOT overlay/dim the canvas — the canvas remains visible alongside
- [ ] The Tier 0 shadcn/ui Drawer component (drawer.tsx) is added to components/ui/
- [ ] The Tier 1 FeatureDrawer component is created in components/common/feature-drawer/
- [ ] Both new components have colocated Storybook stories
- [ ] All new components are exported from their respective barrel index files
- [ ] Unit tests cover drawer content rendering for all feature states
- [ ] Integration tests cover open/close/switch behavior
- [ ] The drawer is keyboard-accessible (Escape closes, Tab navigates content)
- [ ] vaul is added as a dependency to @shepai/web package.json
- [ ] Dark mode is supported with correct theme colors

## Functional Requirements

- **FR-1: Drawer Open on Node Click** — When a user clicks a feature node (type `featureNode`) on the ReactFlow canvas, a drawer panel slides in from the right side of the viewport. The drawer is driven by the existing `selectedNode` state from `useControlCenterState`.

- **FR-2: Drawer Close Triggers** — The drawer closes (selectedNode set to null) when any of these occur: (a) user presses Escape key, (b) user clicks the canvas pane (empty area), (c) user clicks the drawer's close button (X). All three triggers use the existing `clearSelection` function.

- **FR-3: Header Section** — The drawer header displays the feature name as the title and the featureId (e.g., `#f1`) as a subtitle or badge. The header must be visually prominent and always visible at the top of the drawer.

- **FR-4: Status Section** — The drawer displays the feature's current status including: (a) lifecycle phase label using `lifecycleDisplayLabels` mapping (e.g., "REQUIREMENTS", "IMPLEMENTATION"), (b) state badge with icon and color from `featureNodeStateConfig` (running/action-required/done/blocked/error), (c) progress bar showing percentage (0-100) when the state config has `showProgressBar: true` or progress > 0.

- **FR-5: Details Section** — The drawer displays additional feature details: (a) full description text (not truncated), (b) agent name if present (e.g., "Agent: Planner"), (c) runtime if present (e.g., "Runtime: 2h 15m"), (d) blocked-by feature name if state is `blocked`, (e) error message if state is `error`. Fields that are undefined/null are hidden — no empty placeholders.

- **FR-6: In-Place Content Switch** — When the drawer is already open and the user clicks a different feature node, the drawer content updates to show the new feature's data without a close/reopen animation cycle. The drawer remains open and re-renders with the new `selectedNode` data.

- **FR-7: No Canvas Overlay** — The drawer slides in without dimming or overlaying the canvas. The canvas remains fully visible and interactive (pan, zoom, node drag) while the drawer is open. The drawer occupies a fixed 384px width on the right side.

- **FR-8: Drawer Integration Point** — The FeatureDrawer component is rendered inside `ControlCenterInner` as a sibling to `FeaturesCanvas`. It receives `selectedNode` and `clearSelection` as props from the `useControlCenterState` hook.

- **FR-9: Storybook Stories** — Both the Tier 0 Drawer UI primitive and the Tier 1 FeatureDrawer component have colocated `.stories.tsx` files. Stories cover: (a) all five feature states (running, action-required, done, blocked, error), (b) all six lifecycle phases, (c) with/without optional fields (description, agentName, runtime, blockedBy, errorMessage), (d) drawer open/closed states.

- **FR-10: Barrel Exports** — The FeatureDrawer component and its props type are exported from `components/common/index.ts` following the existing barrel export pattern.

## Non-Functional Requirements

- **NFR-1: Render Performance** — The drawer open/close animation must complete in under 300ms. Switching content between features must not cause visible layout shift or flicker. The drawer must not degrade ReactFlow canvas performance (no forced re-renders of the canvas when drawer content changes).

- **NFR-2: Accessibility** — The drawer must meet WCAG 2.1 AA standards: (a) Escape key closes the drawer, (b) close button is focusable and has an accessible label, (c) drawer content is navigable via Tab key, (d) state badges and lifecycle labels have sufficient color contrast (already ensured by featureNodeStateConfig), (e) screen readers announce drawer opening. Vaul's built-in ARIA attributes must be preserved.

- **NFR-3: Dark Mode** — The drawer must render correctly in both light and dark modes using the existing Tailwind CSS v4 theme variables (`bg-background`, `text-foreground`, `border`, `text-muted-foreground`, etc.). No hardcoded color values.

- **NFR-4: Responsive Layout** — The drawer width is fixed at 384px. On viewport widths below 768px, the canvas may be partially obscured — this is acceptable for the initial implementation since the app is primarily desktop-targeted. No responsive breakpoint handling required for v1.

- **NFR-5: Component Architecture** — The drawer follows the project's four-tier component hierarchy: (a) Tier 0 `drawer.tsx` in `components/ui/` is a generic, reusable shadcn/ui primitive with no feature-specific logic, (b) Tier 1 `FeatureDrawer` in `components/common/feature-drawer/` composes the Drawer primitive with feature-specific content layout. No feature-domain logic leaks into the UI primitive.

- **NFR-6: Testability** — The FeatureDrawer component accepts all data as props (no internal data fetching). This enables straightforward unit testing by passing mock FeatureNodeData. Test IDs or data-slot attributes should be added to key sections (header, status, details) for test selectors.

- **NFR-7: Bundle Impact** — The vaul dependency adds approximately 3-5KB gzipped. This is acceptable for the functionality it provides. The drawer component itself should have minimal additional bundle impact by reusing existing UI primitives (Badge, Progress, etc.) from shadcn/ui.

## Product Questions & AI Recommendations

| #   | Question                          | AI Recommendation                        | Rationale                                                                                 |
| --- | --------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | Vaul Drawer vs existing Sheet?    | Use Vaul Drawer                          | Swipe gestures, snap points, mobile-ready. Sheet is simpler but lacks touch interactions. |
| 2   | What content to display?          | All FeatureNodeData fields in 3 sections | Covers full data contract. Undefined fields are hidden. Extensible for future actions.    |
| 3   | Drawer direction?                 | Right side panel                         | Desktop canvas app standard. Inspector panel pattern (Figma, Miro, VS Code).              |
| 4   | Canvas overlay when drawer opens? | No overlay                               | Inspector panels don't dim content. Users need canvas context while inspecting.           |
| 5   | Drawer width?                     | 384px (w-96)                             | Standard inspector width. Balances detail space vs canvas visibility.                     |
| 6   | Content switch behavior?          | Update in-place                          | Avoids jarring close/open animation. Matches inspector panel UX.                          |
| 7   | Keyboard accessibility?           | Yes, full support                        | Escape closes, Tab navigates. Vaul provides ARIA built-in.                                |

## Affected Areas

| Area                                                             | Impact | Reasoning                                                                                                                                |
| ---------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `components/ui/drawer.tsx` (NEW)                                 | High   | New Tier 0 shadcn/ui primitive wrapping Vaul. Must be added via shadcn CLI or manually.                                                  |
| `components/common/feature-drawer/` (NEW)                        | High   | New Tier 1 component that composes the Drawer UI primitive with feature-specific content layout (header, status, details sections).      |
| `components/features/control-center/control-center-inner.tsx`    | Medium | Must integrate the feature drawer, passing `selectedNode` and `clearSelection` as props. Drawer renders as sibling to `FeaturesCanvas`.  |
| `components/features/control-center/use-control-center-state.ts` | Low    | State already tracks `selectedNode`. May need minor adjustments if drawer requires additional state (e.g., explicit open/close boolean). |
| `components/common/index.ts`                                     | Low    | Must export the new FeatureDrawer component.                                                                                             |
| `package.json` (@shepai/web)                                     | Low    | Must add `vaul` as a dependency.                                                                                                         |

## Dependencies

- **vaul** (npm package): Headless drawer component for React. Required by shadcn/ui Drawer. Not yet installed — must be added to @shepai/web.
- **Existing Sheet component** (`components/ui/sheet.tsx`): Reference for Radix-based sliding panel patterns but not directly used. Drawer is a separate primitive.
- **FeatureNodeData interface** (`components/common/feature-node/feature-node-state-config.ts`): Data contract for what the drawer displays. Already defined with name, description, featureId, lifecycle, state, progress, runtime, blockedBy, errorMessage, agentName.
- **featureNodeStateConfig** (`feature-node-state-config.ts`): State colors, icons, border classes, badge classes, and labels for rendering status within the drawer. Already defined for all five states.
- **lifecycleDisplayLabels** (`feature-node-state-config.ts`): Mapping from lifecycle phase enum to display labels. Already defined for all six phases.
- **useControlCenterState hook**: Already provides `selectedNode: FeatureNodeData | null` and `clearSelection: () => void`. The drawer consumes these directly.
- **Existing shadcn/ui primitives**: Badge, Progress, Separator, Button — may be composed within the drawer content sections.

## Size Estimate

**M** — This involves:

1. Installing vaul dependency and adding shadcn Drawer UI primitive (~30 min)
2. Creating FeatureDrawer common component with three content sections (~2-3 hours)
3. Integrating into ControlCenterInner (~30 min)
4. Writing Storybook stories for both new components (~1 hour)
5. Writing TDD tests — RED: unit tests for content rendering across all states, integration tests for open/close/switch; GREEN: minimal passing implementation; REFACTOR: cleanup (~1-2 hours)
6. Total: ~1-2 days of focused work

Estimated at M (days) because while individual pieces are straightforward, the feature requires
a new dependency, a new UI primitive, a new common component with multiple content sections,
Storybook stories, and TDD test coverage across the stack.

---

_Requirements complete — proceed with research to finalize technical approach and resolve implementation details_
