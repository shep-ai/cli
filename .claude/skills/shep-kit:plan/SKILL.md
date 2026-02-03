---
name: shep-kit:plan
description: Use after /shep-kit:research to create implementation plan and task breakdown. Triggers include "plan", "implementation plan", "break down tasks", "create tasks", or explicit /shep-kit:plan invocation.
---

# Create Implementation Plan

Generate a detailed implementation plan with architecture overview and task breakdown.

**Full workflow guide:** [docs/development/spec-driven-workflow.md](../../../docs/development/spec-driven-workflow.md)

## Prerequisites

- Feature spec exists at `specs/NNN-feature-name/spec.md`
- Research completed at `specs/NNN-feature-name/research.md`
- On the feature branch `feat/NNN-feature-name`

## GATE CHECK (Mandatory)

Before starting planning, verify:

1. **Read `research.md`** and check the "Open Questions" section
2. **If any unchecked `- [ ]` items exist**: STOP and inform user:
   > ⛔ Cannot proceed with planning. Open questions in research.md must be resolved first.
   > Please complete research or mark questions as resolved.
3. **Only proceed** when research questions are resolved or section says "All questions resolved"

## Workflow

### 1. Review Spec & Research

Read both files to understand:

- Requirements and success criteria (spec.md)
- Technical decisions and constraints (research.md)
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

### 8. Update plan.md and tasks.md

Fill in both templates:

- `specs/NNN-feature-name/plan.md` - Architecture and strategy
- `specs/NNN-feature-name/tasks.md` - Detailed task list

### 9. Update Status Fields

**CRITICAL:** Update status in ALL spec files:

```markdown
# In spec.md, update:

- **Phase:** Planning # (was Research)

# In research.md, update:

- **Phase:** Planning # (was Research)

# In plan.md, keep:

- **Phase:** Planning
- **Updated:** <today's date>

# In tasks.md, keep:

- **Phase:** Implementation # Ready for impl
- **Updated:** <today's date>
```

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
> Ready to implement. Use tasks.md to track progress.
>
> ⚠️ **MANDATORY TDD**: Each phase follows RED-GREEN-REFACTOR:
>
> 1. RED: Write failing test FIRST
> 2. GREEN: Write minimal code to pass
> 3. REFACTOR: Improve while keeping tests green
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

- Plan: `.claude/skills/shep-kit:new-feature/templates/plan.md`
- Tasks: `.claude/skills/shep-kit:new-feature/templates/tasks.md`
- Data Model: `.claude/skills/shep-kit:new-feature/templates/data-model.md`

## Example

See: `.claude/skills/shep-kit:plan/examples/sample-plan.md`
