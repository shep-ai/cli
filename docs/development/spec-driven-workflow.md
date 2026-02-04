# Spec-Driven Development Workflow

This document is the **single source of truth** for Shep AI's spec-driven development workflow. All contributors (human and AI) must follow this workflow for feature development.

## Overview

Shep-kit is our spec-driven development toolkit inspired by [GitHub's SpecKit](https://github.com/github/spec-kit). Every feature begins with a specification before any implementation code is written.

```
/shep-kit:new-feature → /shep-kit:research → /shep-kit:plan → implement
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

### Step 4: Implement

**Trigger**: After plan is complete.

**📖 Full Guide**: See [Implementation Guide](./implementation-guide.md) for detailed step-by-step instructions.

**MANDATORY TDD Guidelines:**

- **ALWAYS follow RED-GREEN-REFACTOR**:
  1. **RED**: Write failing test FIRST (never skip this!)
  2. **GREEN**: Write minimal code to pass test
  3. **REFACTOR**: Improve code while keeping tests green
- **Never write implementation before tests** (except foundational phases)

**CRITICAL Progress Tracking (MANDATORY):**

- **Update `tasks.md` FREQUENTLY** - Check off items as you complete them (not at the end!)
- **Each action item completed = immediate checkbox update** in tasks.md
- **Commit task updates** along with code changes to show progress
- This keeps the task list as the source of truth for current progress

**Phase Completion Workflow (MANDATORY CI Watch):**

After completing each phase:

1. **Commit phase changes**: `git commit -m "feat(scope): complete phase N - <description>"`
2. **Push to remote**: `git push`
3. **Watch CI immediately**: `gh run watch --exit-status`
4. **If CI fails**:
   - Get logs: `gh run view <run-id> --log-failed`
   - Fix the issue
   - Commit fix: `git commit -m "fix(scope): resolve CI failure in phase N"`
   - Push: `git push`
   - Watch again: `gh run watch --exit-status`
   - **Repeat until CI passes**
5. **Only move to next phase after CI is green**

**Other Guidelines:**

- Update spec files if requirements change
- Commit frequently with conventional commits
- Each TDD cycle must be independently reviewable

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
└── shep-kit:plan/
    ├── SKILL.md
    ├── templates/
    └── examples/
```

## Quick Reference

| Command                 | Purpose             | Output             |
| ----------------------- | ------------------- | ------------------ |
| `/shep-kit:new-feature` | Start new feature   | Branch + spec.md   |
| `/shep-kit:research`    | Technical analysis  | research.md        |
| `/shep-kit:plan`        | Implementation plan | plan.md + tasks.md |

---

## Maintaining This Document

**Update when:**

- Workflow changes
- New skill added to shep-kit
- Template structure changes
- Best practices evolve

**Related docs:**

- [Implementation Guide](./implementation-guide.md) - Step-by-step implementation discipline
- [TDD Guide](./tdd-guide.md) - Test-Driven Development best practices
- [CONTRIBUTING.md](../../CONTRIBUTING.md)
- [CONTRIBUTING-AGENTS.md](../../CONTRIBUTING-AGENTS.md)
- [CLAUDE.md](../../CLAUDE.md)
