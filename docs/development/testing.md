# Testing Guide

Comprehensive guide to testing in Shep AI CLI.

## Testing Philosophy

We follow **Test-Driven Development (TDD)**:

1. **Write the test first** - Define expected behavior before implementation
2. **Red-Green-Refactor** - Fail → Pass → Improve
3. **Test behavior, not implementation** - Focus on what, not how
4. **Fast feedback loops** - Use watch mode during development

See [tdd-guide.md](./tdd-guide.md) for the complete TDD workflow with Clean Architecture.

## Test Structure

```
tests/
├── unit/                    # Fast, isolated tests (Vitest)
│   ├── domain/
│   │   ├── entities/
│   │   └── services/
│   └── application/
│       └── use-cases/
├── integration/             # Tests with real dependencies (Vitest)
│   ├── repositories/
│   └── agents/
├── e2e/                     # Full system tests (Playwright)
│   ├── cli/                 # CLI command tests
│   └── web/                 # Web UI tests
└── helpers/                 # Test utilities
    ├── factories.ts         # Entity factories
    ├── mocks.ts             # Mock implementations
    └── db.ts                # Test database helpers
```

## Test Frameworks

| Framework      | Purpose                  | Location                            |
| -------------- | ------------------------ | ----------------------------------- |
| **Vitest**     | Unit & Integration tests | `tests/unit/`, `tests/integration/` |
| **Playwright** | E2E tests (CLI + Web UI) | `tests/e2e/`                        |
| **Storybook**  | Component visual testing | `src/presentation/web/stories/`     |

## Running Tests

### TDD Watch Mode (Primary Workflow)

```bash
# Start TDD session - tests rerun on file changes
pnpm test:watch
```

### All Tests

```bash
pnpm test
```

### By Layer

```bash
# Unit tests only (fast)
pnpm test:unit

# Integration tests only
pnpm test:int

# E2E tests (Playwright)
pnpm test:e2e
```

### Single File

```bash
pnpm test:single tests/unit/domain/entities/feature.test.ts
```

### By Pattern

```bash
pnpm test -- --grep "Feature"
```

### With Coverage

```bash
pnpm test:coverage
```

Coverage thresholds (in `vitest.config.ts`):

```typescript
coverage: {
  thresholds: {
    lines: 80,
    branches: 75,
    functions: 80,
    statements: 80
  }
}
```

## Writing Tests

### Unit Tests

For domain logic with no external dependencies:

```typescript
// tests/unit/domain/entities/feature.test.ts
import { describe, it, expect } from 'vitest';
import { Feature } from '@/domain/entities/feature';
import { SdlcLifecycle } from '@/domain/value-objects/sdlc-lifecycle';

describe('Feature', () => {
  describe('lifecycle transitions', () => {
    it('should allow transition from Requirements to Plan', () => {
      const feature = Feature.create({
        name: 'Test Feature',
        description: 'Description',
        repoPath: '/test/repo',
      });

      expect(feature.canTransitionTo(SdlcLifecycle.Plan)).toBe(true);
    });

    it('should not allow skipping Plan phase', () => {
      const feature = Feature.create({
        name: 'Test Feature',
        description: 'Description',
        repoPath: '/test/repo',
      });

      expect(feature.canTransitionTo(SdlcLifecycle.Implementation)).toBe(false);
    });

    it('should throw on invalid transition', () => {
      const feature = Feature.create({
        name: 'Test Feature',
        description: 'Description',
        repoPath: '/test/repo',
      });

      expect(() => {
        feature.transitionTo(SdlcLifecycle.Implementation);
      }).toThrow('Invalid lifecycle transition');
    });
  });
});
```

### Integration Tests

For repository implementations with real database:

```typescript
// tests/integration/repositories/feature-repository.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from 'better-sqlite3';
import { SqliteFeatureRepository } from '@/infrastructure/repositories/sqlite/feature.repository';
import { Feature } from '@/domain/entities/feature';
import { createTestDatabase, runMigrations } from '@tests/helpers/db';

describe('SqliteFeatureRepository', () => {
  let db: Database;
  let repository: SqliteFeatureRepository;

  beforeEach(async () => {
    db = createTestDatabase();
    await runMigrations(db);
    repository = new SqliteFeatureRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('save and findById', () => {
    it('should persist and retrieve a feature', async () => {
      const feature = Feature.create({
        name: 'Test Feature',
        description: 'Description',
        repoPath: '/test/repo',
      });

      await repository.save(feature);
      const retrieved = await repository.findById(feature.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Test Feature');
      expect(retrieved?.lifecycle).toBe(feature.lifecycle);
    });
  });

  describe('findByRepoPath', () => {
    it('should return features for specific repo', async () => {
      const feature1 = Feature.create({
        name: 'Feature 1',
        description: 'Desc',
        repoPath: '/repo/a',
      });
      const feature2 = Feature.create({
        name: 'Feature 2',
        description: 'Desc',
        repoPath: '/repo/b',
      });

      await repository.save(feature1);
      await repository.save(feature2);

      const features = await repository.findByRepoPath('/repo/a');

      expect(features).toHaveLength(1);
      expect(features[0].name).toBe('Feature 1');
    });
  });
});
```

