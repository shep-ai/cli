# TypeSpec Domain Modeling Guide

Complete guide to defining domain models using TypeSpec with code generation.

## Philosophy

> "Domain models are the single source of truth. TypeScript types are generated artifacts."

TypeSpec-First Architecture ensures:

- **Type Safety** - TypeScript types generated from canonical definitions
- **API Documentation** - OpenAPI specs generated automatically
- **Contract Validation** - JSON Schema for runtime validation
- **DRY Principle** - Define once, use everywhere

## TypeSpec Workflow

```
┌────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. Define TypeSpec models (tsp/*.tsp)                         │
│                                                                 │
│  2. Compile → Generate TypeScript + OpenAPI + JSON Schema      │
│     pnpm tsp:compile                                            │
│                                                                 │
│  3. Import generated types in application code                 │
│     import type { Settings } from '@/domain/generated/output'  │
│                                                                 │
│  4. Build TypeScript → Compile to JavaScript                   │
│     pnpm build                                                  │
│                                                                 │
│  5. Run tests → Verify types and behavior                      │
│     pnpm test                                                   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
tsp/
├── main.tsp              # Entry point (imports all models)
├── common/               # Shared types
│   ├── base.tsp          # BaseEntity, SoftDeletableEntity, AuditableEntity
│   ├── scalars.tsp       # UUID scalar
│   ├── ask.tsp           # Askable interface pattern
│   └── enums/            # Shared enumerations
│       ├── lifecycle.tsp # SdlcLifecycle enum
│       ├── status.tsp    # TaskStatus enum
│       └── ...
├── domain/               # Domain layer models
│   ├── entities/         # One file per entity
│   │   ├── feature.tsp   # Feature entity
│   │   ├── task.tsp      # Task entity
│   │   ├── settings.tsp  # Settings entity
│   │   └── ...
│   └── value-objects/    # Embedded value objects
│       ├── gantt.tsp     # GanttChart value object
│       └── ...
├── agents/               # Agent system models
│   ├── analyze.tsp       # Analyze agent operations
│   ├── requirements.tsp  # Requirements agent operations
│   └── ...
└── deployment/           # Deployment configuration
    ├── target.tsp        # DeployTarget model
    ├── skill.tsp         # DeploySkill model
    └── ...
```

## Generated Output

```
# After running: pnpm tsp:compile

apis/
├── openapi/
│   └── openapi.yaml      # OpenAPI 3.x spec (API documentation)
└── json-schema/          # JSON Schema files (one per model)
    ├── Feature.json
    ├── Task.json
    ├── Settings.json
    └── ...

src/domain/generated/
└── output.ts             # TypeScript types (DO NOT EDIT)
```

## Creating a New Domain Model

### Step 1: Define the TypeSpec Model

```typescript
// tsp/domain/entities/settings.tsp
import "../common/base.tsp";
import "../common/enums/log-level.tsp";

/**
 * Global application settings (singleton).
 * Stored at ~/.shep/data as single SQLite record.
 */
model Settings extends BaseEntity {
  /** Singleton ID (always 'singleton') */
  id: "singleton";

  /** Model configuration for different agents */
  models: ModelConfiguration;

  /** User profile information (optional) */
  user: UserProfile;

  /** Environment configuration */
  environment: EnvironmentConfig;

  /** System configuration */
  system: SystemConfig;
}

/**
 * AI model configuration for different agents.
 */
model ModelConfiguration {
  /** Model for analyze agent (e.g., 'claude-opus-4') */
  analyze: string;

  /** Model for requirements agent */
  requirements: string;

  /** Model for plan agent */
  plan: string;

  /** Model for implementation agent */
  implement: string;
}

/**
 * User profile information.
 */
model UserProfile {
  /** User's full name */
  name?: string;

  /** User's email address */
  email?: string;

  /** GitHub username */
  githubUsername?: string;
}

/**
 * Environment configuration.
 */
model EnvironmentConfig {
  /** Default text editor (vim, nano, code, etc.) */
  defaultEditor: string;

  /** Preferred shell (bash, zsh, fish, etc.) */
  shellPreference: string;
}

/**
 * System configuration.
 */
model SystemConfig {
  /** Enable automatic updates */
  autoUpdate: boolean;

  /** Logging level */
  logLevel: LogLevel;
}
```

### Step 2: Define Supporting Types

```typescript
// tsp/common/enums/log-level.tsp

/**
 * Logging level for system output.
 */
enum LogLevel {
  /** Debug level logging (most verbose) */
  debug,

  /** Informational messages */
  info,

  /** Warning messages */
  warn,

  /** Error messages only */
  error,
}
```

### Step 3: Extend Base Entity (if needed)

