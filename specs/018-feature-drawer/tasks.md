## Summary

12 tasks across 5 phases, estimated at ~11 hours total.

**Phases 1-3 (complete, 8 tasks)** established the Drawer UI primitive, FeatureDrawer
component, and integration into ControlCenterInner.

**Phase 4 (Native File Dialog Infrastructure, 2 tasks)** creates the FileDialogService
with platform-specific OS commands for file picking (parallel to the existing
FolderDialogService for folders). Includes the API route and client helper following
the same architecture pattern.

**Phase 5 (FeatureCreateDrawer Integration & E2E, 2 tasks)** replaces the browser
`<input type="file">` with the native OS file picker, changes the attachment data model
from `File[]` to `FileAttachment[]` (with full absolute paths), updates the UI to display
full file paths, and validates with a Playwright E2E test.

### Definition of Done

E2E test passes with the following scenario:

1. Navigate to control center
2. Open create feature drawer
3. Type a feature name
4. Click "Add Files" → native file picker returns a file
5. Attachment card shows the **full absolute file path** (not just name/size/type)
6. Submit the feature successfully

### TDD Cycles

- **Task 9 (RED→GREEN)**: Unit tests for FileDialogService before implementation
- **Task 10 (RED→GREEN)**: Unit tests for API route before implementation
- **Task 11 (RED→GREEN)**: Update existing unit tests to expect FileAttachment[], then
  modify the component to pass them
- **Task 12**: Playwright E2E test (no TDD cycle — E2E is the final validation)
