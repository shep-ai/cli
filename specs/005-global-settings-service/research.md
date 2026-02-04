# Research: global-settings-service

> Technical analysis for 005-global-settings-service

## Status

- **Phase:** Planning
- **Updated:** 2026-02-03

## Technology Decisions

### 1. TypeSpec to TypeScript Code Generation

**Options considered:**

1. **@typespec-tools/emitter-typescript** - Community package for emitting TypeScript types from TypeSpec DSL
2. **typespec-typescript-emitter (crowbait)** - Community emitter creating TypeScript from models with HTTP API support
3. **Custom emitter using @typespec/compiler emitter framework** - Build custom emitter using official framework
4. **@typespec/http-server-js** - Official emitter generating TypeScript interfaces (focused on HTTP server generation)

**Decision:** **@typespec-tools/emitter-typescript**

**Rationale:**

- **Focused on type generation**: Specifically designed for emitting TypeScript types from TypeSpec models
- **Active maintenance**: Available on npm with recent updates
- **Simplicity**: Straightforward configuration for our use case (domain model types)
- **No HTTP coupling**: Unlike http-server-js, doesn't assume HTTP API context
- **Warning acknowledged**: While documentation mentions emitter-framework updates may cause breaking changes, this is acceptable for an internal build tool that can be updated when needed

**Alternative if issues arise:** Build custom emitter using the official emitter framework, which is well-documented and provides TypeScript-aware components like `InterfaceDeclaration`.

**Sources:**