```typescript
// tsp/common/base.tsp

/**
 * Base entity with ID and timestamps.
 * All entities should extend this model.
 */
model BaseEntity {
  /** Unique identifier */
  id: string;

  /** Creation timestamp */
  @encode(DateTimeKnownEncoding.rfc3339)
  createdAt: utcDateTime;

  /** Last update timestamp */
  @encode(DateTimeKnownEncoding.rfc3339)
  updatedAt: utcDateTime;
}

/**
 * Entity with soft delete support.
 */
model SoftDeletableEntity extends BaseEntity {
  /** Soft delete flag */
  isDeleted: boolean = false;

  /** Deletion timestamp (null if not deleted) */
  @encode(DateTimeKnownEncoding.rfc3339)
  deletedAt?: utcDateTime;
}
```

### Step 4: Import in main.tsp

```typescript
// tsp/main.tsp
import "@typespec/http";
import "@typespec/openapi3";

import "./common/base.tsp";
import "./common/scalars.tsp";
import "./common/ask.tsp";
import "./common/enums/lifecycle.tsp";
import "./common/enums/status.tsp";
import "./common/enums/log-level.tsp";

import "./domain/entities/feature.tsp";
import "./domain/entities/task.tsp";
import "./domain/entities/settings.tsp"; // NEW

import "./agents/analyze.tsp";
import "./agents/requirements.tsp";

@service({
  title: "Shep AI CLI - Domain Models",
})
namespace ShepAI;
```

### Step 5: Compile and Generate Types

```bash
# Compile TypeSpec → Generate TypeScript + OpenAPI + JSON Schema
pnpm tsp:compile

# Verify generated output
cat src/domain/generated/output.ts | grep "export interface Settings"
```

### Step 6: Use Generated Types in Code

```typescript
// src/application/use-cases/settings/initialize-settings.use-case.ts
import type { Settings } from '@/domain/generated/output';
import type { ISettingsRepository } from '@/application/ports/output/settings.repository.interface';

export class InitializeSettingsUseCase {
  constructor(private readonly settingsRepository: ISettingsRepository) {}

  async execute(): Promise<Settings> {
    // Check if settings already exist
    const existing = await this.settingsRepository.load();
    if (existing !== null) {
      return existing;
    }

    // Create default settings (using generated type)
    const defaults: Settings = {
      id: 'singleton',
      createdAt: new Date(),
      updatedAt: new Date(),
      models: {
        analyze: 'claude-opus-4',
        requirements: 'claude-sonnet-4',
        plan: 'claude-sonnet-4',
        implement: 'claude-sonnet-4',
      },
      user: {},
      environment: {
        defaultEditor: 'vim',
        shellPreference: 'bash',
      },
      system: {
        autoUpdate: true,
        logLevel: 'info',
      },
    };

    // Initialize in repository
    await this.settingsRepository.initialize(defaults);

    return defaults;
  }
}
```

## TypeSpec Best Practices

### 1. One Model Per File (SRP)

```
✅ Good: tsp/domain/entities/feature.tsp (one model)
✅ Good: tsp/domain/entities/task.tsp (one model)
❌ Bad:  tsp/domain/entities.tsp (all models in one file)
```

### 2. Use JSDoc Comments

```typescript
/**
 * Feature entity tracking work through SDLC lifecycle.
 * Represents a unit of work from requirements to deployment.
 */
model Feature extends BaseEntity {
  /** Human-readable feature name */
  name: string;

  /** Detailed feature description */
  description: string;

  /** Current SDLC lifecycle phase */
  lifecycle: SdlcLifecycle;

  /** Repository path this feature belongs to */
  repoPath: string;
}
```

### 3. Use Enums for Fixed Sets

```typescript
// Good: Enum for fixed set of values
enum SdlcLifecycle {
  Requirements,
  Plan,
  Implementation,
  Test,
  Deploy,
  Maintenance,
}

// Bad: String with no validation
model Feature {
  lifecycle: string; // Could be anything!
}
```

### 4. Use Optional Fields Appropriately

```typescript
model UserProfile {
  // Optional fields with ?
  name?: string;
  email?: string;

  // Required field (no ?)
  createdAt: utcDateTime;
}
```

### 5. Extend Base Entities

```typescript
// Good: Extend BaseEntity for consistency
model Settings extends BaseEntity {
  // Inherits: id, createdAt, updatedAt
  models: ModelConfiguration;
}

// Bad: Duplicate fields
model Settings {
  id: string;
  createdAt: utcDateTime; // Duplicate!
  updatedAt: utcDateTime; // Duplicate!
  models: ModelConfiguration;
}
```

## TypeSpec Annotations

### @encode - Date/Time Formatting

```typescript
model BaseEntity {
  /** Creation timestamp (RFC 3339 format) */
  @encode(DateTimeKnownEncoding.rfc3339)
  createdAt: utcDateTime;
}

// Generated TypeScript:
// createdAt: string; (ISO 8601 string)
```

