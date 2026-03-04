import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock readSpecFile from node-helpers
vi.mock(
  '@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js',
  async (importOriginal) => {
    const actual = (await importOriginal()) as Record<string, unknown>;
    return {
      ...actual,
      readSpecFile: vi.fn().mockReturnValue(''),
    };
  }
);

import { buildEvidencePrompt } from '@/infrastructure/services/agents/feature-agent/nodes/prompts/evidence-prompts.js';
import { readSpecFile } from '@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';
import type { CiFixRecord } from '@/domain/generated/output.js';

function baseState(overrides: Partial<FeatureAgentState> = {}): FeatureAgentState {
  return {
    featureId: 'feat-048',
    repositoryPath: '/tmp/repo',
    worktreePath: '/tmp/worktree',
    specDir: '/tmp/specs/048-pr-evidence-agent',
    currentNode: 'merge',
    error: null,
    messages: [],
    approvalGates: undefined,
    validationRetries: 0,
    lastValidationTarget: '',
    lastValidationErrors: [],
    prUrl: null,
    prNumber: null,
    commitHash: null,
    ciStatus: null,
    push: false,
    openPr: false,
    ...overrides,
  } as FeatureAgentState;
}

const SPEC_CONTENT = `name: test-feature
summary: A test feature for evidence testing
content: |
  ## Success Criteria
  - SC-1: Feature builds without errors
  - SC-2: All tests pass
`;

const PLAN_CONTENT = `name: test-feature
summary: Implementation plan
phases:
  - id: phase-1
    name: Core Implementation
`;

const TASKS_CONTENT = `name: test-feature
tasks:
  - id: task-1
    name: Implement core logic
    acceptanceCriteria:
      - Core logic works correctly
`;

