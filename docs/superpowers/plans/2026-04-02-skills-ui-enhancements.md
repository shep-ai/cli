# Skills UI Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show configured auto-injected skills on the skills page (with add/remove), and display which skills were injected on each feature's overview tab.

**Architecture:** Three layers of change — (1) data layer: persist `injectedSkills` on the Feature entity via TypeSpec + migration + mapper, (2) feature drawer: read and display the persisted list in OverviewTab, (3) skills page: read settings config, display auto-injected skills section, add/remove via server actions that mutate settings.

**Tech Stack:** TypeSpec, SQLite (better-sqlite3/umzug), Next.js server actions, React, shadcn/ui, Storybook, Vitest

---

## File Structure

### Data Layer
| File | Action | Responsibility |
|------|--------|---------------|
| `tsp/domain/entities/feature.tsp` | Modify | Add `injectedSkills` field to Feature model |
| `packages/core/src/domain/generated/output.ts` | Regenerate | TypeSpec codegen output |
| `packages/core/src/infrastructure/persistence/sqlite/migrations/051-add-injected-skills-to-features.ts` | Create | Add `injected_skills TEXT` column |
| `packages/core/src/infrastructure/persistence/sqlite/mappers/feature.mapper.ts` | Modify | Serialize/deserialize `injectedSkills` |
| `packages/core/src/application/use-cases/features/create/create-feature.use-case.ts` | Modify | Persist injection result on feature |

### Feature Drawer
| File | Action | Responsibility |
|------|--------|---------------|
| `src/presentation/web/components/common/feature-node/feature-node-state-config.ts` | Modify | Add `injectedSkills` to `FeatureNodeData` |
| `src/presentation/web/components/common/feature-drawer-tabs/overview-tab.tsx` | Modify | Add `InjectedSkillsSection` component |

### Skills Page
| File | Action | Responsibility |
|------|--------|---------------|
| `src/presentation/web/app/skills/page.tsx` | Modify | Fetch injection config from settings |
| `src/presentation/web/components/features/skills/skills-page-client.tsx` | Modify | Accept + render injection config |
| `src/presentation/web/components/features/skills/auto-injected-skills-section.tsx` | Create | Auto-injected skills display with remove |
| `src/presentation/web/components/features/skills/add-skill-dialog.tsx` | Create | Dialog for adding local/remote skills |
| `src/presentation/web/app/actions/add-injected-skill.ts` | Create | Server action to add skill to config |
| `src/presentation/web/app/actions/remove-injected-skill.ts` | Create | Server action to remove skill from config |

### Storybook
| File | Action | Responsibility |
|------|--------|---------------|
| `src/presentation/web/components/common/feature-drawer-tabs/overview-tab.stories.tsx` | Modify | Add story with injected skills |
| `src/presentation/web/components/features/skills/skills-page-client.stories.tsx` | Modify | Add story with injection config |
| `src/presentation/web/components/features/skills/auto-injected-skills-section.stories.tsx` | Create | Stories for auto-injected section |
| `src/presentation/web/components/features/skills/add-skill-dialog.stories.tsx` | Create | Stories for add skill dialog |
| `.storybook/mocks/app/actions/add-injected-skill.ts` | Create | Storybook mock |
| `.storybook/mocks/app/actions/remove-injected-skill.ts` | Create | Storybook mock |

---

### Task 1: TypeSpec + Migration + Mapper — Persist `injectedSkills` on Feature

**Files:**
- Modify: `tsp/domain/entities/feature.tsp`
- Create: `packages/core/src/infrastructure/persistence/sqlite/migrations/051-add-injected-skills-to-features.ts`
- Modify: `packages/core/src/infrastructure/persistence/sqlite/mappers/feature.mapper.ts`
- Test: `tests/unit/infrastructure/persistence/sqlite/mappers/feature.mapper.test.ts`

- [ ] **Step 1: Add `injectedSkills` to Feature TypeSpec model**

In `tsp/domain/entities/feature.tsp`, add after the `agentRunId` field (around line 354):

```typespec
@doc("Skills that were injected into this feature's worktree during creation")
injectedSkills?: string[];
```

