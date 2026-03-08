# Unified AgentModelPicker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the separate agent selector and model picker with a single unified `AgentModelPicker` combobox that shows agents as group headers with brand icons and their models as selectable items underneath.

**Architecture:** A new `AgentModelPicker` component uses the existing shadcn Command + Popover primitives. A new `getAllAgentModels` server action returns all agents with their model lists in one call. A new `updateAgentAndModel` server action persists both `agent.type` and `models.default` atomically. The component is used in two places: settings (persists globally) and feature-create drawer (per-feature override, not persisted).

**Tech Stack:** React, Next.js Server Actions, shadcn Command/Popover, existing `agent-type-icons.tsx` brand icons, `IAgentExecutorFactory.getSupportedModels`

---

### Task 1: Create `getAllAgentModels` server action

**Files:**
- Create: `src/presentation/web/app/actions/get-all-agent-models.ts`
- Create: `.storybook/mocks/app/actions/get-all-agent-models.ts`
- Reference: `src/presentation/web/app/actions/get-supported-models.ts` (pattern)
- Reference: `packages/core/src/application/ports/output/agents/agent-executor-factory.interface.ts`

**Step 1: Define the return type and write the server action**

```ts
// src/presentation/web/app/actions/get-all-agent-models.ts
'use server';

import { resolve } from '@/lib/server-container';
import type { IAgentExecutorFactory } from '@shepai/core/application/ports/output/agents/agent-executor-factory.interface';

export interface AgentModelGroup {
  agentType: string;
  label: string;
  models: string[];
}

const AGENT_LABELS: Record<string, string> = {
  'claude-code': 'Claude Code',
  cursor: 'Cursor',
  'gemini-cli': 'Gemini CLI',
  aider: 'Aider',
  continue: 'Continue',
  dev: 'Dev',
};

export async function getAllAgentModels(): Promise<AgentModelGroup[]> {
  try {
    const factory = resolve<IAgentExecutorFactory>('IAgentExecutorFactory');
    const agents = factory.getSupportedAgents();
    return agents.map((agentType) => ({
      agentType: agentType as string,
      label: AGENT_LABELS[agentType as string] ?? (agentType as string),
      models: factory.getSupportedModels(agentType),
    }));
  } catch {
    return [];
  }
}
```

**Step 2: Create Storybook mock**

```ts
// .storybook/mocks/app/actions/get-all-agent-models.ts
export async function getAllAgentModels() {
  return [
    { agentType: 'claude-code', label: 'Claude Code', models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'] },
    { agentType: 'cursor', label: 'Cursor', models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'gpt-4o', 'cursor-small'] },
    { agentType: 'gemini-cli', label: 'Gemini CLI', models: ['gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro'] },
    { agentType: 'aider', label: 'Aider', models: [] },
    { agentType: 'continue', label: 'Continue', models: [] },
    { agentType: 'dev', label: 'Dev', models: [] },
  ];
}
```

**Step 3: Commit**

```
feat(web): add get-all-agent-models server action
```

---

### Task 2: Create `updateAgentAndModel` server action

**Files:**
- Create: `src/presentation/web/app/actions/update-agent-and-model.ts`
- Create: `.storybook/mocks/app/actions/update-agent-and-model.ts`
- Reference: `src/presentation/web/app/actions/update-model.ts` (pattern)

**Step 1: Write the server action that persists both agent type and model**

```ts
// src/presentation/web/app/actions/update-agent-and-model.ts
'use server';

import { resolve } from '@/lib/server-container';
import {
  getSettings,
  resetSettings,
  initializeSettings,
} from '@shepai/core/infrastructure/services/settings.service';
import type { UpdateSettingsUseCase } from '@shepai/core/application/use-cases/settings/update-settings.use-case';

export async function updateAgentAndModel(
  agentType: string,
  model: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!agentType.trim()) {
    return { ok: false, error: 'agent type is required' };
  }

  try {
    const currentSettings = getSettings();
    const updatedSettings = {
      ...currentSettings,
      agent: { ...currentSettings.agent, type: agentType.trim() as typeof currentSettings.agent.type },
      models: { default: model?.trim() || currentSettings.models.default },
    };

    const updateUseCase = resolve<UpdateSettingsUseCase>('UpdateSettingsUseCase');
    await updateUseCase.execute(updatedSettings);

    resetSettings();
    initializeSettings(updatedSettings);

    return { ok: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update agent and model';
    return { ok: false, error: message };
  }
}
```