describe('buildEvidencePrompt', () => {
  beforeEach(() => {
    vi.mocked(readSpecFile).mockImplementation((specDir: string, filename: string) => {
      if (filename === 'spec.yaml') return SPEC_CONTENT;
      if (filename === 'plan.yaml') return PLAN_CONTENT;
      if (filename === 'tasks.yaml') return TASKS_CONTENT;
      return '';
    });
  });

  describe('core function (task-3)', () => {
    it('should return a string', () => {
      const result = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include the PR number', () => {
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(prompt).toContain('42');
    });

    it('should include the PR URL', () => {
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(prompt).toContain('https://github.com/test/repo/pull/42');
    });

    it('should include the branch name', () => {
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/my-feature'
      );
      expect(prompt).toContain('feat/my-feature');
    });

    it('should include the idempotency marker instruction', () => {
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(prompt).toContain('<!-- shep-evidence-v1 -->');
    });

    it('should include gh pr comment instruction', () => {
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(prompt).toContain('gh pr comment');
    });

    it('should read spec.yaml via readSpecFile', () => {
      buildEvidencePrompt(
        baseState({ specDir: '/tmp/specs/048-pr-evidence-agent' }),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(readSpecFile).toHaveBeenCalledWith('/tmp/specs/048-pr-evidence-agent', 'spec.yaml');
    });

    it('should read plan.yaml via readSpecFile', () => {
      buildEvidencePrompt(
        baseState({ specDir: '/tmp/specs/048-pr-evidence-agent' }),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(readSpecFile).toHaveBeenCalledWith('/tmp/specs/048-pr-evidence-agent', 'plan.yaml');
    });

    it('should read tasks.yaml via readSpecFile', () => {
      buildEvidencePrompt(
        baseState({ specDir: '/tmp/specs/048-pr-evidence-agent' }),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(readSpecFile).toHaveBeenCalledWith('/tmp/specs/048-pr-evidence-agent', 'tasks.yaml');
    });

    it('should include spec content in the prompt', () => {
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(prompt).toContain('test-feature');
      expect(prompt).toContain('A test feature for evidence testing');
    });

    it('should include all required section headers', () => {
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(prompt).toContain('Implementation Summary');
      expect(prompt).toContain('Test Results');
      expect(prompt).toContain('Build Verification');
      expect(prompt).toContain('Files Changed');
      expect(prompt).toContain('Spec Compliance');
    });

    it('should be deterministic — same inputs produce same output', () => {
      const state = baseState();
      const prompt1 = buildEvidencePrompt(
        state,
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      const prompt2 = buildEvidencePrompt(
        state,
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(prompt1).toBe(prompt2);
    });
  });

  describe('e2e test execution and screenshot capture (task-4)', () => {
    it('should include e2e test execution instructions referencing pnpm test:e2e', () => {
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(prompt).toContain('pnpm test:e2e');
    });

    it('should include dynamic port detection instructions when UI changes detected', () => {
      const state = baseState({
        messages: ['[implement] Modified src/presentation/web/components/Dashboard.tsx'],
      });
      const prompt = buildEvidencePrompt(
        state,
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      // Should mention parsing the port from stdout
      expect(prompt.toLowerCase()).toMatch(/parse.*(port|url).*stdout|stdout.*(port|url)/i);
    });

    it('should NOT contain hardcoded port 3001', () => {
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(prompt).not.toContain('PORT=3001');
      expect(prompt).not.toContain('localhost:3001');
      expect(prompt).not.toContain(':3001');
    });

    it('should include screenshot instructions when messages mention web UI file paths', () => {
      const state = baseState({
        messages: ['[implement] Modified src/presentation/web/components/Dashboard.tsx'],
      });
      const prompt = buildEvidencePrompt(
        state,
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(prompt.toLowerCase()).toContain('screenshot');
      expect(prompt).toContain('pnpm dev:web');
    });

    it('should omit screenshot section when no UI changes are detected', () => {
      const state = baseState({
        messages: ['[implement] Modified packages/core/src/domain/models/user.ts'],
      });
      const prompt = buildEvidencePrompt(
        state,
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      // Should not have dedicated screenshot capture section when no UI files changed
      expect(prompt).not.toContain('pnpm dev:web');
    });

    it('should include Playwright video artifact collection instructions', () => {
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(prompt.toLowerCase()).toContain('video');
      expect(prompt).toContain('test-results');
    });
  });

  describe('spec-driven artifact discovery and GitHub API upload (task-5)', () => {
    it('should instruct agent to read spec files for artifact identification', () => {
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(prompt.toLowerCase()).toMatch(/spec.*artifact|artifact.*spec/i);
    });

    it('should reference success criteria and acceptance criteria as artifact sources', () => {
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(prompt.toLowerCase()).toContain('success criteria');
      expect(prompt.toLowerCase()).toContain('acceptance criteria');
    });

    it('should include fallback to common output patterns as secondary strategy', () => {
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      // Should mention common output directories or extensions as a fallback
      expect(prompt).toMatch(/\.csv|\.pdf|\.xlsx/);
    });

    it('should include GitHub API upload instructions', () => {
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(prompt).toContain('gh api');
    });

    it('should NOT include git commit instructions for evidence artifacts', () => {
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      // Should explicitly tell NOT to commit artifacts
      expect(prompt.toLowerCase()).toMatch(/do not commit.*artifact|not.*commit.*evidence/i);
    });

    it('should include the security exclusion patterns', () => {
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(prompt).toContain('.env');
      expect(prompt).toContain('.key');
      expect(prompt).toContain('.pem');
      expect(prompt).toContain('credentials.json');
    });

    it('should include size limit instructions', () => {
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(prompt).toContain('10 MB');
      expect(prompt).toContain('50 MB');
    });
  });

  describe('CI fix history and edge cases (task-6)', () => {
    it('should include CI fix history when ciFixHistory has entries', () => {
      const ciFixHistory: CiFixRecord[] = [
        {
          attempt: 1,
          startedAt: '2026-01-01T00:00:00Z',
          failureSummary: 'lint error in utils.ts',
          outcome: 'fixed',
        },
        {
          attempt: 2,
          startedAt: '2026-01-01T00:01:00Z',
          failureSummary: 'type error in handler.ts',
          outcome: 'fixed',
        },
      ];
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        'success',
        ciFixHistory,
        'feat/test-branch'
      );
      expect(prompt).toContain('CI Fix History');
      expect(prompt).toContain('lint error in utils.ts');
      expect(prompt).toContain('type error in handler.ts');
    });

    it('should omit CI fix history when ciFixHistory is empty', () => {
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        'success',
        [],
        'feat/test-branch'
      );
      expect(prompt).not.toContain('CI Fix History');
    });

    it('should handle null ciStatus gracefully', () => {
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
      // Should not throw or contain 'null' as literal text in CI section
      expect(prompt).not.toMatch(/CI Status:.*null/);
    });

    it('should include ciStatus value when provided', () => {
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        'success',
        [],
        'feat/test-branch'
      );
      expect(prompt).toContain('success');
    });

    it('should handle empty spec file content without errors', () => {
      vi.mocked(readSpecFile).mockReturnValue('');
      const prompt = buildEvidencePrompt(
        baseState(),
        42,
        'https://github.com/test/repo/pull/42',
        null,
        [],
        'feat/test-branch'
      );
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should produce valid prompt when all optional fields are missing', () => {
      vi.mocked(readSpecFile).mockReturnValue('');
      const state = baseState({
        messages: [],
      });
      const prompt = buildEvidencePrompt(
        state,
        1,
        'https://github.com/test/repo/pull/1',
        null,
        [],
        'feat/minimal'
      );
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
      // Core structure should still exist
      expect(prompt).toContain('Implementation Summary');
      expect(prompt).toContain('gh pr comment');
      expect(prompt).toContain('<!-- shep-evidence-v1 -->');
    });
  });
});