### E2E Tests (Playwright)

#### CLI Command Tests

```typescript
// tests/e2e/cli/init.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('shep init', () => {
  const testDir = join(__dirname, '.test-repo');

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
    execSync('pnpm init', { cwd: testDir });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should initialize shep in a repository', () => {
    const result = execSync('pnpm tsx src/presentation/cli/index.ts init', {
      cwd: testDir,
      encoding: 'utf8',
    });

    expect(result).toContain('Initialized');
    expect(existsSync(join(testDir, '.shep'))).toBe(true);
  });
});
```

#### Web UI Tests (Playwright)

```typescript
// tests/e2e/web/feature-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Feature Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should create a new feature', async ({ page }) => {
    // Navigate to features
    await page.click('[data-testid="nav-features"]');

    // Click create button
    await page.click('[data-testid="create-feature-btn"]');

    // Fill form
    await page.fill('[data-testid="feature-name"]', 'User Authentication');
    await page.fill('[data-testid="feature-description"]', 'Add login functionality');

    // Submit
    await page.click('[data-testid="submit-feature"]');

    // Verify creation
    await expect(page.locator('[data-testid="feature-card"]')).toContainText('User Authentication');
    await expect(page.locator('[data-testid="lifecycle-badge"]')).toContainText('Requirements');
  });

  test('should transition feature through lifecycle', async ({ page }) => {
    // Start with existing feature
    await page.goto('/features/test-feature-id');

    // Verify initial state
    await expect(page.locator('[data-testid="lifecycle-badge"]')).toContainText('Requirements');

    // Complete requirements and move to Plan
    await page.click('[data-testid="complete-requirements-btn"]');
    await page.click('[data-testid="confirm-transition"]');

    // Verify transition
    await expect(page.locator('[data-testid="lifecycle-badge"]')).toContainText('Plan');
  });

  test('should display chat interface for requirements gathering', async ({ page }) => {
    await page.goto('/features/test-feature-id/requirements');

    // Verify chat components
    await expect(page.locator('[data-testid="chat-messages"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();

    // Send a message
    await page.fill('[data-testid="chat-input"]', 'I need user authentication with OAuth');
    await page.click('[data-testid="send-message"]');

    // Verify message appears
    await expect(page.locator('[data-testid="chat-messages"]')).toContainText('OAuth');
  });
});
```

### Storybook Component Tests

Visual and interaction testing for UI components:

```typescript
// src/presentation/web/stories/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/ui/button';
import { within, userEvent, expect } from '@storybook/test';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// All variants
export const Default: Story = {
  args: {
    children: 'Button',
    variant: 'default',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Delete',
    variant: 'destructive',
  },
};

export const Outline: Story = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
};

// Interactive test
export const WithInteraction: Story = {
  args: {
    children: 'Click me',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');

    await userEvent.click(button);
    await expect(button).toHaveFocus();
  },
};

// Loading state
export const Loading: Story = {
  args: {
    children: 'Loading...',
    disabled: true,
  },
};
```

```typescript
// src/presentation/web/stories/FeatureCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { FeatureCard } from '@/components/features/FeatureCard';
import { SdlcLifecycle } from '@/domain/value-objects/sdlc-lifecycle';

const meta: Meta<typeof FeatureCard> = {
  title: 'Features/FeatureCard',
  component: FeatureCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Requirements: Story = {
  args: {
    feature: {
      id: 'feat_1',
      name: 'User Authentication',
      description: 'Implement OAuth2 login flow',
      lifecycle: SdlcLifecycle.Requirements,
      taskCount: 0,
      completedTasks: 0,
    },
  },
};

export const InProgress: Story = {
  args: {
    feature: {
      id: 'feat_2',
      name: 'Dashboard Redesign',
      description: 'Modernize the main dashboard',
      lifecycle: SdlcLifecycle.Implementation,
      taskCount: 5,
      completedTasks: 2,
    },
  },
};

export const Completed: Story = {
  args: {
    feature: {
      id: 'feat_3',
      name: 'API Rate Limiting',
      description: 'Add rate limiting to all endpoints',
      lifecycle: SdlcLifecycle.Maintenance,
      taskCount: 3,
      completedTasks: 3,
    },
  },
};
```

