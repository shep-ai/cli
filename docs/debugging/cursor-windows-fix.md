# Cursor Agent on Windows — Fix Log

## Problem

`cursor / windows-latest` E2E job fails because `agent` binary (Cursor CLI) cannot be found on Windows.

## Root Cause

Cursor CLI ships as `.cmd`/`.ps1` scripts on Windows (not `.exe`). Node.js `execFile()` and `spawn()` without `shell: true` cannot resolve `.cmd` extensions, causing `ENOENT`.

## Attempts

### Attempt 1: winget install (FAILED)

- Used `winget install --id Anysphere.Cursor` in workflow
- **Result**: Installs Cursor IDE (GUI), NOT the `agent` CLI binary
- **Error**: `Binary "agent" not found or not executable: spawn agent ENOENT`

### Attempt 2: Native PowerShell installer (PARTIAL)

- Found official installer: `irm 'https://cursor.com/install?win32=true' | iex`
- Downloads `agent-cli-package.zip` from `downloads.cursor.com/lab/.../windows/x64/`
- Installs `cursor-agent.cmd`, `cursor-agent.ps1`, `agent.cmd`, `agent.ps1` to `$LOCALAPPDATA\cursor-agent`
- Also includes `node.exe`, `rg.exe`, `cursorsandbox.exe`
- **Result**: Install succeeds, `shep settings agent --agent cursor` still fails
- **Error**: `execFile('agent', ['--version'])` → ENOENT (can't find .cmd without shell)

### Attempt 3: Fix execFile in DI container (PARTIAL)

- Added `shell: true` + `windowsHide: true` to `execFileAsync` wrapper on Windows
- **Result**: `shep settings agent --agent cursor` now passes!
- **Error**: `shep feat new` fails — `spawn('agent', ...)` still ENOENT

### Attempt 4: Fix spawn in DI container (CURRENT)

- Also added `shell: true` + `windowsHide: true` to `spawnWithPipe` wrapper on Windows
- Both `execFile` and `spawn` now handle `.cmd` scripts on Windows
- **Files changed**:
  - `packages/core/src/infrastructure/di/container.ts` — shell: true for both execFn and spawnWithPipe on win32
  - `.github/workflows/shep-e2e.yml` — native PowerShell installer + correct PATH
  - `packages/core/src/infrastructure/services/tool-installer/tools/cursor-cli.json` — win32 command updated
- **Status**: Pushed, waiting for CI

## Key Learnings

1. Cursor CLI installs as `.cmd` scripts on Windows, not native `.exe`
2. Node.js `execFile`/`spawn` need `shell: true` to resolve `.cmd` on Windows
3. The official Windows installer URL is `https://cursor.com/install?win32=true`
4. Install path is `$LOCALAPPDATA\cursor-agent\` with `agent.cmd` as the primary command
