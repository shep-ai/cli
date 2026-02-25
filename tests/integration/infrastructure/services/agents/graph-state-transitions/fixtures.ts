/**
 * YAML Fixtures for Graph State Transition Tests
 *
 * Minimal valid YAML files that pass all validation nodes in the graph.
 * Kept separate so tests can import individual fixtures or override them.
 */

export const VALID_SPEC_YAML = `name: Test Feature
oneLiner: A test feature for graph state transitions
summary: This is a test feature used in integration tests
phase: implementation
sizeEstimate: S
content: Full description of the test feature for graph state transition testing
technologies:
  - TypeScript
openQuestions: []
`;

export const VALID_RESEARCH_YAML = `name: Test Research
summary: Research for test feature
content: Detailed research content for the test feature
decisions:
  - title: Testing approach
    chosen: Vitest
    rejected:
      - Jest
    rationale: Vitest is faster and natively supports ESM
`;

export const VALID_PLAN_YAML = `content: Implementation plan for test feature
phases:
  - id: phase-1
    name: Setup
    parallel: false
    taskIds:
      - task-1
filesToCreate:
  - src/test-feature.ts
`;

export const VALID_TASKS_YAML = `tasks:
  - id: task-1
    phaseId: phase-1
    title: Implement feature
    description: Implement the test feature
    state: todo
    dependencies: []
    acceptanceCriteria:
      - Feature works
    tdd: null
    estimatedEffort: small
`;

/**
 * Spec YAML with open questions and rejection feedback support.
 * Used by feedback-related tests.
 */
export const SPEC_WITH_QUESTIONS_YAML = `name: Test Feature
oneLiner: A test feature with questions
summary: Test summary with open questions
phase: implementation
sizeEstimate: S
content: Full description with open questions
technologies:
  - TypeScript
openQuestions:
  - question: Which database should we use?
    options:
      - option: PostgreSQL
        description: Relational DB
        selected: true
      - option: MongoDB
        description: Document DB
        selected: false
    selectionRationale: Better for structured data
    answer: PostgreSQL
`;
