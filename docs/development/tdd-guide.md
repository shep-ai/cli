# TDD + Clean Architecture Guide

Complete guide to implementing features using Test-Driven Development with Clean Architecture.

## Philosophy

> "Write the test first, then write the code to make it pass."

TDD ensures:

- **Confidence** - Every feature has tests before code exists
- **Design** - Tests drive better interfaces and APIs
- **Documentation** - Tests serve as living documentation
- **Refactoring Safety** - Change code without fear

## The TDD Cycle: Red-Green-Refactor

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│     ┌─────────┐                                             │
│     │   RED   │  Write a failing test                       │
│     └────┬────┘                                             │
│          │                                                   │
│          ▼                                                   │
│     ┌─────────┐                                             │
│     │  GREEN  │  Write minimal code to pass                 │
│     └────┬────┘                                             │
│          │                                                   │
│          ▼                                                   │
│     ┌──────────┐                                            │
│     │ REFACTOR │  Improve code while keeping tests green    │
│     └────┬─────┘                                            │
│          │                                                   │
│          └──────────────► Repeat                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start: TDD a New Feature

### Example: Adding "Archive Feature" Functionality

Let's implement the ability to archive a feature, walking through each layer with TDD.

---

## Step 1: Domain Layer (Start Here)

### 1.1 RED - Write Failing Domain Test

```bash
# Start test watcher
pnpm test:watch tests/unit/domain/entities/feature.test.ts
```

```typescript
// tests/unit/domain/entities/feature.test.ts
import { describe, it, expect } from 'vitest';
import { Feature } from '@/domain/entities/feature';
import { SdlcLifecycle } from '@/domain/value-objects/sdlc-lifecycle';

describe('Feature', () => {
  describe('archive', () => {
    it('should archive a feature in Maintenance lifecycle', () => {
      // Arrange
      const feature = createFeatureInLifecycle(SdlcLifecycle.Maintenance);

      // Act
      feature.archive();

      // Assert
      expect(feature.isArchived).toBe(true);
      expect(feature.archivedAt).toBeInstanceOf(Date);
    });

    it('should not allow archiving a feature not in Maintenance', () => {
      // Arrange
      const feature = createFeatureInLifecycle(SdlcLifecycle.Implementation);

      // Act & Assert
      expect(() => feature.archive()).toThrow('Cannot archive feature not in Maintenance');
    });

    it('should not allow archiving an already archived feature', () => {
      // Arrange
      const feature = createFeatureInLifecycle(SdlcLifecycle.Maintenance);
      feature.archive();

      // Act & Assert
      expect(() => feature.archive()).toThrow('Feature is already archived');
    });
  });
});

// Test helper
function createFeatureInLifecycle(lifecycle: SdlcLifecycle): Feature {
  const feature = Feature.create({
    name: 'Test Feature',
    description: 'Description',
    repoPath: '/test/repo',
  });
  // Transition through lifecycle to reach target
  // (simplified for example)
  feature['_lifecycle'] = lifecycle;
  return feature;
}
```

**Run tests - they should FAIL (RED)**

```bash
# Expected output:
# ✗ should archive a feature in Maintenance lifecycle
#   Property 'archive' does not exist on type 'Feature'
```

### 1.2 GREEN - Write Minimal Code to Pass

```typescript
// src/domain/entities/feature.ts
export class Feature {
  // ... existing code ...

  private _isArchived: boolean = false;
  private _archivedAt: Date | null = null;

  get isArchived(): boolean {
    return this._isArchived;
  }

  get archivedAt(): Date | null {
    return this._archivedAt;
  }

  archive(): void {
    if (this._lifecycle !== SdlcLifecycle.Maintenance) {
      throw new CannotArchiveError('Cannot archive feature not in Maintenance');
    }
    if (this._isArchived) {
      throw new AlreadyArchivedError('Feature is already archived');
    }
    this._isArchived = true;
    this._archivedAt = new Date();
  }
}
```

**Run tests - they should PASS (GREEN)**

