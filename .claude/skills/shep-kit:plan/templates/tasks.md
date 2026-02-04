# Tasks: {{FEATURE_NAME}}

> Task breakdown for {{NNN}}-{{FEATURE_NAME}}

## Status

- **Phase:** Implementation
- **Updated:** {{DATE}}

## Task List

### Phase 1: {{PHASE_1_NAME}} (Foundational - No Tests)

- [ ] {{FOUNDATIONAL_TASK_1}}
- [ ] {{FOUNDATIONAL_TASK_2}}
- [ ] {{FOUNDATIONAL_TASK_3}}

### Phase 2: {{PHASE_2_NAME}} (TDD Cycle 1)

**RED (Write Failing Tests First):**

- [ ] Write unit test: {{TEST_FILE_1}}
- [ ] Write integration test: {{TEST_FILE_2}}

**GREEN (Implement to Pass Tests):**

- [ ] Implement {{IMPLEMENTATION_1}}
- [ ] Implement {{IMPLEMENTATION_2}}

**REFACTOR (Clean Up):**

- [ ] Refactor {{REFACTOR_1}} while keeping tests green

### Phase 3: {{PHASE_3_NAME}} (TDD Cycle 2) [P]

**RED (Write Failing Tests First):**

- [ ] {{RED_TASKS}}

**GREEN (Implement to Pass Tests):**

- [ ] {{GREEN_TASKS}}

**REFACTOR (Clean Up):**

- [ ] {{REFACTOR_TASKS}}

## TDD Notes

- **MANDATORY**: All phases with code follow RED → GREEN → REFACTOR
- **RED**: Write failing tests FIRST (never skip this!)
- **GREEN**: Write minimal code to pass tests
- **REFACTOR**: Improve code while keeping tests green
- Tests are written BEFORE implementation, not after

## Progress Tracking (CRITICAL)

- **Update checkboxes FREQUENTLY** - as soon as each item is complete!
- **Don't batch updates** - check off items immediately, not at the end
- **Commit task.md updates** along with code changes to show progress
- This file is the source of truth for implementation progress

## Parallelization Notes

- [P] marks phases with parallelizable tasks
- {{PARALLEL_NOTE}}

## Acceptance Checklist

- [ ] All tasks completed
- [ ] Tests passing (`pnpm test`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Types valid (`pnpm typecheck`)
- [ ] Documentation updated
- [ ] PR created and reviewed

---

_Task breakdown for implementation_
