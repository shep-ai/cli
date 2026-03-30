# Spec-Driven Development Workflow

Every feature begins with a specification before any code is written.

```
/shep-kit:new-feature → /shep-kit:research → /shep-kit:plan → /shep-kit:implement → /shep-kit:commit-pr → /shep-kit:merged
```

## Quick Reference

| Command                 | Purpose                   | Output                                        |
| ----------------------- | ------------------------- | --------------------------------------------- |
| `/shep-kit:new-feature` | Start new feature         | Branch + `spec.yaml`                          |
| `/shep-kit:research`    | Technical analysis        | `research.yaml`                               |
| `/shep-kit:plan`        | Implementation plan       | `plan.yaml` + `tasks.yaml`                    |
| `/shep-kit:implement`   | Autonomous implementation | Code + tests + updated `feature.yaml`         |
| `/shep-kit:commit-pr`   | Commit, push, PR, CI      | Pull request (watches CI, fixes failures)     |
| `/shep-kit:merged`      | Post-merge cleanup        | Clean workspace                               |

## Spec Directory

```
specs/NNN-feature-name/
├── spec.yaml           # Requirements & scope
├── research.yaml       # Technical decisions
├── plan.yaml           # Architecture & phases
├── tasks.yaml          # Task breakdown (TDD cycles)
├── feature.yaml        # Status tracking (updated by all skills)
└── evidence/           # Screenshots, test output
```

- **Branch**: `feat/NNN-feature-name`
- **Numbering**: Sequential, kebab-case (e.g., `042-stripe-payments`)
- **YAML is the only format** — no `.md` spec files

## YAML Structure

Spec files (`spec.yaml`, `research.yaml`, `plan.yaml`, `tasks.yaml`) use a **metadata + content hybrid**:

```yaml
name: my-feature
number: 42
branch: feat/042-my-feature
oneLiner: Short description
phase: Research
sizeEstimate: M
technologies: [TypeSpec, Node.js]
openQuestions: []

content: |
  ## Problem Statement
  Description of the problem...
```

**Metadata** — structured fields for programmatic access.
**`content`** — freeform Markdown body for the spec narrative.

`feature.yaml` is different — purely structured status tracking (no `content` field). See [feature.yaml Protocol](./feature-yaml-protocol.md).

## Workflow Details

### 1. New Feature

Creates branch, scaffolds spec directory, agent proposes `spec.yaml`. You review and adjust.

### 2. Research

Agent reads `spec.yaml`, researches options, documents decisions in `research.yaml`.

### 3. Plan

Agent designs architecture and breaks work into TDD phases. Plans **must** define RED-GREEN-REFACTOR cycles for each task.

### 4. Implement

1. Validates specs via `pnpm spec:validate` (blocks on critical issues)
2. Resumes from last completed task if mid-session
3. Executes tasks sequentially following TDD (RED → GREEN → REFACTOR)
4. Verifies after each task (tests, build, typecheck, lint)
5. Updates `feature.yaml` continuously
6. Retries errors up to 3 times, stops if unresolvable

### 5. Commit & PR

Commits, pushes, creates PR, watches CI. If CI fails: fixes and retries. Then watches for review comments and applies fixes autonomously (max 5 iterations).

### 6. Merged

Switches to main, pulls, deletes feature branch, marks `feature.yaml` complete.

## Rules

- Start every feature with `/shep-kit:new-feature`
- Tests before implementation (TDD — no exceptions)
- Run `pnpm spec:validate` before implementing
- Keep specs in sync with implementation
- Reference spec directory in PR descriptions

## Related Docs

- [feature.yaml Protocol](./feature-yaml-protocol.md)
- [Implementation Guide](./implementation-guide.md)
- [TDD Guide](./tdd-guide.md)
