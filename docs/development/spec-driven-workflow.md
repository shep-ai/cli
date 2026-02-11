# Spec-Driven Development Workflow

This document is the **single source of truth** for Shep AI's spec-driven development workflow. All contributors (human and AI) must follow this workflow for feature development.

## Overview

Shep-kit is our spec-driven development toolkit inspired by [GitHub's SpecKit](https://github.com/github/spec-kit). Every feature begins with a specification before any implementation code is written.

```
/shep-kit:new-feature → /shep-kit:research → /shep-kit:plan → /shep-kit:implement → /shep-kit:commit-pr
```

## YAML-First Approach

Starting with spec 011, **YAML files are the source of truth** for all spec artifacts. Markdown files are **auto-generated** from YAML and should not be edited manually.

| Source of Truth (edit these) | Generated (do not edit) |
| ---------------------------- | ----------------------- |
| `spec.yaml`                  | `spec.md`               |
| `research.yaml`              | `research.md`           |
| `plan.yaml`                  | `plan.md`               |
| `tasks.yaml`                 | `tasks.md`              |
| `feature.yaml`               | _(not generated)_       |

Each YAML file uses a **content + metadata hybrid** structure:

- **Metadata fields** — Structured attributes (`name`, `summary`, `technologies`, `openQuestions`, etc.) that skills and scripts can read programmatically without parsing Markdown.
- **`content` field** — Raw Markdown body containing the human-written spec content. This preserves the full expressiveness of Markdown (tables, diagrams, code blocks).

Example structure of a `spec.yaml`:

```yaml
name: my-feature
number: 12
branch: feat/012-my-feature
oneLiner: Short description of the feature
summary: >
  Longer summary spanning multiple lines.
phase: Research
sizeEstimate: M
technologies:
  - TypeSpec
  - Node.js
relatedFeatures:
  - 008-agent-configuration
openQuestions: []

content: |
  ## Problem Statement

  Description of the problem...

  ## Success Criteria

  - Criterion one
  - Criterion two
```

### Spec Scripts

Two pnpm scripts support the YAML-first workflow:

- **`pnpm spec:generate-md <feature-dir>`** — Reads all YAML spec files in a feature directory and generates corresponding Markdown files with YAML front matter + the `content` field body. Generated Markdown is committed to git for human readability in PRs.
- **`pnpm spec:validate <feature-dir>`** — Validates spec quality gates against YAML data: completeness (required files/keys, open questions resolved), architecture compliance (TDD phases, TypeSpec references), and cross-document consistency (task counts, dependency validation).

**Note:** Specs 001-010 remain in their original Markdown format. Only specs 011+ use the YAML-first approach.

## Why Spec-Driven?

1. **Clarity before code**: Requirements are explicit, not discovered during implementation
2. **Dependencies visible**: Cross-feature dependencies are documented upfront
3. **Knowledge preserved**: Specs persist even when contributors change
4. **AI-optimized**: Agents work better with structured context — YAML metadata enables direct field access instead of fragile Markdown parsing
5. **Review-friendly**: PRs reference specs; auto-generated Markdown ensures readability

## Directory Structure

```
specs/                              # Root-level spec directory
├── 001-feature-name/               # Legacy (Markdown-first, specs 001-010)
│   ├── spec.md                     # Requirements & scope
│   ├── research.md                 # Technical decisions
│   ├── plan.md                     # Implementation strategy
│   ├── tasks.md                    # Task breakdown
│   ├── feature.yaml                # Status tracking
│   ├── data-model.md               # Entity changes (if needed)
│   └── contracts/                  # API specs (if needed)
├── 011-feature-name/               # YAML-first (specs 011+)
│   ├── spec.yaml                   # Requirements & scope (SOURCE OF TRUTH)
│   ├── research.yaml               # Technical decisions (SOURCE OF TRUTH)
│   ├── plan.yaml                   # Implementation strategy (SOURCE OF TRUTH)
│   ├── tasks.yaml                  # Task breakdown (SOURCE OF TRUTH)
│   ├── feature.yaml                # Status tracking
│   ├── spec.md                     # Auto-generated from spec.yaml
│   ├── research.md                 # Auto-generated from research.yaml
│   ├── plan.md                     # Auto-generated from plan.yaml
│   ├── tasks.md                    # Auto-generated from tasks.yaml
│   ├── data-model.md               # Entity changes (if needed)
│   └── contracts/                  # API specs (if needed)
└── ...
```

## The Workflow

### Step 1: New Feature (`/shep-kit:new-feature`)

**Trigger**: Starting any new feature, functionality, or enhancement.

**What happens:**

1. Provide feature name (kebab-case) and one-liner description
2. Branch `feat/NNN-feature-name` created from main
3. Spec directory scaffolded with YAML templates
4. Agent analyzes codebase and existing specs
5. Agent proposes spec content (affected areas, dependencies, size)
6. You review and adjust the YAML spec file
7. Markdown auto-generated via `pnpm spec:generate-md`
8. spec.yaml and spec.md committed to feature branch

**Output**: `specs/NNN-feature-name/spec.yaml` (source of truth) + `spec.md` (auto-generated)

### Step 2: Research (`/shep-kit:research`)

**Trigger**: After spec.yaml is complete, before planning.

**What happens:**

1. Agent reads `spec.yaml` to understand requirements (metadata fields + content)
2. Identifies technical decisions needed
3. Researches options (libraries, patterns, approaches)
4. Documents trade-offs and recommendations in `research.yaml`
5. You review decisions

**Output**: `specs/NNN-feature-name/research.yaml` (source of truth) + `research.md` (auto-generated)

### Step 3: Plan (`/shep-kit:plan`)

**Trigger**: After research is complete, before implementation.

**CRITICAL TDD REQUIREMENT:** Plans MUST follow Test-Driven Development with RED-GREEN-REFACTOR cycles for all implementation phases.

**What happens:**

1. Agent reads `spec.yaml` and `research.yaml`
2. Designs architecture (components, data flow)
3. Breaks into implementation phases **following TDD**:
   - **Foundational phases** (no tests): Build pipeline, TypeSpec models, configuration
   - **TDD Cycle phases**: For each layer:
     - **RED**: Define tests to write FIRST
     - **GREEN**: Define minimal implementation to pass
     - **REFACTOR**: Identify cleanup opportunities
4. Identifies files to create/modify
5. Creates task breakdown with **RED-GREEN-REFACTOR** structure in `tasks.yaml`
6. Defines testing strategy (tests FIRST, never after implementation)

**Output**:

- `specs/NNN-feature-name/plan.yaml` - Architecture and TDD-compliant strategy (source of truth)
- `specs/NNN-feature-name/tasks.yaml` - TDD task breakdown (source of truth)
- `specs/NNN-feature-name/plan.md` + `tasks.md` - Auto-generated Markdown
- `specs/NNN-feature-name/data-model.md` - Entity changes (if needed)

### Step 4: Implement (`/shep-kit:implement`)

**Trigger**: After plan and tasks are complete, ready to write code.

**What happens:**

1. **Pre-Implementation Validation Gate** (automatic):

   - Runs `pnpm spec:validate` against the YAML spec files
   - Completeness check (all YAML files present, required keys populated, `openQuestions` resolved)
   - Architecture validation (Clean Architecture, TypeSpec-first, TDD phases defined in `plan.yaml`)
   - Cross-document consistency (task counts match between `plan.yaml` and `tasks.yaml`, no contradictions)
   - Auto-fixes safe structural issues
   - **Blocks if critical issues found** (must be fixed in the YAML source files)

2. **Smart Session Resumption**:

   - Reads `feature.yaml` to determine current state
   - Shows progress summary (7/12 tasks complete, etc.)
   - Validates previous work (tests pass, build succeeds)
   - Automatically continues from last task

3. **Autonomous Task Execution**:

   - Executes tasks from `tasks.yaml` sequentially
   - **Follows TDD discipline strictly** (RED→GREEN→REFACTOR)
   - Runs verification after each task (tests, build, typecheck, lint)
   - Updates `feature.yaml` after each task completion
   - Self-corrects errors with bounded retry (max 3 attempts)

4. **Error Handling**:

   - Captures error details
   - Runs systematic debugging
   - Attempts fix (up to 3 times)
   - Stops and reports if unresolvable
   - Updates `feature.yaml` with error state

5. **Completion**:
   - Updates `feature.yaml` (phase: "ready-for-review")
   - Adds checkpoint "implementation-complete"
   - Reports summary to user

**Output**:

- All code changes implementing the feature
- Updated `feature.yaml` with progress tracking
- All tests passing, build successful

**Status Tracking**: `feature.yaml` is updated continuously throughout implementation. See [feature.yaml Protocol](./feature-yaml-protocol.md) for details.

**Full Guide**: See [Implementation Guide](./implementation-guide.md) for detailed manual implementation instructions (if not using :implement skill).

### Step 5: Commit & Create PR (`/shep-kit:commit-pr`)

**Trigger**: After implementation is complete, ready to submit for review.

**What happens:**

1. Stage and commit all changes
2. Push to remote
3. Create PR with `gh pr create`
4. **Update `feature.yaml`** (phase: "in-review", add PR URL)
5. Watch CI with `gh run watch --exit-status`
6. If CI fails: fix, push, watch again (loop until green)
7. **Watch for review comments** (bot and human) via `gh api`
8. **Autonomous review loop**: If actionable comments found, apply fixes, commit, push, watch CI again, and repeat (max 5 iterations)
9. Report PR URL when approved or no remaining issues

**Note:** After CI passes, the skill autonomously watches for Claude Code bot and human reviewer comments. It fetches reviews from all GitHub API sources, classifies comments as actionable or non-actionable, applies fixes, and loops until the PR is approved or no actionable feedback remains. See the [feature.yaml Protocol](./feature-yaml-protocol.md) for review loop state tracking.

**Output**: Pull request approved (or ready for manual review if max iterations reached)

### Step 6: Cleanup After Merge (`/shep-kit:merged`)

**Trigger**: After PR is merged to main.

**What happens:**

1. **Update `feature.yaml`** (phase: "complete", add merge timestamp)
2. Commit feature.yaml update to main
3. Switch to main branch
4. Pull latest changes
5. Delete local feature branch

**Output**: Clean workspace, feature marked as complete

## Spec File Formats

All spec artifacts (except `feature.yaml` and `data-model.md`) use the **content + metadata hybrid** YAML format. Each YAML file contains:

- **Structured metadata fields** at the top level — machine-readable attributes that skills and validation scripts access directly (e.g., `openQuestions`, `technologies`, `tasks`)
- **`content` field** — a raw Markdown string containing the human-written spec body

When Markdown is generated (via `pnpm spec:generate-md`), the metadata fields become YAML front matter and the `content` field becomes the Markdown body.

### spec.yaml

Core requirements document. Metadata fields:

- `name`, `number`, `branch`, `oneLiner`, `summary`
- `phase` (current SDLC lifecycle phase)
- `sizeEstimate` (S/M/L/XL)
- `technologies`, `relatedFeatures`, `relatedLinks`
- `openQuestions` (array of `{question, resolved, answer?}`)

The `content` field contains: problem statement, success criteria, affected areas, dependencies.

### research.yaml

Technical decisions document. Metadata fields:

- `name`, `summary`
- `decisions` (array of `{title, chosen, rejected[], rationale}`)
- `technologies`, `relatedFeatures`, `relatedLinks`
- `openQuestions`

The `content` field contains: detailed analysis, library comparisons, security/performance considerations.

### plan.yaml

Implementation strategy. Metadata fields:

- `name`, `summary`
- `phases` (array of `{id, name, parallel, taskIds[]}`)
- `filesToCreate`, `filesToModify`
- `technologies`, `relatedFeatures`, `relatedLinks`
- `openQuestions`

The `content` field contains: architecture diagrams, phase descriptions with TDD cycles, risk mitigation, rollback plan.

### tasks.yaml

Actionable task list. Metadata fields:

- `name`, `summary`, `totalEstimate`
- `tasks` (array of structured task objects, each with):
  - `id`, `title`, `description`, `state`, `dependencies[]`
  - `acceptanceCriteria[]`
  - `tdd: {red[], green[], refactor[]}` — explicit TDD cycle steps
  - `estimatedEffort`
- `technologies`, `relatedFeatures`, `relatedLinks`
- `openQuestions`

The `content` field contains: task descriptions grouped by phase with TDD structure, parallelization markers `[P]`, acceptance checklist.

**Note**: `tasks.yaml` is the source of truth for task definitions. `feature.yaml` tracks execution status only.

### feature.yaml

Machine-readable status tracking containing:

- Feature metadata (id, name, branch)
- Lifecycle state (research -> planning -> implementation -> review -> complete)
- Progress tracking (completed/total tasks, percentage)
- Current task being worked on
- Validation gates passed
- Checkpoints with timestamps
- Error state (if blocked)

**Updated by ALL shep-kit skills** as work progresses. See [feature.yaml Protocol](./feature-yaml-protocol.md).

**Note**: `feature.yaml` does NOT use the content + metadata hybrid pattern. It is purely structured YAML for status tracking.

### data-model.md

Entity changes (when needed) containing:

- New entities with TypeSpec structure
- Modified entities
- New enums/value objects

## Branch & Numbering Convention

- **Branch format**: `feat/NNN-feature-name`
- **Spec directory**: `specs/NNN-feature-name/`
- **Numbering**: Sequential (001, 002, 003...)
- **Names**: kebab-case (e.g., `user-authentication`, `payment-integration`)

The next number is determined by scanning existing `specs/` directories.

## Dependency Discovery

When creating a new spec, the agent scans all existing spec files (`specs/*/spec.yaml` for YAML-first specs, `specs/*/spec.md` for legacy specs) to:

- Understand the feature landscape
- Identify potential dependencies (via `relatedFeatures` metadata in YAML specs)
- Avoid duplicate work
- Maintain consistency

## Best Practices

### DO

- Start every feature with `/shep-kit:new-feature`
- Edit YAML source files (`spec.yaml`, `research.yaml`, etc.) — never edit auto-generated Markdown
- Run `pnpm spec:generate-md` after editing YAML to regenerate Markdown
- Run `pnpm spec:validate` before implementation to catch issues early
- Review agent-proposed specs before accepting
- Update YAML specs when requirements change
- Reference spec in PR descriptions
- Keep specs in sync with implementation

### DON'T

- Skip the spec phase for "quick" features
- Implement without a plan
- **Manually edit auto-generated Markdown files** (changes will be overwritten)
- **Write implementation before tests** (violates TDD)
- Skip RED phase and go straight to implementation
- Leave specs outdated after implementation
- Create specs without the skill (use the templates)

## Integration with Existing Workflow

Spec-driven development integrates with our existing practices:

| Existing Practice    | Integration                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| TDD (MANDATORY)      | Plan phase MANDATES RED-GREEN-REFACTOR cycles; `tasks.yaml` breaks down TDD phases explicitly       |
| Clean Architecture   | Spec identifies which layers are affected; each layer has TDD cycle                                 |
| TypeSpec models      | Spec artifacts are defined as TypeSpec entities; data-model.md defines entity changes for tsp/      |
| Conventional Commits | Spec commits: `feat(specs): add NNN-feature-name specification`                                     |
| PR Process           | PRs reference their spec directory; auto-generated Markdown ensures readability in GitHub           |
| YAML-first           | YAML is source of truth; `pnpm spec:validate` replaces fragile grep/awk validation in skill prompts |

## Skill Locations

Skills are located at:

```
.cursor/skills/
├── shep-kit:new-feature/
│   ├── SKILL.md
│   ├── templates/
│   ├── examples/
│   └── scripts/
├── shep-kit:research/
│   ├── SKILL.md
│   ├── templates/
│   └── examples/
├── shep-kit:plan/
│   ├── SKILL.md
│   ├── templates/
│   └── examples/
├── shep-kit:implement/       # NEW
│   ├── SKILL.md
│   ├── validation/
│   └── examples/
├── shep-kit:commit-pr/
│   └── SKILL.md
└── shep-kit:merged/
    └── SKILL.md
```

## Quick Reference

| Command                 | Purpose                    | Output (YAML source + generated MD)                |
| ----------------------- | -------------------------- | -------------------------------------------------- |
| `/shep-kit:new-feature` | Start new feature          | Branch + `spec.yaml` + `spec.md`                   |
| `/shep-kit:research`    | Technical analysis         | `research.yaml` + `research.md`                    |
| `/shep-kit:plan`        | Implementation plan        | `plan.yaml` + `tasks.yaml` + generated `.md` files |
| `/shep-kit:implement`   | Autonomous implementation  | Code + passing tests + updated `feature.yaml`      |
| `/shep-kit:commit-pr`   | Commit, push, PR, watch CI | Pull request (CI green)                            |
| `/shep-kit:merged`      | Post-merge cleanup         | Clean workspace                                    |

| Script                  | Purpose                                       |
| ----------------------- | --------------------------------------------- |
| `pnpm spec:generate-md` | Generate Markdown from YAML spec files        |
| `pnpm spec:validate`    | Validate spec quality gates against YAML data |

---

## Maintaining This Document

**Update when:**

- Workflow changes
- New skill added to shep-kit
- Template structure changes
- Best practices evolve

**Related docs:**

- [feature.yaml Protocol](./feature-yaml-protocol.md) - Status tracking reference
- [Implementation Guide](./implementation-guide.md) - Manual implementation discipline
- [TDD Guide](./tdd-guide.md) - Test-Driven Development best practices
- [CONTRIBUTING.md](../../CONTRIBUTING.md)
- [CONTRIBUTING-AGENTS.md](../../CONTRIBUTING-AGENTS.md)
- [CLAUDE.md](../../CLAUDE.md)
