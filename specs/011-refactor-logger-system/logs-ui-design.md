# Logs UI Design

> Unified log viewing system for CLI and Web UI using shared application layer

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer                                          │
├──────────────────────┬──────────────────────────────────────┤
│ CLI Commands         │ Web UI Pages                         │
│ - shep logs list     │ - /logs (table view)                 │
│ - shep logs show     │ - /logs/[id] (detail view)           │
│ - shep logs follow   │ - /logs/stream (real-time)           │
│ - shep logs search   │                                      │
│ - shep logs export   │                                      │
│ - shep logs clear    │                                      │
└──────────────────────┴──────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Application Layer (Shared Use Cases)                        │
├─────────────────────────────────────────────────────────────┤
│ Use Cases:                                                  │
│ - ListLogsUseCase(filters, pagination)                      │
│ - GetLogEntryUseCase(id)                                    │
│ - SearchLogsUseCase(query, filters)                         │
│ - StreamLogsUseCase(filters) → AsyncIterator               │
│ - ExportLogsUseCase(format, filters)                        │
│ - ClearLogsUseCase(beforeDate)                              │
│                                                             │
│ Ports (Interfaces):                                         │
│ - ILogRepository                                            │
│ - ILogStreamService                                         │
│ - ILogExporter                                              │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Infrastructure Layer                                        │
├─────────────────────────────────────────────────────────────┤
│ Implementations:                                            │
│ - SQLiteLogRepository (stores logs in SQLite)               │
│ - LogStreamService (Server-Sent Events for web)            │
│ - LogExporter (JSON, CSV, NDJSON formats)                   │
└─────────────────────────────────────────────────────────────┘
```

## CLI Commands Design

### Base Command

```bash
shep logs [subcommand] [options]
```

### Subcommands

#### 1. `shep logs list` (default)

List logs with filtering and pagination.

```bash
shep logs list [options]

Options:
  -l, --level <level>      Filter by level (debug|info|warn|error)
  -s, --source <source>    Filter by source/module name
  -f, --from <date>        Show logs from date (ISO 8601 or relative: "1h", "2d")
  -t, --to <date>          Show logs until date
  -n, --limit <number>     Number of entries (default: 50)
  --offset <number>        Pagination offset (default: 0)
  --format <format>        Output format (table|json|csv) (default: table)
  --no-color               Disable colored output

Examples:
  shep logs list --level error --from "1h"
  shep logs list --source "cli:commands" --limit 100
  shep logs list --format json > logs.json
```

**Output (table format):**

```
┌──────────────────────┬───────┬─────────────────┬──────────────────────────┐
│ Timestamp            │ Level │ Source          │ Message                  │
├──────────────────────┼───────┼─────────────────┼──────────────────────────┤
│ 2026-02-08 14:23:45  │ INFO  │ cli:settings    │ Settings loaded          │
│ 2026-02-08 14:23:46  │ ERROR │ use-case:agent  │ Agent validation failed  │
│ 2026-02-08 14:23:50  │ WARN  │ repository:db   │ Slow query detected      │
└──────────────────────┴───────┴─────────────────┴──────────────────────────┘

Showing 3 of 150 entries. Use --offset to paginate.
```

#### 2. `shep logs show <id>`

Show detailed log entry with full context and metadata.

```bash
shep logs show <id>

Arguments:
  id                       Log entry ID (UUID or sequential ID)

Options:
  --format <format>        Output format (pretty|json) (default: pretty)

Example:
  shep logs show 550e8400-e29b-41d4-a716-446655440000
```

**Output (pretty format):**

```
Log Entry: 550e8400-e29b-41d4-a716-446655440000

  Timestamp: 2026-02-08 14:23:46.123Z
  Level:     ERROR
  Source:    use-case:agent
  Message:   Agent validation failed

  Context:
    agentType: claude-code
    authMethod: api-key
    repositoryPath: /home/user/project

  Stack Trace:
    at AgentValidatorService.validate (/app/infrastructure/services/agents/validator.ts:45)
    at ConfigureAgentUseCase.execute (/app/application/use-cases/agent/configure.ts:23)
    ...

  Related Logs: (showing entries within 1 second)
    - [INFO] 14:23:45.900 - cli:settings - Loading settings
    - [ERROR] 14:23:46.123 - use-case:agent - Agent validation failed (current)
    - [INFO] 14:23:46.500 - cli:command - Exiting with code 1