### 1.3 REFACTOR - Improve While Green

```typescript
// src/domain/entities/feature.ts
export class Feature {
  // Refactor: Extract to value object if needed
  // Refactor: Add domain event emission

  archive(): void {
    this.ensureCanArchive();
    this._isArchived = true;
    this._archivedAt = new Date();
    // Could emit: this.addDomainEvent(new FeatureArchivedEvent(this.id));
  }

  private ensureCanArchive(): void {
    if (this._lifecycle !== SdlcLifecycle.Maintenance) {
      throw new CannotArchiveError('Cannot archive feature not in Maintenance');
    }
    if (this._isArchived) {
      throw new AlreadyArchivedError('Feature is already archived');
    }
  }
}
```

**Run tests - they should still PASS**

---

## Step 2: Application Layer (Use Case)

### 2.1 RED - Write Failing Use Case Test

```typescript
// tests/unit/application/use-cases/archive-feature.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArchiveFeatureUseCase } from '@/application/use-cases/archive-feature';
import { createMockFeatureRepository } from '@tests/helpers/mocks';
import { Feature } from '@/domain/entities/feature';

describe('ArchiveFeatureUseCase', () => {
  let useCase: ArchiveFeatureUseCase;
  let featureRepository: ReturnType<typeof createMockFeatureRepository>;

  beforeEach(() => {
    featureRepository = createMockFeatureRepository();
    useCase = new ArchiveFeatureUseCase(featureRepository);
  });

  it('should archive an existing feature', async () => {
    // Arrange
    const feature = createMaintenanceFeature();
    featureRepository.findById.mockResolvedValue(feature);

    // Act
    const result = await useCase.execute({ featureId: feature.id });

    // Assert
    expect(result.success).toBe(true);
    expect(feature.isArchived).toBe(true);
    expect(featureRepository.save).toHaveBeenCalledWith(feature);
  });

  it('should fail if feature not found', async () => {
    // Arrange
    featureRepository.findById.mockResolvedValue(null);

    // Act & Assert
    await expect(useCase.execute({ featureId: 'nonexistent' })).rejects.toThrow(
      'Feature not found'
    );
  });

  it('should fail if feature cannot be archived', async () => {
    // Arrange
    const feature = createImplementationFeature();
    featureRepository.findById.mockResolvedValue(feature);

    // Act & Assert
    await expect(useCase.execute({ featureId: feature.id })).rejects.toThrow(
      'Cannot archive feature not in Maintenance'
    );
  });
});
```

### 2.2 GREEN - Implement Use Case

```typescript
// src/application/use-cases/archive-feature.ts
import { IFeatureRepository } from '@/application/ports/output/feature-repository.port';
import { FeatureNotFoundError } from '@/application/errors';

export interface ArchiveFeatureInput {
  featureId: string;
}

export interface ArchiveFeatureOutput {
  success: boolean;
  archivedAt: Date;
}

export class ArchiveFeatureUseCase {
  constructor(private readonly featureRepository: IFeatureRepository) {}

  async execute(input: ArchiveFeatureInput): Promise<ArchiveFeatureOutput> {
    const feature = await this.featureRepository.findById(input.featureId);

    if (!feature) {
      throw new FeatureNotFoundError(input.featureId);
    }

    feature.archive(); // Domain method handles validation

    await this.featureRepository.save(feature);

    return {
      success: true,
      archivedAt: feature.archivedAt!,
    };
  }
}
```

### 2.3 REFACTOR

- Add input validation
- Consider adding domain events
- Extract port interface if needed

---

## Step 3: Infrastructure Layer (Repository)

### 3.1 RED - Write Failing Integration Test

