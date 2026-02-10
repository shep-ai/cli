# Plan: shepkit-support-yaml-specs

> Implementation plan for 011-shepkit-support-yaml-specs

## Status

- **Phase:** Planning
- **Updated:** 2026-02-10

## Architecture Overview

```
                      TypeSpec Models (.tsp)
                             |
                     pnpm tsp:compile
                             |
                             v
                   Generated Types (output.ts)
                      /              \
                     v                v
          +------------------+   +---------------------+
          | spec-validate.ts |   | spec-generate-md.ts |
          | (pnpm            |   | (pnpm               |
          |  spec:validate)  |   |  spec:generate-md)  |
          +------------------+   +---------------------+
                 ^    reads YAML      ^
                 |                    |
                 +--------+-----------+
                          |
              +-----------+-----------+
              |     YAML Spec Files   |
              | spec.yaml             |
              | research.yaml         |
              | plan.yaml             |
              | tasks.yaml            |
              +-----------+-----------+
                          | generates
                          v
              +-----------+-----------+
              |    Markdown Files     |
              | spec.md (auto-gen)    |
              | research.md (auto-gen)|
              | plan.md (auto-gen)    |
              | tasks.md (auto-gen)   |
              +-----------------------+

  Skill Prompts (SKILL.md)
      |
      +-- Gate checks: read YAML fields directly
      +-- Complex validation: invoke pnpm spec:validate
```

## Implementation Strategy

**MANDATORY TDD**: All implementation phases with executable code follow RED-GREEN-REFACTOR cycles.

### Phase 1: TypeSpec Domain Models (Foundational - No Tests)

**Goal:** Define the spec artifact type system in TypeSpec, generating TypeScript types and JSON Schema.

**Steps:**

1. Create value objects for spec metadata (OpenQuestion, TechDecision, PlanPhase, SpecTask, TddCycle)
2. Create `SpecArtifactBase` model extending `BaseEntity` with shared fields (name, summary, content, technologies, relatedFeatures, relatedLinks, openQuestions)
3. Create concrete entities: `FeatureSpec`, `ResearchSpec`, `PlanSpec`, `TasksSpec` extending `SpecArtifactBase`
4. Update TypeSpec index files, compile, and verify generated output

**Deliverables:** TypeSpec models, generated TypeScript types in `output.ts`, JSON Schema in `apis/json-schema/`

**Testing:** Compile-time validation via `pnpm tsp:compile` (no unit tests for type definitions)

### Phase 2: YAML Templates & Scaffolding (Foundational - No Tests)

**Goal:** Create YAML template files and update the scaffolding script to produce YAML-first specs.

**Steps:**

1. Create YAML template files matching the TypeSpec model shapes: `spec.yaml`, `research.yaml`, `plan.yaml`, `tasks.yaml`
2. Update `init-feature.sh` to scaffold YAML files and produce Markdown via the generation script
3. Add `pnpm spec:generate-md` and `pnpm spec:validate` script entries to `package.json`

**Deliverables:** YAML templates, updated init script, npm script entries

**Testing:** Manual verification of scaffolding output

### Phase 3: Markdown Generation Script (TDD Cycle 1)

**Goal:** Build a Node.js script that reads YAML spec files and generates corresponding Markdown files with front matter.

**TDD Workflow:**

1. **RED:** Write failing tests for YAML-to-Markdown generation (parse YAML, produce front matter + content, handle all 4 artifact types)
2. **GREEN:** Implement `scripts/spec-generate-md.ts` using `js-yaml` to parse and string concatenation to produce Markdown
3. **REFACTOR:** Extract shared helpers, improve error messages

**Deliverables:** `scripts/spec-generate-md.ts`, `tests/unit/scripts/spec-generate-md.test.ts`

### Phase 4: Spec Validation Script (TDD Cycle 2)

**Goal:** Replace the grep/awk validation rules with a typed, testable Node.js validation script.

**TDD Workflow:**

1. **RED:** Write failing tests for all three validation categories:
   - Completeness: required files exist, required keys present, open questions resolved
   - Architecture: Clean Architecture references, TypeSpec-first, TDD phases in plan
   - Consistency: task count matches between plan and tasks, dependency references valid
2. **GREEN:** Implement `scripts/spec-validate.ts` with structured validation output (pass/warn/fail)
3. **REFACTOR:** Extract validation categories into separate functions, improve reporting

**Deliverables:** `scripts/spec-validate.ts`, `tests/unit/scripts/spec-validate.test.ts`

### Phase 5: Skill Prompt Migration (No Tests)

**Goal:** Update all shep-kit skill SKILL.md files to read YAML instead of Markdown for gate checks and validation.

**Steps:**

1. Update `shep-kit:new-feature` SKILL.md: reference YAML templates, update scaffolding instructions
2. Update `shep-kit:research` SKILL.md: gate check reads `spec.yaml` openQuestions field instead of grep on spec.md
3. Update `shep-kit:plan` SKILL.md: gate check reads `research.yaml` openQuestions, task counting from YAML
4. Update `shep-kit:implement` SKILL.md: replace inline validation with `pnpm spec:validate` invocation
5. Update validation documents (completeness.md, architecture.md, consistency.md) to reference YAML fields

**Deliverables:** Updated SKILL.md files for 4 skills, updated 3 validation documents

### Phase 6: Documentation & Verification (No Tests)