```

#### 3. `shep logs follow`

Tail logs in real-time (like `tail -f`).

```bash
shep logs follow [options]

Options:
  -l, --level <level>      Filter by level (default: all)
  -s, --source <source>    Filter by source
  --no-color               Disable colored output

Example:
  shep logs follow --level error
  shep logs follow --source "cli:*"
```

**Output (streaming):**

```
[14:23:45 INFO  cli:settings] Settings loaded
[14:23:46 ERROR use-case:agent] Agent validation failed
  → agentType=claude-code authMethod=api-key
[14:23:50 WARN  repository:db] Slow query detected (245ms)
^C
Stopped following logs.
```

#### 4. `shep logs search <query>`

Full-text search across log messages and context.

```bash
shep logs search <query> [options]

Arguments:
  query                    Search query (supports wildcards)

Options:
  -l, --level <level>      Filter by level
  -f, --from <date>        Search from date
  -t, --to <date>          Search until date
  -n, --limit <number>     Number of results (default: 50)
  --highlight              Highlight matches in output (default: true)
  --format <format>        Output format (table|json) (default: table)

Examples:
  shep logs search "validation failed"
  shep logs search "agent*" --level error
  shep logs search "slow query" --from "2d"
```

**Output:**

```
Found 3 matches for "validation failed"

┌──────────────────────┬───────┬─────────────────┬──────────────────────────┐
│ Timestamp            │ Level │ Source          │ Message                  │
├──────────────────────┼───────┼─────────────────┼──────────────────────────┤
│ 2026-02-08 14:23:46  │ ERROR │ use-case:agent  │ Agent validation failed  │
│ 2026-02-08 13:15:20  │ ERROR │ use-case:agent  │ Token validation failed  │
│ 2026-02-08 12:05:10  │ WARN  │ cli:settings    │ Config validation failed │
└──────────────────────┴───────┴─────────────────┴──────────────────────────┘
```

#### 5. `shep logs export`

Export logs to file in various formats.

```bash
shep logs export [options]

Options:
  -o, --output <file>      Output file path (required)
  -f, --format <format>    Export format (json|ndjson|csv) (required)
  -l, --level <level>      Filter by level
  --from <date>            Export from date
  --to <date>              Export until date
  --compress               Compress output with gzip

Examples:
  shep logs export -o logs.json -f json --from "7d"
  shep logs export -o errors.csv -f csv --level error
  shep logs export -o logs.ndjson.gz -f ndjson --compress
```

**Output:**

```
Exporting logs...
  Filters: level=error, from=2026-02-01
  Format: csv

✓ Exported 1,234 log entries to errors.csv (125 KB)
```

#### 6. `shep logs clear`

Clear old logs (retention policy).

```bash
shep logs clear [options]

Options:
  --before <date>          Clear logs before date (required)
  --level <level>          Only clear logs of this level
  --dry-run                Show what would be deleted without deleting
  -y, --yes                Skip confirmation prompt

Examples:
  shep logs clear --before "30d"
  shep logs clear --before "2026-01-01" --level debug
  shep logs clear --before "7d" --dry-run
```

**Output:**

```
This will delete:
  - 5,432 debug entries
  - 2,123 info entries
  - 345 warn entries
  - 89 error entries

Total: 7,989 entries before 2026-01-08

Are you sure? (y/N): y

✓ Deleted 7,989 log entries
```

## Web UI Design

### Page: `/logs`

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Shep AI - Logs                                     [Export]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Filters: [Level ▼] [Source ▼] [From: 📅] [To: 📅] [Clear]   │
│ Search: [________________________] [🔍]                       │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│ [Auto-refresh: ON] [Follow Mode: OFF]                        │
├──────────────────────┬───────┬─────────────────┬────────────┤
│ Timestamp            │ Level │ Source          │ Message    │
├──────────────────────┼───────┼─────────────────┼────────────┤
│ 2026-02-08 14:23:45  │ ●INFO │ cli:settings    │ Settings…  │
│ 2026-02-08 14:23:46  │ ●ERR  │ use-case:agent  │ Agent va…  │
│ 2026-02-08 14:23:50  │ ●WARN │ repository:db   │ Slow que…  │
│ ...                  │       │                 │            │
└──────────────────────┴───────┴─────────────────┴────────────┘
│ Showing 1-50 of 1,234 entries          [< Prev] [Next >]    │
└─────────────────────────────────────────────────────────────┘
```

**Features:**

