/**
 * YAML Repair Cycle Integration Tests
 *
 * Tests the validation → repair → re-validation flow when agents write
 * malformed YAML with unescaped quotes or special characters.
 *
 * These tests verify the repair node's prompt building and the executor's
 * ability to fix malformed YAML based on validation errors.
 *
 * Covers:
 * - Test 1: Repair prompt contains YAML escaping rules and examples
 * - Test 2: Repair node correctly reads malformed YAML and validation errors
 * - Test 3: Content is preserved after repair (semantic equality)
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readSpecYaml } from './helpers.js';
import {
  createRepairNode,
  buildRepairPrompt,
} from '@/infrastructure/services/agents/feature-agent/nodes/repair.node.js';
import { createValidateNode } from '@/infrastructure/services/agents/feature-agent/nodes/validate.node.js';
import { validateSpecRequirements } from '@/infrastructure/services/agents/feature-agent/nodes/schemas/spec.schema.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';

describe('Graph State Transitions › YAML Repair Cycle', () => {
  let tempDir: string;
  let specDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'shep-yaml-repair-'));
    specDir = join(tempDir, 'specs', '001-test');
  });

  beforeEach(() => {
    // Ensure spec directory exists for each test
    mkdirSync(specDir, { recursive: true });
  });

  afterAll(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it('should build repair prompt with YAML escaping rules and examples', () => {
    // Test the buildRepairPrompt function directly
    const filename = 'spec.yaml';
    const malformedContent = `name: Test Feature with 'unescaped quotes'
oneLiner: broken`;
    const errors = ['YAML parse error: bad indentation'];

    const prompt = buildRepairPrompt(filename, malformedContent, errors, specDir);

    // Verify prompt contains expected sections
    expect(prompt).toContain('YAML Repair Task');
    expect(prompt).toContain('YAML Escaping Rules');
    expect(prompt).toContain('Wrap all string values in double quotes');
    expect(prompt).toContain('Escape internal double quotes with backslash');
    expect(prompt).toContain('Use block scalars (|) for multi-line text');

    // Verify prompt contains concrete examples
    expect(prompt).toContain('Examples (incorrect → correct)');
    expect(prompt).toContain("it's broken");
    expect(prompt).toContain('Add "strict" mode');

    // Verify validation errors are included
    expect(prompt).toContain('YAML parse error: bad indentation');

    // Verify file path is included
    expect(prompt).toContain(join(specDir, filename).replaceAll('\\', '/'));
  });

  it('should invoke repair node and call executor with repair prompt', async () => {
    // Write malformed YAML to spec directory
    const malformedSpecYaml = `name: Test Feature with 'unescaped quotes'
number: 1
branch: "feat/test-feature"
oneLiner: "broken"
summary: "broken"
phase: "implementation"
sizeEstimate: "S"
content: "broken"
technologies:
  - "TypeScript"
openQuestions: []
`;

    writeFileSync(join(specDir, 'spec.yaml'), malformedSpecYaml);

    // Mock executor
    const mockExecutor = {
      execute: vi.fn().mockResolvedValue({ result: 'fixed', exitCode: 0 }),
      executeStream: vi.fn(),
      supportsFeature: vi.fn().mockReturnValue(false),
      agentType: 'claude-code' as never,
    } as unknown as IAgentExecutor;

    // Create repair node
    const repairNode = createRepairNode('spec.yaml', mockExecutor);

    // Create state with validation errors
    const state = {
      featureId: 'test-feature',
      repositoryPath: tempDir,
      worktreePath: tempDir,
      specDir,
      validationRetries: 1,
      lastValidationErrors: ['YAML parse error: bad indentation'],
      lastValidationTarget: 'spec.yaml',
      messages: [],
      approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
      _approvalAction: null,
      _rejectionFeedback: null,
      _needsReexecution: false,
    } as Partial<FeatureAgentState> as FeatureAgentState;

    // Invoke repair node
    await repairNode(state);

    // Verify executor was called
    expect(mockExecutor.execute).toHaveBeenCalled();

    // Verify prompt contains repair instructions
    const executeMock = mockExecutor.execute as ReturnType<typeof vi.fn>;
    const prompt = executeMock.mock.calls[0][0] as string;
    expect(prompt).toContain('YAML Repair Task');
    expect(prompt).toContain('YAML Escaping Rules');
  });

  it('should validate and repair cycle completes successfully', async () => {
    // Create spec directory with initially broken, then fixed YAML
    const originalName = 'Feature With Special Content';
    const originalTechnologies = ['TypeScript', 'React'];

    // Write truly malformed YAML that will fail parsing
    // This YAML has inconsistent indentation which will cause a parse error
    const malformedSpecYaml = `name: ${originalName}
oneLiner: Test feature that's malformed
summary: |
  This is a multi-line summary
    with inconsistent indentation that breaks YAML parsing
  - this looks like a list item but it's inside a block scalar
phase: implementation
sizeEstimate: M
content: Content that's broken
technologies:
${originalTechnologies.map((t) => `  - ${t}`).join('\n')}
  - broken item with : colon causing parse errors
openQuestions: [
`;

    writeFileSync(join(specDir, 'spec.yaml'), malformedSpecYaml);

    // Create validate node
    const validateNode = createValidateNode('spec.yaml', validateSpecRequirements);

    // Create initial state
    const state = {
      featureId: 'test-feature',
      repositoryPath: tempDir,
      worktreePath: tempDir,
      specDir,
      validationRetries: 0,
      lastValidationErrors: [],
      lastValidationTarget: '',
      messages: [],
      approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
      _approvalAction: null,
      _rejectionFeedback: null,
      _needsReexecution: false,
    } as Partial<FeatureAgentState> as FeatureAgentState;

    // First validation should fail (malformed YAML)
    const validationResult = await validateNode(state);

    // Verify validation failed
    expect(validationResult.lastValidationErrors).toBeDefined();
    expect(validationResult.lastValidationErrors!.length).toBeGreaterThan(0);
    expect(validationResult.validationRetries).toBe(1);

    // Now simulate repair by writing fixed YAML
    const fixedSpecYaml = `name: "${originalName}"
number: 1
branch: "feat/test-feature"
oneLiner: "Test feature that's now properly quoted"
summary: "Summary with \\"quotes\\""
phase: "implementation"
sizeEstimate: "M"
content: "Content that's fixed"
technologies:
${originalTechnologies.map((t) => `  - "${t}"`).join('\n')}
openQuestions: []
`;

    writeFileSync(join(specDir, 'spec.yaml'), fixedSpecYaml);

    // Re-validate with updated state
    const revalidationState = { ...state, ...validationResult };
    const revalidationResult = await validateNode(revalidationState);

    // Verify re-validation passed
    expect(revalidationResult.lastValidationErrors).toEqual([]);
    expect(revalidationResult.validationRetries).toBe(0);

    // Verify semantic content is preserved
    const fixedSpec = readSpecYaml(specDir);
    expect(fixedSpec.name).toBe(originalName);
    expect(fixedSpec.sizeEstimate).toBe('M');
    expect(fixedSpec.technologies).toEqual(originalTechnologies);
  });
});
