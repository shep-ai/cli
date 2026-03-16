# E2E Matrix Test Suite — Fix Log

Cross-platform E2E testing across all supported OS + agent combinations.
This is the living debugging log for the `shep-e2e.yml` workflow and Windows support in the main CI pipeline.

## Matrix Coverage

| Agent       | ubuntu-latest | windows-latest | macos-latest |
| ----------- | ------------- | -------------- | ------------ |
| dev         | PASS          | PASS           | PASS         |
| claude-code | PASS          | PASS           | PASS         |
| cursor      | PASS          | TESTING        | PASS         |

## CI Pipelines

| Pipeline | File           | Windows Jobs                        |
| -------- | -------------- | ----------------------------------- |
| CI/CD    | `ci.yml`       | Unit tests, CLI E2E (matrix)        |
| Shep E2E | `shep-e2e.yml` | dev + claude-code + cursor (matrix) |
| PR Check | `pr-check.yml` | N/A (commit lint only)              |

---

## Full-SDLC Jobs

| Job                                   | Status | Notes                                                 |
| ------------------------------------- | ------ | ----------------------------------------------------- |
| claude-code / windows / full-sdlc     | PASS   | Local merge + null TDD guard + temp file commit       |
| claude-code / ubuntu / full-sdlc + pr | PASS   | Rate limit handling + increased timeout (20 min poll) |

## Current Status

### Main CI (`ci.yml`) — Windows

| Job                  | Status | Notes                                                        |
| -------------------- | ------ | ------------------------------------------------------------ |
| Unit tests (windows) | PASS   | Path normalization + cross-platform assertions fixed         |
| CLI E2E (windows)    | PASS   | Process kill (`taskkill`), path separator (`path.sep`) fixed |
| TUI E2E              | N/A    | Ubuntu-only (no Windows matrix)                              |
| Web E2E              | N/A    | Ubuntu-only (Playwright)                                     |

### Shep E2E (`shep-e2e.yml`) — Full Matrix

| Combo                 | Status  | Notes                                                           |
| --------------------- | ------- | --------------------------------------------------------------- |
| dev / ubuntu          | PASS    | Baseline — no subprocess spawning                               |
| dev / windows         | PASS    | Same — pure in-process                                          |
| dev / macos           | PASS    | Same                                                            |
| claude-code / ubuntu  | PASS    | Full lifecycle                                                  |
| claude-code / windows | PASS    | `windowsHide: true`, no `shell: true` needed (.exe binary)      |
| claude-code / macos   | PASS    | Full lifecycle                                                  |
| cursor / ubuntu       | PASS    | Full lifecycle                                                  |
| cursor / windows      | TESTING | Direct node.exe invocation + API key injection (attempts 21-22) |
| cursor / macos        | PASS    | Full lifecycle                                                  |

---

## Fixes Applied

### Round 1: Cursor on Windows (Attempts 1-9)

| #   | Commit     | Fix                                                            | Result  |
| --- | ---------- | -------------------------------------------------------------- | ------- |
| 1   | `37f1204b` | Native PowerShell installer for Windows                        | PARTIAL |
| 2   | `4ba500ef` | `shell: true` for `execFile` on Windows (DI container)         | PARTIAL |
| 3   | `3a39f3fc` | `shell: true` for `spawn` on Windows (DI container)            | PARTIAL |
| 4   | `44c3c80f` | `--yolo` flag for cursor CLI workspace trust                   | PARTIAL |
| 5   | `b1986348` | Move `--yolo` before `-p` in cursor args                       | PARTIAL |
| 6   | `c04491f4` | Local fallback for metadata generation when AI fails           | PARTIAL |
| 7   | `71d8eccf` | Switch model to `claude-haiku-4-5` + add 5-min timeout         | PARTIAL |
| 8   | `351869da` | Use `json` format instead of `stream-json` + raw text fallback | PARTIAL |
| 9   | —          | Exclude cursor/windows from matrix; add hourly schedule        | PASS    |

### Round 1b: Cursor Model Compatibility (Attempt 10)

| #   | Commit | Fix                                                                             | Result |
| --- | ------ | ------------------------------------------------------------------------------- | ------ |
| 10  | —      | Use `auto` model for cursor in E2E workflow — cursor CLI has its own model list | PASS   |