- [TypeSpec Emitter Framework](https://typespec.io/docs/extending-typespec/emitter-framework/)
- [@typespec-tools/emitter-typescript on npm](https://www.npmjs.com/package/@typespec-tools/emitter-typescript)
- [TypeSpec GitHub Discussion #3307](https://github.com/microsoft/typespec/discussions/3307)

---

### 2. SQLite Migration Framework

**Options considered:**

1. **@blackglory/better-sqlite3-migrations** - Dedicated migration utility for better-sqlite3 using user_version
2. **better-sqlite3-helper** - Wrapper with built-in migration system and TypeScript declarations
3. **sqlite-auto-migrator** - Flexible JavaScript-based migrations with auto-generation
4. **Custom SQL-based migrations** - Hand-rolled migration system using user_version pragma

**Decision:** **@blackglory/better-sqlite3-migrations**

**Rationale:**

- **Purpose-built for better-sqlite3**: Specifically designed for our chosen SQLite library
- **Simple API**: Uses SQLite's `user_version` pragma for version tracking
- **Lightweight**: Minimal abstraction, just migration execution
- **TypeScript support**: Written with TypeScript in mind
- **Control**: Migrations are raw SQL files, giving us full control
- **No magic**: Straightforward migration application without complex abstractions

**Migration strategy:**

- Migrations stored in `src/infrastructure/persistence/migrations/`
- Naming convention: `001_create_settings_table.sql`, `002_add_column.sql`
- Use `user_version` pragma for tracking applied migrations
- Support both up and down migrations (stored as comments or separate files)

**Sources:**

- [@blackglory/better-sqlite3-migrations on npm](https://www.npmjs.com/package/@blackglory/better-sqlite3-migrations)
- [better-sqlite3-helper](https://www.npmjs.com/package/better-sqlite3-helper)
- [SQLite Auto Migrator](https://github.com/SanderGi/sqlite-auto-migrator)

---

### 3. Dependency Injection Pattern

**Options considered:**

1. **tsyringe** - Lightweight DI container by Microsoft with decorators
2. **inversify** - Powerful IoC container with extensive features
3. **Manual constructor injection** - No DI library, explicit dependency passing
4. **NestJS** - Full framework with built-in DI (overkill for CLI)

**Decision:** **tsyringe** (Microsoft DI container)

**Rationale:**

- **Proper DI from the start**: Establishes good patterns for foundational architecture
- **Scalability**: As more use cases and services are added, DI container simplifies wiring
- **Microsoft-backed**: Official Microsoft library with good TypeScript support
- **Lightweight**: Minimal overhead compared to inversify or NestJS
- **Decorator-based**: Clean, declarative syntax with `@injectable()` and `@inject()`
- **Container management**: Automatic lifetime management (singleton, transient, scoped)
- **Testing**: Easy to override registrations for test doubles

**Implementation approach:**

- Mark use cases and repositories with `@injectable()` decorator
- Register implementations in container at CLI bootstrap
- Use `@inject()` for constructor dependencies when needed
- Container provides automatic resolution of dependency graphs
- Test setup uses test container with mock registrations

**Why not manual injection:** While simpler initially, manual wiring becomes unwieldy as the application grows. Since this is the foundational architecture, establishing DI patterns now prevents future refactoring.

**Sources:**

- [Clean Architecture in Node.js with TypeScript and Dependency Injection](https://dev.to/evangunawan/clean-architecture-in-nodejs-an-approach-with-typescript-and-dependency-injection-16o)
- [TypeScript Clean Architecture Examples](https://github.com/bypepe77/typescript-clean-architecture)
- [Clean Architecture with Inversify](https://dev.to/vishnucprasad/clean-architecture-with-inversify-in-nodejs-with-typescript-a-code-driven-guide-4oo7)

---

### 4. SQLite Library Choice

**Options considered:**

1. **better-sqlite3** - Synchronous API, fastest SQLite library for Node.js
2. **node-sqlite3** - Asynchronous API, older library with mutex thrashing issues
3. **node:sqlite** - Node.js 22+ built-in module (experimental, zero dependencies)

**Decision:** **better-sqlite3**

**Rationale:**

- **Performance**: 10-12x faster than node-sqlite3 for read/write operations
- **Synchronous API**: Simpler code, better concurrency (no mutex thrashing)
- **Mature**: Battle-tested in production, stable API
- **Better-sqlite3-migrations compatibility**: Migration library we chose is built for this
- **No experimental dependencies**: Unlike node:sqlite, better-sqlite3 is production-ready

**Performance benchmarks:**

- Reading rows: 313,899 ops/sec vs node-sqlite3's 26,780 ops/sec
- Reading 100 rows into array: 8,508 ops/sec vs 2,930 ops/sec
- Inserting rows: 62,554 ops/sec vs 22,637 ops/sec

**Sources:**

- [better-sqlite3 GitHub](https://github.com/WiseLibs/better-sqlite3)
- [better-sqlite3 Performance Benchmarks](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/performance.md)
- [SQLite Driver Benchmark: better-sqlite3 vs node:sqlite](https://sqg.dev/blog/sqlite-driver-benchmark)

---

## Library Analysis

| Library                                 | Version | Purpose                               | Pros                                                            | Cons                                            |
| --------------------------------------- | ------- | ------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| `better-sqlite3`                        | ^11.x   | SQLite database driver                | Fastest SQLite lib, synchronous API, mature, well-tested        | Binary dependency (native compilation required) |
| `@blackglory/better-sqlite3-migrations` | ^0.6.x  | Database migration system             | Purpose-built for better-sqlite3, simple API, uses user_version | Less features than larger frameworks            |
| `@typespec-tools/emitter-typescript`    | Latest  | TypeSpec → TypeScript type generation | Focused on types, simple config, no HTTP coupling               | Emitter framework may have breaking changes     |
| `tsyringe`                              | ^4.x    | Dependency injection container        | Lightweight, Microsoft-backed, decorator-based, easy to test    | Requires experimentalDecorators in tsconfig     |

**Build tooling (already available):**

- `@typespec/compiler` - Already in project for OpenAPI generation
- TypeScript compiler - Already configured

**No additional runtime dependencies** - All libraries are for build/infrastructure only.

---

## Security Considerations

### 1. SQL Injection Prevention

- **Use parameterized queries**: better-sqlite3 prepared statements with `.prepare()` and parameter binding
- **Never use string concatenation** for queries
- **Validate input** at application layer before passing to repository

### 2. File System Security

- **Restrict ~/.shep/ permissions**: Set appropriate file permissions (600 for database file)
- **User-scoped only**: Database location in user home directory prevents cross-user access
- **No network exposure**: SQLite is local-only, no network attack surface

### 3. Settings Validation

- **Validate model names**: Ensure model strings match known valid values
- **Sanitize user profile data**: Validate email, username formats
- **Type safety**: TypeSpec-generated types provide compile-time validation

### 4. Database Defensive Mode

- **Enable defensive flag**: Use `PRAGMA defensive = ON` to prevent corruption
- **WAL mode**: Enable Write-Ahead Logging for better concurrency and crash resistance

### 5. Secrets Management

- **No secrets in settings**: Settings should NOT contain API keys or passwords
- **Separate secrets store**: Future feature for API key management should use encrypted storage (e.g., keytar, OS keychain)

**Sources:**

- [Basic Security Practices for SQLite](https://dev.to/stephenc222/basic-security-practices-for-sqlite-safeguarding-your-data-23lh)
- [SQLite Security Best Practices](https://artoonsolutions.com/node-js-sqlite3/)
- [Getting Started with Native SQLite in Node.js](https://betterstack.com/community/guides/scaling-nodejs/nodejs-sqlite/)

---

## Performance Implications

### 1. Startup Performance

- **First run initialization**: Creating ~/.shep/ directory and database takes ~10-50ms
- **Subsequent loads**: Loading settings from SQLite takes ~1-2ms with prepared statements
- **Impact**: Negligible - CLI startup already includes Node.js VM init (~100ms+)

### 2. Settings Access Pattern

- **Singleton instance**: Load settings once at CLI startup, cache in memory
- **No repeated queries**: After initial load, no database access during command execution
- **Write operations**: Rare (only when user updates settings via CLI command)

### 3. Database Optimization

- **WAL mode**: Enable Write-Ahead Logging for better concurrency
- **Synchronous=NORMAL**: Balance between performance and durability
- **No indexes needed**: Single-row singleton table requires no indexing
- **Prepared statements**: All queries use prepared statements for optimal performance

### 4. TypeSpec Generation Performance

- **Build time**: TypeSpec compilation adds ~1-2 seconds to build pipeline
- **Acceptable trade-off**: Run once during `pnpm generate`, not on every file change
- **No runtime cost**: Generated types are compile-time only, zero runtime overhead

### 5. better-sqlite3 Performance Characteristics

- **Synchronous advantage**: No async overhead, no mutex thrashing
- **Proven scalability**: Handles 2000+ queries/sec in 60GB databases with proper indexing
- **Settings use case**: Vastly over-provisioned for single-row singleton pattern

**Sources:**

- [Understanding Better-SQLite3 Performance](https://dev.to/lovestaco/understanding-better-sqlite3-the-fastest-sqlite-library-for-nodejs-4n8)
- [better-sqlite3 Benchmarks](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/benchmark.md)

---

## Build Flow Implementation

### pnpm Scripts Architecture

```json
{
  "scripts": {
    "generate": "pnpm run tsp:codegen",
    "tsp:codegen": "tsp emit --emit @typespec-tools/emitter-typescript",
    "build": "pnpm run generate && tsc -p tsconfig.build.json",
    "prebuild": "pnpm run generate",
    "pretest": "pnpm run generate",
    "prelint": "pnpm run generate"
  }
}
```

**Strategy:**

- `generate` script runs all code generators (currently just TypeSpec)
- `pre*` hooks ensure generate runs before build/test/lint
- CI/CD explicitly calls `pnpm generate` before all other steps
- Pre-commit hook updated to run `pnpm generate` before lint-staged

---

## Open Questions

All questions resolved.

**Resolved:**

- ✅ TypeSpec TypeScript emitter: **@typespec-tools/emitter-typescript**
- ✅ Migration framework: **@blackglory/better-sqlite3-migrations**
- ✅ Dependency injection: **tsyringe** (Microsoft DI container)
- ✅ SQLite library: **better-sqlite3**
- ✅ Build flow: **generate → build → lint → test**

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
