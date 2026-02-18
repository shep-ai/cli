/**
 * Feature Show Command — PRD Spec Display Tests
 *
 * Tests for the conditional "PRD Spec" textBlock that appears when a feature
 * is awaiting PRD approval (waiting_approval + node:requirements).
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRunStatus } from '@/domain/generated/output.js';
import type { Feature, AgentRun } from '@/domain/generated/output.js';

const { mockResolve, mockShowExecute, mockFindById, mockFindByRunId, mockReadFileSync } =
  vi.hoisted(() => ({
    mockResolve: vi.fn(),
    mockShowExecute: vi.fn(),
    mockFindById: vi.fn(),
    mockFindByRunId: vi.fn(),
    mockReadFileSync: vi.fn(),
  }));

vi.mock('@/infrastructure/di/container.js', () => ({
  container: { resolve: (...args: unknown[]) => mockResolve(...args) },
}));

vi.mock('@/application/use-cases/features/show-feature.use-case.js', () => ({
  ShowFeatureUseCase: class {
    execute = mockShowExecute;
  },
}));

vi.mock('@/infrastructure/services/filesystem/shep-directory.service.js', () => ({
  getShepHomeDir: () => '/home/test/.shep',
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  const mod = {
    ...actual,
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  };
  return { ...mod, default: mod };
});

import { createShowCommand } from '../../../../../../src/presentation/cli/commands/feat/show.command.js';

/** Sample spec YAML content for tests */
const SAMPLE_SPEC_YAML = `
name: test-feature
number: 1
branch: feat/001-test-feature
oneLiner: A test feature
phase: Requirements
sizeEstimate: S
summary: >
  This is the PRD summary for testing purposes. It describes what the feature does.
openQuestions:
  - question: "Should we use approach A or B?"
    resolved: true
    answer: "Use approach A because it is simpler."
  - question: "What about edge case X?"
    resolved: false
content: |
  ## Problem Statement
  This is the problem we are solving.

  ## Success Criteria
  - SC-1: First criterion
  - SC-2: Second criterion
`;

/** YAML with content exceeding 50 lines */
function makeLongContentYaml(): string {
  const lines = Array.from({ length: 80 }, (_, i) => `Line ${i + 1} of the PRD content.`);
  return `
name: long-feature
number: 2
branch: feat/002-long
oneLiner: A long feature
phase: Requirements
sizeEstimate: M
summary: Long PRD summary text.
openQuestions: []
content: |
${lines.map((l) => `  ${l}`).join('\n')}
`;
}