**Goal:** Update project documentation to reflect YAML-first workflow and verify end-to-end.

**Steps:**

1. Update `docs/development/spec-driven-workflow.md` to document YAML-first approach
2. Update `CLAUDE.md` references to mention YAML spec format
3. End-to-end verification: scaffold test feature, validate, generate Markdown, confirm round-trip

**Deliverables:** Updated documentation, verified workflow

## Files to Create/Modify

### New Files

| File                                                          | Purpose                                                                 |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `tsp/domain/value-objects/spec-metadata.tsp`                  | OpenQuestion, TechDecision, PlanPhase, SpecTask, TddCycle value objects |
| `tsp/domain/entities/spec-artifact-base.tsp`                  | SpecArtifactBase model with shared spec fields                          |
| `tsp/domain/entities/feature-spec.tsp`                        | FeatureSpec entity (spec.yaml)                                          |
| `tsp/domain/entities/research-spec.tsp`                       | ResearchSpec entity (research.yaml)                                     |
| `tsp/domain/entities/plan-spec.tsp`                           | PlanSpec entity (plan.yaml)                                             |
| `tsp/domain/entities/tasks-spec.tsp`                          | TasksSpec entity (tasks.yaml)                                           |
| `.claude/skills/shep-kit:new-feature/templates/spec.yaml`     | YAML template for feature specs                                         |
| `.claude/skills/shep-kit:new-feature/templates/research.yaml` | YAML template for research artifacts                                    |
| `.claude/skills/shep-kit:new-feature/templates/plan.yaml`     | YAML template for plans                                                 |
| `.claude/skills/shep-kit:new-feature/templates/tasks.yaml`    | YAML template for task breakdowns                                       |
| `scripts/spec-generate-md.ts`                                 | YAML-to-Markdown generation script                                      |
| `scripts/spec-validate.ts`                                    | Spec validation script (replaces grep/awk rules)                        |
| `tests/unit/scripts/spec-generate-md.test.ts`                 | Unit tests for Markdown generation                                      |
| `tests/unit/scripts/spec-validate.test.ts`                    | Unit tests for spec validation                                          |

### Modified Files

| File                                                           | Changes                                            |
| -------------------------------------------------------------- | -------------------------------------------------- |
| `tsp/domain/entities/index.tsp`                                | Import new spec entity files                       |
| `tsp/domain/value-objects/index.tsp`                           | Import spec-metadata.tsp                           |
| `package.json`                                                 | Add `spec:generate-md` and `spec:validate` scripts |
| `.claude/skills/shep-kit:new-feature/scripts/init-feature.sh`  | Scaffold YAML files, invoke Markdown generation    |
| `.claude/skills/shep-kit:new-feature/SKILL.md`                 | Reference YAML templates and workflow              |
| `.claude/skills/shep-kit:research/SKILL.md`                    | Gate check reads spec.yaml                         |
| `.claude/skills/shep-kit:plan/SKILL.md`                        | Gate check reads research.yaml                     |
| `.claude/skills/shep-kit:implement/SKILL.md`                   | Use `pnpm spec:validate` instead of inline rules   |
| `.claude/skills/shep-kit:implement/validation/completeness.md` | Reference YAML fields                              |
| `.claude/skills/shep-kit:implement/validation/architecture.md` | Reference YAML fields                              |
| `.claude/skills/shep-kit:implement/validation/consistency.md`  | Reference YAML fields                              |
| `docs/development/spec-driven-workflow.md`                     | Document YAML-first workflow                       |
| `CLAUDE.md`                                                    | Add YAML spec format references                    |

## Testing Strategy (TDD: Tests FIRST)

**CRITICAL:** Tests are written FIRST in each TDD cycle.

### Unit Tests (RED -> GREEN -> REFACTOR)

Write FIRST for:

- **spec-generate-md.ts**: Parse YAML spec, produce Markdown with front matter, handle all 4 artifact types, handle missing optional fields, handle multiline content
- **spec-validate.ts**: Completeness checks (required files, required keys, open questions), architecture checks (TDD phases, TypeSpec references), consistency checks (task counts, dependency validation, circular dependency detection)

### Integration Tests (RED -> GREEN -> REFACTOR)

Write FIRST for:

- Scaffolding script produces valid YAML files that pass validation
- Generated Markdown matches expected output for sample specs

### E2E Tests

Not required for this feature (dev tooling only, not user-facing application code).

## Risk Mitigation

| Risk                                       | Mitigation                                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| TypeSpec compilation fails with new models | Validate against existing entity patterns (Artifact, Feature) before adding many files              |
| YAML templates have syntax errors          | Validate templates with `js-yaml.load()` in tests                                                   |
| Skill prompts break existing workflow      | Keep Markdown templates alongside YAML during transition; existing specs (001-010) remain unchanged |
| init-feature.sh changes break scaffolding  | Test script manually before updating SKILL.md references                                            |
| Validation script misses edge cases        | Port existing grep/awk patterns systematically; test each rule individually                         |

## Rollback Plan

Feature is additive and backward-compatible:

- Existing specs (001-010) remain in Markdown format and are unaffected
- New YAML specs (011+) coexist with generated Markdown
- Rollback: revert the branch; no data migration needed
- Skills remain functional with Markdown fallback during transition

---

_Updated by `/shep-kit:plan` — see tasks.md for detailed breakdown_