**Step 2: Create Storybook mock**

```ts
// .storybook/mocks/app/actions/update-agent-and-model.ts
export async function updateAgentAndModel(
  _agentType: string,
  _model: string | null
): Promise<{ ok: boolean; error?: string }> {
  return { ok: true };
}
```

**Step 3: Commit**

```
feat(web): add update-agent-and-model server action
```

---

### Task 3: Build the `AgentModelPicker` component

**Files:**
- Create: `src/presentation/web/components/features/settings/AgentModelPicker/index.tsx`
- Reference: `src/presentation/web/components/features/settings/ModelPicker/index.tsx` (prior art)
- Reference: `src/presentation/web/components/common/feature-node/agent-type-icons.tsx` (brand icons)
- Reference: `src/presentation/web/components/ui/command.tsx` (Command primitives)

**Step 1: Write the component**

The component structure:
- Props: `initialAgentType: string`, `initialModel: string`, `onAgentModelChange?: (agentType: string, model: string) => void`, `disabled?: boolean`, `className?: string`, `mode: 'settings' | 'override'`
- On mount: calls `getAllAgentModels()` to fetch all groups
- Trigger button: shows `[AgentIcon] model-name` with ChevronsUpDown chevron
- Dropdown: Command + Popover with search filtering, agents as CommandGroup headers with icons, models as CommandItems with check marks
- Agents with no models (dev, aider, continue): rendered as a single clickable CommandItem row
- On model select: if `mode === 'settings'`, calls `updateAgentAndModel` server action; if `mode === 'override'`, just calls `onAgentModelChange` callback
- Search filters model names across all groups; groups with no matching models are hidden

```tsx
// src/presentation/web/components/features/settings/AgentModelPicker/index.tsx
'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { getAllAgentModels } from '@/app/actions/get-all-agent-models';
import type { AgentModelGroup } from '@/app/actions/get-all-agent-models';
import { updateAgentAndModel } from '@/app/actions/update-agent-and-model';
import { getAgentTypeIcon } from '@/components/common/feature-node/agent-type-icons';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface AgentModelPickerProps {
  initialAgentType: string;
  initialModel: string;
  onAgentModelChange?: (agentType: string, model: string) => void;
  disabled?: boolean;
  className?: string;
  /** 'settings' persists to DB; 'override' only calls onAgentModelChange */
  mode: 'settings' | 'override';
}

export function AgentModelPicker({
  initialAgentType,
  initialModel,
  onAgentModelChange,
  disabled,
  className,
  mode,
}: AgentModelPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [groups, setGroups] = React.useState<AgentModelGroup[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [agentType, setAgentType] = React.useState(initialAgentType);
  const [model, setModel] = React.useState(initialModel);
  const [search, setSearch] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    getAllAgentModels()
      .then(setGroups)
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    setAgentType(initialAgentType);
    setModel(initialModel);
  }, [initialAgentType, initialModel]);

  const handleSelect = async (newAgentType: string, newModel: string) => {
    setOpen(false);
    setSearch('');

    if (newAgentType === agentType && newModel === model) return;

    if (mode === 'override') {
      setAgentType(newAgentType);
      setModel(newModel);
      onAgentModelChange?.(newAgentType, newModel);
      return;
    }

    // mode === 'settings' — persist to DB
    setSaving(true);
    setError(null);
    try {
      const result = await updateAgentAndModel(newAgentType, newModel || null);
      if (result.ok) {
        setAgentType(newAgentType);
        setModel(newModel);
        onAgentModelChange?.(newAgentType, newModel);
      } else {
        setError(result.error ?? 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  const isDisabled = (disabled ?? false) || loading || saving;

  const AgentIcon = getAgentTypeIcon(agentType);

  // Filter groups by search query
  const query = search.toLowerCase();
  const filteredGroups = groups
    .map((g) => {
      if (!query) return g;
      const matchingModels = g.models.filter((m) => m.toLowerCase().includes(query));
      const labelMatches = g.label.toLowerCase().includes(query);
      if (labelMatches) return g; // show all models if agent name matches
      if (matchingModels.length > 0) return { ...g, models: matchingModels };
      return null;
    })
    .filter((g): g is AgentModelGroup => g !== null);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={isDisabled}
            className="w-full justify-between font-normal"
          >
            <span className="flex items-center gap-2 truncate">
              <AgentIcon className="h-4 w-4 shrink-0" />
              {loading ? 'Loading…' : saving ? 'Saving…' : model || agentType}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search agents & models…"
              value={search}
              onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            />
            <CommandList>
              {!loading && filteredGroups.length === 0 && (
                <CommandEmpty>No matching agents or models.</CommandEmpty>
              )}
              {filteredGroups.map((group, idx) => {
                const GroupIcon = getAgentTypeIcon(group.agentType);
                const hasModels = group.models.length > 0;

                return (
                  <React.Fragment key={group.agentType}>
                    {idx > 0 && <CommandSeparator />}
                    <CommandGroup>
                      {hasModels ? (
                        <>
                          {/* Agent group header — not clickable */}
                          <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            <GroupIcon className="h-4 w-4 shrink-0" />
                            {group.label}
                          </div>
                          {group.models.map((m) => {
                            const isSelected = agentType === group.agentType && model === m;
                            return (
                              <CommandItem
                                key={m}
                                selected={isSelected}
                                onClick={() => handleSelect(group.agentType, m)}
                                className="pl-8"
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4 shrink-0',
                                    isSelected ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                {m}
                              </CommandItem>
                            );
                          })}
                        </>
                      ) : (
                        /* Agent with no models — clickable as agent-only */
                        <CommandItem
                          selected={agentType === group.agentType}
                          onClick={() => handleSelect(group.agentType, '')}
                        >
                          <GroupIcon className="mr-2 h-4 w-4 shrink-0" />
                          {group.label}
                          {agentType === group.agentType && (
                            <Check className="ml-auto h-4 w-4 shrink-0" />
                          )}
                        </CommandItem>
                      )}
                    </CommandGroup>
                  </React.Fragment>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {Boolean(error) && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
```

