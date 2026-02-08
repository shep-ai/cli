# Research: refactor-logger-system

> Technical analysis for 011-refactor-logger-system

## Status

- **Phase:** Research
- **Updated:** 2026-02-08

## Technology Decisions

### 1. Core Logger Library (pino)

**Options considered:**

1. **pino** - High-performance JSON logger with worker thread transports
2. **winston** - Feature-rich, most popular Node.js logger
3. **bunyan** - Mature JSON logger with CLI tools

**Decision:** pino v9+

**Rationale:**

- **Performance**: 5-10x faster than winston/bunyan due to minimal overhead and worker thread transports ([source](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/))
- **JSON-first**: Native structured logging without serialization overhead
- **TypeScript support**: Excellent type definitions and TypeScript-friendly API
- **Production-ready**: Used by Fastify, Netflix, and other high-scale Node.js applications
- **Transport system**: Pino 7+ uses worker threads to offload log processing, preventing blocking of the event loop ([source](https://signoz.io/guides/pino-logger/))
- **Ecosystem**: Rich ecosystem with transports for file rotation, pretty printing, and remote logging services

### 2. Log Rotation Strategy

**Options considered:**

1. **pino-roll** - Sonic-boom based with structured file naming and symlink support
2. **pino-rotating-file-stream** - Uses rotating-file-stream under the hood
3. **System logrotate** - External utility for rotation (pino + logrotate)

**Decision:** pino-roll

**Rationale:**

- **Built on Sonic-boom**: Leverages Pino's native high-performance stream writer
- **Structured naming**: Files follow `filename.date.count.extension` format (e.g., `shep.2026-02-08.1.log`)
- **Symlink support**: Creates `current.log` symlink pointing to active file for easy monitoring
- **Native integration**: Better integration with Pino's transport system than third-party solutions
- **Dual rotation**: Supports both time-based (daily) and size-based rotation out of the box
- **Active maintenance**: More recent updates compared to pino-rotating-file-stream ([source](https://github.com/pinojs/pino/issues/1323))
- **Auto directory creation**: Creates log directories automatically if missing

### 3. Multi-Layer Configuration System

**Options considered:**

1. **Environment variables only** - Simple but inflexible
2. **Settings domain model only** - Persisted but can't override per-command
3. **Multi-layer precedence** - CLI flag > ENV > Settings (CHOSEN)

**Decision:** Multi-layer precedence (CLI flag > ENV > Settings)

**Rationale:**

- **Flexibility**: Users can override log level per command without changing global settings
- **Standard pattern**: Matches 12-factor app configuration precedence
- **Debugging**: Developers can quickly enable debug logs: `shep analyze --log-level debug`
- **CI/CD friendly**: Containers can set `LOG_LEVEL=info` without modifying persisted settings
- **User preference**: Default log level stored in Settings provides consistent UX
- **Implementation**: Use commander's `option()` with `process.env.LOG_LEVEL` fallback, then query Settings ([source](https://blog.logrocket.com/top-five-typescript-dependency-injection-containers/))

**Implementation approach:**

```typescript
// 1. CLI flag (highest priority)
const cliLevel = program.opts().logLevel;

// 2. Environment variable
const envLevel = process.env.LOG_LEVEL;

// 3. Settings (lowest priority)
const settings = await getSettings();
const settingsLevel = settings.system.logLevel;

// Resolve precedence
const logLevel = cliLevel || envLevel || settingsLevel || 'info';
```

### 4. DI Container Integration

**Options considered:**

1. **Singleton factory function** - Simple but tight coupling
2. **tsyringe @singleton()** - Declarative, already used in project
3. **Manual container registration** - Explicit but verbose

**Decision:** tsyringe @singleton() with ILogger interface

**Rationale:**

- **Consistency**: Project already uses tsyringe for DI ([source](https://github.com/microsoft/tsyringe))
- **Singleton lifecycle**: Logger must be singleton to maintain consistent configuration
- **Testability**: ILogger interface allows easy mocking in tests
- **Type safety**: Full IntelliSense support with TypeScript decorators
- **Lazy initialization**: Logger configured once at bootstrap, resolved on-demand
- **Best practice**: Use singleton for shared resources like loggers ([source](https://blog.logrocket.com/top-five-typescript-dependency-injection-containers/))

**DI pattern:**

```typescript
// Define interface
export interface ILogger {
  debug(msg: string, context?: object): void;
  info(msg: string, context?: object): void;
  warn(msg: string, context?: object): void;
  error(msg: string, context?: object): void;
}

// Implement with Pino
@singleton()
export class PinoLogger implements ILogger {
  private logger: pino.Logger;

  constructor(@inject('LoggerConfig') config: LoggerConfig) {
    this.logger = pino(config);
  }
  // ...
}

// Register in container
container.register('ILogger', { useClass: PinoLogger });
```

### 5. SQLite FTS5 for Log Search

**Options considered:**

1. **SQLite FTS5** - Built-in full-text search extension
2. **Simple LIKE queries** - Basic but slow for large datasets
3. **External search engine** (Elasticsearch) - Overkill for CLI tool

**Decision:** SQLite FTS5 with bm25 ranking

**Rationale:**

- **Zero dependencies**: FTS5 is built into SQLite, no extra dependencies
- **Performance**: Inverted index makes search fast even with millions of logs
- **Ranking**: Built-in bm25() function for relevance scoring ([source](https://blog.sqlite.ai/fts5-sqlite-text-search-extension))
- **Boolean queries**: Supports AND, OR, NOT operators
- **Phrase search**: Find exact phrases with quotes
- **Already available**: better-sqlite3 (already in dependencies) supports FTS5
- **Simple migration**: Create virtual table + triggers for auto-sync ([source](https://thelinuxcode.com/sqlite-full-text-search-fts5-in-practice-fast-search-ranking-and-real-world-patterns/))

**Schema pattern:**

```sql
-- Main logs table
CREATE TABLE logs (id TEXT PRIMARY KEY, message TEXT, ...);

-- FTS5 virtual table
CREATE VIRTUAL TABLE logs_fts USING fts5(message, content=logs);

-- Auto-sync trigger
CREATE TRIGGER logs_fts_insert AFTER INSERT ON logs BEGIN
  INSERT INTO logs_fts(rowid, message) VALUES (new.rowid, new.message);
END;
```

### 6. Server-Sent Events (SSE) for Real-time Streaming

**Options considered:**

1. **Server-Sent Events (SSE)** - Unidirectional, simple, HTTP-based
2. **WebSockets** - Bidirectional but overkill for log streaming
3. **Polling** - Simple but inefficient

**Decision:** Server-Sent Events (SSE) via ReadableStream

**Rationale:**

- **Unidirectional**: Logs only flow server → client (perfect for SSE)
- **HTTP-based**: Works through firewalls/proxies, no special protocol
- **Native support**: Next.js 13+ supports streaming responses with ReadableStream
- **Automatic reconnection**: Browsers auto-reconnect on connection drop
- **Event buffering**: Can buffer recent events for late-joining clients
- **Better-sse library**: TypeScript-first library with channels and event buffers ([source](https://www.npmjs.com/package/better-sse))
- **2026 best practices**: Recent guides confirm SSE is standard for log streaming ([source](https://medium.com/@oyetoketoby80/fixing-slow-sse-server-sent-events-streaming-in-next-js-and-vercel-99f42fbdb996))

**Implementation pattern:**

```typescript
// API route: /api/logs/stream
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const entry of streamLogsUseCase.execute(filters)) {
        const data = `data: ${JSON.stringify(entry)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

### 7. Migration Strategy (Incremental)

**Options considered:**

1. **Big-bang migration** - Replace all console.\* calls at once
2. **Incremental migration** - Migrate layer by layer, file by file
3. **Adapter pattern** - Wrap console.\* temporarily during transition

**Decision:** Incremental migration with lint rule enforcement

**Rationale:**

- **Production safety**: Minimizes risk of breaking existing functionality ([source](https://medium.com/@navidbarsalari/incremental-migration-evolving-without-breaking-production-edf679769918))
- **Testability**: Can test each layer independently as it's migrated
- **Rollback friendly**: Easy to revert individual modules if issues arise
- **Team coordination**: Multiple developers can work on different areas
- **2026 best practice**: Incremental migration is standard for large refactors ([source](https://learnwebcraft.com/learn/typescript/migrating-javascript-to-typescript-guide))

**Migration phases:**

1. **Phase 1**: Add logger to DI container, keep console.\* working
2. **Phase 2**: Migrate infrastructure layer (repositories, services)
3. **Phase 3**: Migrate application layer (use cases)
4. **Phase 4**: Migrate presentation layer (CLI commands, web routes)
5. **Phase 5**: Update tests to mock ILogger
6. **Phase 6**: Add ESLint rule to ban console.\* (except in logger implementation)

**ESLint rule:**

```javascript
'no-console': ['error', { allow: [] }], // Enforced in Phase 6
```

### 8. Testing Strategy (Vitest + Mocking)

**Options considered:**

1. **Mock entire pino module** - Simple but loses type safety
2. **ILogger interface mocking** - Clean but requires test doubles
3. **pino-test package** - Inspect actual log output

**Decision:** ILogger interface mocking with Vitest spies

**Rationale:**

- **Type safety**: Mocking ILogger preserves TypeScript types
- **Vitest native**: Project uses Vitest (not Jest), use `vi.fn()` and `vi.spyOn()` ([source](https://github.com/pinojs/pino/issues/837))
- **Test isolation**: Each test gets clean logger mock
- **Assertion flexibility**: Can verify log calls without actual I/O
- **Performance**: No file writes or stream handling during tests

**Mock implementation:**

```typescript
// tests/helpers/mock-logger.ts
export const createMockLogger = (): ILogger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

// In test file
const mockLogger = createMockLogger();
container.registerInstance('ILogger', mockLogger);

// Assert
expect(mockLogger.info).toHaveBeenCalledWith('Settings loaded', {
  userId: '123',
});
```

### 9. Export Formats (JSON/CSV/NDJSON)

**Options considered:**

1. **JSON** - Standard, human-readable, but large files
2. **NDJSON** - Newline-delimited, streamable, efficient
3. **CSV** - Universal compatibility, spreadsheet-friendly
4. **All three** - Maximum flexibility (CHOSEN)

**Decision:** Support JSON, NDJSON, and CSV with optional gzip compression

**Rationale:**

- **JSON**: Best for small exports, API integration, pretty-printing
- **NDJSON**: Best for large exports, streaming processing, log aggregation tools
- **CSV**: Best for Excel/spreadsheet analysis, non-technical users
- **Gzip**: Reduces file size 80-90% for large exports
- **Implementation**: Use native `JSON.stringify()`, manual CSV generation (no heavy deps)

## Library Analysis

| Library                      | Version | Purpose                           | Pros                                                                                                | Cons                                                  |
| ---------------------------- | ------- | --------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **pino**                     | ^9.7    | Core structured logger            | ✅ 5-10x faster than alternatives<br>✅ Worker thread transports<br>✅ Excellent TypeScript support | ⚠️ JSON-only by default (need pino-pretty for dev)    |
| **pino-roll**                | ^1.3    | Log file rotation                 | ✅ Sonic-boom based (fast)<br>✅ Symlink support<br>✅ Structured file naming                       | ⚠️ Smaller community than pino-rotating-file-stream   |
| **pino-pretty**              | ^14.1   | Development log formatting        | ✅ Colorized output<br>✅ Human-readable logs<br>✅ Configurable format                             | ⚠️ Performance overhead (dev-only)                    |
| **better-sse** (optional)    | ^0.15   | TypeScript SSE library            | ✅ TypeScript-first<br>✅ Event buffering<br>✅ Channel broadcasting                                | ⚠️ Adds dependency (can use native ReadableStream)    |
| **csv-stringify** (optional) | ^6.5    | CSV generation                    | ✅ Streaming support<br>✅ Handles escaping                                                         | ⚠️ May not be needed (can use manual string building) |
| **tsyringe**                 | ^4.10   | DI container (already installed)  | ✅ Already in project<br>✅ Singleton support<br>✅ TypeScript decorators                           | N/A (already installed)                               |
| **better-sqlite3**           | ^12.6   | SQLite driver (already installed) | ✅ Already in project<br>✅ FTS5 support built-in<br>✅ Synchronous API (faster)                    | N/A (already installed)                               |

**New dependencies to add:**

```json
{
  "dependencies": {
    "pino": "^9.7.0",
    "pino-roll": "^1.3.0"
  },
  "devDependencies": {
    "pino-pretty": "^14.1.0"
  }
}
```

**Optional dependencies (evaluate during implementation):**

- `better-sse` - If native ReadableStream proves difficult
- `csv-stringify` - If manual CSV generation is too complex

## Security Considerations

### 1. Log Injection Prevention

- **Risk**: User input in logs could inject fake log entries or break JSON parsing
- **Mitigation**: Pino automatically escapes special characters in JSON serialization
- **Implementation**: Always pass user input as context object, not in message string
  ```typescript
  // ❌ Vulnerable
  logger.info(`User login: ${username}`);
  // ✅ Safe
  logger.info('User login', { username });
  ```

### 2. Sensitive Data Exposure

- **Risk**: Logs may contain passwords, API keys, tokens, or PII
- **Mitigation**: Implement redaction rules in Pino configuration
- **Implementation**: Use pino's `redact` option to mask sensitive fields
  ```typescript
  pino({
    redact: {
      paths: ['password', 'apiKey', 'token', '*.password', 'email'],
      censor: '[REDACTED]',
    },
  });
  ```

### 3. Log File Access Control

- **Risk**: Log files may be readable by unauthorized users
- **Mitigation**: Set restrictive file permissions (0600) on log files
- **Implementation**: Configure pino-roll with secure permissions
  ```typescript
  pinoRoll({
    file: '~/.shep/logs/shep.log',
    mode: 0o600, // Owner read/write only
  });
  ```

### 4. Disk Space Exhaustion (DoS)

- **Risk**: Excessive logging could fill disk and crash system
- **Mitigation**: Implement log rotation with size limits and retention policy
- **Implementation**: Configure pino-roll with max size and file count
  ```typescript
  pinoRoll({
    size: '100M', // Max 100MB per file
    frequency: 'daily',
    maxFiles: 30, // Keep 30 days
  });
  ```

### 5. SQL Injection in Log Search

- **Risk**: User search queries could inject SQL into FTS5 queries
- **Mitigation**: Use parameterized queries with better-sqlite3
- **Implementation**: Always use prepared statements
  ```typescript
  const stmt = db.prepare('SELECT * FROM logs_fts WHERE logs_fts MATCH ?');
  stmt.all(userQuery); // Safe - parameterized
  ```

### 6. SSE Authentication

- **Risk**: Unauthenticated users could stream logs via `/api/logs/stream`
- **Mitigation**: Implement authentication middleware for SSE endpoint
- **Implementation**: Check session/token before starting stream
  ```typescript
  export async function GET(request: NextRequest) {
    const session = await getSession(request);
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }
    // ... stream logs
  }
  ```

## Performance Implications

### 1. Logger Performance

- **Impact**: Pino is 5-10x faster than winston/bunyan ([source](https://medium.com/@muhammedshibilin/node-js-logging-pino-vs-winston-vs-bunyan-complete-guide-99fe3cc59ed9))
- **Optimization**: Worker thread transports prevent blocking event loop
- **Measurement**: Benchmark console.log vs pino in CI to verify improvement
- **Expected overhead**: < 5% CPU overhead for typical logging volume

### 2. FTS5 Search Performance

- **Impact**: Inverted index makes search O(log n) instead of O(n)
- **Optimization**: Index only `message` column, not entire context object
- **Trade-off**: Index size ~20-30% of log data size
- **Expected speed**: < 100ms for searches on 1M+ log entries

### 3. SSE Streaming Memory

- **Impact**: Each active SSE connection holds logs in memory buffer
- **Optimization**: Limit buffer size (default: 200 lines) and max connections
- **Monitoring**: Track active SSE connections via metrics
- **Expected memory**: ~1MB per active connection (200 logs × 5KB avg)

### 4. SQLite Write Performance

- **Impact**: Synchronous writes may slow down logging
- **Optimization**: Use WAL mode + batch inserts for log entries
- **Configuration**:
  ```sql
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  ```
- **Expected throughput**: 10,000+ log inserts/second

### 5. Log Rotation I/O

- **Impact**: File rotation involves rename + create operations
- **Optimization**: pino-roll handles rotation in background, minimal blocking
- **Trade-off**: Brief spike in I/O during rotation (daily or when size exceeded)
- **Expected impact**: < 50ms pause during rotation

### 6. Test Suite Performance

- **Impact**: Mocking ILogger instead of real pino improves test speed
- **Optimization**: Zero I/O in tests (no file writes, no stream handling)
- **Expected improvement**: 30-50% faster test suite vs real logger

## Architecture Decisions

### Clean Architecture Compliance

**Layers:**

```
Presentation (CLI/Web) → Application (Use Cases) → Infrastructure (Pino/SQLite)
         ↓                      ↓                         ↓
    Depends on              Depends on                Implements
    ILogger interface       ILogger interface         ILogger interface
```

**Dependency flow:**

- ✅ Domain has no dependencies (no logger in domain entities)
- ✅ Application depends on ILogger interface (port)
- ✅ Infrastructure implements ILogger with PinoLogger
- ✅ Presentation resolves ILogger via DI container

**Port interface:**

```typescript
// application/ports/output/logger.interface.ts
export interface ILogger {
  debug(msg: string, context?: object): void;
  info(msg: string, context?: object): void;
  warn(msg: string, context?: object): void;
  error(msg: string, context?: object): void;
}
```

### DI Registration Pattern

```typescript
// infrastructure/di/container.ts
import { PinoLogger } from '@/infrastructure/services/logger/pino-logger.service';

export async function initializeContainer() {
  // ... existing registrations

  // Register logger configuration
  const loggerConfig = createLoggerConfig(); // From settings + env
  container.registerInstance('LoggerConfig', loggerConfig);

  // Register ILogger implementation
  container.register('ILogger', { useClass: PinoLogger });
}
```

### Migration Path

**Phase order:**

1. ✅ Infrastructure → Application → Presentation (dependency-respecting order)
2. ✅ Tests updated per layer (maintain green suite)
3. ✅ ESLint rule enabled last (after all migrations complete)

## Open Questions

All questions resolved during research phase:

- ✅ **Which logger library?** → pino (performance + TypeScript)
- ✅ **Log rotation strategy?** → pino-roll (Sonic-boom + symlinks)
- ✅ **Configuration precedence?** → CLI flag > ENV > Settings
- ✅ **DI integration?** → tsyringe @singleton() with ILogger interface
- ✅ **FTS5 implementation?** → Virtual table + triggers for auto-sync
- ✅ **SSE approach?** → ReadableStream with text/event-stream
- ✅ **Migration strategy?** → Incremental (layer by layer)
- ✅ **Testing strategy?** → Mock ILogger interface with Vitest

---

## Sources

### Pino Logger

- [Pino Logger: Complete Node.js Guide with Examples [2026] | SigNoz](https://signoz.io/guides/pino-logger/)
- [A Complete Guide to Pino Logging in Node.js | Better Stack Community](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/)
- [Pino.js: The Ultimate Guide to High-Performance Node.js Logging | Last9](https://last9.io/blog/npm-pino-logger/)
- [Building a Production-Grade Logger for Node.js Applications with Pino | by Artem Khrienov | Medium](https://medium.com/@artemkhrenov/building-a-production-grade-logger-for-node-js-applications-with-pino-2ebd8447d531)
- [🚀 Node.js Logging: Pino vs Winston vs Bunyan (Complete Guide) | by Muhammed Shibili N | Medium](https://medium.com/@muhammedshibilin/node-js-logging-pino-vs-winston-vs-bunyan-complete-guide-99fe3cc59ed9)

### Log Rotation

- [GitHub - thelicato/pino-rotating-file-stream](https://github.com/thelicato/pino-rotating-file-stream)
- [pino-roll - npm](https://www.npmjs.com/package/pino-roll)
- [How to rotate logs in a separate thread · Issue #1323 · pinojs/pino](https://github.com/pinojs/pino/issues/1323)

### SQLite FTS5

- [SQLite Extensions: Full-text search with FTS5](https://blog.sqlite.ai/fts5-sqlite-text-search-extension)
- [SQLite Full-Text Search (FTS5) in Practice: Fast Search, Ranking, and Real-World Patterns – TheLinuxCode](https://thelinuxcode.com/sqlite-full-text-search-fts5-in-practice-fast-search-ranking-and-real-world-patterns/)
- [Full-Text Search in SQLite: A Practical Guide | by Johni Douglas Marangon | Medium](https://medium.com/@johnidouglasmarangon/full-text-search-in-sqlite-a-practical-guide-80a69c3f42a4)

### Server-Sent Events

- [Real-Time Notifications with Server-Sent Events (SSE) in Next.js - Pedro Alonso](https://www.pedroalonso.net/blog/sse-nextjs-real-time-notifications/)
- [Using Server-Sent Events (SSE) to stream LLM responses in Next.js | Upstash Blog](https://upstash.com/blog/sse-streaming-llm-responses)
- [Fixing Slow SSE (Server-Sent Events) Streaming in Next.js and Vercel | by Oyetoke Tobiloba Emmanuel | Jan, 2026 | Medium](https://medium.com/@oyetoketoby80/fixing-slow-sse-server-sent-events-streaming-in-next-js-and-vercel-99f42fbdb996)
- [better-sse - npm](https://www.npmjs.com/package/better-sse)

### Dependency Injection

- [GitHub - microsoft/tsyringe: Lightweight dependency injection container for JavaScript/TypeScript](https://github.com/microsoft/tsyringe)
- [Top 5 TypeScript dependency injection containers - LogRocket Blog](https://blog.logrocket.com/top-five-typescript-dependency-injection-containers/)
- [Dependency Injection in Typescript with tsyringe • GameChanger Tech Blog](https://tech.gc.com/dependency-injection/)

### Migration Strategy

- [🚀 Incremental Migration: Evolving Without Breaking Production | by Navidbarsalari | Medium](https://medium.com/@navidbarsalari/incremental-migration-evolving-without-breaking-production-edf679769918)
- [Enterprise Migration Strategy: JavaScript to TypeScript | LearnWebCraft](https://learnwebcraft.com/learn/typescript/migrating-javascript-to-typescript-guide)

### Testing

- [How to test pino logging output? (jest) · Issue #837 · pinojs/pino](https://github.com/pinojs/pino/issues/837)
- [pino-test - npm](https://www.npmjs.com/package/pino-test)

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