Run: `pnpm tsp:compile`
Expected: Compilation succeeds, `output.ts` is regenerated with `injectedSkills?: string[]` on the Feature interface.

- [ ] **Step 2: Create migration 051**

Create `packages/core/src/infrastructure/persistence/sqlite/migrations/051-add-injected-skills-to-features.ts`:

```typescript
/**
 * Migration 051: Add injected_skills column to features table.
 *
 * Stores JSON array of skill names that were injected into the
 * feature's worktree at creation time. Nullable for existing features.
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(features)') as { name: string }[];
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('injected_skills')) {
    db.exec('ALTER TABLE features ADD COLUMN injected_skills TEXT');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
```

- [ ] **Step 3: Write failing test for feature mapper serialization**

In the feature mapper test file, add tests for `injectedSkills` round-trip:

```typescript
describe('injectedSkills serialization', () => {
  it('should serialize injectedSkills to JSON in toDatabase', () => {
    const feature = createTestFeature({
      injectedSkills: ['architecture-reviewer', 'tsp-model'],
    });
    const row = toDatabase(feature);
    expect(row.injected_skills).toBe(JSON.stringify(['architecture-reviewer', 'tsp-model']));
  });

  it('should serialize null when injectedSkills is undefined', () => {
    const feature = createTestFeature({ injectedSkills: undefined });
    const row = toDatabase(feature);
    expect(row.injected_skills).toBeNull();
  });

  it('should serialize null when injectedSkills is empty', () => {
    const feature = createTestFeature({ injectedSkills: [] });
    const row = toDatabase(feature);
    expect(row.injected_skills).toBeNull();
  });

  it('should deserialize injected_skills from JSON in fromDatabase', () => {
    const row = createTestRow({
      injected_skills: JSON.stringify(['architecture-reviewer', 'tsp-model']),
    });
    const feature = fromDatabase(row);
    expect(feature.injectedSkills).toEqual(['architecture-reviewer', 'tsp-model']);
  });

  it('should omit injectedSkills when injected_skills is null', () => {
    const row = createTestRow({ injected_skills: null });
    const feature = fromDatabase(row);
    expect(feature.injectedSkills).toBeUndefined();
  });
});
```

**Note:** If `createTestRow` helper exists in the test file, add `injected_skills: null` to its default return object so it satisfies the updated `FeatureRow` interface.

Run: `pnpm test:unit -- --testPathPattern="feature.mapper" --run`
Expected: FAIL — `injected_skills` not in `toDatabase`/`fromDatabase`.

- [ ] **Step 4: Update feature mapper**

In `packages/core/src/infrastructure/persistence/sqlite/mappers/feature.mapper.ts`:

**FeatureRow interface** — add after `attachments`:
```typescript
injected_skills: string | null;
```

**toDatabase function** — add after the `attachments` line:
```typescript
injected_skills: feature.injectedSkills?.length
  ? JSON.stringify(feature.injectedSkills)
  : null,
```

**fromDatabase function** — add after the `attachments` line:
```typescript
...(row.injected_skills !== null && { injectedSkills: JSON.parse(row.injected_skills) }),
```

- [ ] **Step 5: Run tests to verify mapper passes**

Run: `pnpm test:unit -- --testPathPattern="feature.mapper" --run`
Expected: All tests PASS including new `injectedSkills serialization` tests.

- [ ] **Step 6: Commit**

```bash
git add tsp/domain/entities/feature.tsp \
  packages/core/src/domain/generated/ \
  packages/core/src/infrastructure/persistence/sqlite/migrations/051-add-injected-skills-to-features.ts \
  packages/core/src/infrastructure/persistence/sqlite/mappers/feature.mapper.ts \
  tests/unit/infrastructure/persistence/sqlite/mappers/feature.mapper.test.ts
git commit -m "feat(domain): add injected-skills field to feature entity with migration"
```

---

### Task 2: Populate `injectedSkills` in CreateFeatureUseCase

**Files:**
- Modify: `packages/core/src/application/use-cases/features/create/create-feature.use-case.ts`
- Test: `tests/unit/application/use-cases/features/create-feature.use-case.test.ts`

- [ ] **Step 1: Write failing test**

In the create-feature use case test file, within the `skill injection` describe block, add:

