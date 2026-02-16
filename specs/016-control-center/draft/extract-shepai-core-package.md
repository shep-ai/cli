# Plan: Extract @shepai/core + Simplify Control Center Data Layer

## Context

Two problems need solving together as part of 016-control-center:

1. **The web package depends on the CLI via a globalThis bridge hack** — Turbopack can't resolve CLI source files with Node.js ESM `.js` imports, so the CLI exposes use cases via `globalThis.__shepUseCases`. This is fragile, requires duplicated type definitions in the web layer, and couples the web to CLI startup.

2. **The control center data layer violated policies** — created `ListDashboardFeaturesUseCase` (unnecessary), `DashboardFeature` DTO (duplicates domain), modified CLI folder (forbidden), and hand-crafted `FeatureNodeData` instead of extending the generated `Feature` type.

**Solution**: Extract `domain/`, `application/`, and `infrastructure/` into a `@shepai/core` workspace package. Both `@shepai/cli` and `@shepai/web` depend on `@shepai/core` directly. This eliminates the globalThis bridge for types, removes the CLI dependency, and naturally solves the data layer issues.

---

## Key Decision: Pre-Compiled Package

`@shepai/core` exports **compiled JavaScript** (not TypeScript source).

- Core has its own `tsc` build step → `packages/core/dist/`
- Turbopack resolves it like any npm package (no `transpilePackages` needed)
- Build order: TypeSpec → core → CLI → web
- IDE jump-to-definition works via `tsconfig.json` path mappings to source

---

## @shepai/core Package Structure

```
packages/core/
├── package.json          (@shepai/core, private, type: module)
├── tsconfig.json         (IDE/typecheck, noEmit)
├── tsconfig.build.json   (compilation to dist/)
└── src/
    ├── index.ts           (main barrel export)
    ├── domain/
    │   ├── index.ts
    │   ├── generated/
    │   │   └── output.ts  (TypeSpec-generated, moved from src/domain/generated/)
    │   ├── factories/
    │   │   └── settings-defaults.factory.ts
    │   └── value-objects/
    │       └── version-info.ts
    ├── application/
    │   ├── index.ts
    │   ├── use-cases/
    │   │   ├── settings/   (initialize, load, update)
    │   │   ├── agents/     (run, configure, validate, approve, reject, stop, delete, get, list, show)
    │   │   └── features/   (create, delete, list, show, resume — NO dashboard)
    │   └── ports/output/
    │       ├── agents/     (executor factory/provider, validator, runner, registry, repository, process service)
    │       ├── repositories/ (settings, feature)
    │       └── services/   (version, web-server, worktree, spec-initializer, external-issue-fetcher)
    └── infrastructure/
        ├── index.ts
        ├── di/
        │   └── container.ts
        ├── persistence/sqlite/
        │   ├── connection.ts
        │   ├── migrations.ts
        │   └── mappers/    (settings, feature, agent-run)
        ├── repositories/   (sqlite-settings, sqlite-feature, agent-run)
        └── services/
            ├── settings.service.ts
            ├── version.service.ts
            ├── web-server.service.ts
            ├── port.service.ts
            ├── folder-dialog.service.ts
            ├── filesystem/
            ├── git/
            ├── spec/
            ├── external/
            └── agents/     (common/, feature-agent/, analyze-repo/, streaming/)
```

### `packages/core/package.json`

```json
{
  "name": "@shepai/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./domain": { "import": "./dist/domain/index.js", "types": "./dist/domain/index.d.ts" },
    "./domain/generated": {
      "import": "./dist/domain/generated/output.js",
      "types": "./dist/domain/generated/output.d.ts"
    },
    "./application": {
      "import": "./dist/application/index.js",
      "types": "./dist/application/index.d.ts"
    },
    "./infrastructure": {
      "import": "./dist/infrastructure/index.js",
      "types": "./dist/infrastructure/index.d.ts"
    },
    "./infrastructure/di": {
      "import": "./dist/infrastructure/di/container.js",
      "types": "./dist/infrastructure/di/container.d.ts"
    },
    "./infrastructure/services/*": {
      "import": "./dist/infrastructure/services/*.js",
      "types": "./dist/infrastructure/services/*.d.ts"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsc -w -p tsconfig.build.json",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@blackglory/better-sqlite3-migrations": "^0.1.20",
    "@langchain/core": "^1.1.22",
    "@langchain/langgraph": "^1.1.4",
    "@langchain/langgraph-checkpoint-sqlite": "^1.0.1",
    "better-sqlite3": "^12.6.2",
    "js-yaml": "^4.1.1",
    "next": "^16.1.6",
    "reflect-metadata": "^0.2.2",
    "tsyringe": "^4.10.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13",
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^25.2.0",
    "typescript": "^5.3.0"
  }
}
```

