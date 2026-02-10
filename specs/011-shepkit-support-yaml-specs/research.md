# Research: shepkit-support-yaml-specs

> Technical analysis for 011-shepkit-support-yaml-specs

## Status

- **Phase:** Research
- **Updated:** 2026-02-10

## Technology Decisions

### 1. YAML Parsing Library

**Options considered:**

1. **js-yaml** — Already in project (v4.1.1), lightweight (13KB gzipped), YAML 1.1/1.2 compliant
2. **yaml** (npm: `yaml`) — YAML 1.2 compliant, preserves comments/formatting via Document API, native TypeScript
3. **Custom parser** — Roll our own YAML parsing utilities

**Decision:** Keep `js-yaml` (already a dependency)

**Rationale:** The project already uses `js-yaml` v4.1.1 in `src/presentation/cli/ui/output.ts`. Our spec YAML files are simple structured data with no need for comment preservation (comments belong in generated Markdown, not YAML source). `js-yaml` provides `load()` and `dump()` which are sufficient for read/validate/write workflows. Adding `yaml` (27KB gzipped) provides no tangible benefit for this use case. If round-trip editing with comment preservation becomes needed later, `yaml` can be added incrementally.

### 2. Schema Validation Approach

**Options considered:**

1. **Zod** — Already in project (v4.3.6), TypeScript-first schema validation, excellent error messages
2. **JSON Schema** — Standard, language-agnostic, can validate YAML after parsing to JS objects
3. **Ajv** — Fastest JSON Schema validator for JS, but adds a new dependency
4. **Custom validation** — Manual checks in Node.js code

**Decision:** Zod (already a dependency)

**Rationale:** Zod is already installed in the project and provides TypeScript-first schema definitions that double as type inference. Defining spec schemas in Zod gives us: (1) runtime validation with detailed error messages, (2) TypeScript type inference from schemas (`z.infer<typeof SpecSchema>`), (3) no new dependencies, (4) composable schemas for shared structures. This replaces the current fragile grep/awk validation in skill scripts with robust, typed validation.

### 3. Markdown Generation Approach

**Options considered:**

1. **Handlebars** — Template engine, clean separation of template + data, supports loops/conditionals/partials
2. **Programmatic (remark/mdast)** — AST-based Markdown generation, guarantees valid output
3. **Template literals** — Zero dependencies, plain TypeScript string interpolation

**Decision:** Handlebars

**Rationale:** Spec Markdown has complex structure (tables, nested task phases, conditional TDD sections, checkbox lists) that benefits from a proper template engine. Handlebars provides: (1) templates as separate `.hbs` files that are easy to maintain, (2) native loops (`{{#each}}`) for task lists and phases, (3) conditionals (`{{#if}}`) for optional sections, (4) custom helpers for date formatting and pluralization, (5) partials for reusable fragments. The remark/mdast approach is overkill (5+ packages, AST boilerplate). Template literals become unmaintainable with the complexity of tasks.md (TDD phases, acceptance criteria, dependency tables).

### 4. Skill Instruction Updates

**Options considered:**

1. **Skills call Node.js scripts for parsing** — Skills invoke `node scripts/parse-spec.js spec.yaml` to extract data
2. **Skills read YAML directly** — Update skill prompts to read YAML keys instead of grep Markdown headers
3. **Validation as a standalone Node.js CLI command** — `pnpm spec:validate NNN-feature-name`

**Decision:** Hybrid — Skills read YAML directly + Node.js validation command

**Rationale:** Skills (Claude Code agent prompts) can read YAML files natively since YAML is a well-understood format. Simple reads (checking `open_questions`, reading `status.phase`) don't need a script. However, complex validation (completeness, architecture, consistency checks) should be a dedicated Node.js command (`pnpm spec:validate`) that replaces the 50+ grep/awk validation rules currently embedded in `.claude/skills/shep-kit:implement/validation/`. This gives us: (1) testable validation logic, (2) Zod schema validation, (3) clear error messages, (4) reusable across all skills.

## Library Analysis

| Library    | Version | Purpose                            | Pros                                             | Cons                                                |
| ---------- | ------- | ---------------------------------- | ------------------------------------------------ | --------------------------------------------------- |
| js-yaml    | ^4.1.1  | YAML parsing/serialization         | Already installed, lightweight, simple API       | No comment preservation                             |
| zod        | ^4.3.6  | Schema validation + type inference | Already installed, TypeScript-native, composable | Schemas must be maintained alongside YAML templates |
| handlebars | ^4.7.8  | Markdown generation from YAML data | Clean templates, loops/conditionals, partials    | New dependency (~77KB, minimal for CLI)             |

