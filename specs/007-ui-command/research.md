# Research: ui-command

> Technical analysis for 007-ui-command

## Status

- **Phase:** Planning
- **Updated:** 2026-02-05

## Technology Decisions

### 1. Server Approach: In-Process Programmatic API

**Options considered:**

1. **Programmatic API** (`next()` + `app.prepare()` + custom HTTP server) — Run Next.js in the same Node.js process as the CLI
2. **Child Process** (`spawn` with `node_modules/.bin/next`) — Spawn Next.js as a separate process managed by the CLI

**Decision:** Programmatic API (in-process)

**Rationale:**

- **Shared runtime**: Next.js server pages/API routes run inside the CLI process and have direct access to the DI container, database connections, repositories, and use cases — no IPC or HTTP bridge needed
- **True Clean Architecture**: Both presentation layers (CLI and Web) share the exact same application/domain layer instances at runtime, not just the same code
- **Single initialization**: Database migrations, settings, and DI container are initialized once during CLI bootstrap — Next.js routes reuse them directly via `container.resolve()`
- **Simpler data flow**: Server components and API routes can call `container.resolve(LoadSettingsUseCase)` directly, no serialization/deserialization overhead

**Trade-offs accepted:**

- Loses Automatic Static Optimization (documented Next.js limitation for custom servers — acceptable since this is a dev tool, not a production deployment)
- Higher memory footprint in a single process (acceptable for a developer tool)
- `app.close()` has known quirks in dev mode — mitigated with HTTP server close + process exit handler

**Next.js programmatic API (confirmed working with v16+):**

```typescript
import next from 'next';
import { createServer } from 'node:http';

const app = next({ dev: true, dir: './src/presentation/web', port, hostname: 'localhost' });
const handle = app.getRequestHandler();
await app.prepare();

const server = createServer((req, res) => handle(req, res));
server.listen(port, () => console.log(`Ready on http://localhost:${port}`));
```

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

**Decision:** In-process shutdown via `server.close()` + `app.close()`

Since Next.js runs in-process (no child process tree to kill), shutdown is simpler:

1. SIGINT/SIGTERM handler stops accepting new connections (`server.close()`)
2. Close Next.js internals (`app.close()`)
3. Re-entrant guard (`isShuttingDown` flag) prevents double-shutdown
4. `process.exit(0)` after cleanup

No process group management needed — single process, single cleanup path.

### 4. Architecture Placement

**Decision:** Infrastructure service + CLI command

| Component             | Location                                            | Responsibility                                        |
| --------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `findAvailablePort()` | `src/infrastructure/services/port.service.ts`       | Port availability checking                            |
| `WebServerService`    | `src/infrastructure/services/web-server.service.ts` | Create Next.js app, HTTP server, lifecycle management |
| `createUiCommand()`   | `src/presentation/cli/commands/ui.command.ts`       | CLI command with `--port` option                      |
| Registration          | `src/presentation/cli/index.ts`                     | `program.addCommand(createUiCommand())`               |

The web server service lives in infrastructure because it manages the HTTP server and Next.js runtime. Next.js API routes/server components can import from the domain/application layer and resolve use cases from the DI container directly.

## Library Analysis

No new libraries required. The implementation uses only Node.js built-ins and existing dependencies:

| Module      | Purpose                                          |
| ----------- | ------------------------------------------------ |
| `node:net`  | Port availability checking (try-bind pattern)    |
| `node:http` | HTTP server creation for Next.js request handler |
| `next`      | Already installed — programmatic API (`next()`)  |

## Security Considerations

- **Port binding**: The server binds to `localhost` by default (not `0.0.0.0`), limiting exposure to the local machine only
- **No new dependencies**: Zero supply-chain risk — uses only Node.js built-in modules and existing `next` package
- **Port validation**: The `--port` flag input must be validated (integer, within valid range 1024-65535)
- **Shared process**: Web UI runs in the same process as CLI — same trust boundary, no additional attack surface

## Performance Implications

- **Startup time**: Next.js takes several seconds to compile and start — the CLI should show a "Starting..." indicator during `app.prepare()`
- **Memory**: Next.js dev mode can consume significant memory (100-500MB+) in the same process — acceptable for a developer tool
- **Port scanning**: The try-bind approach is fast (~1ms per port check) and limited to 20 attempts max
- **Shared resources**: Database connections and DI container instances are shared, reducing total resource usage vs separate processes

## Open Questions

All questions resolved.

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