**Root cause**: Cursor CLI doesn't support `claude-haiku-4-5`. Its available models are agent-specific (e.g., `auto`, `composer-1.5`, `gpt-5.x` variants, `sonnet-4.x`, `opus-4.x`). Passing `--model haiku-4.5` causes immediate failure on ubuntu and macOS (not just Windows).

### Round 2: Broad Windows Compatibility (Attempt 11)

| Area                 | Fix                                                                        |
| -------------------- | -------------------------------------------------------------------------- |
| DI container         | Removed blanket `shell: true` from `spawnWithPipe` — each executor owns it |
| Cursor executor      | Explicitly sets `shell: true` + `windowsHide: true` + `stdio: pipe`        |
| Gemini executor      | Explicitly sets `windowsHide: true` + `stdio: pipe` (no shell)             |
| Worktree hash        | Normalize `repoPath` to forward slashes before SHA-256 hashing             |
| Worktree `remove()`  | Added `repoPath` param so git runs with correct `cwd`                      |
| IDE launcher         | Split template before `{dir}` substitution — preserves paths with spaces   |
| `feat.test.ts`       | `pkill` → `wmic` on Windows; `sleep` → `Atomics.wait`                      |
| `help.test.ts`       | `process.kill(-pid)` → `taskkill /T /F` on Windows                         |
| `build-integrity.ts` | `path.sep` instead of hardcoded `/` for path stripping                     |

---

## Cursor on Windows

### Problem

Cursor CLI ships as `.cmd`/`.ps1` scripts on Windows. Node.js needs `shell: true` to resolve `.cmd`, but `shell: true` causes `cmd.exe` to mangle long `-p` prompt arguments — corrupting structured JSON prompts and `--output-format` flags.

### What works

- Install: `irm 'https://cursor.com/install?win32=true' | iex` → `$LOCALAPPDATA\cursor-agent\agent.cmd`
- Agent validation: `execFile('agent', ['--version'])` with `shell: true`
- Feature creation: metadata generation with local fallback
- Implementation: cursor creates files (but reports 0 chars due to output parsing)

### What breaks

- `--output-format stream-json` → ignored by `cmd.exe`, cursor outputs raw text
- Long `-p` prompts → garbled by `cmd.exe` argument escaping
- Merge phase → cursor gets corrupted prompt, asks "What would you like me to do?" instead of committing

### Fix Applied (Attempt 12 — stdin pipe)

- **stdin-based prompt passing**: on Windows, `-p` is omitted from args; prompt is piped via `proc.stdin.write()` instead
- Result: **FAILED** — cursor CLI does not read prompts from stdin, hangs indefinitely waiting for `-p`

### Fix Applied (Attempt 13 — PowerShell + temp file)