```typescript
it('should persist injectedSkills from injection result on the feature', async () => {
  const skillInjectionConfig = {
    enabled: true,
    skills: [
      { name: 'architecture-reviewer', type: 'local' as const, source: '.claude/skills/architecture-reviewer' },
    ],
  };
  mockSettingsService.getSettings.mockReturnValue({
    ...defaultSettings,
    workflow: { skillInjection: skillInjectionConfig },
  });
  mockSkillInjector.inject.mockResolvedValue({
    injected: ['architecture-reviewer'],
    skipped: ['tsp-model'],
    failed: [],
  });

  await useCase.execute(createInput({ injectSkills: true }));

  const savedFeature = mockFeatureRepo.save.mock.calls.at(-1)?.[0];
  expect(savedFeature.injectedSkills).toEqual(['architecture-reviewer', 'tsp-model']);
});

it('should not set injectedSkills when skill injection is disabled', async () => {
  mockSettingsService.getSettings.mockReturnValue({
    ...defaultSettings,
    workflow: { skillInjection: { enabled: false, skills: [] } },
  });

  await useCase.execute(createInput());

  const savedFeature = mockFeatureRepo.save.mock.calls.at(-1)?.[0];
  expect(savedFeature.injectedSkills).toBeUndefined();
});
```

Run: `pnpm test:unit -- --testPathPattern="create-feature.use-case" --run`
Expected: FAIL — `injectedSkills` not populated on saved feature.

- [ ] **Step 2: Update CreateFeatureUseCase to capture and persist injection result**

In `packages/core/src/application/use-cases/features/create/create-feature.use-case.ts`, modify the skill injection block (around lines 309-322). Change it to capture the result:

```typescript
// Inject curated skills into the worktree (opt-in, guarded by settings or CLI flag)
const settings = getSettings();
const shouldInject = input.injectSkills ?? settings.workflow.skillInjection?.enabled ?? false;
let injectedSkillNames: string[] | undefined;
if (shouldInject && settings.workflow.skillInjection?.skills?.length) {
  try {
    const result = await this.skillInjector.inject(
      worktreePath,
      settings.workflow.skillInjection,
      effectiveRepoPath
    );
    injectedSkillNames = [...result.injected, ...result.skipped];
  } catch {
    // Skill injection failure must not block feature creation (NFR-3)
  }
}
```

Then in the `updatedFeature` spread (around line 325), add:

```typescript
...(injectedSkillNames?.length ? { injectedSkills: injectedSkillNames } : {}),
```

- [ ] **Step 3: Run tests to verify**

Run: `pnpm test:unit -- --testPathPattern="create-feature.use-case" --run`
Expected: All tests PASS including new injection result persistence tests.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/application/use-cases/features/create/create-feature.use-case.ts \
  tests/unit/application/use-cases/features/create-feature.use-case.test.ts