### @deprecated - Mark Obsolete Fields

```typescript
model LegacyFeature {
  name: string;

  /** @deprecated Use 'description' instead */
  @deprecated("Use 'description' instead")
  summary: string;

  description: string;
}
```

### @example - Provide Examples

```typescript
model Settings {
  /** Default text editor
   * @example "vim"
   * @example "code"
   */
  defaultEditor: string;
}
```

## Modifying Existing Models

### Adding a Field

```typescript
// tsp/domain/entities/settings.tsp

model Settings extends BaseEntity {
  // ... existing fields ...

  /** NEW: Telemetry opt-out flag */
  telemetryEnabled: boolean = true; // Default value
}
```

**Workflow:**

1. Modify `.tsp` file
2. Run `pnpm tsp:compile` → Regenerate TypeScript
3. Update database migration (add column)
4. Update repository mapper (add field mapping)
5. Run tests → Fix compile errors
6. Commit both `.tsp` and generated files

### Removing a Field (Breaking Change)

```typescript
// tsp/domain/entities/settings.tsp

model Settings extends BaseEntity {
  // ... existing fields ...

  // REMOVED: oldField: string; ← Delete this line
}
```

**Workflow:**

1. Remove field from `.tsp` file
2. Run `pnpm tsp:compile` → TypeScript compile errors appear
3. Fix all references to removed field
4. Update database migration (remove column or mark deprecated)
5. Run tests → Ensure no broken references
6. Commit changes

### Renaming a Field

```typescript
// Before
model Settings {
  editorPreference: string;
}

// After
model Settings {
  defaultEditor: string;
}
```

**Workflow:**

1. Add new field with new name
2. Mark old field as `@deprecated`
3. Run `pnpm tsp:compile`
4. Migrate code to use new field
5. Create database migration (rename column or dual-write)
6. After migration period, remove deprecated field
7. Run `pnpm tsp:compile` again

## TypeSpec Commands

```bash
# Compile TypeSpec → Generate TypeScript + OpenAPI + JSON Schema
pnpm tsp:compile

# Format TypeSpec files with Prettier
pnpm tsp:format

# Watch mode (recompile on changes)
pnpm tsp:watch

# Validate without generating (dry run)
pnpm tsp:compile --no-emit

# Generate only OpenAPI (skip TypeScript)
pnpm tsp:compile --emit @typespec/openapi3

# Validate TypeSpec + Lint + Format (full check)
pnpm validate
```

## Troubleshooting

### Error: "Duplicate identifier"

**Cause:** Model name conflicts with existing type.

**Solution:** Rename the model or use namespace:

```typescript
namespace Settings {
  model Configuration {
    // ...
  }
}
```

### Error: "Cannot find '@typespec/http'"

**Cause:** Missing TypeSpec dependencies.

**Solution:**

```bash
pnpm install @typespec/compiler @typespec/http @typespec/openapi3 --save-dev
```

### Generated TypeScript Types Don't Update

**Cause:** Cached compilation output.

**Solution:**

```bash
# Clear generated output
rm -rf apis/ src/domain/generated/

# Recompile
pnpm tsp:compile
```

### TypeScript Compile Errors After TypeSpec Change

**Cause:** Breaking change in domain model (expected behavior).

**Solution:**

1. Let TypeScript show all compile errors
2. Fix each reference to match new type
3. Update tests to match new structure
4. This is **intentional** - type safety catches issues early!

## Integration with CI/CD

TypeSpec compilation runs in CI pipeline:

```yaml
# .github/workflows/ci.yml
jobs:
  lint:
    steps:
      - name: Compile TypeSpec
        run: pnpm tsp:compile

      - name: Check for uncommitted changes
        run: |
          git diff --exit-code src/domain/generated/
```

**IMPORTANT:** Always commit generated files (`src/domain/generated/output.ts`) to version control. This ensures:

- CI can detect if someone manually edited generated files
- Code reviews show generated type changes
- Deployments don't require TypeSpec toolchain

## Related Documentation

- [CLAUDE.md](../../CLAUDE.md#typespec-domain-models) - TypeSpec architecture overview
- [tdd-guide.md](./tdd-guide.md#testing-typespec-generated-code) - Testing TypeSpec-generated code
- [TypeSpec Official Docs](https://typespec.io/) - Language reference

---

## Maintaining This Document

**Update when:**

- New TypeSpec features are adopted
- Generated output structure changes
- New emitters are added (e.g., JSON Schema, Protobuf)

**Related files:**

- `tsp/` - TypeSpec source files
- `tspconfig.yaml` - TypeSpec configuration
- `package.json` - TypeSpec dependencies and scripts