```typescript
// tests/integration/repositories/feature-repository.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SqliteFeatureRepository } from '@/infrastructure/repositories/sqlite/feature.repository';
import { createTestDatabase, runMigrations } from '@tests/helpers/db';
import { Feature } from '@/domain/entities/feature';
import { SdlcLifecycle } from '@/domain/value-objects/sdlc-lifecycle';

describe('SqliteFeatureRepository', () => {
  let db: Database;
  let repository: SqliteFeatureRepository;

  beforeEach(async () => {
    db = createTestDatabase();
    await runMigrations(db);
    repository = new SqliteFeatureRepository(db);
  });

  afterEach(() => db.close());

  describe('archive persistence', () => {
    it('should persist archived state', async () => {
      // Arrange
      const feature = createMaintenanceFeature();
      await repository.save(feature);

      // Act
      feature.archive();
      await repository.save(feature);

      // Assert
      const retrieved = await repository.findById(feature.id);
      expect(retrieved?.isArchived).toBe(true);
      expect(retrieved?.archivedAt).toBeInstanceOf(Date);
    });

    it('should find only non-archived features by default', async () => {
      // Arrange
      const active = createMaintenanceFeature();
      const archived = createMaintenanceFeature();
      archived.archive();

      await repository.save(active);
      await repository.save(archived);

      // Act
      const features = await repository.findByRepoPath(active.repoPath);

      // Assert
      expect(features).toHaveLength(1);
      expect(features[0].id).toBe(active.id);
    });

    it('should find archived features when requested', async () => {
      // Arrange
      const archived = createMaintenanceFeature();
      archived.archive();
      await repository.save(archived);

      // Act
      const features = await repository.findArchived(archived.repoPath);

      // Assert
      expect(features).toHaveLength(1);
      expect(features[0].isArchived).toBe(true);
    });
  });
});
```

### 3.2 GREEN - Update Repository Implementation

