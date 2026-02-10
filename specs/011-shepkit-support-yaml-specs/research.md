# Research: shepkit-support-yaml-specs

> Technical analysis for 011-shepkit-support-yaml-specs

## Status

- **Phase:** Planning
- **Updated:** 2026-02-10

## Technology Decisions

### 1. Spec Artifact Modeling — TypeSpec-First

**Options considered:**

1. **Zod schemas** — Define YAML structure with Zod, infer TypeScript types
2. **JSON Schema** — Language-agnostic schema validation
3. **TypeSpec models** — Extend existing domain model architecture, generate TypeScript types

**Decision:** TypeSpec models

**Rationale:** The project already follows a TypeSpec-first architecture where domain models are the single source of truth (`tsp/domain/entities/`). Creating spec artifact models in TypeSpec aligns with the existing pattern: define `.tsp` → generate TypeScript via `pnpm tsp:compile` → import from `@/domain/generated/output`. This avoids maintaining a separate schema system (Zod) alongside TypeSpec, keeps the domain model layer consistent, and gives us TypeScript types, JSON Schema, and OpenAPI specs for free from one source.

### 2. Spec Artifact Structure — Content + Metadata

**Options considered:**

1. **Fully structured YAML** — Every Markdown section becomes a YAML key (problem_statement, success_criteria, etc.)
2. **Content + metadata hybrid** — Each artifact has a `content` field (raw Markdown) plus structured metadata attributes
3. **Pure metadata only** — Only store structured data, generate all Markdown from metadata

**Decision:** Content + metadata hybrid

**Rationale:** Each spec artifact (spec, research, plan, tasks) is modeled as a TypeSpec entity with:

- **`content: string`** — Raw Markdown body (the human-written spec content). This IS the spec.
- **Metadata fields** — Structured attributes for `name`, `summary`, related features, technologies, links, etc.

This approach means:

- Markdown generation is trivial — just output the `content` field with a metadata header
- Skills read metadata fields for gate checks (e.g., `openQuestions` array) without parsing Markdown
- The content field preserves full expressiveness of Markdown (tables, diagrams, code blocks)
- No complex template engine needed — no Handlebars, no remark/mdast

### 3. Markdown Generation — Direct Content Field

**Options considered:**

1. **Handlebars templates** — Compile YAML data into Markdown via template engine
2. **remark/mdast AST** — Programmatic Markdown construction
3. **Direct content field** — YAML `content` field IS the Markdown; generation = metadata header + content

**Decision:** Direct content field (no template engine needed)

**Rationale:** Since each artifact's `content` field contains the raw Markdown, "generating" Markdown is simply:

```
---
name: <metadata.name>
summary: <metadata.summary>
# ... other metadata as YAML front matter
---

<content field>
```

This eliminates the need for Handlebars or any template engine. The generated `.md` file is just YAML front matter + the content field. Simple string concatenation in a Node.js script suffices.

### 4. YAML Parsing Library

**Options considered:**

1. **js-yaml** — Already in project (v4.1.1), lightweight, no comment preservation
2. **yaml (npm)** — Comment preservation, round-trip editing, Document API
3. **Custom parser** — Roll our own

**Decision:** js-yaml (already a dependency)

**Rationale:** The project already uses `js-yaml` in `src/presentation/cli/ui/output.ts`. Since YAML spec files are structured data (no need for comment preservation — comments live in the Markdown content), `js-yaml.load()` and `js-yaml.dump()` are sufficient. No new dependency needed.

### 5. Validation Approach — TypeSpec-Generated Types + Simple Node.js Checks

**Options considered:**

1. **Zod runtime validation** — Define Zod schemas, validate parsed YAML at runtime
2. **TypeSpec-generated types + type guards** — Use generated TypeScript types for validation
3. **JSON Schema validation** — Use TypeSpec-generated JSON Schema with Ajv

**Decision:** TypeSpec-generated types + simple Node.js validation script

**Rationale:** TypeSpec already generates JSON Schema to `apis/json-schema/` and TypeScript types to `src/domain/generated/output.ts`. For runtime validation, a lightweight Node.js script can:

1. Parse YAML with `js-yaml`
2. Validate against the generated TypeScript types (compile-time safety)
3. Run semantic checks (open questions resolved, task dependencies valid, etc.)

