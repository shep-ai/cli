# Tasks: shep-kit

> Task breakdown for 001-shep-kit

## Status

- **Phase:** Complete
- **Updated:** 2026-02-02

## Task List

### Phase 1: Core Infrastructure

- [x] Create `specs/001-shep-kit/` directory structure
- [x] Create spec.md with requirements
- [x] Create research.md with technical decisions
- [x] Create plan.md with architecture
- [x] Create `.claude/skills/shep-kit:*` directory structure (flat naming)

### Phase 2: new-feature Skill

- [x] Write `new-feature/SKILL.md`
- [x] Write `new-feature/scripts/init-feature.sh`
- [x] Write `new-feature/templates/spec.md`
- [x] Write `new-feature/templates/research.md`
- [x] Write `new-feature/templates/plan.md`
- [x] Write `new-feature/templates/tasks.md`
- [x] Write `new-feature/templates/data-model.md`
- [x] Create `new-feature/examples/001-sample-feature/spec.md`

### Phase 3: research Skill

- [x] Write `research/SKILL.md`
- [x] Write `research/templates/research.md`
- [x] Create `research/examples/sample-research.md`

### Phase 4: plan Skill

- [x] Write `plan/SKILL.md`
- [x] Write `plan/templates/plan.md`
- [x] Write `plan/templates/tasks.md`
- [x] Create `plan/examples/sample-plan.md`

### Phase 5: Documentation [P]

- [x] Create `docs/development/spec-driven-workflow.md`
- [x] Update `CONTRIBUTING.md`
- [x] Update `CONTRIBUTING-AGENTS.md`
- [x] Update `CLAUDE.md`
- [x] Update `README.md` (referenced via CONTRIBUTING links)
- [x] Update `AGENTS.md` (referenced via CLAUDE.md links)

### Phase 6: Validation

- [x] Test `/shep-kit:new-feature` end-to-end (bootstrapped 001-shep-kit itself)
- [x] Verify templates render correctly
- [x] Cross-validate documentation consistency
- [x] Fix CI scope validation (added 'specs' to commitlint + pr-check.yml)
- [x] Clarify lowercase acronym requirement in commit guidelines

## Acceptance Checklist

- [x] All tasks completed
- [x] Tests passing (`pnpm test`)
- [x] Linting clean (`pnpm lint`)
- [x] Types valid (`pnpm typecheck`)
- [x] Documentation updated
- [x] PR created and reviewed
- [x] PR merged (PR #3)

## Parallelization Notes

- [P] Phase 5 tasks ran in parallel (independent doc updates)
- Phase 2, 3, 4 ran in parallel (independent skills)
- Phase 6 waited for all prior phases

---

_All tasks complete. Feature merged via PR #3._