git commit -m "feat(domain): persist injected skill names on feature during creation"
```

---

### Task 3: Feature Drawer — Display Injected Skills in Overview Tab

**Files:**
- Modify: `src/presentation/web/components/common/feature-node/feature-node-state-config.ts`
- Modify: `src/presentation/web/app/build-feature-node-data.ts`
- Modify: `src/presentation/web/components/common/feature-drawer-tabs/overview-tab.tsx`
- Modify: `src/presentation/web/components/common/feature-drawer-tabs/overview-tab.stories.tsx`

- [ ] **Step 1: Add `injectedSkills` to `FeatureNodeData`**

In `src/presentation/web/components/common/feature-node/feature-node-state-config.ts`, add to the `FeatureNodeData` interface after the `hasChildren` field:

```typescript
/** Skills that were injected into this feature's worktree */
injectedSkills?: string[];
```

- [ ] **Step 2: Pass `injectedSkills` through `buildFeatureNodeData`**

In `src/presentation/web/app/build-feature-node-data.ts`, add `injectedSkills` to the returned object. Find the spread where feature fields are mapped to `FeatureNodeData` and add:

```typescript
...(feature.injectedSkills?.length && { injectedSkills: feature.injectedSkills }),
```

Without this step, `data.injectedSkills` will always be `undefined` in the overview tab.

- [ ] **Step 3: Add `InjectedSkillsSection` to overview tab**

In `src/presentation/web/components/common/feature-drawer-tabs/overview-tab.tsx`:

Add `Puzzle` to the lucide-react import:

```typescript
import {
  AlertTriangle,
  Check,
  ExternalLink,
  FileSearch,
  GitBranch,
  GitCommitHorizontal,
  Puzzle,
  RotateCcw,
  ShieldCheck,
  Square,
  X,
  Zap,
} from 'lucide-react';
```

Add the `InjectedSkillsSection` component before the `DetailRow` function (bottom of file):

```typescript
function InjectedSkillsSection({ skills }: { skills: string[] }) {
  if (skills.length === 0) return null;
  return (
    <>
      <Separator />
      <div data-testid="feature-drawer-injected-skills" className="flex flex-col gap-3 p-4">
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider">
          <Puzzle className="h-3 w-3" />
          INJECTED SKILLS
        </span>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((name) => (
            <Badge key={name} variant="secondary">
              {name}
            </Badge>
          ))}
        </div>
      </div>
    </>
  );
}
```

In the `OverviewTab` render, add after `<FeatureSettings data={data} />`:

```typescript
{data.injectedSkills?.length ? (
  <InjectedSkillsSection skills={data.injectedSkills} />
) : null}
```

- [ ] **Step 4: Add story for injected skills**

In `src/presentation/web/components/common/feature-drawer-tabs/overview-tab.stories.tsx`, add a new story:

```typescript
const withInjectedSkillsData: FeatureNodeData = {
  ...fullData,
  injectedSkills: ['architecture-reviewer', 'cross-validate-artifacts', 'tsp-model'],
};

export const WithInjectedSkills: Story = {
  args: {
    data: withInjectedSkillsData,
  },
};
```

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: Build succeeds without errors.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/web/components/common/feature-node/feature-node-state-config.ts \
  src/presentation/web/app/build-feature-node-data.ts \
  src/presentation/web/components/common/feature-drawer-tabs/overview-tab.tsx \
  src/presentation/web/components/common/feature-drawer-tabs/overview-tab.stories.tsx
git commit -m "feat(web): display injected skills in feature drawer overview tab"
```

---

### Task 4: Server Actions — Add/Remove Injected Skills

**Files:**
- Create: `src/presentation/web/app/actions/add-injected-skill.ts`
- Create: `src/presentation/web/app/actions/remove-injected-skill.ts`
- Create: `.storybook/mocks/app/actions/add-injected-skill.ts`
- Create: `.storybook/mocks/app/actions/remove-injected-skill.ts`

- [ ] **Step 1: Create `addInjectedSkill` server action**

Create `src/presentation/web/app/actions/add-injected-skill.ts`:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shepai/core/application/use-cases/settings/load-settings.use-case';
import type { UpdateSettingsUseCase } from '@shepai/core/application/use-cases/settings/update-settings.use-case';
import { updateSettings as updateSettingsSingleton } from '@shepai/core/infrastructure/services/settings.service';
import type { SkillSource } from '@shepai/core/domain/generated/output';

export interface AddInjectedSkillResult {
  success: boolean;
  error?: string;
}

