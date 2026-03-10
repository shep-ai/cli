import { describe, it, expect, vi } from 'vitest';

// Mock readSpecFile from node-helpers
vi.mock(
  '@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js',
  async (importOriginal) => {
    const actual = (await importOriginal()) as Record<string, unknown>;
    return {
      ...actual,
      readSpecFile: vi.fn().mockReturnValue(''),
      buildCommitPushBlock: vi.fn().mockReturnValue('## Final Step — Commit Your Work\n(mocked)'),
    };
  }
);

import { buildEvidencePrompt } from '@/infrastructure/services/agents/feature-agent/nodes/prompts/evidence-prompts.js';
import {
  readSpecFile,
  buildCommitPushBlock,
} from '@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';

function baseState(overrides: Partial<FeatureAgentState> = {}): FeatureAgentState {
  return {
    featureId: 'feat-001',
    repositoryPath: '/tmp/repo',
    worktreePath: '/home/user/.shep/repos/abc123/wt/feat-test',
    specDir: '/home/user/.shep/repos/abc123/wt/feat-test/specs/057-test-feature',
    currentNode: 'evidence',
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
    evidence: [],
    ...overrides,
  } as FeatureAgentState;
}

describe('buildEvidencePrompt', () => {
  it('should include spec context when spec.yaml exists', () => {
    vi.mocked(readSpecFile).mockImplementation((_, filename) => {
      if (filename === 'spec.yaml') return 'name: Test Feature\nsummary: A test feature\n';
      return '';
    });

    const prompt = buildEvidencePrompt(baseState());
    expect(prompt).toContain('Test Feature');
    expect(prompt).toContain('spec.yaml');
  });

  it('should include tasks context when tasks.yaml exists', () => {
    vi.mocked(readSpecFile).mockImplementation((_, filename) => {
      if (filename === 'tasks.yaml')
        return 'phases:\n  - name: Phase 1\n    tasks:\n      - id: task-1\n        name: Create the thing\n';
      return '';
    });

    const prompt = buildEvidencePrompt(baseState());
    expect(prompt).toContain('task-1');
    expect(prompt).toContain('Create the thing');
  });

  it('should include worktree path', () => {
    const prompt = buildEvidencePrompt(
      baseState({ worktreePath: '/home/user/.shep/repos/abc123/wt/my-feature' })
    );
    expect(prompt).toContain('/home/user/.shep/repos/abc123/wt/my-feature');
  });

  it('should fall back to repositoryPath when worktreePath is absent', () => {
    const prompt = buildEvidencePrompt(
      baseState({
        worktreePath: '',
        repositoryPath: '/home/user/.shep/repos/abc123/wt/fallback',
      })
    );
    expect(prompt).toContain('/home/user/.shep/repos/abc123/wt/fallback');
  });

  it('should include JSON output format instructions', () => {
    const prompt = buildEvidencePrompt(baseState());
    // Should instruct the agent to output a fenced JSON code block with evidence records
    expect(prompt).toContain('```json');
    expect(prompt).toContain('type');
    expect(prompt).toContain('capturedAt');
    expect(prompt).toContain('description');
    expect(prompt).toContain('relativePath');
    expect(prompt).toContain('taskRef');
  });

  it('should include all valid EvidenceType values in instructions', () => {
    const prompt = buildEvidencePrompt(baseState());
    expect(prompt).toContain('Screenshot');
    expect(prompt).toContain('Video');
    expect(prompt).toContain('TestOutput');
    expect(prompt).toContain('TerminalRecording');
  });

  it('should include file size constraints (standard resolution)', () => {
    const prompt = buildEvidencePrompt(baseState());
    expect(prompt.toLowerCase()).toContain('standard resolution');
  });

  it('should include file size constraints (500-line truncation)', () => {
    const prompt = buildEvidencePrompt(baseState());
    expect(prompt).toContain('500');
  });

  it('should include sensitive data redaction instructions', () => {
    const prompt = buildEvidencePrompt(baseState());
    const lower = prompt.toLowerCase();
    expect(lower).toMatch(/redact|sensitive|secret|api key/);
  });

  it('should include evidence capture instructions per task type', () => {
    const prompt = buildEvidencePrompt(baseState());
    const lower = prompt.toLowerCase();
    expect(lower).toContain('screenshot');
    expect(lower).toMatch(/test output|test result/);
    expect(lower).toMatch(/terminal|cli/);
  });

  it('should handle missing spec.yaml gracefully', () => {
    vi.mocked(readSpecFile).mockReturnValue('');

    const prompt = buildEvidencePrompt(baseState());
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('should handle missing tasks.yaml gracefully', () => {
    vi.mocked(readSpecFile).mockImplementation((_, filename) => {
      if (filename === 'spec.yaml') return 'name: Test Feature\n';
      return '';
    });

    const prompt = buildEvidencePrompt(baseState());
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('should be deterministic (same input = same output)', () => {
    vi.mocked(readSpecFile).mockReturnValue('name: Test\n');
    const state = baseState();
    const prompt1 = buildEvidencePrompt(state);
    const prompt2 = buildEvidencePrompt(state);
    expect(prompt1).toBe(prompt2);
  });

  describe('commitEvidence=false (default)', () => {
    it('should store evidence in shep home folder by default', () => {
      const prompt = buildEvidencePrompt(baseState());
      // Should reference the shep home evidence directory (derived from worktree path)
      expect(prompt).toContain('evidence');
      expect(prompt).toContain('shep home');
    });

    it('should NOT include commit/push block', () => {
      const prompt = buildEvidencePrompt(baseState());
      expect(prompt).toContain('Do NOT commit or push');
      expect(vi.mocked(buildCommitPushBlock)).not.toHaveBeenCalled();
    });

    it('should instruct NOT to commit files', () => {
      const prompt = buildEvidencePrompt(baseState(), { commitEvidence: false });
      expect(prompt).toContain('Do NOT commit or push');
    });
  });

  describe('commitEvidence=true', () => {
    it('should include spec evidence folder storage instructions', () => {
      const prompt = buildEvidencePrompt(baseState(), { commitEvidence: true });
      expect(prompt).toContain('specs/057-test-feature/evidence');
    });

    it('should include commit block via buildCommitPushBlock', () => {
      vi.mocked(buildCommitPushBlock).mockReturnValue('## Final Step — Commit Your Work\n(mocked)');

      const prompt = buildEvidencePrompt(baseState(), { commitEvidence: true });
      expect(prompt).toContain('## Final Step — Commit Your Work');
      expect(vi.mocked(buildCommitPushBlock)).toHaveBeenCalled();
    });

    it('should pass spec evidence path in commit block files', () => {
      buildEvidencePrompt(baseState(), { commitEvidence: true });
      expect(vi.mocked(buildCommitPushBlock)).toHaveBeenCalledWith(
        expect.objectContaining({
          files: expect.arrayContaining([
            expect.stringContaining('specs/057-test-feature/evidence/'),
          ]),
        })
      );
    });

    it('should pass push flag through to buildCommitPushBlock', () => {
      buildEvidencePrompt(baseState({ push: true }), { commitEvidence: true });
      expect(vi.mocked(buildCommitPushBlock)).toHaveBeenCalledWith(
        expect.objectContaining({ push: true })
      );
    });

    it('should mention PR body in the prompt', () => {
      const prompt = buildEvidencePrompt(baseState(), { commitEvidence: true });
      expect(prompt).toContain('pull request body');
    });

    it('should save to BOTH locations', () => {
      const prompt = buildEvidencePrompt(baseState(), { commitEvidence: true });
      expect(prompt).toContain('Shep home folder');
      expect(prompt).toContain('Spec folder');
    });
  });
});