1. **Real-time Updates**: Auto-refresh toggle with SSE (Server-Sent Events)
2. **Follow Mode**: Auto-scroll to bottom as new logs arrive
3. **Level Color Coding**:
   - 🔴 ERROR (red)
   - 🟡 WARN (yellow)
   - 🔵 INFO (blue)
   - 🟢 DEBUG (gray)
4. **Expandable Rows**: Click row to show full context/metadata inline
5. **Filters**: Dropdown filters for level, source, date range
6. **Search**: Full-text search with highlight
7. **Export Button**: Download current view as JSON/CSV

### Page: `/logs/[id]`

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Logs                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Log Entry Details                                            │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ● ERROR                                                  │ │
│ │ Agent validation failed                                  │ │
│ │                                                          │ │
│ │ 📅 2026-02-08 14:23:46.123Z                             │ │
│ │ 📍 use-case:agent                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Context                                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ {                                                        │ │
│ │   "agentType": "claude-code",                           │ │
│ │   "authMethod": "api-key",                              │ │
│ │   "repositoryPath": "/home/user/project"                │ │
│ │ }                                                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Stack Trace                                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ at AgentValidatorService.validate                        │ │
│ │    (/infrastructure/services/agents/validator.ts:45)     │ │
│ │ at ConfigureAgentUseCase.execute                         │ │
│ │    (/application/use-cases/agent/configure.ts:23)        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Related Logs (±1 second)                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 14:23:45 INFO  cli:settings - Loading settings          │ │
│ │ 14:23:46 ERROR use-case:agent - Agent validation failed │ │
│ │ 14:23:46 INFO  cli:command - Exiting with code 1        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ [Copy as JSON] [Download]                                    │
└─────────────────────────────────────────────────────────────┘
```

### Page: `/logs/stream` (Real-time)

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Live Logs                                          [Pause]   │
├─────────────────────────────────────────────────────────────┤
│ Filters: [Level ▼] [Source ▼]                     [Clear]   │
│                                                               │
│ [Auto-scroll: ON] [Buffer: 200 lines]                        │
├─────────────────────────────────────────────────────────────┤
│ [14:23:45 INFO  cli:settings] Settings loaded               │
│ [14:23:46 ERROR use-case:agent] Agent validation failed     │
│   → agentType=claude-code authMethod=api-key                 │
│ [14:23:50 WARN  repository:db] Slow query detected (245ms)  │
│ [14:23:51 INFO  cli:command] Command completed              │
│ ...                                                           │
│                                                               │
│ ▌(blinking cursor - live stream)                             │
└─────────────────────────────────────────────────────────────┘
```

**Features:**

1. **Server-Sent Events (SSE)**: Real-time log streaming from backend
2. **Pause/Resume**: Pause stream without losing connection
3. **Auto-scroll**: Toggle automatic scrolling to bottom
4. **Buffer Limit**: Keep last N lines in memory (prevent memory leak)
5. **Level Filtering**: Real-time filter on client side

## Application Layer (Shared)

### Use Cases

All use cases are injectable via DI container and used by both CLI and Web.

```typescript
// src/application/use-cases/logs/list-logs.use-case.ts
import { injectable, inject } from 'tsyringe';
import type { ILogRepository } from '@/application/ports/output/log-repository.interface';

export interface ListLogsFilters {
  level?: 'debug' | 'info' | 'warn' | 'error';
  source?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  source: string;
  message: string;
  context?: Record<string, unknown>;
  stackTrace?: string;
}

export interface LogListResult {
  entries: LogEntry[];
  total: number;
  hasMore: boolean;
}

@injectable()
export class ListLogsUseCase {
  constructor(@inject('ILogRepository') private logRepository: ILogRepository) {}

  async execute(filters: ListLogsFilters = {}): Promise<LogListResult> {
    const { limit = 50, offset = 0 } = filters;

    // Delegate to repository
    const entries = await this.logRepository.findAll(filters);
    const total = await this.logRepository.count(filters);

    return {
      entries,
      total,
      hasMore: offset + entries.length < total,
    };
  }
}
```

```typescript
// src/application/use-cases/logs/get-log-entry.use-case.ts
import { injectable, inject } from 'tsyringe';
import type { ILogRepository } from '@/application/ports/output/log-repository.interface';

@injectable()
export class GetLogEntryUseCase {
  constructor(@inject('ILogRepository') private logRepository: ILogRepository) {}

  async execute(id: string): Promise<LogEntry | null> {
    return await this.logRepository.findById(id);
  }
}
```