**Step 2: Commit**

```
feat(web): add unified agent-model picker component
```

---

### Task 4: Add Storybook stories for `AgentModelPicker`

**Files:**
- Create: `src/presentation/web/components/features/settings/AgentModelPicker/AgentModelPicker.stories.tsx`

**Step 1: Write stories**

```tsx
// src/presentation/web/components/features/settings/AgentModelPicker/AgentModelPicker.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AgentModelPicker } from './index';

const meta: Meta<typeof AgentModelPicker> = {
  title: 'Features/Settings/AgentModelPicker',
  component: AgentModelPicker,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    onAgentModelChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const ClaudeCodeDefault: Story = {
  args: {
    initialAgentType: 'claude-code',
    initialModel: 'claude-sonnet-4-6',
    mode: 'settings',
  },
};

export const CursorSelected: Story = {
  args: {
    initialAgentType: 'cursor',
    initialModel: 'gpt-4o',
    mode: 'settings',
  },
};

export const DevAgent: Story = {
  args: {
    initialAgentType: 'dev',
    initialModel: '',
    mode: 'settings',
  },
};

export const OverrideMode: Story = {
  args: {
    initialAgentType: 'claude-code',
    initialModel: 'claude-sonnet-4-6',
    mode: 'override',
  },
};

export const Disabled: Story = {
  args: {
    initialAgentType: 'claude-code',
    initialModel: 'claude-sonnet-4-6',
    mode: 'settings',
    disabled: true,
  },
};
```

**Step 2: Run Storybook build to verify**

Run: `pnpm storybook:build` (or whatever the storybook build command is)
Expected: No errors referencing AgentModelPicker or missing mocks.

**Step 3: Commit**

```
feat(web): add agent-model picker storybook stories
```

---

### Task 5: Integrate AgentModelPicker into feature-create drawer

**Files:**
- Modify: `src/presentation/web/components/common/feature-create-drawer/feature-create-drawer.tsx`
- Modify: `src/presentation/web/components/common/feature-create-drawer/feature-create-drawer.stories.tsx`

**Step 1: Add agent/model override fields to `FeatureCreatePayload`**

