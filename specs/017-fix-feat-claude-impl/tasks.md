## Status

- **Phase:** Implementation
- **Updated:** 2026-02-15

## Task List

### Phase 1: Error Classification & Retry Utility (TDD)

**RED (Write Failing Tests First):**

- [ ] task-1: Write classifyError() tests covering API 400/429/500, network, non-retryable, unknown

**GREEN + REFACTOR:**

- [ ] task-2: Implement classifyError() + retryExecute() with tests, pass all, refactor

### Phase 2: AgentExecutionOptions & Executor Wiring (TDD)

**RED:**

- [ ] task-3: Write buildArgs() tests for disableMcp and tools options

**GREEN + REFACTOR:**

- [ ] task-4: Add disableMcp/tools to AgentExecutionOptions, update buildArgs()

### Phase 3: Implement Node Hardening (TDD)

**RED:**

- [ ] task-5: Write buildExecutorOptions() hardening tests (maxTurns, disableMcp)
- [ ] task-6: Write phase-skipping and completedPhases tracking tests

**GREEN + REFACTOR:**

- [ ] task-7: Implement all Phase 3 changes, pass all tests, refactor

## TDD Notes

- **MANDATORY**: All phases follow RED -> GREEN -> REFACTOR
- **RED**: Write failing tests FIRST (never skip this!)
- **GREEN**: Write minimal code to pass tests
- **REFACTOR**: Improve code while keeping tests green

## Progress Tracking (CRITICAL)

- **Update checkboxes FREQUENTLY** - as soon as each item is complete!
- **Don't batch updates** - check off items immediately, not at the end
- **Commit task.md updates** along with code changes to show progress

## Acceptance Checklist

Before marking feature complete:

- [ ] All 7 tasks completed
- [ ] Tests passing (`pnpm test`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Types valid (`pnpm typecheck`)
- [ ] TypeSpec compiles (`pnpm tsp:compile`)
- [ ] PR created and reviewed

---

_Task breakdown for implementation tracking_