```typescript
// src/application/use-cases/logs/search-logs.use-case.ts
import { injectable, inject } from 'tsyringe';
import type { ILogRepository } from '@/application/ports/output/log-repository.interface';

export interface SearchLogsQuery {
  query: string;
  level?: 'debug' | 'info' | 'warn' | 'error';
  from?: Date;
  to?: Date;
  limit?: number;
}

@injectable()
export class SearchLogsUseCase {
  constructor(@inject('ILogRepository') private logRepository: ILogRepository) {}

  async execute(query: SearchLogsQuery): Promise<LogListResult> {
    return await this.logRepository.search(query);
  }
}
```

```typescript
// src/application/use-cases/logs/stream-logs.use-case.ts
import { injectable, inject } from 'tsyringe';
import type { ILogStreamService } from '@/application/ports/output/log-stream.interface';

export interface StreamLogsFilters {
  level?: 'debug' | 'info' | 'warn' | 'error';
  source?: string;
}

@injectable()
export class StreamLogsUseCase {
  constructor(@inject('ILogStreamService') private streamService: ILogStreamService) {}

  async *execute(filters: StreamLogsFilters = {}): AsyncGenerator<LogEntry> {
    // Return async iterator for streaming
    for await (const entry of this.streamService.stream(filters)) {
      yield entry;
    }
  }
}
```

```typescript
// src/application/use-cases/logs/export-logs.use-case.ts
import { injectable, inject } from 'tsyringe';
import type { ILogRepository } from '@/application/ports/output/log-repository.interface';
import type { ILogExporter } from '@/application/ports/output/log-exporter.interface';

export type ExportFormat = 'json' | 'ndjson' | 'csv';

export interface ExportLogsOptions {
  format: ExportFormat;
  outputPath: string;
  filters?: ListLogsFilters;
  compress?: boolean;
}

@injectable()
export class ExportLogsUseCase {
  constructor(
    @inject('ILogRepository') private logRepository: ILogRepository,
    @inject('ILogExporter') private exporter: ILogExporter
  ) {}

  async execute(
    options: ExportLogsOptions
  ): Promise<{ path: string; count: number; size: number }> {
    // Fetch logs with filters
    const entries = await this.logRepository.findAll(options.filters || {});

    // Export to file
    const result = await this.exporter.export(entries, options);

    return {
      path: result.path,
      count: entries.length,
      size: result.sizeBytes,
    };
  }
}
```

```typescript
// src/application/use-cases/logs/clear-logs.use-case.ts
import { injectable, inject } from 'tsyringe';
import type { ILogRepository } from '@/application/ports/output/log-repository.interface';

export interface ClearLogsOptions {
  before: Date;
  level?: 'debug' | 'info' | 'warn' | 'error';
  dryRun?: boolean;
}

export interface ClearLogsResult {
  deletedCount: number;
  breakdown: Record<'debug' | 'info' | 'warn' | 'error', number>;
}

@injectable()
export class ClearLogsUseCase {
  constructor(@inject('ILogRepository') private logRepository: ILogRepository) {}

  async execute(options: ClearLogsOptions): Promise<ClearLogsResult> {
    if (options.dryRun) {
      return await this.logRepository.countToDelete(options);
    }

    return await this.logRepository.deleteBefore(options);
  }
}
```

### Ports (Interfaces)

```typescript
// src/application/ports/output/log-repository.interface.ts
import type {
  LogEntry,
  ListLogsFilters,
  SearchLogsQuery,
  ClearLogsOptions,
  ClearLogsResult,
} from '@/application/use-cases/logs';

export interface ILogRepository {
  // Create
  insert(entry: Omit<LogEntry, 'id'>): Promise<LogEntry>;

  // Read
  findAll(filters: ListLogsFilters): Promise<LogEntry[]>;
  findById(id: string): Promise<LogEntry | null>;
  count(filters: ListLogsFilters): Promise<number>;
  search(query: SearchLogsQuery): Promise<LogEntry[]>;

  // Delete
  deleteBefore(options: ClearLogsOptions): Promise<ClearLogsResult>;
  countToDelete(options: ClearLogsOptions): Promise<ClearLogsResult>;
}
```

```typescript
// src/application/ports/output/log-stream.interface.ts
import type { LogEntry, StreamLogsFilters } from '@/application/use-cases/logs';

export interface ILogStreamService {
  // Stream logs in real-time
  stream(filters: StreamLogsFilters): AsyncIterable<LogEntry>;

  // Emit new log entry to all active streams
  emit(entry: LogEntry): void;

  // Close all streams
  close(): void;
}
```