This replaces the 50+ grep/awk validation rules in `.claude/skills/shep-kit:implement/validation/` with testable, typed Node.js code. No Zod needed since TypeSpec already generates the type definitions.

### 6. Skill Instruction Updates — Direct YAML Reading

**Options considered:**

1. **Skills call Node.js scripts** — Invoke `node scripts/parse-spec.js` for every read
2. **Skills read YAML directly** — Update skill prompts to read YAML keys
3. **Hybrid** — Direct reads for simple checks, scripts for complex validation

**Decision:** Skills read YAML directly + `pnpm spec:validate` for complex checks

**Rationale:** Claude Code agents can natively read and understand YAML files. Simple gate checks (is `openQuestions` empty? what's the current `phase`?) are trivial to read from YAML without invoking a script. Complex validation (completeness, architecture compliance, cross-doc consistency) runs via `pnpm spec:validate NNN-feature-name`.

## TypeSpec Model Design

### Base Model — SpecArtifactBase

Common fields shared across all spec artifact types, extracted into a base entity.

```
model SpecArtifactBase extends BaseEntity {
  name: string;                    // Artifact title / feature name
  summary: string;                 // Short description
  content: string;                 // Raw Markdown body (the human-written spec content)
  technologies: string[];          // Key technologies mentioned/evaluated
  relatedFeatures: string[];       // References to other spec IDs (e.g., "008-agent-configuration")
  relatedLinks: string[];          // URLs to docs, references, comparisons
  openQuestions: OpenQuestion[];    // Structured open questions for gate checks
}
```

**Rationale:** All four artifact types share these 7 fields. Extracting them into `SpecArtifactBase` avoids duplication and ensures consistent metadata across spec types. Each concrete artifact extends this base with type-specific fields.

### Concrete Entities (one file per model in `tsp/domain/entities/`)

#### FeatureSpec

Represents the feature specification artifact (`spec.yaml`).

```
model FeatureSpec extends SpecArtifactBase {
  number: int32;             // Spec number (e.g., 11)
  branch: string;            // Git branch name
  oneLiner: string;          // One-line description
  phase: SdlcLifecycle;      // Current phase
  sizeEstimate: string;      // S/M/L/XL
}
```

#### ResearchSpec

Represents the research artifact (`research.yaml`).

```
model ResearchSpec extends SpecArtifactBase {
  decisions: TechDecision[]; // Structured technology decisions
}
```

#### PlanSpec

Represents the implementation plan artifact (`plan.yaml`).

```
model PlanSpec extends SpecArtifactBase {
  phases: PlanPhase[];       // Structured implementation phases
  filesToCreate: string[];   // New files planned
  filesToModify: string[];   // Existing files to change
}
```

#### TasksSpec

Represents the task breakdown artifact (`tasks.yaml`).

```
model TasksSpec extends SpecArtifactBase {
  tasks: SpecTask[];         // Structured task list
  totalEstimate: string;     // Overall effort estimate
}
```

### Supporting Value Objects

```
model OpenQuestion {
  question: string;
  resolved: boolean;
  answer?: string;
}

model TechDecision {
  title: string;
  chosen: string;
  rejected: string[];
  rationale: string;
}

model PlanPhase {
  id: string;
  name: string;
  parallel: boolean;
  taskIds: string[];       // References to SpecTask.id
}

model SpecTask {
  id: string;
  title: string;
  description: string;
  state: TaskState;
  dependencies: string[];  // Other SpecTask IDs
  acceptanceCriteria: string[];
  tdd: TddCycle;
  estimatedEffort: string;
}

model TddCycle {
  red: string[];
  green: string[];
  refactor: string[];
}
```

### YAML File Example (`spec.yaml`)

```yaml
name: shepkit-support-yaml-specs
number: 11
branch: feat/011-shepkit-support-yaml-specs
oneLiner: Support YAML-based spec definitions as the primary source of truth
summary: >
  Adopt YAML as the primary spec format with TypeSpec-generated types,
  replacing fragile grep/awk Markdown parsing with structured data.
phase: Research
sizeEstimate: L

relatedFeatures:
  - 001-shep-kit

technologies:
  - TypeSpec
  - js-yaml
  - Node.js

openQuestions: []

content: |
  ## Problem Statement

  The current spec-driven workflow uses Markdown files as the source of truth...

  ## Success Criteria

  - All shep-kit skills can read/write specs in YAML format
  - Markdown files are auto-generated from YAML content field
  ...

  ## Affected Areas

  | Area | Impact | Reasoning |
  | ---- | ------ | --------- |
  | `.claude/skills/shep-kit:*/` | High | All skills need updated parsing |
  ...
```

### Generated Markdown Output (`spec.md`)

```markdown
---
name: shepkit-support-yaml-specs
number: 11
branch: feat/011-shepkit-support-yaml-specs
phase: Research
sizeEstimate: L
technologies: [TypeSpec, js-yaml, Node.js]
---

## Problem Statement

The current spec-driven workflow uses Markdown files as the source of truth...

## Success Criteria

- All shep-kit skills can read/write specs in YAML format
- Markdown files are auto-generated from YAML content field
  ...
```

## Library Analysis

| Library | Version | Purpose                    | Pros                                       | Cons                                 |
| ------- | ------- | -------------------------- | ------------------------------------------ | ------------------------------------ |
| js-yaml | ^4.1.1  | YAML parsing/serialization | Already installed, lightweight, simple API | No comment preservation (not needed) |

No new libraries required. TypeSpec handles schema/type generation. js-yaml handles YAML parsing.

## Decision Log

| #   | Decision            | Chosen                           | Rejected                             | Why                                                                         |
| --- | ------------------- | -------------------------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| 1   | Spec modeling       | TypeSpec entities                | Zod, JSON Schema                     | Aligns with existing TypeSpec-first architecture                            |
| 2   | Artifact structure  | Content + metadata               | Fully structured YAML, metadata-only | Content preserves Markdown expressiveness; metadata enables machine queries |
| 3   | Markdown generation | Direct content field             | Handlebars, remark/mdast             | No template engine needed — content IS the Markdown                         |
| 4   | YAML parsing        | js-yaml (existing)               | yaml (npm)                           | Already installed, sufficient for structured data                           |
| 5   | Validation          | TypeSpec types + Node.js script  | Zod, JSON Schema + Ajv               | TypeSpec generates types; simple script for semantic checks                 |
| 6   | Skill updates       | Direct YAML reads + CLI validate | Script-only, direct-only             | Simple reads in skills; complex validation via testable Node.js             |

## Security Considerations

No security implications identified. This feature modifies only local spec files and developer tooling. No user input is passed to YAML parsing from external sources.

## Performance Implications

No performance implications identified. Spec parsing and Markdown generation are one-shot operations during development, not runtime paths.

## Current Parsing Inventory (Migration Scope)

### Skills by parsing complexity

| Skill                    | Current Parsing                        | Migration Effort                           |
| ------------------------ | -------------------------------------- | ------------------------------------------ |
| `shep-kit:new-feature`   | Directory listing only                 | Low — update templates to YAML             |
| `shep-kit:research`      | grep/awk for Open Questions gate check | Low — read `spec.yaml` openQuestions field |
| `shep-kit:plan`          | grep/awk for gate check + task count   | Low — read YAML arrays                     |
| `shep-kit:implement`     | 50+ grep/awk validation rules          | High — replace with `pnpm spec:validate`   |
| `shep-kit:commit-pr`     | Reads feature.yaml only                | None — already YAML                        |
| `shep-kit:parallel-task` | Uses init-feature.sh                   | Low — update script                        |
| `shep-kit:merged`        | Reads feature.yaml only                | None — already YAML                        |

### Current patterns being replaced

| Pattern            | Current (Markdown)                         | New (YAML)                                    |
| ------------------ | ------------------------------------------ | --------------------------------------------- |
| Section existence  | `grep -q "^## Problem Statement"`          | Check key exists in parsed object             |
| Checkbox status    | `grep "^- \[ \]"` in awk-extracted section | `spec.openQuestions.filter(q => !q.resolved)` |
| Task count         | `grep -c "^## Task [0-9]"`                 | `tasks.tasks.length`                          |
| Section extraction | `awk '/^## Section/,/^##[^#]/'`            | Direct key access: `spec.content`             |
| Table parsing      | `awk -F'\|' '{print $2}'`                  | Array of objects: `spec.relatedFeatures[0]`   |
| Task dependencies  | `grep -oP "task-\d+"` in task sections     | `task.dependencies: ['task-1', 'task-2']`     |

## Open Questions

All questions resolved.

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
