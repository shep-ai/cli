## Status

- **Phase:** Implementation
- **Updated:** 2026-02-10

## Task List

### Phase 1: SKILL.md Review Watch Extension

- [ ] **Task 1:** Add Step 6 header and review detection phase to SKILL.md
  - Add Step 6 after existing Step 5
  - Document two-phase detection (check wait + API fetch)
  - Provide `gh api` commands for all three review endpoints
  - Include `--jq` filters for relevant fields

- [ ] **Task 2:** Add bot identification and comment classification to Step 6
  - Document bot identification (`user.login`, `user.type`)
  - Create comment classification taxonomy table
  - Document GitHub suggestion block handling
  - Define exit conditions for no actionable comments

### Phase 2: SKILL.md Review Fix Loop Extension

- [ ] **Task 3:** Add Step 7 review fix loop to SKILL.md
  - Document fix application strategy (suggestions, AI-interpreted)
  - Define commit message format (`fix(review): ...`)
  - Document loop control (max 5 iterations, convergence detection)
  - List all exit conditions

- [ ] **Task 4:** Update SKILL.md flow diagram, red flags, quick reference
  - Update flow diagram with review cycle nodes
  - Add review-loop red flags
  - Update quick reference table
  - Add feature.yaml update instructions

### Phase 3: Documentation Updates [P]

- [ ] **Task 5:** Update feature-yaml-protocol.md with review loop extensions
  - Add review-watching and review-fixing phases
  - Document review loop checkpoints
  - Document `reviewLoop` field schema
  - Update commit-pr section

- [ ] **Task 6:** Update spec-driven-workflow.md commit-pr section
  - Update Step 5 description with review loop mention
  - Add note about autonomous review handling

### Phase 4: Validation & Finalization

- [ ] **Task 7:** Validate cross-references and run format check
  - Read complete SKILL.md end-to-end
  - Verify `gh api` command syntax
  - Check cross-references between files
  - Run `pnpm format:check`

## TDD Notes

This feature involves only SKILL.md prompt engineering and documentation updates.
There is no TypeScript code to write, so traditional RED-GREEN-REFACTOR TDD
cycles do not apply. Validation is performed by manual review and `pnpm format:check`.

## Progress Tracking (CRITICAL)

- **Update checkboxes FREQUENTLY** - as soon as each item is complete!
- **Don't batch updates** - check off items immediately, not at the end
- **Commit task.md updates** along with code changes to show progress

## Acceptance Checklist

Before marking feature complete:

- [ ] All tasks completed
- [ ] SKILL.md reads as coherent instruction set
- [ ] All `gh api` commands are syntactically valid
- [ ] Cross-references are consistent
- [ ] `pnpm format:check` passes
- [ ] Documentation updated
- [ ] PR created and reviewed

---

_Task breakdown for implementation tracking_
