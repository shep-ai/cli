# Tasks: shepkit-support-yaml-specs

> Task breakdown for 011-shepkit-support-yaml-specs

## Status

- **Phase:** Implementation
- **Updated:** 2026-02-10

## Task List

### Phase 1: TypeSpec Domain Models (Foundational - No Tests)

- [ ] Create `tsp/domain/value-objects/spec-metadata.tsp` with value objects: `OpenQuestion`, `TechDecision`, `PlanPhase`, `SpecTask`, `TddCycle`
- [ ] Create `tsp/domain/entities/spec-artifact-base.tsp` with `SpecArtifactBase` model extending `BaseEntity` (name, summary, content, technologies, relatedFeatures, relatedLinks, openQuestions)
- [ ] Create concrete spec entities in `tsp/domain/entities/`: `feature-spec.tsp` (FeatureSpec), `research-spec.tsp` (ResearchSpec), `plan-spec.tsp` (PlanSpec), `tasks-spec.tsp` (TasksSpec)
- [ ] Update `tsp/domain/entities/index.tsp` and `tsp/domain/value-objects/index.tsp` to import new files; run `pnpm tsp:compile` and verify generated types in `src/domain/generated/output.ts`

### Phase 2: YAML Templates & Scaffolding (Foundational - No Tests)

- [ ] Create YAML template files in `.claude/skills/shep-kit:new-feature/templates/`: `spec.yaml`, `research.yaml`, `plan.yaml`, `tasks.yaml` — matching TypeSpec model shapes with `{{PLACEHOLDER}}` substitution variables
- [ ] Update `.claude/skills/shep-kit:new-feature/scripts/init-feature.sh` to scaffold YAML files alongside Markdown, calling `spec-generate-md` for initial Markdown generation
- [ ] Add `spec:generate-md` and `spec:validate` npm script entries to root `package.json`

### Phase 3: Markdown Generation Script (TDD Cycle 1)

**RED (Write Failing Tests First):**

- [ ] Write unit tests in `tests/unit/scripts/spec-generate-md.test.ts`: parse YAML to Markdown with front matter for all 4 artifact types, handle missing optional fields, handle multiline content field, validate output structure

**GREEN (Implement to Pass Tests):**

- [ ] Implement `scripts/spec-generate-md.ts`: read YAML files from `specs/<feature-id>/`, parse with `js-yaml`, output Markdown files with YAML front matter + content field; support `--feature <id>` CLI argument

**REFACTOR (Clean Up):**

- [ ] Extract shared YAML loading and front matter generation helpers; add error handling for malformed YAML; verify all tests still pass

### Phase 4: Spec Validation Script (TDD Cycle 2)

**RED (Write Failing Tests First):**

- [ ] Write unit tests in `tests/unit/scripts/spec-validate.test.ts` for completeness checks: required files exist (spec.yaml, research.yaml, plan.yaml, tasks.yaml, feature.yaml), required keys present in each YAML file, openQuestions all resolved
- [ ] Write unit tests for architecture checks: TDD phases present in plan, TypeSpec-first references, Clean Architecture compliance
- [ ] Write unit tests for consistency checks: task count matches between plan phases and tasks file, dependency references are valid task IDs, no circular dependencies

**GREEN (Implement to Pass Tests):**

- [ ] Implement `scripts/spec-validate.ts` with three validation categories (completeness, architecture, consistency); output structured results (pass/warn/fail with messages); support `--feature <id>` CLI argument

**REFACTOR (Clean Up):**

- [ ] Extract validation categories into separate functions; improve error reporting format; verify all tests still pass

### Phase 5: Skill Prompt Migration (No Tests) [P]

- [ ] Update `.claude/skills/shep-kit:new-feature/SKILL.md`: reference YAML templates, update scaffolding instructions to produce YAML-first with generated Markdown
- [ ] Update `.claude/skills/shep-kit:research/SKILL.md`: gate check reads `spec.yaml` openQuestions array instead of grep on spec.md
- [ ] Update `.claude/skills/shep-kit:plan/SKILL.md`: gate check reads `research.yaml` openQuestions, task counting from YAML arrays
- [ ] Update `.claude/skills/shep-kit:implement/SKILL.md`: replace inline grep/awk validation with `pnpm spec:validate <feature-id>` invocation
- [ ] Update validation documents (`completeness.md`, `architecture.md`, `consistency.md`) to reference YAML field checks instead of Markdown grep patterns

### Phase 6: Documentation & Verification (No Tests)

- [ ] Update `docs/development/spec-driven-workflow.md` to document YAML-first approach (YAML as source of truth, Markdown auto-generated, validation via Node.js scripts)
- [ ] Update `CLAUDE.md` to reference YAML spec format in relevant sections (Spec-Driven Development, feature.yaml protocol)
- [ ] End-to-end verification: scaffold a test feature with updated `init-feature.sh`, run `pnpm spec:validate`, run `pnpm spec:generate-md`, confirm Markdown output matches expectations

## TDD Notes

- **MANDATORY**: All phases with code follow RED -> GREEN -> REFACTOR
- **RED**: Write failing tests FIRST (never skip this!)
- **GREEN**: Write minimal code to pass tests
- **REFACTOR**: Improve code while keeping tests green
- Tests are written BEFORE implementation, not after
- Phase 1-2 are foundational (TypeSpec models, templates) — no unit tests, validated by compilation
- Phase 3-4 are TDD cycles — tests written first for Node.js scripts
- Phase 5-6 are prompt/documentation updates — no unit tests applicable

## Progress Tracking (CRITICAL)

- **Update checkboxes FREQUENTLY** - as soon as each item is complete!
- **Don't batch updates** - check off items immediately, not at the end
- **Commit task.md updates** along with code changes to show progress
- This file is the source of truth for implementation progress

## Parallelization Notes

- [P] marks phases with parallelizable tasks
- Phase 5 tasks (skill prompt migration) are independent of each other and can be done in parallel
- Phase 3 and Phase 4 could be parallelized (independent scripts) but are ordered for incremental delivery
- Phases 1-2 must complete before Phases 3-4 (scripts depend on TypeSpec types and templates)

## Acceptance Checklist

Before marking feature complete:

- [ ] All tasks completed
- [ ] Tests passing (`pnpm test`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Types valid (`pnpm typecheck`)
- [ ] TypeSpec compiles (`pnpm tsp:compile`)
- [ ] Documentation updated
- [ ] PR created and reviewed

---

_Task breakdown for implementation tracking_