```typescript
// src/application/ports/output/log-exporter.interface.ts
import type { LogEntry, ExportFormat } from '@/application/use-cases/logs';

export interface ExportResult {
  path: string;
  sizeBytes: number;
}

export interface ILogExporter {
  export(
    entries: LogEntry[],
    options: { format: ExportFormat; outputPath: string; compress?: boolean }
  ): Promise<ExportResult>;
}
```

## Infrastructure Layer

### SQLite Log Repository

```typescript
// src/infrastructure/repositories/sqlite-log.repository.ts
import { injectable, inject } from 'tsyringe';
import type { Database } from 'better-sqlite3';
import type { ILogRepository } from '@/application/ports/output/log-repository.interface';
import type { LogEntry, ListLogsFilters } from '@/application/use-cases/logs';

@injectable()
export class SQLiteLogRepository implements ILogRepository {
  constructor(@inject('Database') private db: Database) {}

  async insert(entry: Omit<LogEntry, 'id'>): Promise<LogEntry> {
    const id = crypto.randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO logs (id, timestamp, level, source, message, context, stack_trace)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      entry.timestamp.toISOString(),
      entry.level,
      entry.source,
      entry.message,
      JSON.stringify(entry.context || null),
      entry.stackTrace || null
    );

    return { id, ...entry };
  }

  async findAll(filters: ListLogsFilters): Promise<LogEntry[]> {
    let sql = 'SELECT * FROM logs WHERE 1=1';
    const params: unknown[] = [];

    if (filters.level) {
      sql += ' AND level = ?';
      params.push(filters.level);
    }
    if (filters.source) {
      sql += ' AND source LIKE ?';
      params.push(`%${filters.source}%`);
    }
    if (filters.from) {
      sql += ' AND timestamp >= ?';
      params.push(filters.from.toISOString());
    }
    if (filters.to) {
      sql += ' AND timestamp <= ?';
      params.push(filters.to.toISOString());
    }

    sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(filters.limit || 50, filters.offset || 0);

    const rows = this.db.prepare(sql).all(...params);
    return rows.map(this.mapToLogEntry);
  }

  async count(filters: ListLogsFilters): Promise<number> {
    // Similar WHERE clause builder
    // ...
  }

  async search(query: SearchLogsQuery): Promise<LogEntry[]> {
    // Use SQLite FTS (Full-Text Search) if available
    // ...
  }

  async deleteBefore(options: ClearLogsOptions): Promise<ClearLogsResult> {
    // Delete and return counts
    // ...
  }

  private mapToLogEntry(row: any): LogEntry {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      level: row.level,
      source: row.source,
      message: row.message,
      context: row.context ? JSON.parse(row.context) : undefined,
      stackTrace: row.stack_trace || undefined,
    };
  }
}
```

### Log Stream Service (SSE)

```typescript
// src/infrastructure/services/log-stream.service.ts
import { injectable } from 'tsyringe';
import type { ILogStreamService } from '@/application/ports/output/log-stream.interface';
import type { LogEntry, StreamLogsFilters } from '@/application/use-cases/logs';
import { EventEmitter } from 'node:events';

@injectable()
export class LogStreamService implements ILogStreamService {
  private emitter = new EventEmitter();

  async *stream(filters: StreamLogsFilters): AsyncGenerator<LogEntry> {
    const queue: LogEntry[] = [];
    let resolve: ((value: IteratorResult<LogEntry>) => void) | null = null;

    const listener = (entry: LogEntry) => {
      // Apply filters
      if (filters.level && entry.level !== filters.level) return;
      if (filters.source && !entry.source.includes(filters.source)) return;

      if (resolve) {
        resolve({ value: entry, done: false });
        resolve = null;
      } else {
        queue.push(entry);
      }
    };

    this.emitter.on('log', listener);

    try {
      while (true) {
        if (queue.length > 0) {
          yield queue.shift()!;
        } else {
          await new Promise<void>((res) => {
            resolve = (result) => {
              if (!result.done) {
                queue.push(result.value);
              }
              res();
            };
          });
        }
      }
    } finally {
      this.emitter.off('log', listener);
    }
  }

  emit(entry: LogEntry): void {
    this.emitter.emit('log', entry);
  }

  close(): void {
    this.emitter.removeAllListeners();
  }
}
```