export async function addInjectedSkill(skill: SkillSource): Promise<AddInjectedSkillResult> {
  try {
    const loadUseCase = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
    const current = await loadUseCase.execute();

    const existingSkills = current.workflow.skillInjection?.skills ?? [];
    if (existingSkills.some((s) => s.name === skill.name)) {
      return { success: false, error: `Skill "${skill.name}" is already configured` };
    }

    const updated = {
      ...current,
      workflow: {
        ...current.workflow,
        skillInjection: {
          enabled: current.workflow.skillInjection?.enabled ?? true,
          skills: [...existingSkills, skill],
        },
      },
      updatedAt: new Date(),
    };

    const updateUseCase = resolve<UpdateSettingsUseCase>('UpdateSettingsUseCase');
    await updateUseCase.execute(updated);
    updateSettingsSingleton(updated);
    revalidatePath('/skills');

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add skill';
    return { success: false, error: message };
  }
}
```

- [ ] **Step 2: Create `removeInjectedSkill` server action**

Create `src/presentation/web/app/actions/remove-injected-skill.ts`:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shepai/core/application/use-cases/settings/load-settings.use-case';
import type { UpdateSettingsUseCase } from '@shepai/core/application/use-cases/settings/update-settings.use-case';
import { updateSettings as updateSettingsSingleton } from '@shepai/core/infrastructure/services/settings.service';

export interface RemoveInjectedSkillResult {
  success: boolean;
  error?: string;
}

export async function removeInjectedSkill(skillName: string): Promise<RemoveInjectedSkillResult> {
  try {
    const loadUseCase = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
    const current = await loadUseCase.execute();

    const existingSkills = current.workflow.skillInjection?.skills ?? [];
    const filtered = existingSkills.filter((s) => s.name !== skillName);

    if (filtered.length === existingSkills.length) {
      return { success: false, error: `Skill "${skillName}" not found in configuration` };
    }

    const updated = {
      ...current,
      workflow: {
        ...current.workflow,
        skillInjection: {
          enabled: current.workflow.skillInjection?.enabled ?? false,
          skills: filtered,
        },
      },
      updatedAt: new Date(),
    };

    const updateUseCase = resolve<UpdateSettingsUseCase>('UpdateSettingsUseCase');
    await updateUseCase.execute(updated);
    updateSettingsSingleton(updated);
    revalidatePath('/skills');

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove skill';
    return { success: false, error: message };
  }
}
```

- [ ] **Step 3: Create Storybook mocks**

Create `.storybook/mocks/app/actions/add-injected-skill.ts`:

```typescript
import type { SkillSource } from '@shepai/core/domain/generated/output';

export async function addInjectedSkill(
  _skill: SkillSource
): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}
```

Create `.storybook/mocks/app/actions/remove-injected-skill.ts`:

```typescript
export async function removeInjectedSkill(
  _skillName: string
): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds without errors.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/web/app/actions/add-injected-skill.ts \
  src/presentation/web/app/actions/remove-injected-skill.ts \
  .storybook/mocks/app/actions/add-injected-skill.ts \
  .storybook/mocks/app/actions/remove-injected-skill.ts
git commit -m "feat(web): add server actions for managing injected skills config"
```

---

### Task 5: Auto-Injected Skills Section Component

**Files:**
- Create: `src/presentation/web/components/features/skills/auto-injected-skills-section.tsx`
- Create: `src/presentation/web/components/features/skills/auto-injected-skills-section.stories.tsx`

- [ ] **Step 1: Create the component**

Create `src/presentation/web/components/features/skills/auto-injected-skills-section.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { SkillInjectionConfig, SkillSource } from '@shepai/core/domain/generated/output';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { removeInjectedSkill } from '@/app/actions/remove-injected-skill';
import { AddSkillDialog } from './add-skill-dialog';
import type { SkillData } from '@/lib/skills';

export interface AutoInjectedSkillsSectionProps {
  config: SkillInjectionConfig;
  discoveredSkills: SkillData[];
}

export function AutoInjectedSkillsSection({
  config,
  discoveredSkills,
}: AutoInjectedSkillsSectionProps) {
  const router = useRouter();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removingSkill, setRemovingSkill] = useState<string | null>(null);

  if (!config.skills.length) return null;

  const handleRemove = async (skillName: string) => {
    setRemovingSkill(skillName);
    const result = await removeInjectedSkill(skillName);
    setRemovingSkill(null);
    if (!result.success) {
      toast.error(result.error ?? 'Failed to remove skill');
      return;
    }
    toast.success(`Removed "${skillName}" from auto-injection`);
    router.refresh();
  };

  const handleAdded = () => {
    setAddDialogOpen(false);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">Auto-Injected Skills</h2>
        <p className="text-muted-foreground text-sm">
          Skills automatically added to new features
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {config.skills.map((skill) => (
          <InjectedSkillCard
            key={skill.name}
            skill={skill}
            onRemove={() => handleRemove(skill.name)}
            isRemoving={removingSkill === skill.name}
          />
        ))}
      </div>
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddDialogOpen(true)}
          data-testid="add-injected-skill-button"
        >
          <Plus className="mr-1.5 size-4" />
          Add Skill
        </Button>
      </div>
      <AddSkillDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdded={handleAdded}
        discoveredSkills={discoveredSkills}
        existingSkillNames={config.skills.map((s) => s.name)}
      />
    </div>
  );
}

function InjectedSkillCard({
  skill,
  onRemove,
  isRemoving,
}: {
  skill: SkillSource;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  return (
    <Card data-testid={`injected-skill-${skill.name}`}>
      <CardContent className="flex items-center justify-between gap-2 p-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-medium">{skill.name}</span>
          <div className="flex items-center gap-1.5">
            <Badge variant={skill.type === 'local' ? 'secondary' : 'outline'} className="text-xs">
              {skill.type === 'local' ? 'Local' : 'Remote'}
            </Badge>
            <span className="text-muted-foreground max-w-37.5 truncate text-xs">
              {skill.source}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={isRemoving}
          aria-label={`Remove ${skill.name}`}
          data-testid={`remove-injected-skill-${skill.name}`}
        >
          <X className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create stories**

Create `src/presentation/web/components/features/skills/auto-injected-skills-section.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { AutoInjectedSkillsSection } from './auto-injected-skills-section';
import type { SkillInjectionConfig } from '@shepai/core/domain/generated/output';
import type { SkillData } from '@/lib/skills';

