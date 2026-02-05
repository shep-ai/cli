# Spec-Driven Development Workflow

This document is the **single source of truth** for Shep AI's spec-driven development workflow. All contributors (human and AI) must follow this workflow for feature development.

## Overview

Shep-kit is our spec-driven development toolkit inspired by [GitHub's SpecKit](https://github.com/github/spec-kit). Every feature begins with a specification before any implementation code is written.

```
/shep-kit:new-feature → /shep-kit:research → /shep-kit:plan → /shep-kit:implement → /shep-kit:commit-pr
```

## Why Spec-Driven?

1. **Clarity before code**: Requirements are explicit, not discovered during implementation
2. **Dependencies visible**: Cross-feature dependencies are documented upfront
3. **Knowledge preserved**: Specs persist even when contributors change
4. **AI-optimized**: Agents work better with structured context
5. **Review-friendly**: PRs reference specs for easier understanding

## Directory Structure

```
specs/                              # Root-level spec directory
├── 001-feature-name/
│   ├── spec.md                     # Requirements & scope
│   ├── research.md                 # Technical decisions
│   ├── plan.md                     # Implementation strategy
│   ├── tasks.md                    # Task breakdown
│   ├── feature.yaml                # Status tracking (NEW)
│   ├── data-model.md               # Entity changes (if needed)
│   └── contracts/                  # API specs (if needed)
├── 002-another-feature/
│   └── ...
└── ...
```

## The Workflow

### Step 1: New Feature (`/shep-kit:new-feature`)

**Trigger**: Starting any new feature, functionality, or enhancement.

**What happens:**

1. Provide feature name (kebab-case) and one-liner description
2. Branch `feat/NNN-feature-name` created from main
3. Spec directory scaffolded with templates
4. Agent analyzes codebase and existing specs
5. Agent proposes spec content (affected areas, dependencies, size)
6. You review and adjust
7. spec.md committed to feature branch

**Output**: `specs/NNN-feature-name/spec.md` with requirements

### Step 2: Research (`/shep-kit:research`)

**Trigger**: After spec.md is complete, before planning.

**What happens:**

1. Agent reads spec.md to understand requirements
2. Identifies technical decisions needed
3. Researches options (libraries, patterns, approaches)
4. Documents trade-offs and recommendations
5. You review decisions

**Output**: `specs/NNN-feature-name/research.md` with technical decisions

### Step 3: Plan (`/shep-kit:plan`)

**Trigger**: After research is complete, before implementation.

**CRITICAL TDD REQUIREMENT:** Plans MUST follow Test-Driven Development with RED-GREEN-REFACTOR cycles for all implementation phases.

**What happens:**

1. Agent reads spec.md and research.md
2. Designs architecture (components, data flow)
3. Breaks into implementation phases **following TDD**:
   - **Foundational phases** (no tests): Build pipeline, TypeSpec models, configuration
   - **TDD Cycle phases**: For each layer:
     - **RED**: Define tests to write FIRST
     - **GREEN**: Define minimal implementation to pass
     - **REFACTOR**: Identify cleanup opportunities
4. Identifies files to create/modify
5. Creates task breakdown with **RED-GREEN-REFACTOR** structure
6. Defines testing strategy (tests FIRST, never after implementation)

**Output**:

- `specs/NNN-feature-name/plan.md` - Architecture and TDD-compliant strategy
- `specs/NNN-feature-name/tasks.md` - TDD task breakdown (RED→GREEN→REFACTOR)
- `specs/NNN-feature-name/data-model.md` - Entity changes (if needed)

### Step 4: Implement (`/shep-kit:implement`)

**Trigger**: After plan and tasks are complete, ready to write code.

**What happens:**

1. **Pre-Implementation Validation Gate** (automatic):

   - Basic completeness check (all files present, open questions resolved)
   - Architecture validation (Clean Architecture, TypeSpec-first, TDD phases defined)
   - Cross-document consistency (task counts match, no contradictions)
   - Auto-fixes safe structural issues (missing sections, empty checkboxes)
   - **Blocks if critical issues found** (must be fixed manually)

2. **Smart Session Resumption**:

   - Reads `feature.yaml` to determine current state
   - Shows progress summary (7/12 tasks complete, etc.)
   - Validates previous work (tests pass, build succeeds)
   - Automatically continues from last task

3. **Autonomous Task Execution**:

   - Executes tasks from `tasks.md` sequentially
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

**📖 Full Guide**: See [Implementation Guide](./implementation-guide.md) for detailed manual implementation instructions (if not using :implement skill).

### Step 5: Commit & Create PR (`/shep-kit:commit-pr`)

**Trigger**: After implementation is complete, ready to submit for review.

**What happens:**

1. Stage and commit all changes
2. Push to remote
3. Create PR with `gh pr create`
4. **Update `feature.yaml`** (phase: "in-review", add PR URL)
5. Watch CI with `gh run watch --exit-status`
6. If CI fails: fix, push, watch again (loop until green)
7. Report PR URL when CI is green

**Output**: Pull request ready for code review with passing CI

### Step 6: Cleanup After Merge (`/shep-kit:merged`)

**Trigger**: After PR is merged to main.

**What happens:**

1. **Update `feature.yaml`** (phase: "complete", add merge timestamp)
2. Commit feature.yaml update to main
3. Switch to main branch
4. Pull latest changes
5. Delete local feature branch

**Output**: Clean workspace, feature marked as complete

## Spec File Templates

### spec.md

Core requirements document containing:

- Problem statement
- Success criteria
- Affected areas with impact levels
- Dependencies on other features
- Size estimate (S/M/L/XL)
- Open questions

### research.md

Technical decisions document containing:

- Options considered for each decision
- Chosen approach with rationale
- Library analysis
- Security considerations
- Performance implications

### plan.md

Implementation strategy containing:

- Architecture diagram
- Implementation phases
- Files to create/modify
- Testing strategy
- Risk mitigation
- Rollback plan

### tasks.md

Actionable task list containing:

- Tasks grouped by phase **with TDD structure**:
  - **RED**: Tests to write first
  - **GREEN**: Implementation to pass tests
  - **REFACTOR**: Cleanup while keeping tests green
- Parallelization markers `[P]`
- Acceptance checklist
- Task dependencies

**Note**: Source of truth for task definitions. `feature.yaml` tracks execution status only.

### feature.yaml

Machine-readable status tracking (NEW) containing:

- Feature metadata (id, name, branch)
- Lifecycle state (research → planning → implementation → review → complete)
- Progress tracking (completed/total tasks, percentage)
- Current task being worked on
- Validation gates passed
- Checkpoints with timestamps
- Error state (if blocked)

**Updated by ALL shep-kit skills** as work progresses. See [feature.yaml Protocol](./feature-yaml-protocol.md).

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

When creating a new spec, the agent scans all existing `specs/*/spec.md` files to:

- Understand the feature landscape
- Identify potential dependencies
- Avoid duplicate work
- Maintain consistency

## Best Practices

### DO

- Start every feature with `/shep-kit:new-feature`
- Review agent-proposed specs before accepting
- Update specs when requirements change
- Reference spec in PR descriptions
- Keep specs in sync with implementation

### DON'T

- Skip the spec phase for "quick" features
- Implement without a plan
- **Write implementation before tests** (violates TDD)
- Skip RED phase and go straight to implementation
- Leave specs outdated after implementation
- Create specs without the skill (use the templates)

## Integration with Existing Workflow

Spec-driven development integrates with our existing practices:

| Existing Practice    | Integration                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------- |
| TDD (MANDATORY)      | Plan phase MANDATES RED-GREEN-REFACTOR cycles; tasks.md breaks down TDD phases explicitly |
| Clean Architecture   | Spec identifies which layers are affected; each layer has TDD cycle                       |
| TypeSpec models      | data-model.md defines entity changes for tsp/                                             |
| Conventional Commits | Spec commits: `feat(specs): add NNN-feature-name specification`                           |
| PR Process           | PRs reference their spec directory; each TDD cycle can be reviewed independently          |

## Skill Locations

Skills are located at:

```
.claude/skills/
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

| Command                 | Purpose                    | Output                  |
| ----------------------- | -------------------------- | ----------------------- |
| `/shep-kit:new-feature` | Start new feature          | Branch + spec.md        |
| `/shep-kit:research`    | Technical analysis         | research.md             |
| `/shep-kit:plan`        | Implementation plan        | plan.md + tasks.md      |
| `/shep-kit:implement`   | Autonomous implementation  | Code + passing tests    |
| `/shep-kit:commit-pr`   | Commit, push, PR, watch CI | Pull request (CI green) |
| `/shep-kit:merged`      | Post-merge cleanup         | Clean workspace         |

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