### `packages/core/tsconfig.build.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

`rootDir: "src"` ensures `src/domain/generated/output.ts` → `dist/domain/generated/output.js` (no extra `src/` nesting).

---

## Migration Phases

### Phase A: Scaffold core package

1. Create `packages/core/` with `package.json`, `tsconfig.json`, `tsconfig.build.json`, empty `src/index.ts`
2. Update `pnpm-workspace.yaml`: add `packages/core`
3. `pnpm install` to link workspace
4. Verify `pnpm build` still works

### Phase B: Move domain layer

1. Move `src/domain/` → `packages/core/src/domain/`
2. Create `packages/core/src/domain/index.ts` barrel
3. Update `tspconfig.yaml`: emitter output → `{cwd}/packages/core/src/domain/generated`
4. Update `tsp:codegen` script: `prettier --write packages/core/src/domain/generated/`
5. Update root `src/index.ts` to re-export from `@shepai/core/domain`
6. Update all imports across CLI, web, infrastructure, and tests

### Phase C: Move application layer

1. Move `src/application/` → `packages/core/src/application/`
2. Create `packages/core/src/application/index.ts` barrel
3. **Delete** `ListDashboardFeaturesUseCase` (policy violation — use existing `ListFeaturesUseCase`)
4. **Remove** `DashboardFeature` interface and `listWithAgentRuns()` from `IFeatureRepository`
5. Update all imports in infrastructure, CLI, web, and tests

### Phase D: Move infrastructure layer

1. Move `src/infrastructure/` → `packages/core/src/infrastructure/`
2. Create `packages/core/src/infrastructure/index.ts` barrel
3. Convert all `@/` alias imports within core to relative paths (~30 files)
4. Remove `ListDashboardFeaturesUseCase` from DI container registrations
5. Update CLI imports: `../../infrastructure/di/container.js` → `@shepai/core/infrastructure/di`
6. Update web imports: `@cli/*` → `@shepai/core/*`
7. Add `@shepai/core` dependency to `@shepai/web/package.json`
8. Remove `@cli/*` path from web `tsconfig.json`

### Phase E: Clean up root package

1. Remove moved dependencies from root `package.json` (keep `commander`, `@inquirer/prompts`, `cli-table3`, `picocolors` + all React/UI deps)
2. Update root `tsconfig.build.json`: include only `src/presentation/**/*` and `src/index.ts`
3. Update root `tsconfig.json` paths: add `@shepai/core` → `packages/core/src`
4. Update `vitest.config.ts`: add `@shepai/core` → `packages/core/src` alias
5. Remove `tsc-alias` entries no longer needed

### Phase F: Control center data layer (from previous plan)

1. **FeatureNodeData extends Feature**: Update `feature-node-state-config.ts` — `FeatureNodeData extends Feature` with UI-only extras
2. **State derivation**: Add `deriveNodeState()` and `deriveProgress()` in feature-node component (derive from `Feature.plan.tasks`)
3. **Web bridge module**: Rewrite `lib/use-cases.ts` — import `Feature` from `@shepai/core/domain/generated`, call `ListFeaturesUseCase` via globalThis bridge
4. **Simplify page.tsx**: `getFeatures()` returns `Feature[]`, spread directly into node data
5. **Delete** `src/presentation/web/app/derive-state.ts`
6. **Update hook**: `createFeatureNode()` creates Feature-compatible defaults with `SdlcLifecycle.Requirements`
7. **Update stories/tests**: All `FeatureNodeData` objects include required Feature fields, create `createMockFeature()` helper

### Phase G: globalThis bridge in WebServerService

The globalThis bridge is still needed for **runtime** use case access (the DI container is initialized by CLI or dev-server, not by Next.js). But now it's simpler:

**`packages/core/src/infrastructure/services/web-server.service.ts`** — in `start()`, resolve `ListFeaturesUseCase` and set `globalThis.__shepUseCases`:

```typescript
const listFeatures = container.resolve(ListFeaturesUseCase);
(globalThis as Record<string, unknown>).__shepUseCases = { listFeatures };
```

**CLI `index.ts`** — remove the globalThis bridge setup (it's now in WebServerService)

**Web `dev-server.ts`** — import from `@shepai/core` instead of relative paths:

```typescript
import { initializeContainer, container } from '@shepai/core/infrastructure/di';
import { InitializeSettingsUseCase } from '@shepai/core/application';
import { initializeSettings } from '@shepai/core/infrastructure/services/settings.service';
```

---

## Critical Files to Modify

| File                                                       | Change                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| `pnpm-workspace.yaml`                                      | Add `packages/core`                                                |
| `tspconfig.yaml`                                           | Output dir → `packages/core/src/domain/generated`                  |
| `package.json` (root)                                      | Add `@shepai/core: workspace:*`, remove moved deps, update scripts |
| `tsconfig.json` (root)                                     | Add `@shepai/core` path mapping                                    |
| `tsconfig.build.json` (root)                               | Include only `src/presentation/**/*` + `src/index.ts`              |
| `vitest.config.ts`                                         | Add `@shepai/core` alias → `packages/core/src`                     |
| `src/presentation/cli/index.ts`                            | Import from `@shepai/core`, remove globalThis bridge               |
| `src/presentation/web/package.json`                        | Add `@shepai/core: workspace:*`                                    |
| `src/presentation/web/tsconfig.json`                       | Replace `@cli/*` with `@shepai/core` paths                         |
| `src/presentation/web/dev-server.ts`                       | Import from `@shepai/core`                                         |
| `src/presentation/web/lib/use-cases.ts`                    | Import `Feature` from `@shepai/core/domain/generated`              |
| `src/presentation/web/app/page.tsx`                        | Use `getFeatures()`, spread Feature directly                       |
| `src/presentation/web/app/api/dialog/pick-folder/route.ts` | `@cli/...` → `@shepai/core/...`                                    |
| ~20 CLI command files                                      | Relative imports → `@shepai/core/*`                                |
| ~30 infrastructure files                                   | `@/` aliases → relative paths (within core)                        |
| All feature-node stories/tests                             | Feature-compatible data shapes                                     |

## Files to Delete

| File                                                                                            | Reason                                       |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `src/application/use-cases/features/list-dashboard-features.use-case.ts`                        | Policy violation                             |
| `tests/unit/application/use-cases/features/list-dashboard-features.use-case.test.ts`            | Test for removed use case                    |
| `tests/unit/infrastructure/repositories/sqlite-feature-repository-list-with-agent-runs.test.ts` | Test for removed repo method                 |
| `src/presentation/web/app/derive-state.ts`                                                      | Derivation moves into component              |
| `src/domain/`                                                                                   | Moved to `packages/core/src/domain/`         |
| `src/application/`                                                                              | Moved to `packages/core/src/application/`    |
| `src/infrastructure/`                                                                           | Moved to `packages/core/src/infrastructure/` |

---

## Build Pipeline (After)

```
1. pnpm generate          → TypeSpec → packages/core/src/domain/generated/output.ts
2. pnpm --filter core build → tsc → packages/core/dist/
3. tsc -p tsconfig.build.json → dist/ (CLI presentation layer only)
4. tsc-alias               → resolve remaining @/* paths in dist/
5. pnpm build:web          → Next.js build
6. Copy web/.next          → web/ for npm package
```

**Dev workflow:**

- `pnpm dev:core` — `tsc -w` watches core source
- `pnpm dev:cli` — `tsx` resolves `@shepai/core` via workspace symlink
- `pnpm dev:web` — Turbopack resolves `@shepai/core` via workspace symlink

---

## Verification

```bash
pnpm install              # Workspace links @shepai/core
pnpm generate             # TypeSpec compiles to packages/core/
pnpm --filter @shepai/core build  # Core compiles to dist/
pnpm typecheck            # CLI types valid
pnpm typecheck:web        # Web types valid with @shepai/core imports
pnpm test:unit            # All unit tests pass
pnpm lint                 # No lint errors
pnpm lint:web             # No web lint errors
pnpm build:web            # Next.js builds
pnpm build:storybook      # Stories build with Feature-based data
pnpm build                # Full build pipeline
```