const meta = {
  title: 'Features/Skills/AutoInjectedSkillsSection',
  component: AutoInjectedSkillsSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof AutoInjectedSkillsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleConfig: SkillInjectionConfig = {
  enabled: true,
  skills: [
    { name: 'architecture-reviewer', type: 'local', source: '.claude/skills/architecture-reviewer' },
    { name: 'tsp-model', type: 'local', source: '.claude/skills/tsp-model' },
    { name: 'remotion-best-practices', type: 'remote', source: '@anthropic/remotion-skills', remoteSkillName: 'remotion-best-practices' },
  ],
};

const sampleDiscoveredSkills: SkillData[] = [
  {
    name: 'architecture-reviewer',
    displayName: 'architecture-reviewer',
    description: 'Review architecture decisions',
    category: 'Analysis',
    source: 'project',
    body: '',
    resources: [],
  },
  {
    name: 'cross-validate-artifacts',
    displayName: 'cross-validate-artifacts',
    description: 'Cross-validate documentation',
    category: 'Analysis',
    source: 'project',
    body: '',
    resources: [],
  },
];

export const Default: Story = {
  args: {
    config: sampleConfig,
    discoveredSkills: sampleDiscoveredSkills,
  },
};

export const SingleSkill: Story = {
  args: {
    config: {
      enabled: true,
      skills: [sampleConfig.skills[0]],
    },
    discoveredSkills: sampleDiscoveredSkills,
  },
};

export const EmptySkills: Story = {
  args: {
    config: { enabled: true, skills: [] },
    discoveredSkills: sampleDiscoveredSkills,
  },
};
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/web/components/features/skills/auto-injected-skills-section.tsx \
  src/presentation/web/components/features/skills/auto-injected-skills-section.stories.tsx
git commit -m "feat(web): add auto-injected skills section component with stories"
```

---

### Task 6: Add Skill Dialog Component

**Files:**
- Create: `src/presentation/web/components/features/skills/add-skill-dialog.tsx`
- Create: `src/presentation/web/components/features/skills/add-skill-dialog.stories.tsx`

- [ ] **Step 1: Create the dialog component**

Create `src/presentation/web/components/features/skills/add-skill-dialog.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { SkillSourceType } from '@shepai/core/domain/generated/output';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { addInjectedSkill } from '@/app/actions/add-injected-skill';
import type { SkillData } from '@/lib/skills';

export interface AddSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
  discoveredSkills: SkillData[];
  existingSkillNames: string[];
}

