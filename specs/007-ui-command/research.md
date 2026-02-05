# Research: ui-command

> Technical analysis for 007-ui-command

## Status

- **Phase:** Research
- **Updated:** 2026-02-05

## Technology Decisions

### 1. Server Approach: Child Process vs Programmatic API

**Options considered:**

1. **Programmatic API** (`next()` + `app.prepare()` + custom HTTP server) — Run Next.js in the same Node.js process as the CLI
2. **Child Process** (`spawn` with `node_modules/.bin/next`) — Spawn Next.js as a separate process managed by the CLI
3. **Shell exec** (`child_process.exec('next dev')`) — Simple but buffered output, no streaming

**Decision:** Child Process via `spawn`

**Rationale:**

- **Process isolation**: Next.js dev mode is memory-heavy; keeping it separate protects the CLI process
- **All Next.js optimizations preserved**: The programmatic API loses Automatic Static Optimization (documented limitation)
- **Simpler lifecycle**: Kill the process tree to shut down (vs known issues with `app.close()` in dev mode)
- **Shared code, not shared process**: Both CLI and Web import the same domain/application layer TypeScript modules — they don't need to share a runtime instance
- **Readiness detection**: Watch stdout for Next.js "Ready" message, with port polling fallback
- **Direct binary execution**: Resolve `node_modules/.bin/next` directly (not via `npx`) to avoid an extra process layer

The programmatic API would only be preferred if we needed to intercept individual HTTP requests or share in-memory state between CLI and Web — neither is a current requirement.

### 2. Port Detection Strategy

**Options considered:**

1. **`detect-port`** (npm, 5.1M weekly downloads) — Tries 10 ports above starting port, 1 dependency
2. **`get-port`** (sindresorhus, 9.6M downloads) — Zero deps, ESM-only, `portNumbers()` range API
3. **`get-port-please`** (UnJS, 3M+ downloads) — Zero deps, dual ESM/CJS, `portRange` + `waitForPort()`
4. **Manual approach** (Vite-style, `node:net`) — Zero deps, ~30 lines, full control

**Decision:** Manual approach using `node:net`

**Rationale:**

- Zero external dependencies — avoids adding another package for ~30 lines of code
- The requirement is simple: try port N, if EADDRINUSE try N+1, repeat
- Full control over behavior (no surprise random port fallback like library defaults)
- Same pattern used by Vite internally — proven approach
- Can set a reasonable upper bound (try 20 ports, then fail with a clear error)
- TOCTOU gap (check port, then start server) is acceptable for a developer tool

**Implementation pattern:**

```typescript
async function findAvailablePort(startPort: number, maxAttempts = 20): Promise<number> {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found between ${startPort}-${startPort + maxAttempts - 1}`);
}
```

### 3. Signal Handling & Graceful Shutdown

**Options considered:**

1. **Simple SIGINT handler** — Just kill child on Ctrl+C
2. **Process group management** — `detached: true` + negative PID kill for entire process tree
3. **Full lifecycle manager** — SIGINT/SIGTERM handlers + force-kill timeout + exit handler

**Decision:** Process group management with force-kill timeout

**Rationale:**

- `next dev` spawns sub-processes (Node.js workers, etc.) — killing just the direct child can leave orphans
- `detached: true` creates a process group; `process.kill(-child.pid, 'SIGTERM')` kills the entire tree
- 5-second force-kill timeout (SIGKILL) as safety net
- Synchronous `process.on('exit')` handler as last resort
- Re-entrant guard (`isShuttingDown` flag) prevents double-shutdown

### 4. Architecture Placement

**Decision:** Infrastructure service + CLI command

| Component             | Location                                            | Responsibility                               |
| --------------------- | --------------------------------------------------- | -------------------------------------------- |
| `findAvailablePort()` | `src/infrastructure/services/port.service.ts`       | Port availability checking                   |
| `WebServerService`    | `src/infrastructure/services/web-server.service.ts` | Spawn, monitor, and shutdown Next.js process |
| `createUiCommand()`   | `src/presentation/cli/commands/ui.command.ts`       | CLI command with `--port` option             |
| Registration          | `src/presentation/cli/index.ts`                     | `program.addCommand(createUiCommand())`      |

This follows existing patterns (`VersionService`, `SettingsService`) and Clean Architecture layer separation. The web server service lives in infrastructure because it manages an external process.

## Library Analysis

No new libraries required. The implementation uses only Node.js built-ins:

| Module               | Purpose                                                                   |
| -------------------- | ------------------------------------------------------------------------- |
| `node:net`           | Port availability checking (try-bind pattern)                             |
| `node:child_process` | Spawning Next.js server via `spawn` (not `exec` — avoids shell injection) |
| `node:path`          | Resolving `node_modules/.bin/next` binary path                            |

## Security Considerations

- **Port binding**: The server binds to `localhost` by default (not `0.0.0.0`), limiting exposure to the local machine only
- **No new dependencies**: Zero supply-chain risk — uses only Node.js built-in modules
- **No shell execution**: Uses `spawn` (direct binary exec), not `exec` (shell) — no command injection risk
- **Process isolation**: The web server runs in a separate process, so a crash or vulnerability in the web UI doesn't bring down the CLI process
- **Port validation**: The `--port` flag input must be validated (integer, within valid range 1024-65535)

## Performance Implications

- **Startup time**: Next.js dev server takes several seconds to compile and start — the CLI should show a "Starting..." indicator while waiting
- **Memory**: Next.js dev mode can consume significant memory (100-500MB+) — this is expected and isolated in the child process
- **Port scanning**: The try-bind approach is fast (~1ms per port check) and limited to 20 attempts max

## Open Questions

All questions resolved.

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
