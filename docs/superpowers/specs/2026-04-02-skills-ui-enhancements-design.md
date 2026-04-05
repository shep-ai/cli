# Skills UI Enhancements Design

## Overview

Two UI enhancements for the skill injector feature:

1. **Skills page** — Show configured auto-injected skills with add/remove management
2. **Feature drawer** — Show which skills were injected into a specific feature

## Section 1: Data Layer — Persist Injected Skills on Feature Entity

### TypeSpec Change

Add `injectedSkills?: string[]` to the Feature model in `tsp/domain/entities/feature.tsp`.

### SQLite Persistence

Store as a JSON column `injected_skills TEXT` in the features table. Follow the existing pattern used by `skill_injection_skills` in the settings mapper (JSON serialization/deserialization).

### Migration

Add migration after the existing `050-add-skill-injection-config.ts`. The `injected_skills` column must be nullable (`TEXT DEFAULT NULL`) since existing features have no data.

### Population

In `CreateFeatureUseCase` (`packages/core/src/application/use-cases/features/create/create-feature.use-case.ts`), after `skillInjector.inject()` returns a `SkillInjectionResult`, save `[...result.injected, ...result.skipped]` on the feature entity before persisting. This captures all skills active in the worktree, not just newly copied ones (skipped skills were already present).

### Flow Through to UI

The `get-feature-drawer-data.ts` server action already fetches feature data. Add `injectedSkills` to `FeatureNodeData` and pass it through the existing data pipeline.

## Section 2: Feature Drawer — Injected Skills in Overview Tab

### Location

In `overview-tab.tsx`, add a new `InjectedSkillsSection` component. Renders after `FeatureSettings` (at the bottom of the overview), since injected skills are a configuration detail.

### Component: `InjectedSkillsSection`

- Only renders when `data.injectedSkills?.length > 0`
- Header: "INJECTED SKILLS" — matches existing "SETTINGS" section style (small caps label via `text-xs font-semibold tracking-wider`)
- Displays skill names as chips using the existing `Badge` component
- Icon: `Puzzle` from lucide-react (consistent with the skills page)
- Read-only display

### Visual Structure

```
─────────────────────────
INJECTED SKILLS
🧩 architecture-reviewer  cross-validate-artifacts  tsp-model
─────────────────────────
```

## Section 3: Skills Page — Auto-Injected Skills Section with Add/Remove

### Data Source

Extend the skills page server component (`app/skills/page.tsx`) to also fetch `settings.workflow.skillInjection` config via the existing `getSettings()` pattern (already used in 13+ web layer files). Pass the `SkillInjectionConfig` as a prop to `SkillsPageClient` alongside `skills`.

### Empty State

When `skillInjection` is disabled or has zero configured skills, the section is hidden entirely (consistent with how `FeatureSettings` hides when no settings exist).

### Display

At the top of `skills-page-client.tsx`, above the search bar, add an "Auto-Injected Skills" section:

- **Section header:** "Auto-Injected Skills" with subtitle "Skills automatically added to new features"
- **Each configured `SkillSource`** shown as a compact card/row:
  - Name
  - Type badge: "Local" or "Remote"
  - Source path (truncated if long)
  - Remove button (X icon) — calls server action to update settings
- **"Add Skill" button** at the end — opens a dialog/popover:
  - Pick from discovered skills (already on the page), OR
  - Enter a remote skill source manually
  - Type selector: Local / Remote

### Server Actions

- `addInjectedSkill(skill: SkillSource)` — adds to `settings.workflow.skillInjection.skills`
- `removeInjectedSkill(skillName: string)` — removes from the array
- Both update settings via the existing `UpdateSettingsUseCase`

### State Management

The skills page client receives `injectionConfig: SkillInjectionConfig` as a prop. After add/remove mutations, use `router.refresh()` to re-fetch from server (consistent with other settings mutation patterns in the app).

## Files Affected

### Data Layer
- `tsp/domain/entities/feature.tsp` — add `injectedSkills` field
- `packages/core/src/domain/generated/output.ts` — regenerated
- `packages/core/src/infrastructure/persistence/sqlite/` — migration + mapper updates
- `packages/core/src/application/use-cases/features/create/create-feature.use-case.ts` — persist injection result
- Feature mapper in `packages/core/src/infrastructure/persistence/sqlite/mappers/` — serialize/deserialize `injectedSkills`

### Feature Drawer
- `src/presentation/web/components/common/feature-node/feature-node-state-config.ts` — add `injectedSkills` to `FeatureNodeData`
- `src/presentation/web/components/common/feature-drawer-tabs/overview-tab.tsx` — add `InjectedSkillsSection`
- `src/presentation/web/app/actions/get-feature-drawer-data.ts` — pass through `injectedSkills`

### Skills Page
- `src/presentation/web/app/skills/page.tsx` — fetch injection config
- `src/presentation/web/components/features/skills/skills-page-client.tsx` — add auto-injected section + props
- `src/presentation/web/app/actions/add-injected-skill.ts` — new server action
- `src/presentation/web/app/actions/remove-injected-skill.ts` — new server action
- New component: `auto-injected-skills-section.tsx`
- New component: `add-skill-dialog.tsx`

### Stories
- `overview-tab.stories.tsx` — add story with injected skills
- `skills-page-client.stories.tsx` — add story with injection config
- `auto-injected-skills-section.stories.tsx` — new stories
- `add-skill-dialog.stories.tsx` — new stories

### Storybook Mocks
- `.storybook/mocks/app/actions/add-injected-skill.ts` — mock for add action
- `.storybook/mocks/app/actions/remove-injected-skill.ts` — mock for remove action
