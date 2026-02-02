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

### 3. Define Implementation Phases

Break implementation into logical phases:

- Each phase should be independently testable
- Order by dependencies (foundational first)
- Identify parallelizable work

### 4. Identify Files to Create/Modify

For each phase, list:

- **New files**: Path and purpose
- **Modified files**: Path and changes needed

### 5. Define Testing Strategy

Specify tests needed:

- Unit tests for domain logic
- Integration tests for repositories/services
- E2E tests for user-facing features

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

### 9. Update data-model.md (if needed)

If feature requires entity changes:

- Define new entities with TypeSpec structure
- Document modifications to existing entities
- List new enums or value objects

### 10. Commit

```bash
git add specs/NNN-feature-name/
git commit -m "feat(specs): add NNN-feature-name implementation plan"
```

### 11. Next Steps

Inform the user:

> Plan complete for `NNN-feature-name`!
> Ready to implement. Use tasks.md to track progress.
> Consider TDD: write tests first, then implementation.

## Key Principles

- **Incremental**: Each phase produces working, testable code
- **Parallel-aware**: Mark independent tasks for concurrent execution
- **TDD-aligned**: Testing strategy enables test-first development
- **Reversible**: Always have a rollback plan

## Template Locations

- Plan: `.claude/skills/shep-kit/new-feature/templates/plan.md`
- Tasks: `.claude/skills/shep-kit/new-feature/templates/tasks.md`
- Data Model: `.claude/skills/shep-kit/new-feature/templates/data-model.md`

## Example

See: `.claude/skills/shep-kit/plan/examples/sample-plan.md`