export function AddSkillDialog({
  open,
  onOpenChange,
  onAdded,
  discoveredSkills,
  existingSkillNames,
}: AddSkillDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remoteName, setRemoteName] = useState('');
  const [remoteSource, setRemoteSource] = useState('');
  const [remoteSkillName, setRemoteSkillName] = useState('');

  const availableSkills = discoveredSkills.filter(
    (s) => !existingSkillNames.includes(s.name)
  );

  const handleAddLocal = async (skill: SkillData) => {
    setIsSubmitting(true);
    const result = await addInjectedSkill({
      name: skill.name,
      type: 'local' as SkillSourceType,
      source: `.claude/skills/${skill.name}`,
    });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error ?? 'Failed to add skill');
      return;
    }
    toast.success(`Added "${skill.name}" to auto-injection`);
    onAdded();
  };

  const handleAddRemote = async () => {
    if (!remoteName.trim() || !remoteSource.trim()) {
      toast.error('Name and source are required');
      return;
    }
    setIsSubmitting(true);
    const result = await addInjectedSkill({
      name: remoteName.trim(),
      type: 'remote' as SkillSourceType,
      source: remoteSource.trim(),
      ...(remoteSkillName.trim() && { remoteSkillName: remoteSkillName.trim() }),
    });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error ?? 'Failed to add skill');
      return;
    }
    toast.success(`Added "${remoteName.trim()}" to auto-injection`);
    setRemoteName('');
    setRemoteSource('');
    setRemoteSkillName('');
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="add-skill-dialog">
        <DialogHeader>
          <DialogTitle>Add Skill to Auto-Injection</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="local">
          <TabsList className="w-full">
            <TabsTrigger value="local" className="flex-1">
              Local
            </TabsTrigger>
            <TabsTrigger value="remote" className="flex-1">
              Remote
            </TabsTrigger>
          </TabsList>
          <TabsContent value="local" className="mt-4">
            {availableSkills.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                All discovered skills are already configured.
              </p>
            ) : (
              <div className="flex max-h-60 flex-col gap-2 overflow-y-auto">
                {availableSkills.map((skill) => (
                  <button
                    key={skill.name}
                    type="button"
                    className="hover:bg-accent flex flex-col gap-0.5 rounded-md border p-3 text-left transition-colors"
                    onClick={() => handleAddLocal(skill)}
                    disabled={isSubmitting}
                    data-testid={`add-local-skill-${skill.name}`}
                  >
                    <span className="text-sm font-medium">{skill.displayName}</span>
                    <span className="text-muted-foreground line-clamp-1 text-xs">
                      {skill.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="remote" className="mt-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="remote-name">Name</Label>
                <Input
                  id="remote-name"
                  placeholder="e.g. remotion-best-practices"
                  value={remoteName}
                  onChange={(e) => setRemoteName(e.target.value)}
                  data-testid="remote-skill-name"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="remote-source">Source (npm package or URL)</Label>
                <Input
                  id="remote-source"
                  placeholder="e.g. @anthropic/remotion-skills"
                  value={remoteSource}
                  onChange={(e) => setRemoteSource(e.target.value)}
                  data-testid="remote-skill-source"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="remote-skill-name">Skill Name (optional)</Label>
                <Input
                  id="remote-skill-name"
                  placeholder="e.g. remotion-best-practices"
                  value={remoteSkillName}
                  onChange={(e) => setRemoteSkillName(e.target.value)}
                  data-testid="remote-skill-skill-name"
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAddRemote}
                  disabled={isSubmitting || !remoteName.trim() || !remoteSource.trim()}
                  data-testid="add-remote-skill-submit"
                >
                  Add Remote Skill
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create stories**

Create `src/presentation/web/components/features/skills/add-skill-dialog.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { AddSkillDialog } from './add-skill-dialog';
import type { SkillData } from '@/lib/skills';

const meta = {
  title: 'Features/Skills/AddSkillDialog',
  component: AddSkillDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof AddSkillDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleDiscoveredSkills: SkillData[] = [
  {
    name: 'architecture-reviewer',
    displayName: 'architecture-reviewer',
    description: 'Review architecture decisions against Clean Architecture principles',
    category: 'Analysis',
    source: 'project',
    body: '',
    resources: [],
  },
  {
    name: 'cross-validate-artifacts',
    displayName: 'cross-validate-artifacts',
    description: 'Cross-validate documentation and artifacts across the codebase',
    category: 'Analysis',
    source: 'project',
    body: '',
    resources: [],
  },
  {
    name: 'tsp-model',
    displayName: 'tsp-model',
    description: 'Create and modify TypeSpec domain models',
    category: 'Code Generation',
    source: 'project',
    body: '',
    resources: [],
  },
];

export const Default: Story = {
  args: {
    open: true,
    onOpenChange: () => undefined,
    onAdded: () => undefined,
    discoveredSkills: sampleDiscoveredSkills,
    existingSkillNames: [],
  },
};

export const SomeAlreadyConfigured: Story = {
  args: {
    open: true,
    onOpenChange: () => undefined,
    onAdded: () => undefined,
    discoveredSkills: sampleDiscoveredSkills,
    existingSkillNames: ['architecture-reviewer'],
  },
};

export const AllConfigured: Story = {
  args: {
    open: true,
    onOpenChange: () => undefined,
    onAdded: () => undefined,
    discoveredSkills: sampleDiscoveredSkills,
    existingSkillNames: ['architecture-reviewer', 'cross-validate-artifacts', 'tsp-model'],
  },
};
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/web/components/features/skills/add-skill-dialog.tsx \
  src/presentation/web/components/features/skills/add-skill-dialog.stories.tsx
git commit -m "feat(web): add skill dialog component for managing auto-injection"
```

---

### Task 7: Wire Up Skills Page — Fetch Config + Render Section

**Files:**
- Modify: `src/presentation/web/app/skills/page.tsx`
- Modify: `src/presentation/web/components/features/skills/skills-page-client.tsx`
- Modify: `src/presentation/web/components/features/skills/skills-page-client.stories.tsx`

- [ ] **Step 1: Update skills page server component to fetch settings**

In `src/presentation/web/app/skills/page.tsx`, add settings fetching. Import `getSettings` and pass the injection config:

```typescript
import { getSettings } from '@shepai/core/infrastructure/services/settings.service';

// Inside the page component, after getSkills():
const settings = getSettings();
const injectionConfig = settings.workflow.skillInjection ?? { enabled: false, skills: [] };

// Pass to client:
<SkillsPageClient skills={skills} injectionConfig={injectionConfig} />
```

- [ ] **Step 2: Update `SkillsPageClient` to accept and render injection config**

In `src/presentation/web/components/features/skills/skills-page-client.tsx`:

Add import:
```typescript
import type { SkillInjectionConfig } from '@shepai/core/domain/generated/output';
import { AutoInjectedSkillsSection } from './auto-injected-skills-section';
```

Update the props interface:
```typescript
export interface SkillsPageClientProps {
  skills: SkillData[];
  injectionConfig: SkillInjectionConfig;
}
```

Update the component signature:
```typescript
export function SkillsPageClient({ skills, injectionConfig }: SkillsPageClientProps) {
```

Add the section above the search bar (after `<PageHeader>`):
```typescript
{injectionConfig.skills.length > 0 ? (
  <>
    <AutoInjectedSkillsSection
      config={injectionConfig}
      discoveredSkills={skills}
    />
    <Separator />
  </>
) : null}
```

Add `Separator` to imports from `@/components/ui/separator`.

- [ ] **Step 3: Update stories**

In `src/presentation/web/components/features/skills/skills-page-client.stories.tsx`, add `injectionConfig` to existing stories and a new story:

Add default config to existing stories' args:
```typescript
injectionConfig: { enabled: false, skills: [] },
```

Add a new story:
```typescript
export const WithInjectedSkills: Story = {
  args: {
    skills: sampleSkills,
    injectionConfig: {
      enabled: true,
      skills: [
        { name: 'architecture-reviewer', type: 'local', source: '.claude/skills/architecture-reviewer' },
        { name: 'tsp-model', type: 'local', source: '.claude/skills/tsp-model' },
      ],
    },
  },
};
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/web/app/skills/page.tsx \
  src/presentation/web/components/features/skills/skills-page-client.tsx \
  src/presentation/web/components/features/skills/skills-page-client.stories.tsx
git commit -m "feat(web): wire auto-injected skills section into skills page"
```

---

### Task 8: Final Validation

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 2: Run validation**

Run: `pnpm validate`
Expected: Lint, format, typecheck all pass.

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Final commit if any lint/format fixes**

If `pnpm validate` auto-fixed anything:

```bash
git add -u
git commit -m "chore(web): fix lint and format issues"
```
