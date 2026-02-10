---
name: shep-kit:new-feature
description: Use when starting any new feature, functionality, or enhancement. Triggers include "new feature", "start developing", "add functionality", "implement X", or explicit /shep-kit:new-feature invocation. Creates spec branch and scaffolds specification directory.
---

# Create New Feature Specification

Start spec-driven development by creating a feature branch and specification directory.

**Full workflow guide:** [docs/development/spec-driven-workflow.md](../../../docs/development/spec-driven-workflow.md)

## Phase Lifecycle

```
Requirements → Research → Planning → Implementation → Complete
    ↓             ↓           ↓            ↓            ↓
 spec.yaml   research.yaml plan.yaml   tasks.yaml   all files
    ↓             ↓           ↓            ↓            ↓
 spec.md     research.md   plan.md     tasks.md     (auto-generated)
```

**CRITICAL:** Each phase MUST update the `Phase` status field before proceeding.

**IMPORTANT:** Edit YAML files, not Markdown. Markdown files are auto-generated from YAML via `pnpm spec:generate-md <feature-id>`.

## Workflow

### 1. Gather Minimal Input

Ask the user for:

- **Feature name** (kebab-case, e.g., `user-authentication`)
- **One-liner description** (brief summary)

### 2. Create Branch

```bash
# Determine next number
NEXT_NUM=$(ls -d specs/[0-9][0-9][0-9]-* 2>/dev/null | wc -l | xargs printf "%03d" $(($ + 1)))
# If no specs exist, use 001
[ -z "$NEXT_NUM" ] && NEXT_NUM="001"

# Create branch from main
git checkout main && git pull
git checkout -b "feat/${NEXT_NUM}-${FEATURE_NAME}"
```

### 3. Run Init Script

Execute the scaffolding script:

```bash
.claude/skills/shep-kit:new-feature/scripts/init-feature.sh <NNN> <feature-name>
```

This creates `specs/NNN-feature-name/` with all template files using a **YAML-first** approach:

- **YAML source files**: `spec.yaml`, `research.yaml`, `plan.yaml`, `tasks.yaml` (source of truth)
- **Markdown files**: `spec.md`, `research.md`, `plan.md`, `tasks.md` (auto-generated from YAML)
- **Status tracking**: `feature.yaml` (implementation status, unchanged)

### 4. Analyze Context

Before filling the spec, analyze:

- **Existing specs**: Read `specs/*/spec.yaml` (or `specs/*/spec.md`) to understand feature landscape and discover dependencies
- **Codebase**: Identify affected areas, patterns, existing implementations
- **Cross-reference**: Infer dependencies, impact areas, size estimate

### 5. Propose Spec Content

Fill the template placeholders with inferred values:

- Problem statement (from user description + context)
- Success criteria (inferred from scope)
- Affected areas with impact levels (from codebase analysis)
- Dependencies on other features (from existing specs)
- Size estimate with reasoning (S/M/L/XL)
- Open questions (gaps identified during analysis)

Present the proposed spec to the user for review.

### 6. User Confirms/Adjusts

Allow the user to:

- Approve the proposed spec
- Modify any inferred values
- Add missing context or requirements

### 7. Write Spec & Update feature.yaml

```bash
# Write confirmed content to spec.yaml (the source of truth)
# Then generate Markdown from YAML:
pnpm spec:generate-md NNN-feature-name

# feature.yaml already created by init script with initial state:
#   - lifecycle: "research"
#   - phase: "research"
#   - checkpoint: "feature-created"
# See: docs/development/feature-yaml-protocol.md for details

# Stage and commit (both YAML source and generated Markdown)
git add specs/NNN-feature-name/
git commit -m "feat(specs): add NNN-feature-name specification"
```

**IMPORTANT:** Always edit `spec.yaml`, then run `pnpm spec:generate-md <feature-id>` to produce `spec.md`. Never hand-edit Markdown spec files.

**feature.yaml Status**: Already initialized by init script. No manual updates needed at this stage.

### 8. Next Steps

Inform the user:

> Spec created on `feat/NNN-feature-name`!
> Next: `/shep-kit:research` to analyze technical approach.

## Open Questions Policy

**CRITICAL:** Open questions in `spec.yaml` (the `openQuestions` array) MUST be resolved before `/shep-kit:research`.

- If questions are identified, add them to the `openQuestions` array in `spec.yaml`
- User must confirm answers or mark the array empty (`openQuestions: []`)
- Research phase will REFUSE to proceed if unresolved open questions exist in `spec.yaml`

## Key Principles

- **Branch first**: All spec work happens on the feature branch
- **Infer, don't interrogate**: Analyze codebase to propose smart defaults
- **Dependencies from specs**: Scan existing `specs/*/spec.yaml` for relationships
- **User confirms**: Always get approval before writing files
- **Open questions block progress**: Never proceed with unresolved questions

## Template Location

Templates are in: `.claude/skills/shep-kit:new-feature/templates/`

### YAML Templates (Source of Truth)

- `spec.yaml` - Feature specification
- `research.yaml` - Technical decisions
- `plan.yaml` - Implementation strategy
- `tasks.yaml` - Task breakdown

### Other Templates

- `data-model.md` - Domain models
- `feature.yaml` - Status tracking

Markdown files (`spec.md`, `research.md`, `plan.md`, `tasks.md`) are auto-generated from YAML via `pnpm spec:generate-md`.

## feature.yaml Protocol

All shep-kit skills update `feature.yaml` as work progresses.

**Reference:** [docs/development/feature-yaml-protocol.md](../../../docs/development/feature-yaml-protocol.md)

**This skill's responsibility:**

- Create initial `feature.yaml` with:
  - `lifecycle: "research"`
  - `phase: "research"`
  - Checkpoint: "feature-created"

## Example

See: `.claude/skills/shep-kit:new-feature/examples/001-sample-feature/`