## CLI Implementation Example

```typescript
// src/presentation/cli/commands/logs/list.command.ts
import { Command } from 'commander';
import { container } from '@/infrastructure/di/container';
import { ListLogsUseCase } from '@/application/use-cases/logs/list-logs.use-case';
import { formatLogsTable } from '@/presentation/cli/ui/formatters/logs';

export function createLogsListCommand(): Command {
  return new Command('list')
    .description('List logs with filtering and pagination')
    .option('-l, --level <level>', 'Filter by level (debug|info|warn|error)')
    .option('-s, --source <source>', 'Filter by source/module name')
    .option('-f, --from <date>', 'Show logs from date')
    .option('-t, --to <date>', 'Show logs until date')
    .option('-n, --limit <number>', 'Number of entries', '50')
    .option('--offset <number>', 'Pagination offset', '0')
    .option('--format <format>', 'Output format (table|json|csv)', 'table')
    .action(async (options) => {
      const useCase = container.resolve(ListLogsUseCase);

      const result = await useCase.execute({
        level: options.level,
        source: options.source,
        from: options.from ? new Date(options.from) : undefined,
        to: options.to ? new Date(options.to) : undefined,
        limit: parseInt(options.limit),
        offset: parseInt(options.offset),
      });

      if (options.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else if (options.format === 'table') {
        console.log(formatLogsTable(result));
        console.log(`\nShowing ${result.entries.length} of ${result.total} entries.`);
      }
    });
}
```

## Web Implementation Example

```typescript
// src/presentation/web/app/logs/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { LogsTable } from '@/components/logs/logs-table';
import { LogsFilters } from '@/components/logs/logs-filters';
import type { LogListResult, ListLogsFilters } from '@/application/use-cases/logs';

export default function LogsPage() {
  const [logs, setLogs] = useState<LogListResult | null>(null);
  const [filters, setFilters] = useState<ListLogsFilters>({});

  useEffect(() => {
    // Call API endpoint that uses ListLogsUseCase
    fetch('/api/logs?' + new URLSearchParams(filters as any))
      .then((res) => res.json())
      .then(setLogs);
  }, [filters]);

  return (
    <div>
      <h1>Logs</h1>
      <LogsFilters value={filters} onChange={setFilters} />
      {logs && <LogsTable data={logs} />}
    </div>
  );
}
```

```typescript
// src/presentation/web/app/api/logs/route.ts
import { NextRequest } from 'next/server';
import { container } from '@/infrastructure/di/container';
import { ListLogsUseCase } from '@/application/use-cases/logs/list-logs.use-case';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const useCase = container.resolve(ListLogsUseCase);

  const result = await useCase.execute({
    level: searchParams.get('level') as any,
    source: searchParams.get('source') || undefined,
    limit: parseInt(searchParams.get('limit') || '50'),
    offset: parseInt(searchParams.get('offset') || '0'),
  });

  return Response.json(result);
}
```

```typescript
// src/presentation/web/app/api/logs/stream/route.ts
import { container } from '@/infrastructure/di/container';
import { StreamLogsUseCase } from '@/application/use-cases/logs/stream-logs.use-case';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const useCase = container.resolve(StreamLogsUseCase);

  // Server-Sent Events
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const entry of useCase.execute({
        level: searchParams.get('level') as any,
        source: searchParams.get('source') || undefined,
      })) {
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

## Database Schema

```sql
-- src/infrastructure/persistence/migrations/003-create-logs-table.sql
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  level TEXT NOT NULL CHECK(level IN ('debug', 'info', 'warn', 'error')),
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  context TEXT, -- JSON
  stack_trace TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);

-- Full-text search (optional)
CREATE VIRTUAL TABLE IF NOT EXISTS logs_fts USING fts5(
  message,
  content=logs,
  content_rowid=rowid
);
```

## Benefits of This Architecture

✅ **Single Source of Truth**: Both CLI and Web use the same use cases
✅ **Testable**: Use cases can be unit tested with mocked repositories
✅ **Swappable Storage**: Can replace SQLite with PostgreSQL by implementing ILogRepository
✅ **Swappable UI**: Can add mobile app, TUI, or API clients easily
✅ **Clean Dependencies**: Presentation → Application → Infrastructure
✅ **DI-Friendly**: All dependencies injected via tsyringe
✅ **Type-Safe**: Full TypeScript typing across all layers

## Next Steps

This design will be implemented during the research and planning phases of the spec.
