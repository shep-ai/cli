/**
 * Plan Phase Prompt
 *
 * Instructs the agent to create an implementation plan (plan.yaml) and
 * a task breakdown (tasks.yaml) from the spec and research.
 * The plan covers architecture decisions and rationale.
 * The tasks cover concrete TDD work items.
 */

import { readSpecFile } from '../node-helpers.js';
import type { FeatureAgentState } from '../../state.js';

export function buildPlanPrompt(state: FeatureAgentState): string {
  const specContent = readSpecFile(state.specDir, 'spec.yaml');
  const researchContent = readSpecFile(state.specDir, 'research.yaml');

  return `You are a software architect performing the PLANNING phase of feature development.

## Your Task

1. Read the feature spec (with requirements) and research findings
2. Create a concrete implementation plan with architecture decisions and rationale
3. Break the work into ordered tasks with TDD cycles (RED-GREEN-REFACTOR)
4. Write the plan to plan.yaml AND the task breakdown to tasks.yaml

## Feature Spec

${specContent}

## Research Findings

${researchContent}

## What to Produce

### Implementation Plan (plan.yaml)
- Architecture overview and how the feature fits the existing codebase
- Key design decisions with rationale (reference research where applicable)
- Implementation phases — logical groupings of related tasks
- Files to create and files to modify
- Risk mitigation strategies

### Task Breakdown (tasks.yaml)
- Concrete, ordered tasks that implement the plan
- Each task with TDD cycle: what test to write first (RED), minimal implementation (GREEN), cleanup (REFACTOR)
- Dependencies between tasks
- Acceptance criteria for each task
- Effort estimates

## Output Instructions

You MUST write TWO files:

### File 1: ${state.specDir}/plan.yaml

  name: (feature name)
  summary: >
    (Summary of the implementation approach and key decisions)

  relatedFeatures: []
  technologies:
    - (technologies needed)
  relatedLinks: []

  phases:
    - id: phase-1
      name: '(Phase Name — e.g., "Foundation & Domain Setup")'
      parallel: false
      taskIds:
        - task-1
        - task-2
    - id: phase-2
      name: '(Next Phase)'
      parallel: false
      taskIds:
        - task-3

  filesToCreate:
    - (path/to/new/file.ts)

  filesToModify:
    - (path/to/existing/file.ts)

  openQuestions: []

  content: |
    ## Architecture Overview

    (How the implementation fits the existing architecture.
    Reference specific patterns from the codebase.)

    ## Key Design Decisions

    (For each decision, explain what was chosen, what alternatives were considered,
    and why this approach is best. Reference research findings.)

    ## Implementation Strategy

    (High-level approach: phase ordering rationale, what comes first and why)

    ## Risk Mitigation

    | Risk | Mitigation |
    | ---- | ---------- |
    | (risk) | (how to handle it) |

### File 2: ${state.specDir}/tasks.yaml

  name: (feature name)
  summary: >
    (Summary: N tasks across M phases)

  relatedFeatures: []
  technologies: []
  relatedLinks: []

  tasks:
    - id: task-1
      title: '(Task Title)'
      description: '(What this task accomplishes and why)'
      state: Todo
      dependencies: []
      acceptanceCriteria:
        - '(Specific, testable criterion)'
        - '(Another criterion)'
      tdd:
        red:
          - '(Write test that asserts X behavior)'
        green:
          - '(Implement minimal code to pass the test)'
        refactor:
          - '(Clean up: extract helpers, improve naming, etc.)'
      estimatedEffort: '(time estimate, e.g., 1h, 30min)'

    - id: task-2
      title: '(Next Task)'
      description: '...'
      state: Todo
      dependencies:
        - task-1
      acceptanceCriteria:
        - '...'
      tdd:
        red:
          - '...'
        green:
          - '...'
        refactor:
          - '...'
      estimatedEffort: '...'

  totalEstimate: '(total estimated hours)'
  openQuestions: []

  content: |
    ## Task List

    ### Phase 1: (Phase Name)

    **RED:**
    - [ ] (tests to write first)

    **GREEN:**
    - [ ] **Task 1:** (title) (effort)

    **REFACTOR:**
    - [ ] (cleanup items)

    ### Phase 2: (Phase Name)
    ...

## Constraints

- Write to BOTH ${state.specDir}/plan.yaml AND ${state.specDir}/tasks.yaml
- Every code task MUST have TDD cycles (red/green/refactor) — non-code tasks (installs, docs) can set tdd: null
- Tasks must be ordered by dependency — no task should depend on a later task
- Each phase should group logically related tasks
- Prefer small, focused tasks over large monolithic ones
- Follow existing codebase conventions for file placement and naming
- Do NOT create any other files
- Do NOT modify any source code
- Do NOT start implementing — planning only`;
}
