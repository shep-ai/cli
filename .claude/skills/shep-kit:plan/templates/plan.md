# Plan: {{FEATURE_NAME}}

> Implementation plan for {{NNN}}-{{FEATURE_NAME}}

## Status

- **Phase:** Planning
- **Updated:** {{DATE}}

## Architecture Overview

```
{{ARCHITECTURE_DIAGRAM}}
```

## Implementation Strategy

**MANDATORY TDD**: All implementation phases MUST follow RED-GREEN-REFACTOR cycles.

### Phase 1: {{PHASE_1_NAME}} (Foundational - No Tests)

**Goal:** {{PHASE_1_GOAL}}

**Steps:**

{{PHASE_1_STEPS}}

**Deliverables:**

{{PHASE_1_DELIVERABLES}}

**Testing:**

{{PHASE_1_TESTING}}

---

### Phase 2: {{PHASE_2_NAME}} (TDD Cycle 1)

**Goal:** {{PHASE_2_GOAL}}

**TDD Workflow:**

1. **RED**: Write failing tests first

   - {{RED_TESTS}}

2. **GREEN**: Write minimal code to pass tests

   - {{GREEN_IMPLEMENTATION}}

3. **REFACTOR**: Clean up while keeping tests green
   - {{REFACTOR_IMPROVEMENTS}}

**Deliverables:**

{{PHASE_2_DELIVERABLES}}

---

{{ADDITIONAL_PHASES}}

## Files to Create/Modify

### New Files

| File              | Purpose              |
| ----------------- | -------------------- |
| {{NEW_FILE_PATH}} | {{NEW_FILE_PURPOSE}} |

### Modified Files

| File              | Changes              |
| ----------------- | -------------------- |
| {{MOD_FILE_PATH}} | {{MOD_FILE_CHANGES}} |

## Testing Strategy (TDD: Tests FIRST)

**CRITICAL:** Tests are written FIRST in each TDD cycle, never after implementation.

### Unit Tests (RED → GREEN → REFACTOR)

**Write FIRST for:**

- {{UNIT_TEST_DOMAIN}}
- {{UNIT_TEST_USE_CASES}}

### Integration Tests (RED → GREEN → REFACTOR)

**Write FIRST for:**

- {{INT_TEST_REPOSITORIES}}
- {{INT_TEST_MIGRATIONS}}
- {{INT_TEST_SERVICES}}

### E2E Tests (RED → GREEN → REFACTOR)

**Write FIRST for:**

- {{E2E_TEST_CLI}}
- {{E2E_TEST_USER_FLOWS}}

## Risk Mitigation

| Risk     | Mitigation     |
| -------- | -------------- |
| {{RISK}} | {{MITIGATION}} |

## Rollback Plan

{{ROLLBACK_STRATEGY}}

---

_Updated by `/shep-kit:plan` — see tasks.md for breakdown_
