## Architecture Overview

The feature drawer integrates into the existing four-tier component hierarchy:

```
ControlCenterInner (Tier 3 - features/)
├── FeaturesCanvas (Tier 3 - features/)
│   └── FeatureNode (Tier 1 - common/)
└── FeatureDrawer (Tier 1 - common/)    ← NEW
    └── Drawer (Tier 0 - ui/)           ← NEW
        └── Vaul primitives
```

The Drawer UI primitive follows the exact pattern established by `sheet.tsx`: a headless library
(Vaul instead of Radix Dialog) wrapped with styled sub-components. Each sub-component uses
`data-slot` attributes for CSS targeting, `cn()` for className merging, and spreads remaining
props. The component exports follow the named-function pattern with a barrel export at the bottom.

The FeatureDrawer follows the same directory structure as `feature-node/` — a subdirectory
under `components/common/` containing the component file, colocated stories, and a barrel
`index.ts`. It is re-exported from `components/common/index.ts`.

The integration point is `ControlCenterInner`, which already destructures `selectedNode` and
`clearSelection` from `useControlCenterState` but currently passes neither to any visible UI.
The drawer renders as a Vaul portal (to `document.body`) — it does not affect the FeaturesCanvas
DOM tree or ReactFlow's viewport calculations.

### Data Flow

```
User clicks FeatureNode on canvas
  → handleNodeClick sets selectedNode (useControlCenterState)
  → ControlCenterInner re-renders
  → FeatureDrawer receives selectedNode !== null → Drawer opens

User clicks canvas pane / Escape / close button
  → clearSelection / onOpenChange(false) sets selectedNode to null
  → ControlCenterInner re-renders
  → FeatureDrawer receives selectedNode === null → Drawer closes

User clicks different FeatureNode while drawer is open
  → handleNodeClick updates selectedNode with new data
  → FeatureDrawer re-renders in-place with new content (no close/reopen)
```

## Key Design Decisions

### 1. Vaul Drawer over existing Sheet (Radix Dialog)

The Sheet component (`sheet.tsx`) wraps Radix Dialog which is inherently modal — it traps
focus, adds an overlay, and blocks background interaction. Achieving non-modal behavior
requires fighting against Radix Dialog's design (removing overlay, disabling focus trap,
preventing `pointer-events: none` on body). Vaul provides `modal={false}` natively, keeping
the canvas fully interactive while the drawer is open. This matches the inspector panel UX
pattern used in Figma, Miro, and VS Code. The ~3-5KB gzipped bundle cost is minimal.

### 2. Derived open state (no new state variable)

The drawer's visibility is derived from `selectedNode !== null`. No additional `isDrawerOpen`
boolean is needed. This avoids redundant state that must be kept in sync and eliminates a
class of consistency bugs. The `onOpenChange` callback from Vaul maps directly to
`clearSelection` via the `onClose` prop.

### 3. Portal rendering with fixed positioning

Vaul renders via portal to `document.body` with `position: fixed`, overlaying the right 384px
(w-96) of the canvas viewport. This avoids fighting Vaul's layout model and prevents ReactFlow
viewport recalculation that would occur with a flex-sibling approach where the canvas resizes.

### 4. Inline progress bar (no new Progress UI component)

The existing `feature-node.tsx` implements an inline progress bar using simple divs
(`bg-muted` container + colored fill with `progressClass`). The drawer follows the same
pattern for consistency. A Tier 0 Progress component can be extracted later if more consumers
need it.

### 5. Three inline sections (no sub-components)

Header, Status, and Details are rendered as inline JSX within FeatureDrawer (~80-100 lines
total). Each section is ~15-25 lines of JSX used in one place. Splitting into separate
sub-component files would be premature abstraction. Sections are delimited by the existing
Separator component.

### 6. Styling reuse from featureNodeStateConfig

The drawer imports `featureNodeStateConfig` and `lifecycleDisplayLabels` directly from
`components/common/feature-node/feature-node-state-config.ts` (already re-exported via
`components/common/index.ts`). This ensures visual consistency between the canvas node
and the drawer content — same icons, colors, and labels.

## Implementation Strategy

Phase 1 comes first because the Tier 0 Drawer primitive is a dependency of the Tier 1
FeatureDrawer. Phase 2 builds the feature-specific component with full test coverage using
the Drawer from Phase 1. Phase 3 wires everything together in the actual page component.

This ordering means each phase can be independently verified:

- **Phase 1**: Storybook stories confirm Drawer opens/closes/animates in all four directions
- **Phase 2**: Vitest unit tests confirm all 5 states × 6 lifecycle phases render correctly;
  Storybook stories provide visual coverage of every state combination
- **Phase 3**: Manual verification of the full integration — open/close/switch/Escape/pane-click

### Vaul Configuration for Right-Side Non-Modal Drawer

```tsx
<Drawer.Root direction="right" modal={false} open={open} onOpenChange={onOpenChange}>
  <Drawer.Portal>
    <Drawer.Content
      className="bg-background fixed inset-y-0 right-0 z-50 flex h-full w-96 flex-col"
      style={{ '--initial-transform': 'calc(100% + 8px)' }}
    >
      {/* content */}
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
```

