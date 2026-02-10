/**
 * spec-validate Unit Tests
 *
 * Tests for the spec validation script that checks spec directories for quality gates.
 *
 * TDD Phase: RED
 * - These tests are written BEFORE implementation
 * - All tests should FAIL initially because the script doesn't exist yet
 * - Tests define the expected behavior of the validation script
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import {
  validateCompleteness,
  validateArchitecture,
  validateConsistency,
  validateSpec,
} from '../../../scripts/spec-validate.js';

describe('spec-validate', () => {
  const testSpecDir = join(process.cwd(), 'specs', '999-test-validation');

  beforeEach(() => {
    if (existsSync(testSpecDir)) {
      rmSync(testSpecDir, { recursive: true });
    }
    mkdirSync(testSpecDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testSpecDir)) {
      rmSync(testSpecDir, { recursive: true });
    }
  });

  /**
   * Helper to write all required YAML files with valid content
   */
  function writeValidSpecFiles() {
    writeFileSync(
      join(testSpecDir, 'spec.yaml'),
      `name: test-feature
number: 999
branch: feat/999-test-feature
oneLiner: A test feature for validation
summary: This is a test feature used to validate the spec-validate script.
phase: Requirements
sizeEstimate: S
relatedFeatures: []
technologies:
  - TypeScript
relatedLinks: []
openQuestions: []
content: |
  ## Problem Statement
  Test problem statement.

  ## Success Criteria
  - [ ] Criterion 1
`
    );

    writeFileSync(
      join(testSpecDir, 'research.yaml'),
      `name: test-feature
summary: Technical analysis for 999-test-feature
relatedFeatures: []
technologies:
  - TypeScript
relatedLinks: []
decisions:
  - title: Library Choice
    chosen: js-yaml
    rejected:
      - yaml
      - toml
    rationale: Well-maintained and TypeScript-friendly
openQuestions: []
content: |
  ## Technology Decisions
  Analysis of options.
`
    );

    writeFileSync(
      join(testSpecDir, 'plan.yaml'),
      `name: test-feature
summary: Implementation plan for 999-test-feature
relatedFeatures: []
technologies:
  - TypeScript
relatedLinks: []
phases:
  - id: phase-1
    name: Foundation
    parallel: false
    taskIds:
      - task-1
      - task-2
  - id: phase-2
    name: Core Implementation
    parallel: false
    taskIds:
      - task-3
filesToCreate:
  - src/new-file.ts
filesToModify:
  - package.json
openQuestions: []
content: |
  ## Implementation Strategy

  **MANDATORY TDD**: All implementation phases follow RED-GREEN-REFACTOR cycles.

  This project follows Clean Architecture with four layers.

  ### Phase 1: Foundation

  **TDD Workflow:**

  1. **RED:** Write failing tests FIRST
  2. **GREEN:** Implement minimal code to pass tests
  3. **REFACTOR:** Improve code while keeping tests green

  Run \`pnpm tsp:compile\` to generate TypeSpec types.
`
    );

    writeFileSync(
      join(testSpecDir, 'tasks.yaml'),
      `name: test-feature
summary: Task breakdown for 999-test-feature
relatedFeatures: []
technologies:
  - TypeScript
relatedLinks: []
tasks:
  - id: task-1
    title: Set up foundation
    description: Create the base structure
    state: Todo
    dependencies: []
    acceptanceCriteria:
      - Base structure exists
    tdd: null
    estimatedEffort: 1h
  - id: task-2
    title: Implement core logic
    description: Build the main functionality
    state: Todo
    dependencies:
      - task-1
    acceptanceCriteria:
      - Core logic works
    tdd:
      red:
        - Write tests for core logic
      green:
        - Implement core logic to pass tests
      refactor:
        - Extract helpers
    estimatedEffort: 2h
  - id: task-3
    title: Add integration
    description: Wire up components
    state: Todo
    dependencies:
      - task-2
    acceptanceCriteria:
      - Components wired up
    tdd: null
    estimatedEffort: 1h
totalEstimate: 4h
openQuestions: []
content: |
  ## Task List
  Tasks here.
`
    );

    writeFileSync(
      join(testSpecDir, 'feature.yaml'),
      `feature:
  id: '999-test-validation'
  name: 'test-validation'
  number: 999
  branch: 'feat/999-test-validation'
  lifecycle: 'implementation'
  createdAt: '2026-02-10T00:00:00Z'

status:
  phase: 'implementing'
  progress:
    completed: 0
    total: 3
    percentage: 0
  currentTask: null
  lastUpdated: '2026-02-10T00:00:00Z'
  lastUpdatedBy: 'shep-kit:implement'

validation:
  lastRun: null
  gatesPassed: []
  autoFixesApplied: []

tasks:
  current: null
  blocked: []
  failed: []

checkpoints: []

errors:
  current: null
  history: []
`
    );
  }

  describe('validateCompleteness()', () => {
    it('should pass when all required files exist with valid keys', () => {
      // Arrange
      writeValidSpecFiles();

      // Act
      const result = validateCompleteness(testSpecDir);

      // Assert
      expect(result.category).toBe('completeness');
      expect(result.status).toBe('pass');
      expect(result.messages.every((m) => m.level !== 'error')).toBe(true);
    });

    it('should fail when spec.yaml is missing', () => {
      // Arrange
      writeValidSpecFiles();
      rmSync(join(testSpecDir, 'spec.yaml'));

      // Act
      const result = validateCompleteness(testSpecDir);

      // Assert
      expect(result.category).toBe('completeness');
      expect(result.status).toBe('fail');
      expect(
        result.messages.some((m) => m.level === 'error' && m.message.includes('spec.yaml'))
      ).toBe(true);
    });

    it('should fail when required keys are missing from spec.yaml', () => {
      // Arrange
      writeValidSpecFiles();
      // Overwrite spec.yaml with missing required keys (no number, branch, oneLiner, phase, sizeEstimate)
      writeFileSync(
        join(testSpecDir, 'spec.yaml'),
        `name: test-feature
summary: A test feature
content: |
  ## Problem Statement
  Test.
`
      );

      // Act
      const result = validateCompleteness(testSpecDir);

      // Assert
      expect(result.category).toBe('completeness');
      expect(result.status).toBe('fail');
      expect(result.messages.some((m) => m.level === 'error' && m.message.includes('number'))).toBe(
        true
      );
    });

    it('should fail when openQuestions have unresolved items', () => {
      // Arrange
      writeValidSpecFiles();
      // Overwrite spec.yaml with unresolved open questions
      writeFileSync(
        join(testSpecDir, 'spec.yaml'),
        `name: test-feature
number: 999
branch: feat/999-test-feature
oneLiner: A test feature
summary: Test feature
phase: Requirements
sizeEstimate: S
relatedFeatures: []
technologies: []
relatedLinks: []
openQuestions:
  - question: "Should we use approach A or B?"
    resolved: false
  - question: "What about edge cases?"
    resolved: false
content: |
  ## Problem Statement
  Test.
`
      );

      // Act
      const result = validateCompleteness(testSpecDir);

      // Assert
      expect(result.category).toBe('completeness');
      expect(result.status).toBe('fail');
      expect(
        result.messages.some((m) => m.level === 'error' && m.message.includes('unresolved'))
      ).toBe(true);
    });

    it('should pass when openQuestions are all resolved', () => {
      // Arrange
      writeValidSpecFiles();
      writeFileSync(
        join(testSpecDir, 'spec.yaml'),
        `name: test-feature
number: 999
branch: feat/999-test-feature
oneLiner: A test feature
summary: Test feature
phase: Requirements
sizeEstimate: S
relatedFeatures: []
technologies: []
relatedLinks: []
openQuestions:
  - question: "Should we use approach A or B?"
    resolved: true
    answer: "Approach A because of performance"
  - question: "What about edge cases?"
    resolved: true
    answer: "Handled via validation"
content: |
  ## Problem Statement
  Test.
`
      );

      // Act
      const result = validateCompleteness(testSpecDir);

      // Assert
      expect(result.category).toBe('completeness');
      expect(result.status).toBe('pass');
    });

    it('should pass when openQuestions array is empty', () => {
      // Arrange
      writeValidSpecFiles();

      // Act (writeValidSpecFiles already sets openQuestions: [])
      const result = validateCompleteness(testSpecDir);

      // Assert
      expect(result.category).toBe('completeness');
      expect(result.status).toBe('pass');
    });
  });

  describe('validateArchitecture()', () => {
    it('should pass when plan content references TDD and Clean Architecture', () => {
      // Arrange
      writeValidSpecFiles();

      // Act
      const result = validateArchitecture(testSpecDir);

      // Assert
      expect(result.category).toBe('architecture');
      expect(result.status).toBe('pass');
    });

    it('should warn when plan content is missing TDD references', () => {
      // Arrange
      writeValidSpecFiles();
      writeFileSync(
        join(testSpecDir, 'plan.yaml'),
        `name: test-feature
summary: Implementation plan
relatedFeatures: []
technologies: []
relatedLinks: []
phases:
  - id: phase-1
    name: Foundation
    parallel: false
    taskIds:
      - task-1
filesToCreate: []
filesToModify: []
openQuestions: []
content: |
  ## Implementation Strategy

  This project follows Clean Architecture with four layers.

  ### Phase 1: Foundation

  Steps:
  1. Create files
  2. Implement logic
`
      );

      // Act
      const result = validateArchitecture(testSpecDir);

      // Assert
      expect(result.category).toBe('architecture');
      expect(result.status).toBe('warn');
      expect(
        result.messages.some(
          (m) => m.level === 'warning' && m.message.toLowerCase().includes('tdd')
        )
      ).toBe(true);
    });

    it('should warn when plan content is missing Clean Architecture references', () => {
      // Arrange
      writeValidSpecFiles();
      writeFileSync(
        join(testSpecDir, 'plan.yaml'),
        `name: test-feature
summary: Implementation plan
relatedFeatures: []
technologies: []
relatedLinks: []
phases:
  - id: phase-1
    name: Foundation
    parallel: false
    taskIds:
      - task-1
filesToCreate: []
filesToModify: []
openQuestions: []
content: |
  ## Implementation Strategy

  **MANDATORY TDD**: All implementation phases follow RED-GREEN-REFACTOR cycles.

  ### Phase 1: Foundation

  **TDD Workflow:**

  1. **RED:** Write failing tests FIRST
  2. **GREEN:** Implement minimal code to pass tests
  3. **REFACTOR:** Improve code while keeping tests green
`
      );

      // Act
      const result = validateArchitecture(testSpecDir);

      // Assert
      expect(result.category).toBe('architecture');
      expect(result.status).toBe('warn');
      expect(
        result.messages.some(
          (m) => m.level === 'warning' && m.message.toLowerCase().includes('clean architecture')
        )
      ).toBe(true);
    });
  });

  describe('validateConsistency()', () => {
    it('should pass when all task references are valid', () => {
      // Arrange
      writeValidSpecFiles();

      // Act
      const result = validateConsistency(testSpecDir);

      // Assert
      expect(result.category).toBe('consistency');
      expect(result.status).toBe('pass');
    });

    it('should fail when plan references non-existent task IDs', () => {
      // Arrange
      writeValidSpecFiles();
      // Overwrite plan.yaml to reference task IDs that don't exist in tasks.yaml
      writeFileSync(
        join(testSpecDir, 'plan.yaml'),
        `name: test-feature
summary: Implementation plan
relatedFeatures: []
technologies: []
relatedLinks: []
phases:
  - id: phase-1
    name: Foundation
    parallel: false
    taskIds:
      - task-1
      - task-99
      - task-nonexistent
filesToCreate: []
filesToModify: []
openQuestions: []
content: |
  ## Implementation Strategy

  **MANDATORY TDD**: RED-GREEN-REFACTOR cycles.
  Clean Architecture layers.
`
      );

      // Act
      const result = validateConsistency(testSpecDir);

      // Assert
      expect(result.category).toBe('consistency');
      expect(result.status).toBe('fail');
      expect(
        result.messages.some((m) => m.level === 'error' && m.message.includes('task-99'))
      ).toBe(true);
      expect(
        result.messages.some((m) => m.level === 'error' && m.message.includes('task-nonexistent'))
      ).toBe(true);
    });

    it('should fail when task dependencies reference non-existent tasks', () => {
      // Arrange
      writeValidSpecFiles();
      // Overwrite tasks.yaml with a dependency on a non-existent task
      writeFileSync(
        join(testSpecDir, 'tasks.yaml'),
        `name: test-feature
summary: Task breakdown
relatedFeatures: []
technologies: []
relatedLinks: []
tasks:
  - id: task-1
    title: First task
    description: Do something
    state: Todo
    dependencies:
      - task-phantom
    acceptanceCriteria:
      - Something works
    tdd: null
    estimatedEffort: 1h
totalEstimate: 1h
openQuestions: []
content: |
  ## Task List
  Tasks here.
`
      );

      // Act
      const result = validateConsistency(testSpecDir);

      // Assert
      expect(result.category).toBe('consistency');
      expect(result.status).toBe('fail');
      expect(
        result.messages.some((m) => m.level === 'error' && m.message.includes('task-phantom'))
      ).toBe(true);
    });

    it('should fail when circular dependencies detected', () => {
      // Arrange
      writeValidSpecFiles();
      // Overwrite tasks.yaml with circular dependencies: task-1 -> task-2 -> task-1
      writeFileSync(
        join(testSpecDir, 'tasks.yaml'),
        `name: test-feature
summary: Task breakdown
relatedFeatures: []
technologies: []
relatedLinks: []
tasks:
  - id: task-1
    title: First task
    description: Do something
    state: Todo
    dependencies:
      - task-2
    acceptanceCriteria:
      - Something works
    tdd: null
    estimatedEffort: 1h
  - id: task-2
    title: Second task
    description: Do something else
    state: Todo
    dependencies:
      - task-1
    acceptanceCriteria:
      - Something else works
    tdd: null
    estimatedEffort: 1h
totalEstimate: 2h
openQuestions: []
content: |
  ## Task List
  Tasks here.
`
      );

      // Also update plan.yaml to reference these tasks
      writeFileSync(
        join(testSpecDir, 'plan.yaml'),
        `name: test-feature
summary: Implementation plan
relatedFeatures: []
technologies: []
relatedLinks: []
phases:
  - id: phase-1
    name: Foundation
    parallel: false
    taskIds:
      - task-1
      - task-2
filesToCreate: []
filesToModify: []
openQuestions: []
content: |
  ## Implementation Strategy

  **MANDATORY TDD**: RED-GREEN-REFACTOR cycles.
  Clean Architecture layers.
`
      );

      // Act
      const result = validateConsistency(testSpecDir);

      // Assert
      expect(result.category).toBe('consistency');
      expect(result.status).toBe('fail');
      expect(
        result.messages.some(
          (m) => m.level === 'error' && m.message.toLowerCase().includes('circular')
        )
      ).toBe(true);
    });

    it('should pass when tasks have no dependencies', () => {
      // Arrange
      writeValidSpecFiles();
      // Overwrite tasks.yaml with tasks that have no dependencies
      writeFileSync(
        join(testSpecDir, 'tasks.yaml'),
        `name: test-feature
summary: Task breakdown
relatedFeatures: []
technologies: []
relatedLinks: []
tasks:
  - id: task-1
    title: First task
    description: Do something
    state: Todo
    dependencies: []
    acceptanceCriteria:
      - Something works
    tdd: null
    estimatedEffort: 1h
  - id: task-2
    title: Second task
    description: Do something else
    state: Todo
    dependencies: []
    acceptanceCriteria:
      - Something else works
    tdd: null
    estimatedEffort: 1h
  - id: task-3
    title: Third task
    description: Do another thing
    state: Todo
    dependencies: []
    acceptanceCriteria:
      - Another thing works
    tdd: null
    estimatedEffort: 1h
totalEstimate: 3h
openQuestions: []
content: |
  ## Task List
  Tasks here.
`
      );

      // Act
      const result = validateConsistency(testSpecDir);

      // Assert
      expect(result.category).toBe('consistency');
      expect(result.status).toBe('pass');
    });
  });

  describe('validateSpec()', () => {
    it('should run all three validation categories', () => {
      // Arrange
      writeValidSpecFiles();

      // Act
      const results = validateSpec(testSpecDir);

      // Assert
      expect(results).toHaveLength(3);
      const categories = results.map((r) => r.category);
      expect(categories).toContain('completeness');
      expect(categories).toContain('architecture');
      expect(categories).toContain('consistency');
    });

    it('should return array of 3 results', () => {
      // Arrange
      writeValidSpecFiles();

      // Act
      const results = validateSpec(testSpecDir);

      // Assert
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(3);
      for (const result of results) {
        expect(result).toHaveProperty('category');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('messages');
        expect(['pass', 'warn', 'fail']).toContain(result.status);
        expect(['completeness', 'architecture', 'consistency']).toContain(result.category);
      }
    });
  });
});
