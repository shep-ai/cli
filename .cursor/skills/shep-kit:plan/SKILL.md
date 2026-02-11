---
name: shep-kit:plan
description: Use after /shep-kit:research to create implementation plan and task breakdown. Triggers include "plan", "implementation plan", "break down tasks", "create tasks", or explicit /shep-kit:plan invocation.
---

# Create Implementation Plan

Generate a detailed implementation plan with architecture overview and task breakdown.

**Full workflow guide:** [docs/development/spec-driven-workflow.md](../../../docs/development/spec-driven-workflow.md)

## Prerequisites

- Feature spec exists at `specs/NNN-feature-name/spec.yaml`
- Research completed at `specs/NNN-feature-name/research.yaml`
- On the feature branch `feat/NNN-feature-name`

## GATE CHECK (Mandatory)

Before starting planning, verify:

1. **Read `research.yaml`** and check the `openQuestions` field
2. **If any items have `resolved: false`**: STOP and inform user:
   > Cannot proceed with planning. Open questions in research.yaml must be resolved first.
   > Please complete research or mark questions as resolved.
3. **Only proceed** when all open questions have `resolved: true` or the `openQuestions` array is empty

## Workflow

### 1. Review Spec & Research

Read both YAML source files to understand:

- Requirements and success criteria (`spec.yaml`)
- Technical decisions and constraints (`research.yaml`)
- Affected areas and dependencies

### 2. Design Architecture

Create high-level architecture:

- Component diagram (ASCII or Mermaid)
- Data flow between components
- Integration points with existing code

### 3. Define Implementation Phases (MANDATORY TDD STRUCTURE)

**CRITICAL:** Plans MUST follow Test-Driven Development (TDD) with RED-GREEN-REFACTOR cycles.

Break implementation into phases following TDD:

- **Foundational phases** (no tests): Build pipeline, TypeSpec models, configuration
- **TDD Cycle phases**: For each layer (Domain, Application, Infrastructure):
  - **RED**: Write failing tests first
  - **GREEN**: Write minimal code to pass tests
  - **REFACTOR**: Clean up while keeping tests green
- Each phase should be independently testable
- Order by dependencies (foundational first)
- Identify parallelizable work

### 4. Identify Files to Create/Modify

For each phase, list:

- **New files**: Path and purpose
- **Modified files**: Path and changes needed

### 5. Define Testing Strategy (TDD: Tests FIRST)

**MANDATORY:** Define what tests to write FIRST in each TDD cycle.

For each layer, specify tests to write BEFORE implementation:

- **Unit tests** (RED first): Domain logic, use cases with mocks
- **Integration tests** (RED first): Repositories, migrations, database operations
- **E2E tests** (RED first): User-facing features, CLI commands

Each TDD phase MUST follow:

1. RED: Write failing test
2. GREEN: Write minimal code to pass
3. REFACTOR: Improve code while keeping tests green

### 6. Document Risks & Rollback

- Identify potential risks
- Define mitigation strategies
- Document rollback plan if needed

### 7. Create Task Breakdown

Convert phases into actionable tasks:

- Each task should be completable in one session
- Mark parallelizable tasks with [P]
- Include acceptance checklist

### 8. Write plan.yaml and tasks.yaml, then Generate Markdown

Write structured YAML source files (the source of truth):

- `specs/NNN-feature-name/plan.yaml` - Architecture and strategy
- `specs/NNN-feature-name/tasks.yaml` - Detailed task list

Then generate Markdown from YAML:

```bash
pnpm spec:generate-md NNN-feature-name
```

This produces `plan.md` and `tasks.md` automatically. Do NOT hand-edit the Markdown files.

### 9. Update Status Fields & feature.yaml

**CRITICAL:** Update status in YAML source files AND feature.yaml:

Update the `status` field in each YAML source file:

- `spec.yaml` → set `status.phase: planning` (was research)
- `research.yaml` → set `status.phase: planning` (was research)
- `plan.yaml` → set `status.phase: planning`, `status.updatedAt: <today's date>`
- `tasks.yaml` → set `status.phase: implementation`, `status.updatedAt: <today's date>`

**Update feature.yaml:**

```yaml
# specs/NNN-feature-name/feature.yaml
feature:
  lifecycle: 'implementation' # Update from "planning"

status:
  phase: 'ready-to-implement' # Update from "planning"
  progress:
    total: <count from tasks.yaml> # Count tasks[].id entries
  lastUpdated: '<timestamp>'
  lastUpdatedBy: 'shep-kit:plan'

checkpoints:
  # Add new checkpoint:
  - phase: 'plan-complete'
    completedAt: '<timestamp>'
    completedBy: 'shep-kit:plan'
```

**Count tasks** from the YAML array (not markdown grep):

```bash
# Count entries in tasks.yaml tasks[] array
yq '.tasks | length' specs/NNN-feature-name/tasks.yaml
```

**Regenerate Markdown** after status updates:

```bash
pnpm spec:generate-md NNN-feature-name
```

**Reference:** [docs/development/feature-yaml-protocol.md](../../../docs/development/feature-yaml-protocol.md)

### 10. Update data-model.md (if needed)

If feature requires entity changes:

- Define new entities with TypeSpec structure
- Document modifications to existing entities
- List new enums or value objects

### 11. Commit

```bash
git add specs/NNN-feature-name/
git commit -m "feat(specs): add NNN-feature-name implementation plan"
```

### 12. Next Steps

Inform the user:

> Plan complete for `NNN-feature-name`!
> Ready to implement. Use tasks.yaml to track progress.
>
> ⚠️ **MANDATORY TDD**: Each phase follows RED-GREEN-REFACTOR:
>
> 1. RED: Write failing test FIRST
> 2. GREEN: Write minimal code to pass
> 3. REFACTOR: Improve while keeping tests green
>
> **MANDATORY Phase Completion Workflow**:
>
> After EACH phase:
>
> 1. Update tasks.yaml status fields FREQUENTLY (as you complete items, not at the end!)
> 2. Commit and push: `git add . && git commit -m "feat: complete phase N" && git push`
> 3. Watch CI: `gh run watch --exit-status`
> 4. If CI fails: Fix → Commit → Push → Watch again (LOOP until green)
> 5. Only proceed to next phase after CI passes
>
> **IMPORTANT:** After implementation, update all spec file statuses to "Complete"

## Key Principles

- **Gate enforcement**: Never skip the open questions check
- **TDD MANDATORY**: Plans MUST follow RED-GREEN-REFACTOR cycles for all implementation phases
- **Tests FIRST**: Every TDD phase starts with failing tests, never implementation first
- **Incremental**: Each phase produces working, tested code
- **Parallel-aware**: Mark independent tasks for concurrent execution
- **Reversible**: Always have a rollback plan
- **Status tracking**: Always update Phase fields before committing

## Template Locations

- Plan: `.cursor/skills/shep-kit:new-feature/templates/plan.yaml`
- Tasks: `.cursor/skills/shep-kit:new-feature/templates/tasks.yaml`
- Data Model: `.cursor/skills/shep-kit:new-feature/templates/data-model.md`

## Example

See: `.cursor/skills/shep-kit:plan/examples/sample-plan.md`
