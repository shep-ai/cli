/**
 * Feature Review Command — PRD Spec Display Tests
 *
 * Tests for the conditional PRD content display in the review command
 * using inline console.log when feature is awaiting PRD approval.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRunStatus } from '@/domain/generated/output.js';

const { mockResolve, mockResolveWaiting, mockReadFileSync } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockResolveWaiting: vi.fn(),
  mockReadFileSync: vi.fn(),
}));

vi.mock('@/infrastructure/di/container.js', () => ({
  container: { resolve: (...args: unknown[]) => mockResolve(...args) },
}));

vi.mock('../../../../../../src/presentation/cli/commands/feat/resolve-waiting-feature.js', () => ({
  resolveWaitingFeature: (...args: unknown[]) => mockResolveWaiting(...args),
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  const mod = {
    ...actual,
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  };
  return { ...mod, default: mod };
});

import { createReviewCommand } from '../../../../../../src/presentation/cli/commands/feat/review.command.js';

/** Sample spec YAML content for tests */
const SAMPLE_SPEC_YAML = `
name: test-feature
number: 1
branch: feat/001-test-feature
oneLiner: A test feature
phase: Requirements
sizeEstimate: S
summary: >
  This is the PRD summary for review testing. It describes what we are building.
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

function makeWaitingResult(overrides?: Record<string, unknown>) {
  return {
    feature: {
      id: 'feat-001-full-uuid',
      name: 'Test Feature',
      branch: 'feat/test-feature',
      specPath: '/specs/001-test',
      ...overrides,
    },
    run: {
      id: 'run-001',
      status: AgentRunStatus.waitingApproval,
      result: 'node:requirements',
      ...(overrides?.run as Record<string, unknown>),
    },
  };
}

describe('createReviewCommand - PRD Spec display', () => {
  let logOutput: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    logOutput = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logOutput.push(args.map(String).join(' '));
    });
    process.exitCode = undefined as any;
  });

  describe('PRD content displayed when conditions are met', () => {
    it('should show PRD summary when specPath + node:requirements', async () => {
      mockResolveWaiting.mockResolvedValue(makeWaitingResult());
      mockReadFileSync.mockReturnValue(SAMPLE_SPEC_YAML);

      const cmd = createReviewCommand();
      await cmd.parseAsync([], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).toContain('PRD summary for review testing');
    });

    it('should show open questions with status indicators', async () => {
      mockResolveWaiting.mockResolvedValue(makeWaitingResult());
      mockReadFileSync.mockReturnValue(SAMPLE_SPEC_YAML);

      const cmd = createReviewCommand();
      await cmd.parseAsync([], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).toMatch(/\[RESOLVED\]/);
      expect(output).toContain('Should we use approach A or B?');
      expect(output).toMatch(/\[OPEN\]/);
      expect(output).toContain('What about edge case X?');
    });

    it('should show resolved answer text', async () => {
      mockResolveWaiting.mockResolvedValue(makeWaitingResult());
      mockReadFileSync.mockReturnValue(SAMPLE_SPEC_YAML);

      const cmd = createReviewCommand();
      await cmd.parseAsync([], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).toContain('Use approach A because it is simpler.');
    });

    it('should show content from the spec', async () => {
      mockResolveWaiting.mockResolvedValue(makeWaitingResult());
      mockReadFileSync.mockReturnValue(SAMPLE_SPEC_YAML);

      const cmd = createReviewCommand();
      await cmd.parseAsync([], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).toContain('Problem Statement');
    });

    it('should display PRD content BEFORE the approve/reject hints', async () => {
      mockResolveWaiting.mockResolvedValue(makeWaitingResult());
      mockReadFileSync.mockReturnValue(SAMPLE_SPEC_YAML);

      const cmd = createReviewCommand();
      await cmd.parseAsync([], { from: 'user' });

      const output = logOutput.join('\n');
      const prdIndex = output.indexOf('PRD summary for review testing');
      const approveIndex = output.indexOf('To approve:');
      expect(prdIndex).toBeGreaterThan(-1);
      expect(approveIndex).toBeGreaterThan(-1);
      expect(prdIndex).toBeLessThan(approveIndex);
    });
  });

  describe('content truncation', () => {
    it('should truncate content at 50 lines with truncation notice', async () => {
      mockResolveWaiting.mockResolvedValue(makeWaitingResult({ specPath: '/specs/002-long' }));
      mockReadFileSync.mockReturnValue(makeLongContentYaml());

      const cmd = createReviewCommand();
      await cmd.parseAsync([], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).toContain('Line 50 of the PRD content.');
      expect(output).not.toContain('Line 51 of the PRD content.');
      expect(output).toMatch(/truncated/i);
    });
  });

  describe('PRD section absent when conditions not met', () => {
    it('should not show PRD output when specPath is undefined', async () => {
      mockResolveWaiting.mockResolvedValue(makeWaitingResult({ specPath: undefined }));

      const cmd = createReviewCommand();
      await cmd.parseAsync([], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).not.toMatch(/PRD Spec/);
      expect(output).not.toContain('PRD summary');
      expect(mockReadFileSync).not.toHaveBeenCalled();
    });

    it('should not show PRD output when run.result is node:plan (not requirements)', async () => {
      mockResolveWaiting.mockResolvedValue({
        feature: {
          id: 'feat-001-full-uuid',
          name: 'Test Feature',
          branch: 'feat/test-feature',
          specPath: '/specs/001-test',
        },
        run: {
          id: 'run-001',
          status: AgentRunStatus.waitingApproval,
          result: 'node:plan',
        },
      });

      const cmd = createReviewCommand();
      await cmd.parseAsync([], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).not.toContain('PRD summary');
      expect(mockReadFileSync).not.toHaveBeenCalled();
    });
  });

  describe('graceful degradation', () => {
    it('should not crash when spec.yaml is missing', async () => {
      mockResolveWaiting.mockResolvedValue(makeWaitingResult());
      mockReadFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const cmd = createReviewCommand();
      await cmd.parseAsync([], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).not.toContain('PRD summary');
      expect(process.exitCode).toBeUndefined();
    });

    it('should not crash when spec.yaml contains malformed YAML', async () => {
      mockResolveWaiting.mockResolvedValue(makeWaitingResult());
      mockReadFileSync.mockReturnValue('{{{{invalid yaml');

      const cmd = createReviewCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(process.exitCode).toBeUndefined();
    });
  });
});
