/**
 * spec-generate-md Unit Tests
 *
 * Tests for the YAML-to-Markdown spec generation script.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { generateMarkdownFromYaml, parseYamlFile } from '../../../scripts/spec-generate-md.js';

describe('spec-generate-md', () => {
  const testSpecDir = join(process.cwd(), 'specs', '999-test-feature');
  const testYamlPath = join(testSpecDir, 'spec.yaml');

  beforeEach(() => {
    // Create test spec directory
    if (existsSync(testSpecDir)) {
      rmSync(testSpecDir, { recursive: true });
    }
    mkdirSync(testSpecDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(testSpecDir)) {
      rmSync(testSpecDir, { recursive: true });
    }
  });

  describe('parseYamlFile()', () => {
    it('should parse a valid YAML spec file', () => {
      // Arrange
      const yamlContent = `
name: test-feature
number: 999
branch: feat/999-test-feature
oneLiner: Test feature
summary: A test feature
phase: Requirements
sizeEstimate: S
relatedFeatures: []
technologies: []
relatedLinks: []
openQuestions: []
content: |
  ## Problem Statement
  Test problem
`;
      writeFileSync(testYamlPath, yamlContent);

      // Act
      const result = parseYamlFile(testYamlPath);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe('test-feature');
      expect(result.number).toBe(999);
      expect(result.content).toContain('## Problem Statement');
    });

    it('should throw error for invalid YAML', () => {
      // Arrange
      writeFileSync(testYamlPath, 'invalid: yaml: content: [');

      // Act & Assert
      expect(() => parseYamlFile(testYamlPath)).toThrow();
    });

    it('should throw error for missing file', () => {
      // Act & Assert
      expect(() => parseYamlFile('/nonexistent/file.yaml')).toThrow();
    });
  });

  describe('generateMarkdownFromYaml()', () => {
    it('should generate Markdown for FeatureSpec without frontmatter', () => {
      // Arrange
      const yamlContent = `
name: test-feature
number: 999
branch: feat/999-test-feature
oneLiner: Test feature
summary: A test feature
phase: Requirements
sizeEstimate: S
relatedFeatures: []
technologies: ['TypeScript']
relatedLinks: []
openQuestions: []
content: |
  ## Problem Statement
  Test problem statement.

  ## Success Criteria
  - [ ] Criterion 1
`;
      writeFileSync(testYamlPath, yamlContent);

      // Act
      const result = generateMarkdownFromYaml(testYamlPath, 'feature');

      // Assert - no frontmatter, just content
      expect(result).not.toMatch(/^---/);
      expect(result).toContain('## Problem Statement');
      expect(result).toContain('Test problem statement');
      expect(result).toContain('## Success Criteria');
    });

    it('should generate Markdown for ResearchSpec without frontmatter', () => {
      // Arrange
      const yamlContent = `
name: test-feature
summary: Technical analysis
relatedFeatures: []
technologies: ['TypeScript']
relatedLinks: []
decisions:
  - title: Tech Choice
    chosen: TypeScript
    rejected: ['JavaScript']
    rationale: Type safety
openQuestions: []
content: |
  ## Technology Decisions
  Analysis here.
`;
      const yamlPath = join(testSpecDir, 'research.yaml');
      writeFileSync(yamlPath, yamlContent);

      // Act
      const result = generateMarkdownFromYaml(yamlPath, 'research');

      // Assert - content only, no metadata
      expect(result).not.toMatch(/^---/);
      expect(result).not.toContain('decisions:');
      expect(result).toContain('## Technology Decisions');
    });

    it('should generate Markdown for PlanSpec without frontmatter', () => {
      // Arrange
      const yamlContent = `
name: test-feature
summary: Implementation plan
relatedFeatures: []
technologies: []
relatedLinks: []
phases:
  - id: phase-1
    name: Foundation
    parallel: false
    taskIds: ['task-1']
filesToCreate: ['src/file.ts']
filesToModify: ['package.json']
openQuestions: []
content: |
  ## Implementation Strategy
  Strategy here.
`;
      const yamlPath = join(testSpecDir, 'plan.yaml');
      writeFileSync(yamlPath, yamlContent);

      // Act
      const result = generateMarkdownFromYaml(yamlPath, 'plan');

      // Assert - content only
      expect(result).not.toMatch(/^---/);
      expect(result).not.toContain('phases:');
      expect(result).toContain('## Implementation Strategy');
    });

    it('should generate Markdown for TasksSpec without frontmatter', () => {
      // Arrange
      const yamlContent = `
name: test-feature
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
    acceptanceCriteria: ['Criterion 1']
    tdd: null
    estimatedEffort: 2h
totalEstimate: 2h
openQuestions: []
content: |
  ## Task List
  Tasks here.
`;
      const yamlPath = join(testSpecDir, 'tasks.yaml');
      writeFileSync(yamlPath, yamlContent);

      // Act
      const result = generateMarkdownFromYaml(yamlPath, 'tasks');

      // Assert - content only
      expect(result).not.toMatch(/^---/);
      expect(result).not.toContain('totalEstimate:');
      expect(result).toContain('## Task List');
    });

    it('should handle multiline content correctly', () => {
      // Arrange
      const yamlContent = `
name: test-feature
number: 999
branch: feat/999-test-feature
oneLiner: Test
summary: Test
phase: Requirements
sizeEstimate: S
relatedFeatures: []
technologies: []
relatedLinks: []
openQuestions: []
content: |
  ## Section 1

  Paragraph with multiple lines.
  More content here.

  ## Section 2

  Another section.
`;
      writeFileSync(testYamlPath, yamlContent);

      // Act
      const result = generateMarkdownFromYaml(testYamlPath, 'feature');

      // Assert
      expect(result).toContain('## Section 1');
      expect(result).toContain('Paragraph with multiple lines.');
      expect(result).toContain('## Section 2');
      expect(result).toContain('Another section.');
    });

    it('should handle missing optional fields gracefully', () => {
      // Arrange
      const yamlContent = `
name: test-feature
number: 999
branch: feat/999-test-feature
oneLiner: Test
summary: Test
phase: Requirements
sizeEstimate: S
relatedFeatures: []
technologies: []
relatedLinks: []
openQuestions: []
content: |
  ## Minimal content
`;
      writeFileSync(testYamlPath, yamlContent);

      // Act
      const result = generateMarkdownFromYaml(testYamlPath, 'feature');

      // Assert
      expect(result).toBeDefined();
      expect(result).not.toMatch(/^---/);
      expect(result).toContain('## Minimal content');
    });

    it('should preserve exact formatting of content field', () => {
      // Arrange
      const yamlContent = `
name: test-feature
number: 999
branch: feat/999-test-feature
oneLiner: Test
summary: Test
phase: Requirements
sizeEstimate: S
relatedFeatures: []
technologies: []
relatedLinks: []
openQuestions: []
content: |
  ## Code Example

  \`\`\`typescript
  function example() {
    return true;
  }
  \`\`\`

  ## Table

  | Column | Value |
  | ------ | ----- |
  | A      | 1     |
`;
      writeFileSync(testYamlPath, yamlContent);

      // Act
      const result = generateMarkdownFromYaml(testYamlPath, 'feature');

      // Assert
      expect(result).toContain('```typescript');
      expect(result).toContain('function example()');
      expect(result).toContain('| Column | Value |');
    });
  });

  describe('generateMarkdownFromYaml() - Error Handling', () => {
    it('should throw error for unsupported artifact type', () => {
      // Arrange
      writeFileSync(testYamlPath, 'name: test');

      // Act & Assert
      expect(() => generateMarkdownFromYaml(testYamlPath, 'invalid' as any)).toThrow();
    });

    it('should throw error when content field is missing', () => {
      // Arrange
      const yamlContent = `
name: test-feature
number: 999
`;
      writeFileSync(testYamlPath, yamlContent);

      // Act & Assert
      expect(() => generateMarkdownFromYaml(testYamlPath, 'feature')).toThrow(
        /content field is required/
      );
    });
  });
});