## Test Utilities

### Factories

Create test entities consistently:

```typescript
// tests/helpers/factories.ts
import { Feature } from '@/domain/entities/feature';
import { Task } from '@/domain/entities/task';

export function createFeature(overrides: Partial<FeatureProps> = {}): Feature {
  return Feature.create({
    name: 'Test Feature',
    description: 'Test Description',
    repoPath: '/test/repo',
    ...overrides,
  });
}

export function createTask(overrides: Partial<TaskProps> = {}): Task {
  return new Task({
    featureId: 'feat_123',
    title: 'Test Task',
    description: 'Task description',
    dependsOn: [],
    ...overrides,
  });
}
```

### Mocks

Mock external dependencies:

```typescript
// tests/helpers/mocks.ts
import { vi } from 'vitest';
import type { ILLMClient } from '@/infrastructure/services/llm-client';

export function createMockLLMClient(): ILLMClient {
  return {
    complete: vi.fn().mockResolvedValue({
      content: 'Mock response',
    }),
    chat: vi.fn().mockResolvedValue({
      content: 'Mock chat response',
    }),
  };
}

export function createMockFeatureRepository(): IFeatureRepository {
  const features = new Map<string, Feature>();

  return {
    findById: vi.fn((id) => Promise.resolve(features.get(id) ?? null)),
    findByRepoPath: vi.fn(() => Promise.resolve(Array.from(features.values()))),
    save: vi.fn((feature) => {
      features.set(feature.id, feature);
      return Promise.resolve();
    }),
    delete: vi.fn((id) => {
      features.delete(id);
      return Promise.resolve();
    }),
  };
}
```

### Test Database

In-memory SQLite for tests:

```typescript
// tests/helpers/db.ts
import Database from 'better-sqlite3';
import { migrations } from '@/infrastructure/persistence/migrations';

export function createTestDatabase(): Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  return db;
}

export async function runMigrations(db: Database): Promise<void> {
  for (const migration of migrations) {
    await migration.up(db);
  }
}
```

## Testing Patterns

### Testing Use Cases

```typescript
describe('CreatePlanUseCase', () => {
  it('should create plan from requirements', async () => {
    // Arrange
    const featureRepo = createMockFeatureRepository();
    const planningAgent = createMockPlanningAgent();
    const feature = createFeature({ lifecycle: SdlcLifecycle.Requirements });
    await featureRepo.save(feature);

    const useCase = new CreatePlanUseCase(featureRepo, planningAgent);

    // Act
    const result = await useCase.execute(feature.id);

    // Assert
    expect(result.feature.lifecycle).toBe(SdlcLifecycle.Plan);
    expect(result.plan.tasks).toHaveLength(3);
    expect(featureRepo.save).toHaveBeenCalled();
  });
});
```

### Testing Agents

```typescript
describe('RepositoryAnalysisAgent', () => {
  it('should analyze repository structure', async () => {
    const agent = new RepositoryAnalysisAgent();
    const context = createTestAgentContext();

    await agent.initialize(context);

    const result = await agent.execute({
      id: 'task_1',
      type: 'analyze',
      payload: { repoPath: fixtureRepoPath },
    });

    expect(result.status).toBe('success');
    expect(result.data.summary).toBeDefined();
  });
});
```

## Coverage Requirements

| Layer          | Minimum Coverage |
| -------------- | ---------------- |
| Domain         | 90%              |
| Application    | 85%              |
| Infrastructure | 75%              |
| Presentation   | 60%              |

## Continuous Integration

Tests run on every PR:

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test -- --coverage

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Install Playwright Browsers
        run: pnpm exec playwright install --with-deps

      - name: Build
        run: pnpm build

      - name: Run E2E Tests
        run: pnpm test:e2e

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  storybook:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Build Storybook
        run: pnpm storybook:build

      - name: Run Storybook Tests
        run: pnpm test:storybook
```

---

## Maintaining This Document

**Update when:**

- Testing framework changes
- Coverage requirements change
- New testing patterns emerge
- Test utilities are added

**Related docs:**

- [setup.md](./setup.md) - Development setup
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - PR requirements