In `feature-create-drawer.tsx`, add to the `FeatureCreatePayload` interface:

```ts
/** Optional agent type override for this feature run */
agentType?: string;
/** Optional model override for this feature run */
model?: string;
```

**Step 2: Add state and render the AgentModelPicker in override mode**

Add state variables:
```ts
const [overrideAgent, setOverrideAgent] = useState<string | undefined>(undefined);
const [overrideModel, setOverrideModel] = useState<string | undefined>(undefined);
```

Props needed: `initialAgentType` and `initialModel` — these come from the current settings. Add new props to `FeatureCreateDrawerProps`:
```ts
/** Current global agent type from settings */
currentAgentType?: string;
/** Current global model from settings */
currentModel?: string;
```

Add the picker in the form between the PARENT FEATURE and MODE sections:

```tsx
{/* Agent & Model override */}
<div className="flex flex-col gap-1.5">
  <Label className="text-muted-foreground text-xs font-semibold tracking-wider">
    AGENT & MODEL
  </Label>
  <AgentModelPicker
    initialAgentType={overrideAgent ?? currentAgentType ?? 'claude-code'}
    initialModel={overrideModel ?? currentModel ?? 'claude-sonnet-4-6'}
    mode="override"
    onAgentModelChange={(agent, model) => {
      setOverrideAgent(agent);
      setOverrideModel(model);
    }}
    disabled={isSubmitting}
  />
</div>
```

**Step 3: Pass override values through in `handleSubmit`**

Add to the `onSubmit` call:
```ts
...(overrideAgent ? { agentType: overrideAgent } : {}),
...(overrideModel ? { model: overrideModel } : {}),
```

**Step 4: Reset override in `resetForm`**

```ts
setOverrideAgent(undefined);
setOverrideModel(undefined);
```

**Step 5: Update stories to provide new props**

Add `currentAgentType` and `currentModel` to stories args:
```ts
currentAgentType: 'claude-code',
currentModel: 'claude-sonnet-4-6',
```

**Step 6: Commit**

```
feat(web): integrate agent-model picker into feature create drawer
```

---

### Task 6: Wire `FeatureCreatePayload.agentType` and `model` through to create-feature action

**Files:**
- Modify: `src/presentation/web/app/actions/create-feature.ts`
- Modify: where create-feature is called from the control center (likely `use-control-center-state.ts` or `create-drawer-client.tsx`)

**Step 1: Check how `createFeature` server action is called and what params it takes**

Read the existing `create-feature.ts` action and the caller to understand the current signature.

**Step 2: Add optional `agentType` and `model` params to the server action**

Pass them through to `CreateFeatureUseCaseInput` which already has `model?: string`. For `agentType`, if the override differs from settings, the use case needs to use it for executor selection. This may require threading `agentType` through the use case input or temporarily overriding the settings agent type.

> **Note:** The `model` field already exists on `CreateFeatureUseCaseInput` from the earlier feature work. The `agentType` override may need a new field on the input DTO. Check the existing use case input and add if needed.

**Step 3: Commit**

```
feat(web): pass agent and model overrides from create drawer to server action
```

---

### Task 7: Build and verify

**Step 1: Run full build**

Run: `pnpm build`
Expected: Exit 0, no TypeScript errors.

**Step 2: Run tests**

Run: `pnpm test`
Expected: All pass.

**Step 3: Run lint**

Run: `pnpm lint:fix`
Expected: Clean.

**Step 4: Visual verification**

Run: `pnpm dev:web`
Open http://localhost:3000 — verify the AgentModelPicker works in:
1. Feature create drawer: shows unified agent+model dropdown
2. Selecting a model shows `[icon] model-name` on the trigger

**Step 5: Commit any fixes**

```
fix(web): address build and lint issues for agent-model picker
```

---

## Notes

- The old `ModelPicker` component and its server actions (`get-supported-models`, `update-model`) are kept for now. They can be removed in a follow-up cleanup once the unified picker is confirmed working everywhere.
- The `AgentModelPicker` in settings mode (`mode: 'settings'`) persists both agent type and model atomically, which is an improvement over the current two-step flow.
- Agents without models (dev, aider, continue) appear as single clickable rows — selecting them sets the agent type with no model.