```typescript
// src/infrastructure/repositories/sqlite/feature.repository.ts
export class SqliteFeatureRepository implements IFeatureRepository {
  // Add new columns to schema
  async save(feature: Feature): Promise<void> {
    await this.db.run(
      `
      INSERT INTO features (id, name, description, lifecycle, repo_path, is_archived, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        lifecycle = excluded.lifecycle,
        is_archived = excluded.is_archived,
        archived_at = excluded.archived_at,
        updated_at = CURRENT_TIMESTAMP
    `,
      [
        feature.id,
        feature.name,
        feature.description,
        feature.lifecycle,
        feature.repoPath,
        feature.isArchived ? 1 : 0,
        feature.archivedAt?.toISOString() ?? null,
      ]
    );
  }

  async findByRepoPath(repoPath: string): Promise<Feature[]> {
    const rows = await this.db.all<FeatureRow[]>(
      'SELECT * FROM features WHERE repo_path = ? AND is_archived = 0',
      [repoPath]
    );
    return rows.map((row) => FeatureMapper.toDomain(row));
  }

  async findArchived(repoPath: string): Promise<Feature[]> {
    const rows = await this.db.all<FeatureRow[]>(
      'SELECT * FROM features WHERE repo_path = ? AND is_archived = 1',
      [repoPath]
    );
    return rows.map((row) => FeatureMapper.toDomain(row));
  }
}
```

---

## Step 4: Presentation Layer

### 4.1 CLI Command (TDD)

```typescript
// tests/e2e/cli/archive-feature.test.ts
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('shep feature archive', () => {
  it('should archive a feature', () => {
    // Setup: Create a feature first
    const createResult = execSync('shep feature create "Test" --lifecycle maintenance');
    const featureId = extractFeatureId(createResult);

    // Act
    const result = execSync(`shep feature archive ${featureId}`);

    // Assert
    expect(result.toString()).toContain('Feature archived successfully');
  });
});
```

### 4.2 Web UI Component (TDD with Playwright)

```typescript
// tests/e2e/web/archive-feature.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Archive Feature', () => {
  test('should archive feature from UI', async ({ page }) => {
    // Arrange
    await page.goto('/features/test-feature');

    // Act
    await page.click('[data-testid="archive-button"]');
    await page.click('[data-testid="confirm-archive"]');

    // Assert
    await expect(page.locator('[data-testid="archived-badge"]')).toBeVisible();
  });
});
```

---

## TDD Command Reference

```bash
# Start TDD session (watch mode)
pnpm test:watch

# Run specific test file
pnpm test:single tests/unit/domain/entities/feature.test.ts

# Run tests matching pattern
pnpm test -- --grep "archive"

# Run only unit tests
pnpm test:unit

# Run only integration tests
pnpm test:int

# Run e2e tests (Playwright)
pnpm test:e2e

# Run tests for changed files only
pnpm test -- --changed
```

## TDD Best Practices

### 1. Test Naming Convention

```typescript
// Pattern: should_[expected behavior]_when_[condition]
it('should archive feature when in Maintenance lifecycle', () => {});
it('should throw error when archiving Implementation feature', () => {});
```

### 2. Arrange-Act-Assert (AAA)

```typescript
it('should do something', () => {
  // Arrange - Set up test data
  const feature = createFeature();

  // Act - Execute the behavior
  feature.archive();

  // Assert - Verify the result
  expect(feature.isArchived).toBe(true);
});
```

### 3. One Assertion Per Test (When Possible)

```typescript
// Good: Focused tests
it('should set isArchived to true', () => {
  feature.archive();
  expect(feature.isArchived).toBe(true);
});

it('should set archivedAt timestamp', () => {
  feature.archive();
  expect(feature.archivedAt).toBeInstanceOf(Date);
});
```

### 4. Test Factories Over Fixtures

```typescript
// tests/helpers/factories.ts
export function createFeature(overrides: Partial<FeatureProps> = {}): Feature {
  return Feature.create({
    name: 'Default Name',
    description: 'Default Description',
    repoPath: '/default/path',
    ...overrides,
  });
}

export function createMaintenanceFeature(): Feature {
  const feature = createFeature();
  feature['_lifecycle'] = SdlcLifecycle.Maintenance;
  return feature;
}
```

## Layer Testing Summary

| Layer          | Test Type   | Speed  | Dependencies        |
| -------------- | ----------- | ------ | ------------------- |
| Domain         | Unit        | Fast   | None                |
| Application    | Unit        | Fast   | Mocked ports        |
| Infrastructure | Integration | Medium | Real DB (in-memory) |
| Presentation   | E2E         | Slow   | Full stack          |

## Testing TypeSpec-Generated Code

### Philosophy

TypeSpec models are the single source of truth. Generated TypeScript types in `src/domain/generated/output.ts` should **never be edited manually**.

### Testing Approach

**DO:**

- ✅ Test domain logic that uses generated types
- ✅ Test repository mapping between generated types and database
- ✅ Verify TypeSpec compilation in CI (`pnpm tsp:compile`)
- ✅ Import types from generated output: `import type { Settings } from '@/domain/generated/output'`

**DON'T:**

- ❌ Unit test the generated types themselves (they're generated)
- ❌ Mock generated types (use real types for type safety)
- ❌ Manually edit `src/domain/generated/output.ts`

### Example: Testing Repository with Generated Types

```typescript
// tests/integration/repositories/settings.repository.test.ts
import type { Settings } from '@/domain/generated/output';
import { SQLiteSettingsRepository } from '@/infrastructure/repositories/sqlite-settings.repository';

describe('SQLiteSettingsRepository', () => {
  it('should persist Settings with all TypeSpec-defined fields', async () => {
    // Arrange - Create Settings object using generated type
    const settings: Settings = {
      id: 'singleton',
      createdAt: new Date(),
      updatedAt: new Date(),
      models: {
        analyze: 'claude-opus-4',
        requirements: 'claude-sonnet-4',
        plan: 'claude-sonnet-4',
        implement: 'claude-sonnet-4',
      },
      user: {
        name: 'Test User',
        email: 'test@example.com',
      },
      environment: {
        defaultEditor: 'vim',
        shellPreference: 'bash',
      },
      system: {
        autoUpdate: true,
        logLevel: 'info',
      },
    };

    // Act
    await repository.initialize(settings);
    const loaded = await repository.load();

    // Assert - Verify all fields persisted correctly
    expect(loaded).toMatchObject(settings);
  });
});
```

### Regenerating Types After TypeSpec Changes

```bash
# 1. Modify TypeSpec model
vim tsp/domain/entities/settings.tsp

# 2. Regenerate TypeScript types
pnpm tsp:compile

# 3. Run tests (should fail if breaking change)
pnpm test

# 4. Fix implementation to match new types
# TypeScript will show compile errors

# 5. Tests pass → commit both .tsp and generated files
git add tsp/ src/domain/generated/
git commit -m "feat(domain): add new field to Settings model"
```

## Testing Repositories with In-Memory SQLite

### Why In-Memory Databases?

Integration tests for repositories should use **in-memory SQLite** databases:

- ✅ Fast (no disk I/O)
- ✅ Isolated (each test gets fresh database)
- ✅ Real SQL engine (not mocked)
- ✅ Tests actual schema and constraints

### Setup Pattern

```typescript
// tests/helpers/database.helper.ts
import Database from 'better-sqlite3';

export function createInMemoryDatabase(): Database.Database {
  return new Database(':memory:', {
    // fileMustExist: false (implicit for :memory:)
  });
}

export function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(tableName);
  return result !== undefined;
}
```

### Test Structure

```typescript
// tests/integration/infrastructure/repositories/sqlite-settings.repository.test.ts
import 'reflect-metadata'; // IMPORTANT: Required for tsyringe DI
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createInMemoryDatabase, tableExists } from '@tests/helpers/database.helper';
import { runSQLiteMigrations } from '@/infrastructure/persistence/sqlite/migrations';
import { SQLiteSettingsRepository } from '@/infrastructure/repositories/sqlite-settings.repository';
import type { Settings } from '@/domain/generated/output';

describe('SQLiteSettingsRepository', () => {
  let db: Database.Database;
  let repository: SQLiteSettingsRepository;

  beforeEach(async () => {
    // Create fresh in-memory database
    db = createInMemoryDatabase();

    // Run migrations to create schema
    await runSQLiteMigrations(db);

    // Create repository instance
    repository = new SQLiteSettingsRepository(db);
  });

  afterEach(() => {
    // Close database connection
    db.close();
  });

  describe('migrations', () => {
    it('should create settings table', () => {
      expect(tableExists(db, 'settings')).toBe(true);
    });

    it('should create singleton constraint', async () => {
      // Arrange
      const settings1 = createTestSettings();
      const settings2 = createTestSettings();
      settings2.id = 'duplicate'; // Try to create second record

      // Act
      await repository.initialize(settings1);

      // Assert - Singleton constraint prevents duplicate
      await expect(repository.initialize(settings2)).rejects.toThrow();
    });
  });

  describe('CRUD operations', () => {
    it('should initialize settings', async () => {
      // Arrange
      const settings = createTestSettings();

      // Act
      await repository.initialize(settings);

      // Assert
      const row = db.prepare('SELECT * FROM settings WHERE id = ?').get('singleton');
      expect(row).toBeDefined();
    });

    it('should load settings', async () => {
      // Arrange
      const settings = createTestSettings();
      await repository.initialize(settings);

      // Act
      const loaded = await repository.load();

      // Assert
      expect(loaded).toMatchObject(settings);
    });

    it('should update settings', async () => {
      // Arrange
      const settings = createTestSettings();
      await repository.initialize(settings);

      // Act
      settings.system.logLevel = 'debug';
      await repository.update(settings);

      // Assert
      const loaded = await repository.load();
      expect(loaded?.system.logLevel).toBe('debug');
    });

    it('should return null when no settings exist', async () => {
      // Act
      const loaded = await repository.load();

      // Assert
      expect(loaded).toBeNull();
    });
  });

  describe('SQL injection prevention', () => {
    it('should safely handle quotes in email', async () => {
      // Arrange
      const settings = createTestSettings();
      settings.user.email = "test'@example.com"; // SQL injection attempt

      // Act
      await repository.initialize(settings);

      // Assert
      const loaded = await repository.load();
      expect(loaded?.user.email).toBe("test'@example.com");
    });
  });

  describe('database mapping', () => {
    it('should use snake_case for database columns', async () => {
      // Arrange
      const settings = createTestSettings();

      // Act
      await repository.initialize(settings);

      // Assert - Verify column naming
      const row = db.prepare('SELECT model_analyze, sys_log_level FROM settings').get() as {
        model_analyze: string;
        sys_log_level: string;
      };
      expect(row.model_analyze).toBe(settings.models.analyze);
      expect(row.sys_log_level).toBe(settings.system.logLevel);
    });

    it('should convert boolean to integer (SQLite limitation)', async () => {
      // Arrange
      const settings = createTestSettings();
      settings.system.autoUpdate = true;

      // Act
      await repository.initialize(settings);

      // Assert
      const row = db.prepare('SELECT sys_auto_update FROM settings').get() as {
        sys_auto_update: number;
      };
      expect(row.sys_auto_update).toBe(1); // boolean true → 1
    });

    it('should correctly convert integer back to boolean when loading', async () => {
      // Arrange - Manually insert with integer value
      db.prepare(
        `INSERT INTO settings (id, sys_auto_update, ...) VALUES ('singleton', 0, ...)`
      ).run();

      // Act
      const loaded = await repository.load();

      // Assert
      expect(loaded?.system.autoUpdate).toBe(false); // 0 → boolean false
    });
  });
});

// Test helper
function createTestSettings(): Settings {
  return {
    id: 'singleton',
    createdAt: new Date(),
    updatedAt: new Date(),
    models: {
      analyze: 'claude-opus-4',
      requirements: 'claude-sonnet-4',
      plan: 'claude-sonnet-4',
      implement: 'claude-sonnet-4',
    },
    user: {
      name: 'Test User',
      email: 'test@example.com',
    },
    environment: {
      defaultEditor: 'vim',
      shellPreference: 'bash',
    },
    system: {
      autoUpdate: true,
      logLevel: 'info',
    },
  };
}
```

### Best Practices

1. **Always import reflect-metadata first** (required for tsyringe DI):

   ```typescript
   import 'reflect-metadata'; // MUST be first import
   import { describe, it, expect } from 'vitest';
   ```

2. **Test database constraints** (UNIQUE, NOT NULL, CHECK, FOREIGN KEY):

   ```typescript
   it('should enforce singleton constraint', async () => {
     await repository.initialize(settings1);
     await expect(repository.initialize(settings2)).rejects.toThrow();
   });
   ```

3. **Test SQL injection prevention** (verify prepared statements work):

   ```typescript
   it('should safely handle special characters', async () => {
     const malicious = createSettings();
     malicious.user.email = "'; DROP TABLE settings; --";
     await repository.initialize(malicious);
     expect(tableExists(db, 'settings')).toBe(true); // Table still exists
   });
   ```

4. **Test database mapping** (camelCase ↔ snake_case):

   ```typescript
   it('should use snake_case columns', async () => {
     await repository.save(entity);
     const row = db.prepare('SELECT created_at FROM entities').get();
     expect(row.created_at).toBeDefined(); // Not createdAt
   });
   ```

5. **Test migrations** (verify schema creation):
   ```typescript
   it('should create all required tables', () => {
     expect(tableExists(db, 'settings')).toBe(true);
     expect(tableExists(db, 'features')).toBe(true);
   });
   ```

## Continuous TDD Workflow

```
1. Pick a small feature slice
2. Write failing domain test → Make it pass → Refactor
3. Write failing use case test → Make it pass → Refactor
4. Write failing repository test → Make it pass → Refactor
5. Write failing UI test → Make it pass → Refactor
6. Commit and repeat
```

---

## Maintaining This Document

**Update when:**

- Testing infrastructure changes
- New testing patterns are adopted
- Layer structure changes

**Related docs:**

- [testing.md](./testing.md) - General testing guide
- [../architecture/clean-architecture.md](../architecture/clean-architecture.md) - Layer details
