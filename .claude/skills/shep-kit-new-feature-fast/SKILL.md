---
name: shep-kit:new-feature-fast
description: Fast-track feature creation that collapses new-feature, research, and planning into a single autonomous pass. Produces all spec YAMLs (spec, research, plan, tasks, feature) in one go with minimal user interaction. Triggers include "quick feature", "fast feature", "rapid spec", or explicit /shep-kit:new-feature-fast invocation.
---

# Fast-Track Feature Specification

Collapse the full `new-feature → research → plan` pipeline into a single autonomous pass. Produces **all the same YAML artifacts** as the full pipeline but with minimal user interaction (0-2 clarifying questions max).

**Full workflow guide:** [docs/development/spec-driven-workflow.md](../../../docs/development/spec-driven-workflow.md)

## When to Use

- Feature scope is well-understood from the one-liner description
- You want to skip the multi-step interactive flow
- You want to get to implementation quickly

## When NOT to Use

- Highly ambiguous features requiring extensive discovery
- Features with many open questions or unknowns
- When you specifically need deep library evaluation with benchmarks

## Input

The user provides a feature description inline:

```
/shep-kit:new-feature-fast add unit tests to backend services
```

If no description is provided, ask for a one-liner description. That is the **only** mandatory question.

## Workflow

### Phase 1: Scaffold

#### 1.1 Derive Feature Name

Extract a kebab-case feature name from the user's description. Do NOT ask — infer it.

Examples:

- "add unit tests to backend" → `backend-unit-tests`
- "implement dark mode toggle" → `dark-mode-toggle`
- "fix memory leak in agent runner" → `agent-runner-memory-fix`

#### 1.2 Create Branch & Directory

```bash
# Determine next spec number
NEXT_NUM=$(ls -d .shep/specs/[0-9][0-9][0-9]-* specs/[0-9][0-9][0-9]-* 2>/dev/null | sort | tail -1 | grep -oP '^\d{3}' | xargs -I{} printf "%03d" $(({} + 1)))
# If no specs exist, use 001
[ -z "$NEXT_NUM" ] && NEXT_NUM="001"

FEATURE_NAME="<derived-kebab-case>"

# Create branch from main
git checkout main && git pull
git checkout -b "feat/${NEXT_NUM}-${FEATURE_NAME}"

# Run scaffolding (creates all template files)
.claude/skills/shep-kit-new-feature/scripts/init-feature.sh "$NEXT_NUM" "$FEATURE_NAME"
```

This reuses the existing init script — same templates, same directory structure.

### Phase 2: Deep Analysis (Silent)

Before writing any YAML, perform thorough codebase analysis. This is the foundation for ALL subsequent YAML files. Do NOT show analysis to user — go straight to writing.

Analyze:

- **Architecture**: Read `CLAUDE.md`, `AGENTS.md`, key source directories
- **Existing specs**: Read `.shep/specs/*/spec.yaml` (or `specs/*/spec.yaml` for legacy) for dependencies and landscape
- **Affected code**: Identify files, modules, patterns relevant to the feature
- **Testing patterns**: Check existing test structure, frameworks, conventions
- **Domain models**: Check TypeSpec definitions if relevant (`tsp/`)

#### Clarifying Questions (0-2 max)

After analysis, if something is **genuinely ambiguous** and would lead to a fundamentally different spec, ask **at most 1-2 quick questions**. Use `AskUserQuestion` with concrete options inferred from the codebase.

**Do NOT ask about:**

- Things you can infer from codebase analysis
- Style/naming preferences (follow existing conventions)
- Technology choices that are already decided by the stack

**Examples of valid questions:**

- "Should this cover only unit tests or also integration tests?" (scope ambiguity)
- "Should this target the agent system or the CLI layer?" (area ambiguity)

### Phase 3: Write All YAMLs

Write all YAML files in sequence. Each file should be concise but **complete** — no placeholder values, no `{{TEMPLATE}}` markers, no `TBD` entries.

#### 3.1 Write `spec.yaml`

Fill in ALL fields with real values:

- `name`, `number`, `branch`, `oneLiner`, `summary` — from user input + analysis
- `phase`: `Requirements`
- `sizeEstimate` — inferred from scope (S/M/L/XL)
- `relatedFeatures` — from scanning existing specs
- `technologies` — from codebase analysis
- `openQuestions: []` — **MUST be empty** (resolve everything inline)
- `content` section with:
  - **Problem Statement** — concise, from user description
  - **Success Criteria** — 3-6 measurable criteria
  - **Affected Areas** — table with area, impact level, reasoning
  - **Dependencies** — on other features or external systems
  - **Size Estimate** — with reasoning

#### 3.2 Write `research.yaml`

Fill in ALL fields:

- `summary` — one-line research summary
- `decisions[]` — each with `title`, `chosen`, `rejected[]`, `rationale`
- `technologies` — libraries/tools involved
- `openQuestions: []` — **MUST be empty**
- `content` section with:
  - **Technology Decisions** — each decision with options considered, chosen, rationale
  - **Library Analysis** — table if new libraries are involved (skip if using existing stack only)
  - **Security Considerations** — or "No security implications identified"
  - **Performance Implications** — or "No performance implications identified"

**Keep it focused:** If the feature uses only existing stack/patterns, the research section can be brief. Don't fabricate decisions where none exist.

#### 3.3 Write `plan.yaml`

Fill in ALL fields:

- `phases[]` — each with `id`, `name`, `parallel`, `taskIds`
- `filesToCreate[]` — new files with paths
- `filesToModify[]` — existing files to change
- `openQuestions: []` — **MUST be empty**
- `content` section with:
  - **Architecture Overview** — ASCII diagram or description of how components connect
  - **Implementation Strategy** — high-level walkthrough of phases and their ordering rationale
  - **Files to Create/Modify** — tables
  - **Testing Strategy (TDD: Tests FIRST)** — what tests at each layer
  - **Risk Mitigation** — table of risks and mitigations

**MANDATORY TDD:** Every implementation phase with executable code MUST define RED-GREEN-REFACTOR cycles.

**NO duplication with tasks.yaml:** plan.yaml covers architecture and strategy. Task-level detail lives only in tasks.yaml.

#### 3.4 Write `tasks.yaml`

Fill in ALL fields:

- `tasks[]` — each task with:
  - `id` — `task-1`, `task-2`, etc.
  - `title` — clear, actionable title
  - `description` — what this task accomplishes
  - `state`: `Todo`
  - `dependencies[]` — task IDs this depends on
  - `acceptanceCriteria[]` — specific, verifiable criteria
  - `tdd` — for implementation tasks:
    - `red[]` — tests to write first
    - `green[]` — minimal implementation
    - `refactor[]` — cleanup steps
  - `tdd: null` — for foundational/config tasks without tests
  - `estimatedEffort` — S/M/L
- `totalEstimate` — overall effort
- `openQuestions: []`
- `content` section — brief summary + acceptance checklist only

#### 3.5 Update `feature.yaml`

Update to reflect planning-complete state:

```yaml
feature:
  id: '<FEATURE_ID>'
  name: '<FEATURE_NAME>'
  number: <NUMBER>
  branch: 'feat/<NNN>-<FEATURE_NAME>'
  lifecycle: 'implementation'
  createdAt: '<TIMESTAMP>'

status:
  phase: 'ready-to-implement'
  progress:
    completed: 0
    total: <task_count> # count from tasks.yaml tasks[] array
    percentage: 0
  currentTask: null
  lastUpdated: '<TIMESTAMP>'
  lastUpdatedBy: 'shep-kit:new-feature-fast'

validation:
  lastRun: null
  gatesPassed: []
  autoFixesApplied: []

tasks:
  current: null
  blocked: []
  failed: []

checkpoints:
  - phase: 'feature-created'
    completedAt: '<TIMESTAMP>'
    completedBy: 'shep-kit:new-feature-fast'
  - phase: 'research-complete'
    completedAt: '<TIMESTAMP>'
    completedBy: 'shep-kit:new-feature-fast'
  - phase: 'plan-complete'
    completedAt: '<TIMESTAMP>'
    completedBy: 'shep-kit:new-feature-fast'

errors:
  current: null
  history: []
```

### Phase 4: Commit

```bash
# Stage and commit everything
git add .shep/specs/<NNN>-<FEATURE_NAME>/
git commit -m "feat(specs): add <NNN>-<FEATURE_NAME> fast-track specification"
```

### Phase 5: Summary & Next Steps

Display a concise summary:

```
Fast-track spec complete for <NNN>-<FEATURE_NAME>!

Artifacts created:
  - spec.yaml     — requirements & success criteria
  - research.yaml — technical decisions
  - plan.yaml     — architecture & TDD phases
  - tasks.yaml    — <N> tasks across <M> phases
  - feature.yaml  — ready-to-implement

Branch: feat/<NNN>-<FEATURE_NAME>
```

Then ask the user:

> Continue to `/shep-kit:implement` to start autonomous implementation?

- If **yes**: invoke `/shep-kit:implement`
- If **no**: stop here, user reviews first

## Quality Requirements

Even though this is "fast", the output MUST meet these standards:

1. **No placeholders** — every field has a real, inferred value
2. **No open questions** — all `openQuestions` arrays are empty `[]`
3. **TDD cycles defined** — every implementation task has `red/green/refactor`
4. **Acceptance criteria** — every task has specific, verifiable criteria
5. **Dependencies mapped** — task dependencies and feature relationships identified
6. **Files identified** — `filesToCreate` and `filesToModify` are populated
7. **Consistent** — task IDs in `tasks.yaml` match `taskIds` in `plan.yaml` phases

## What This Skill Does NOT Do

- Skip TDD requirements (still mandatory)
- Produce lower-quality specs (same schema, same required fields)
- Replace the full pipeline for complex/ambiguous features
- Run implementation (that's `/shep-kit:implement`)

## Key Differences from Full Pipeline

| Aspect                     | Full Pipeline                       | Fast                     |
| -------------------------- | ----------------------------------- | ------------------------ |
| User interaction           | Multi-step Q&A per phase            | 0-2 questions total      |
| Gate checks between phases | Explicit stop + user resumes        | No stops, continuous     |
| Commits                    | One per phase (3-4 commits)         | Single commit            |
| Open questions             | Can leave unresolved between phases | Must resolve inline      |
| Depth                      | Deep library eval, benchmarks       | Focused on key decisions |
| Speed                      | 4 separate skill invocations        | 1 skill invocation       |
| Artifacts produced         | Identical                           | Identical                |
| TDD requirement            | Mandatory                           | Mandatory                |
| feature.yaml protocol      | Followed                            | Followed                 |

## Template & Script Reuse

This skill reuses assets from `shep-kit:new-feature`:

- **Init script**: `.claude/skills/shep-kit-new-feature/scripts/init-feature.sh`
- **Templates**: `.claude/skills/shep-kit-new-feature/templates/`
  No additional templates or scripts needed.