function makeFeature(overrides?: Partial<Feature>): Feature {
  return {
    id: 'feat-001',
    name: 'Test Feature',
    slug: 'test-feature',
    description: 'A test feature',
    repositoryPath: '/repo',
    branch: 'feat/test-feature',
    lifecycle: 'Requirements' as any,
    messages: [],
    relatedArtifacts: [],
    agentRunId: 'run-001',
    openPr: false,
    autoMerge: false,
    allowPrd: false,
    allowPlan: false,
    allowMerge: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function makeRun(overrides?: Partial<AgentRun>): AgentRun {
  return {
    id: 'run-001',
    agentType: 'claude-code' as any,
    agentName: 'feature-agent',
    status: AgentRunStatus.waitingApproval,
    result: 'node:requirements',
    prompt: 'Test prompt',
    threadId: 'thread-001',
    featureId: 'feat-001',
    repositoryPath: '/repo',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function setupMocks(feature: Feature, run: AgentRun | null) {
  mockShowExecute.mockResolvedValue(feature);
  mockFindById.mockResolvedValue(run);
  mockFindByRunId.mockResolvedValue([]);
  mockResolve.mockImplementation((token: unknown) => {
    if (typeof token === 'string') {
      if (token === 'IAgentRunRepository') return { findById: mockFindById };
      if (token === 'IPhaseTimingRepository') return { findByRunId: mockFindByRunId };
      return {};
    }
    return { execute: mockShowExecute };
  });
}

describe('createShowCommand - PRD Spec display', () => {
  let logOutput: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    logOutput = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logOutput.push(args.map(String).join(' '));
    });
    process.exitCode = undefined as any;
  });

  describe('PRD section displayed when conditions are met', () => {
    it('should show PRD Spec textBlock when specPath + waiting_approval + node:requirements', async () => {
      const feature = makeFeature({ specPath: '/specs/001-test' });
      const run = makeRun();
      setupMocks(feature, run);
      mockReadFileSync.mockReturnValue(SAMPLE_SPEC_YAML);

      const cmd = createShowCommand();
      await cmd.parseAsync(['feat-001'], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).toMatch(/PRD Spec/);
    });

    it('should include summary text from the parsed spec', async () => {
      const feature = makeFeature({ specPath: '/specs/001-test' });
      const run = makeRun();
      setupMocks(feature, run);
      mockReadFileSync.mockReturnValue(SAMPLE_SPEC_YAML);

      const cmd = createShowCommand();
      await cmd.parseAsync(['feat-001'], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).toContain('PRD summary for testing purposes');
    });

    it('should show open questions with [RESOLVED] prefix when resolved', async () => {
      const feature = makeFeature({ specPath: '/specs/001-test' });
      const run = makeRun();
      setupMocks(feature, run);
      mockReadFileSync.mockReturnValue(SAMPLE_SPEC_YAML);

      const cmd = createShowCommand();
      await cmd.parseAsync(['feat-001'], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).toMatch(/\[RESOLVED\]/);
      expect(output).toContain('Should we use approach A or B?');
    });

    it('should show open questions with [OPEN] prefix when unresolved', async () => {
      const feature = makeFeature({ specPath: '/specs/001-test' });
      const run = makeRun();
      setupMocks(feature, run);
      mockReadFileSync.mockReturnValue(SAMPLE_SPEC_YAML);

      const cmd = createShowCommand();
      await cmd.parseAsync(['feat-001'], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).toMatch(/\[OPEN\]/);
      expect(output).toContain('What about edge case X?');
    });

    it('should show resolved answer text when question is resolved', async () => {
      const feature = makeFeature({ specPath: '/specs/001-test' });
      const run = makeRun();
      setupMocks(feature, run);
      mockReadFileSync.mockReturnValue(SAMPLE_SPEC_YAML);

      const cmd = createShowCommand();
      await cmd.parseAsync(['feat-001'], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).toContain('Use approach A because it is simpler.');
    });

    it('should show content from the spec', async () => {
      const feature = makeFeature({ specPath: '/specs/001-test' });
      const run = makeRun();
      setupMocks(feature, run);
      mockReadFileSync.mockReturnValue(SAMPLE_SPEC_YAML);

      const cmd = createShowCommand();
      await cmd.parseAsync(['feat-001'], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).toContain('Problem Statement');
      expect(output).toContain('Success Criteria');
    });
  });

  describe('content truncation', () => {
    it('should truncate content at 50 lines with truncation notice', async () => {
      const feature = makeFeature({ specPath: '/specs/002-long' });
      const run = makeRun();
      setupMocks(feature, run);
      mockReadFileSync.mockReturnValue(makeLongContentYaml());

      const cmd = createShowCommand();
      await cmd.parseAsync(['feat-001'], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).toContain('Line 50 of the PRD content.');
      expect(output).not.toContain('Line 51 of the PRD content.');
      expect(output).toMatch(/truncated/i);
      expect(output).toContain('/specs/002-long');
    });
  });

  describe('PRD section absent when conditions not met', () => {
    it('should not show PRD section when specPath is undefined', async () => {
      const feature = makeFeature({ specPath: undefined });
      const run = makeRun();
      setupMocks(feature, run);

      const cmd = createShowCommand();
      await cmd.parseAsync(['feat-001'], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).not.toMatch(/PRD Spec/);
      expect(mockReadFileSync).not.toHaveBeenCalled();
    });

    it('should not show PRD section when run is not waiting_approval', async () => {
      const feature = makeFeature({ specPath: '/specs/001-test' });
      const run = makeRun({ status: AgentRunStatus.running });
      setupMocks(feature, run);

      const cmd = createShowCommand();
      await cmd.parseAsync(['feat-001'], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).not.toMatch(/PRD Spec/);
    });

    it('should not show PRD section when run.result is node:plan (not requirements)', async () => {
      const feature = makeFeature({ specPath: '/specs/001-test' });
      const run = makeRun({ result: 'node:plan' });
      setupMocks(feature, run);

      const cmd = createShowCommand();
      await cmd.parseAsync(['feat-001'], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).not.toMatch(/PRD Spec/);
    });

    it('should not show PRD section when run is null', async () => {
      const feature = makeFeature({ specPath: '/specs/001-test', agentRunId: undefined });
      setupMocks(feature, null);

      const cmd = createShowCommand();
      await cmd.parseAsync(['feat-001'], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).not.toMatch(/PRD Spec/);
    });
  });

  describe('graceful degradation', () => {
    it('should not crash when spec.yaml does not exist', async () => {
      const feature = makeFeature({ specPath: '/specs/001-test' });
      const run = makeRun();
      setupMocks(feature, run);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const cmd = createShowCommand();
      await cmd.parseAsync(['feat-001'], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).not.toMatch(/PRD Spec/);
      expect(process.exitCode).toBeUndefined();
    });

    it('should not crash when spec.yaml contains malformed YAML', async () => {
      const feature = makeFeature({ specPath: '/specs/001-test' });
      const run = makeRun();
      setupMocks(feature, run);
      mockReadFileSync.mockReturnValue('{{{{invalid yaml');

      const cmd = createShowCommand();
      await cmd.parseAsync(['feat-001'], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).not.toMatch(/PRD Spec/);
      expect(process.exitCode).toBeUndefined();
    });
  });
});