## Decision Log

| #   | Decision            | Chosen                                | Rejected                        | Why                                                                           |
| --- | ------------------- | ------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| 1   | YAML parsing        | js-yaml                               | yaml (npm), custom              | Already installed, sufficient for structured data without comments            |
| 2   | Schema validation   | Zod                                   | JSON Schema, Ajv, custom        | Already installed, TypeScript-first, type inference                           |
| 3   | Markdown generation | Handlebars                            | remark/mdast, template literals | Right balance of power vs. simplicity for spec templates                      |
| 4   | Skill parsing       | Hybrid (direct read + CLI validation) | Scripts-only, direct-only       | Simple reads stay in skills; complex validation becomes testable Node.js code |

## Security Considerations

No security implications identified. This feature modifies only local spec files and developer tooling. No user input is passed to YAML parsing from external sources. Zod validation provides defense-in-depth against malformed spec files.

## Performance Implications

No performance implications identified. Spec parsing and Markdown generation are one-shot operations during development, not runtime paths. Handlebars template compilation is negligible (< 10ms per template).

## Current Parsing Inventory (Migration Scope)

### Skills by parsing complexity

| Skill                    | Current Parsing                        | Migration Effort                            |
| ------------------------ | -------------------------------------- | ------------------------------------------- |
| `shep-kit:new-feature`   | Directory listing only                 | Low — update templates to YAML              |
| `shep-kit:research`      | grep/awk for Open Questions gate check | Low — read `spec.yaml` open_questions field |
| `shep-kit:plan`          | grep/awk for gate check + task count   | Low — read YAML arrays                      |
| `shep-kit:implement`     | 50+ grep/awk validation rules          | High — replace with `pnpm spec:validate`    |
| `shep-kit:commit-pr`     | Reads feature.yaml only                | None — already YAML                         |
| `shep-kit:parallel-task` | Uses init-feature.sh                   | Low — update script                         |
| `shep-kit:merged`        | Reads feature.yaml only                | None — already YAML                         |

### Current patterns being replaced

| Pattern            | Current (Markdown)                         | New (YAML)                                      |
| ------------------ | ------------------------------------------ | ----------------------------------------------- |
| Section existence  | `grep -q "^## Problem Statement"`          | Check key exists in parsed object               |
| Checkbox status    | `grep "^- \[ \]"` in awk-extracted section | `spec.open_questions.filter(q => !q.resolved)`  |
| Task count         | `grep -c "^## Task [0-9]"`                 | `tasks.length`                                  |
| Section extraction | `awk '/^## Section/,/^##[^#]/'`            | Direct key access: `spec.success_criteria`      |
| Table parsing      | `awk -F'\|' '{print $2}'`                  | Array of objects: `spec.affected_areas[0].area` |
| Task dependencies  | `grep -oP "task-\d+"` in task sections     | `task.dependencies: ['task-1', 'task-2']`       |

## YAML Schema Design (Preview)

### spec.yaml structure

```yaml
feature:
  name: 'feature-name'
  number: 11
  created: '2026-02-10'
  branch: 'feat/011-feature-name'
  phase: 'requirements'
  one_liner: 'Brief description'

problem_statement: |
  Multi-line problem description...

success_criteria:
  - id: 'sc-1'
    description: 'Criterion text'
    done: false

affected_areas:
  - area: '.claude/skills/shep-kit:*/'
    impact: 'high'
    reasoning: 'All skills need updated parsing'

dependencies: []

size_estimate:
  size: 'L'
  reasoning: 'Touches all shep-kit skills...'

open_questions: []
# OR:
# open_questions:
#   - question: "Should we migrate existing specs?"
#     resolved: true
#     answer: "No, new specs only"
```

### tasks.yaml structure

```yaml
phases:
  - id: 'phase-1'
    name: 'Foundation'
    parallel: false
    tasks:
      - id: 'task-1'
        title: 'Define YAML schemas with Zod'
        description: 'Create Zod schemas for spec, research, plan, tasks'
        state: 'todo'
        dependencies: []
        acceptance_criteria:
          - 'Zod schemas defined for all 4 spec types'
          - 'TypeScript types inferred from schemas'
        tdd:
          red:
            - 'Write tests for schema validation with valid/invalid data'
          green:
            - 'Implement Zod schemas that pass tests'
          refactor:
            - 'Extract shared schema fragments'
        estimated_effort: 'M'
```

## Open Questions

All questions resolved.

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
