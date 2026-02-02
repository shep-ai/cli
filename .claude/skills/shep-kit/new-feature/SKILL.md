---
name: shep-kit:new-feature
description: Use when starting any new feature, functionality, or enhancement. Triggers include "new feature", "start developing", "add functionality", "implement X", or explicit /shep-kit:new-feature invocation. Creates spec branch and scaffolds specification directory.
---

# Create New Feature Specification

Start spec-driven development by creating a feature branch and specification directory.

**Full workflow guide:** [docs/development/spec-driven-workflow.md](../../../docs/development/spec-driven-workflow.md)

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
.claude/skills/shep-kit/new-feature/scripts/init-feature.sh <NNN> <feature-name>
```

This creates `specs/NNN-feature-name/` with all template files.

### 4. Analyze Context

Before filling the spec, analyze:

- **Existing specs**: Read `specs/*/spec.md` to understand feature landscape and discover dependencies
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

### 7. Write Spec & Commit

```bash
# Update spec.md with confirmed content
# Stage and commit
git add specs/NNN-feature-name/
git commit -m "feat(specs): add NNN-feature-name specification"
```

### 8. Next Steps

Inform the user:

> Spec created on `feat/NNN-feature-name`!
> Next: `/shep-kit:research` to analyze technical approach.

## Key Principles

- **Branch first**: All spec work happens on the feature branch
- **Infer, don't interrogate**: Analyze codebase to propose smart defaults
- **Dependencies from specs**: Scan existing `specs/*/spec.md` for relationships
- **User confirms**: Always get approval before writing files

## Template Location

Templates are in: `.claude/skills/shep-kit/new-feature/templates/`

## Example

See: `.claude/skills/shep-kit/new-feature/examples/001-sample-feature/`