### Composed Existing Primitives

The FeatureDrawer composes these existing UI components:

- **Badge** (`components/ui/badge.tsx`) — State badge with icon and styled background
- **Separator** (`components/ui/separator.tsx`) — Between Header, Status, and Details sections
- **CometSpinner** (`components/ui/comet-spinner.tsx`) — Animated spinner for running state
- **Lucide icons** — State icons from `featureNodeStateConfig`, XIcon for close button

## Risk Mitigation

| Risk                                                         | Mitigation                                                                                                                                                                    |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vaul non-modal + right-direction edge cases                  | Research confirmed this combination works. Use `--initial-transform: calc(100% + 8px)` CSS variable on DrawerContent. Verify in Storybook before integration.                 |
| Escape key conflict between Vaul and useControlCenterState   | Both fire clearSelection — selectedNode is set to null either way. No conflict. Verified by reading both implementations.                                                     |
| Drawer portal outside React context providers                | Vaul uses React portal which preserves React context (theme, providers). Standard React behavior.                                                                             |
| Canvas re-renders when drawer content changes                | Drawer is portal-based, outside ReactFlow DOM. FeaturesCanvas does not consume selectedNode. Only ControlCenterInner re-renders, passing new props to FeatureDrawer.          |
| No existing Progress UI component                            | Use inline div-based progress bar matching feature-node.tsx pattern. Keep it consistent, extract later if needed.                                                             |
| vaul peer dependency compatibility with React 19             | Check vaul's peerDependencies during install. Vaul v1+ supports React 18/19. Fall back to pinning a compatible version if needed.                                             |
| `selectedNode` carries callback props (onAction, onSettings) | FeatureDrawer should only read data display fields from FeatureNodeData, ignoring callback props. These callbacks are for node interactions, not drawer actions.              |
| Native OS dialog blocks E2E tests                            | Use Playwright route interception to mock `/api/dialog/pick-files`. Return controlled file paths without spawning actual OS dialogs.                                          |
| `CreateFeatureFormData` interface change breaks consumers    | Only `handleCreateFeatureSubmit` in `useControlCenterState` consumes this type, and it doesn't use `attachments` at all — safe to change from `File[]` to `FileAttachment[]`. |
| File picker returns paths but no metadata                    | The API route calls `fs.statSync()` on each returned path to get file size. File name is derived from `path.basename()`.                                                      |
| MIME type unavailable from native picker                     | Switch icon mapping from MIME-based to extension-based. Use a simple extension lookup (`.png`→image, `.pdf`→pdf, `.ts`→code, etc.).                                           |

## Phase 4-5: Native File Picker Integration

### Architecture

Extends the existing native dialog bridge pattern (FolderDialogService → API route → client helper):

```
FeatureCreateDrawer (client)
  → pickFiles() (client helper)
  → POST /api/dialog/pick-files (Next.js API route)
  → FileDialogService.pickFiles() (infrastructure service)
  → OS-native file dialog (osascript / zenity / PowerShell)
  → Returns: FileAttachment[] { path, name, size }
```

### FileDialogService Design

New sibling to `FolderDialogService`, same architecture pattern:

```typescript
// Platform-specific commands
darwin: osascript -e 'set f to (choose file with prompt "Select files" with multiple selections allowed)
        set paths to {} / repeat with i in f / copy POSIX path of i to end of paths / end repeat
        set text item delimiters to "\n" / paths as text'
linux:  zenity --file-selection --multiple --separator="\n" --title="Select files" 2>/dev/null
win32:  powershell OpenFileDialog with Multiselect, FileNames joined by newline
```

Returns `string[]` (array of absolute paths) or `null` on cancel.

### FileAttachment Interface

Replaces `File[]` in `CreateFeatureFormData`:

```typescript
interface FileAttachment {
  path: string; // Full absolute path (e.g., /Users/dev/docs/spec.pdf)
  name: string; // Filename only (e.g., spec.pdf)
  size: number; // Size in bytes from fs.statSync()
}

interface CreateFeatureFormData {
  name: string;
  description: string;
  attachments: FileAttachment[]; // Changed from File[]
}
```

### AttachmentCard Changes

- Shows full file path as subtitle below the filename
- Icon mapping uses file extension instead of MIME type
- File size display unchanged (same formatFileSize utility)

### E2E Test Strategy

The Playwright E2E test uses route interception to avoid spawning actual OS dialogs:

```typescript
await page.route('**/api/dialog/pick-files', (route) =>
  route.fulfill({
    json: {
      files: [{ path: '/Users/test/docs/requirements.pdf', name: 'requirements.pdf', size: 42000 }],
      cancelled: false,
    },
  })
);
```

Test scenario:

1. Navigate to control center (/)
2. Click "+ Add Feature" to open create drawer
3. Type feature name
4. Click "Add Files" (triggers mocked native picker)
5. Verify attachment card shows full path (/Users/test/docs/requirements.pdf)
6. Submit and verify