- **PowerShell-based invocation**: on Windows, prompt is written to a temp file, then `powershell.exe` is spawned instead of `cmd.exe`
- PowerShell reads the file with `Get-Content -Raw` and passes it as `-p $p` to agent
- This bypasses cmd.exe entirely — PowerShell has a 32K char limit (vs cmd.exe's 8K) and doesn't mangle arguments
- `shell: true` is no longer used; PowerShell resolves `agent.cmd` natively
- Temp file is cleaned up in the `close` handler
- Cursor/windows is now **enabled** in the E2E matrix

---

## Key Learnings

### Windows Process Management

1. `process.kill(-pid)` (negative PID for process group kill) is POSIX-only — use `taskkill /pid X /T /F` on Windows
2. `pkill` and `sleep` shell commands don't exist on Windows — use Node.js APIs (`wmic`, `Atomics.wait`)
3. Windows `.cmd` scripts need `shell: true` in `execFile`/`spawn` — native `.exe` binaries do not

### Windows Path Handling

4. `path.join()` produces backslashes on Windows — always normalize to `/` before hashing or comparing
5. IDE launcher: split template string before `{dir}` substitution to preserve paths with spaces
6. `git worktree remove` needs an explicit `cwd` — without it, inherits process cwd which may not be a git repo
7. Use `path.sep` instead of hardcoded `/` when stripping path prefixes in assertions

### Agent Executor Architecture

8. Each executor should own its own `shell` option — don't set it centrally in the DI wrapper
9. `shell: true` with `spawn()` causes DEP0190 + argument escaping issues (packages/CLAUDE.md warns against this)
10. Always add a timeout to agent executor calls to prevent infinite hangs

### Round 3: Programmatic Merge + CI Robustness (Attempts 14-19)

| #   | Commit     | Fix                                                                   | Result                                                |
| --- | ---------- | --------------------------------------------------------------------- | ----------------------------------------------------- |
| 14  | `ccc027a7` | Replace agent-based local merge with programmatic `localMergeSquash`  | cursor/ubuntu+macos PASS, dev jobs FAIL (empty merge) |
| 15  | `99de008`  | Handle empty squash merge (skip commit when nothing to commit)        | dev jobs PASS, claude/windows FAIL (untracked files)  |
| 16  | `5bd85caf` | `git clean -fd` before merge + null TDD field guards in implement     | 9/11 PASS, claude/windows FAIL (shell splitting)      |
| 17  | `1b98529d` | Use `--message=` form for commit message                              | Still fails — cmd.exe splits on `=` too               |
| 18  | `0f262bf9` | Use temp file + `git commit --file` to avoid shell splitting entirely | 10/11 PASS — only cursor/windows hangs                |
| 19  | `0b94794f` | Increase e2e wait timeouts (20 min poll, 25 min step for full-sdlc)   | 10/11 PASS — full-sdlc+pr now completes               |
| 20  | `8cff192d` | Use `taskkill /F /T /PID` for cursor timeout on Windows (tree kill)   | TESTING                                               |

**Root cause (merge)**: Cursor agent doesn't reliably execute `git merge --squash`. Replaced with deterministic `localMergeSquash` method that runs git commands directly. Also handles: empty merges (dev executor), untracked files (leaked agent files), and Windows `shell: true` commit message splitting.

**Root cause (CI watch)**: GitHub API rate limits (HTTP 403) crash the CI watch loop. Added graceful catch-and-skip for rate limit errors.

**Root cause (cursor/windows)**: Cursor CLI agent hangs indefinitely on Windows CI runners. PowerShell spawns `agent.cmd` but the process never produces output. `proc.kill()` doesn't terminate the process tree. Added `taskkill /F /T` for proper tree kill on timeout.

### Cursor-Specific

11. Cursor CLI installs as `.cmd` scripts on Windows, not native `.exe`
12. Official installer: `https://cursor.com/install?win32=true` → `$LOCALAPPDATA\cursor-agent\agent.cmd`
13. Cursor CLI uses `--yolo` (not `--force`) to skip workspace trust; must appear BEFORE `-p`
14. `--output-format stream-json` is broken on Windows with `shell: true` — use `json` format instead
15. `composer-1.5` model returns 0 chars with `--output-format stream-json` — use `claude-haiku-4-5`
16. Cursor CLI has its own model list (not Anthropic model IDs) — use `auto` instead of `claude-haiku-4-5` in E2E tests
17. `agent.cmd` spawns PowerShell → `cursor-agent.ps1` → `node.exe index.js` — nesting chains hang in CI
18. Direct `node.exe index.js` invocation (bypassing all shell wrappers) eliminates spawn hangs
19. `CursorExecutorService` factory did NOT pass `authConfig` — `CURSOR_API_KEY` was never injected into subprocess env

### Round 4: Direct Invocation + API Key Injection (Attempts 21-22)

| #   | Commit | Fix                                                                           | Result  |
| --- | ------ | ----------------------------------------------------------------------------- | ------- |
| 21  | —      | Bypass PowerShell nesting: resolve `node.exe` + `index.js` directly on Win    | PARTIAL |
| 22  | —      | Inject `CURSOR_API_KEY` via `authConfig` into subprocess env (was never set!) | TESTING |

**Root cause (attempt 21)**: The `agent.cmd` → PowerShell → `cursor-agent.ps1` → `node.exe` nesting chain hangs on Windows CI runners. Direct invocation of `node.exe index.js` via `resolveCursorBinary()` eliminates the chain entirely. Spawn no longer hangs — PID created successfully.

**Root cause (attempt 22)**: Cursor agent spawned but produced zero output for 10 minutes. Investigation revealed `CursorExecutorService` constructor never received `authConfig` from the factory (unlike `GeminiCliExecutorService` which did). The `CURSOR_API_KEY` env var was never injected into the subprocess environment. On Linux/macOS this worked because the CI step's `env:` block inherited `CURSOR_API_KEY` into the process tree. On Windows with direct `node.exe` invocation, the env is constructed explicitly and the key was missing. Fix: accept `authConfig` in constructor, inject `CURSOR_API_KEY` via `buildEnv()` helper across all spawn paths.
